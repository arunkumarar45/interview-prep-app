// server/lib/repoAnalyzer.ts
// Shared repository extraction module used by /api/project/analyze and
// /api/resume/project-from-repo.
//
// Security hardening:
//  - ZIP path traversal protection (reject ../ and absolute paths)
//  - Total extracted size limit (not just file count)
//  - Per-file size limit for ZIP entries
//  - 10-second timeout on all GitHub API requests
//  - GitHub truncated-tree detection with user-facing warning
//  - SSRF protection: only github.com URLs accepted (strict regex)

import AdmZip from "adm-zip";

export const ZIP_MAX_BYTES = 20 * 1024 * 1024;   // 20 MB upload limit
export const FILE_COUNT_LIMIT = 200;              // max included source files
export const MAX_EXTRACTED_BYTES = 50 * 1024 * 1024; // 50 MB total extracted
export const MAX_SINGLE_FILE_BYTES = 512 * 1024; // 512 KB per file

const GITHUB_API_TIMEOUT_MS = 10_000; // 10 seconds

export const EXCLUDED_DIR_PREFIXES = [
  "node_modules/",
  ".git/",
  "venv/",
  "dist/",
  "build/",
  "__pycache__/",
  ".next/",
  "vendor/",
];

export const ALLOWED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx",
  ".py", ".go", ".java", ".rs",
  ".json", ".yaml", ".yml",
  ".md", ".env.example",
  ".sql", ".graphql", ".proto",
  ".html", ".css", ".scss",
  ".rb", ".php", ".swift", ".kt",
  ".c", ".cpp", ".h", ".hpp",
  ".sh", ".toml", ".ini",
]);

export function isExcluded(entryPath: string): boolean {
  const normalized = entryPath.replace(/\\/g, "/");
  return EXCLUDED_DIR_PREFIXES.some(
    (prefix) =>
      normalized.includes(`/${prefix}`) || normalized.startsWith(prefix)
  );
}

export function hasAllowedExtension(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return filename === ".env.example";
  return ALLOWED_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

/**
 * Checks whether a ZIP entry path is safe to extract.
 * Rejects: absolute paths, path traversal (../), null bytes.
 */
function isSafeZipPath(entryName: string): boolean {
  if (!entryName) return false;
  if (entryName.includes("\0")) return false;          // null byte
  if (/^[/\\]/.test(entryName)) return false;          // absolute path
  const normalized = entryName.replace(/\\/g, "/");
  if (normalized.includes("../")) return false;        // traversal
  if (normalized.includes("..\\")) return false;       // Windows traversal
  return true;
}

export interface ExtractedRepoContext {
  sourceLabel: string;
  files: Record<string, string>;
  repoName?: string;
  readmeContent?: string;
  /** True if the GitHub tree was truncated — analysis may be incomplete */
  isTruncated?: boolean;
}

export class RepoExtractionError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "RepoExtractionError";
  }
}

/**
 * Creates an AbortController that fires after `ms` milliseconds.
 */
function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

/**
 * Extracts source code context from either an uploaded ZIP Express File
 * or a public GitHub repository URL.
 *
 * SSRF protection: only github.com URLs matching the strict regex are accepted.
 * No redirect-following, no arbitrary URL support.
 */
export async function extractRepoContext(params: {
  file?: Express.Multer.File;
  githubUrl?: string;
}): Promise<ExtractedRepoContext> {
  const { file, githubUrl } = params;

  // ── Path A: ZIP archive upload ─────────────────────────────────────────────
  if (file) {
    if (file.size > ZIP_MAX_BYTES) {
      throw new RepoExtractionError("ZIP must be under 20 MB", 400);
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(file.buffer);
    } catch {
      throw new RepoExtractionError(
        "Could not open the archive. Is it a valid ZIP file?",
        422
      );
    }

    const entries = zip.getEntries();

    // Filter: safe paths + allowed extensions + not excluded dirs
    const included = entries.filter(
      (e) =>
        !e.isDirectory &&
        isSafeZipPath(e.entryName) &&      // ← path traversal guard
        !isExcluded(e.entryName) &&
        hasAllowedExtension(e.entryName)
    );

    if (included.length > FILE_COUNT_LIMIT) {
      throw new RepoExtractionError(
        `ZIP must contain fewer than ${FILE_COUNT_LIMIT} source files ` +
          `(after excluding node_modules, .git, venv, dist, build). Found ${included.length}.`,
        400
      );
    }

    if (included.length === 0) {
      throw new RepoExtractionError(
        "No readable source files found in the ZIP after applying exclusions.",
        422
      );
    }

    const files: Record<string, string> = {};
    let readmeContent: string | undefined;
    let totalExtractedBytes = 0;

    for (const entry of included) {
      // Per-file size guard
      if (entry.header.size > MAX_SINGLE_FILE_BYTES) continue;

      totalExtractedBytes += entry.header.size;
      if (totalExtractedBytes > MAX_EXTRACTED_BYTES) {
        throw new RepoExtractionError(
          `Total extracted content exceeds ${MAX_EXTRACTED_BYTES / (1024 * 1024)} MB limit.`,
          400
        );
      }

      try {
        const text = entry.getData().toString("utf8");
        files[entry.entryName] = text;
        if (entry.entryName.toLowerCase().endsWith("readme.md")) {
          readmeContent = text;
        }
      } catch {
        // Skip entries that cannot be decoded as UTF-8
      }
    }

    const repoName = file.originalname.replace(/\.(zip|tar\.gz|tgz)$/i, "");
    return {
      sourceLabel: `ZIP archive: ${file.originalname}`,
      files,
      repoName,
      readmeContent,
      isTruncated: false,
    };
  }

  // ── Path B: GitHub public repository URL ──────────────────────────────────
  // SSRF protection: strict regex — only github.com owner/repo format accepted.
  // No support for redirects, internal IPs, or arbitrary hosts.
  if (githubUrl?.trim()) {
    const match = githubUrl
      .trim()
      .match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/);

    if (!match) {
      throw new RepoExtractionError(
        "Provide a valid public GitHub repository URL (e.g. https://github.com/owner/repo). " +
          "Only HTTPS github.com URLs are supported.",
        400
      );
    }

    const [, owner, repo] = match;

    // Fetch the recursive file tree from GitHub API
    const treeTimer = withTimeout(GITHUB_API_TIMEOUT_MS);
    let treeData: {
      tree: Array<{ path: string; type: string; url: string; size?: number }>;
      truncated: boolean;
    };

    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
        {
          signal: treeTimer.signal,
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "InterviewPrep-AI/1.0",
          },
        }
      );

      if (!treeRes.ok) {
        const msg =
          treeRes.status === 404
            ? "Repository not found. Make sure it is public."
            : treeRes.status === 403
            ? "GitHub API rate limit reached. Please try again in a few minutes."
            : `GitHub API error: ${treeRes.status}`;
        throw new RepoExtractionError(msg, treeRes.status === 404 ? 404 : 400);
      }

      treeData = (await treeRes.json()) as typeof treeData;
    } catch (err) {
      treeTimer.clear();
      if ((err as Error).name === "AbortError") {
        throw new RepoExtractionError(
          "GitHub API request timed out. Please try again.",
          504
        );
      }
      if (err instanceof RepoExtractionError) throw err;
      throw new RepoExtractionError(
        "Failed to reach GitHub API. Please check the URL and try again.",
        502
      );
    } finally {
      treeTimer.clear();
    }

    const blobs = treeData.tree.filter(
      (node) =>
        node.type === "blob" &&
        !isExcluded(node.path) &&
        hasAllowedExtension(node.path) &&
        (node.size ?? 0) < MAX_SINGLE_FILE_BYTES
    );

    if (blobs.length > FILE_COUNT_LIMIT) {
      throw new RepoExtractionError(
        `Repository has more than ${FILE_COUNT_LIMIT} source files after exclusions. ` +
          `Please upload a ZIP with only the relevant source directories.`,
        400
      );
    }

    if (blobs.length === 0) {
      throw new RepoExtractionError(
        "No readable source files found in the repository.",
        422
      );
    }

    // Fetch file content for up to 40 blobs concurrently
    const toFetch = blobs.slice(0, 40);
    const files: Record<string, string> = {};
    let readmeContent: string | undefined;

    await Promise.all(
      toFetch.map(async (node) => {
        const fileTimer = withTimeout(GITHUB_API_TIMEOUT_MS);
        try {
          const raw = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${node.path}`,
            {
              signal: fileTimer.signal,
              headers: { "User-Agent": "InterviewPrep-AI/1.0" },
            }
          );
          if (raw.ok) {
            const text = await raw.text();
            files[node.path] = text;
            if (node.path.toLowerCase().endsWith("readme.md")) {
              readmeContent = text;
            }
          }
        } catch {
          // Skip individual file failures — analysis continues with available files
        } finally {
          fileTimer.clear();
        }
      })
    );

    // isTruncated: GitHub truncated the tree OR we fetched fewer files than available
    const isTruncated = treeData.truncated || blobs.length > 40;

    return {
      sourceLabel: `GitHub: ${owner}/${repo}`,
      files,
      repoName: repo,
      readmeContent,
      isTruncated,
    };
  }

  throw new RepoExtractionError(
    "Provide either a ZIP file upload (field: zip) or a githubUrl in the request body.",
    400
  );
}
