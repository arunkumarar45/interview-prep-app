import React, { useState } from "react";
import { apiFetch, apiFetchBlob } from "../../../lib/api";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { ModernTemplate } from "./templates/ModernTemplate";
import { CompactTemplate } from "./templates/CompactTemplate";
import {
  Sparkles,
  Save,
  Download,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  Github,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  FileCode,
  ShieldCheck,
  Check,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

export interface BulletClassification {
  id: string;
  actionVerb: "strong" | "weak" | "passive";
  quantified: boolean;
  verifiable: "verified" | "unverifiable";
  issues: string[];
  suggestion: string;
}

import type { SavedResumeRecord } from "./ResumeHomeScreen";
import { AtsAuditModal } from "./AtsAuditModal";
import type {
  ResumeFormData,
  ResumeExperienceItem,
  ResumeEducationItem,
  ResumeProjectItem,
  ResumeCertificationItem,
  AtsAuditReport,
} from "../../../types/resume";

const defaultFormData: ResumeFormData = {
  contactInfo: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
  },
  summary: "",
  experience: [
    {
      id: "exp-1",
      title: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      bullets: [""],
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "",
      institution: "",
      location: "",
      startDate: "",
      endDate: "",
      gpa: "",
    },
  ],
  skills: [],
  projects: [],
  certifications: [],
};

export function ResumeEditorScreen({
  initialResume,
  initialPrefillData,
  initialToneNote,
  initialTemplateId = "modern",
  initialSourceMode = "from_scratch",
  onBack,
}: {
  initialResume?: SavedResumeRecord | null;
  initialPrefillData?: ResumeFormData | null;
  initialToneNote?: string | null;
  initialTemplateId?: "classic" | "modern" | "compact";
  initialSourceMode?: "reference_upload" | "from_scratch";
  onBack: () => void;
}) {
  const [resumeId, setResumeId] = useState<string | undefined>(initialResume?.id);
  const [templateId, setTemplateId] = useState<"classic" | "modern" | "compact">(
    (initialResume?.template_id as any) || initialTemplateId
  );
  const [sourceMode] = useState<string>(
    initialResume?.source_mode || initialSourceMode
  );

  const [formData, setFormData] = useState<ResumeFormData>(
    initialResume?.form_data || initialPrefillData || defaultFormData
  );

  const [generatedContent, setGeneratedContent] = useState<ResumeFormData>(
    initialResume?.generated_content || initialPrefillData || defaultFormData
  );

  // Accordion section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    contact: true,
    summary: true,
    experience: true,
    education: true,
    skills: true,
    projects: true,
    certifications: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // UI state
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [validatingClaims, setValidatingClaims] = useState(false);
  const [claimAuditResults, setClaimAuditResults] = useState<Record<string, BulletClassification>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Repo project import modal/drawer state
  const [repoMode, setRepoMode] = useState<"zip" | "github">("zip");
  const [repoFile, setRepoFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [extractingRepo, setExtractingRepo] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [showRepoImport, setShowRepoImport] = useState(false);

  // Update handlers
  const updateContact = (key: keyof typeof formData.contactInfo, value: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        contactInfo: { ...prev.contactInfo, [key]: value },
      };
      setGeneratedContent(next);
      return next;
    });
  };

  const updateSummary = (val: string) => {
    setFormData((prev) => {
      const next = { ...prev, summary: val };
      setGeneratedContent(next);
      return next;
    });
  };

  // Experience handlers
  const addExperience = () => {
    const newItem: ResumeExperienceItem = {
      id: `exp-${Date.now()}`,
      title: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      bullets: [""],
    };
    setFormData((prev) => {
      const next = { ...prev, experience: [...prev.experience, newItem] };
      setGeneratedContent(next);
      return next;
    });
  };

  const removeExperience = (id: string) => {
    setFormData((prev) => {
      const next = { ...prev, experience: prev.experience.filter((e) => e.id !== id) };
      setGeneratedContent(next);
      return next;
    });
  };

  const updateExpField = (id: string, field: keyof ResumeExperienceItem, val: any) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((e) => (e.id === id ? { ...e, [field]: val } : e)),
      };
      setGeneratedContent(next);
      return next;
    });
  };

  const addExpBullet = (expId: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((e) =>
          e.id === expId ? { ...e, bullets: [...e.bullets, ""] } : e
        ),
      };
      setGeneratedContent(next);
      return next;
    });
  };

  const updateExpBullet = (expId: string, bIdx: number, val: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((e) => {
          if (e.id !== expId) return e;
          const nextBullets = [...e.bullets];
          nextBullets[bIdx] = val;
          return { ...e, bullets: nextBullets };
        }),
      };
      setGeneratedContent(next);
      return next;
    });
  };

  const removeExpBullet = (expId: string, bIdx: number) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((e) => {
          if (e.id !== expId) return e;
          return { ...e, bullets: e.bullets.filter((_, i) => i !== bIdx) };
        }),
      };
      setGeneratedContent(next);
      return next;
    });
  };

  // Education handlers
  const addEducation = () => {
    const newItem: ResumeEducationItem = {
      id: `edu-${Date.now()}`,
      degree: "",
      institution: "",
      location: "",
      startDate: "",
      endDate: "",
      gpa: "",
    };
    setFormData((prev) => {
      const next = { ...prev, education: [...prev.education, newItem] };
      setGeneratedContent(next);
      return next;
    });
  };

  const removeEducation = (id: string) => {
    setFormData((prev) => {
      const next = { ...prev, education: prev.education.filter((e) => e.id !== id) };
      setGeneratedContent(next);
      return next;
    });
  };

  const updateEduField = (id: string, field: keyof ResumeEducationItem, val: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        education: prev.education.map((e) => (e.id === id ? { ...e, [field]: val } : e)),
      };
      setGeneratedContent(next);
      return next;
    });
  };

  // Skills handlers
  const updateSkills = (val: string) => {
    const arr = val.split(",").map((s) => s.trim()).filter(Boolean);
    setFormData((prev) => {
      const next = { ...prev, skills: arr };
      setGeneratedContent(next);
      return next;
    });
  };

  // Projects handlers
  const addManualProject = () => {
    const newItem: ResumeProjectItem = {
      id: `proj-${Date.now()}`,
      name: "",
      techStack: "",
      bullets: [""],
      source: "manual",
    };
    setFormData((prev) => {
      const next = { ...prev, projects: [...prev.projects, newItem] };
      setGeneratedContent(next);
      return next;
    });
  };

  const removeProject = (id: string) => {
    setFormData((prev) => {
      const next = { ...prev, projects: prev.projects.filter((p) => p.id !== id) };
      setGeneratedContent(next);
      return next;
    });
  };

  const updateProjField = (id: string, field: keyof ResumeProjectItem, val: any) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, [field]: val } : p)),
      };
      setGeneratedContent(next);
      return next;
    });
  };

  const updateProjBullet = (projId: string, bIdx: number, val: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projId) return p;
          const nextBullets = [...p.bullets];
          nextBullets[bIdx] = val;
          return { ...p, bullets: nextBullets };
        }),
      };
      setGeneratedContent(next);
      return next;
    });
  };

  // Auto-fill project from repo handler
  const handleExtractProjectFromRepo = async () => {
    setExtractingRepo(true);
    setRepoError(null);

    try {
      let body: any;
      if (repoMode === "zip") {
        if (!repoFile) throw new Error("Please select a ZIP file.");
        const fd = new FormData();
        fd.append("zip", repoFile);
        body = fd;
      } else {
        if (!githubUrl.trim()) throw new Error("Please enter a GitHub repository URL.");
        body = JSON.stringify({ githubUrl: githubUrl.trim() });
      }

      const res = await apiFetch<{
        projectName: string;
        techStack: string;
        bullets: string[];
      }>("/api/resume/project-from-repo", {
        method: "POST",
        body,
      });

      const newRepoProject: ResumeProjectItem = {
        id: `proj-${Date.now()}`,
        name: res.projectName,
        techStack: res.techStack,
        bullets: res.bullets,
        source: "repo",
      };

      setFormData((prev) => {
        const next = { ...prev, projects: [newRepoProject, ...prev.projects] };
        setGeneratedContent(next);
        return next;
      });

      setShowRepoImport(false);
      setRepoFile(null);
      setGithubUrl("");
    } catch (err: any) {
      setRepoError(err.message || "Failed to extract project from repository.");
    } finally {
      setExtractingRepo(false);
    }
  };

  // Generate Resume (AI Polish)
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await apiFetch<{ generatedContent: ResumeFormData }>("/api/resume/generate", {
        method: "POST",
        body: JSON.stringify({
          templateId,
          sourceMode,
          formData,
          referenceStructureNote: initialToneNote,
        }),
      });

      setGeneratedContent(res.generatedContent);
    } catch (err: any) {
      setError(err.message || "Failed to generate AI resume polish.");
    } finally {
      setGenerating(false);
    }
  };

  // Claim Validation & Bullet Audit (Phase 8)
  const handleAuditClaims = async () => {
    setValidatingClaims(true);
    setError(null);
    try {
      const bulletsToValidate: Array<{ id: string; text: string }> = [];
      if (formData.summary && formData.summary.trim().length > 10) {
        bulletsToValidate.push({ id: "summary", text: formData.summary.trim() });
      }
      formData.experience.forEach((exp) => {
        exp.bullets.forEach((b, idx) => {
          if (b.trim().length > 0) {
            bulletsToValidate.push({ id: `${exp.id}-b-${idx}`, text: b.trim() });
          }
        });
      });
      formData.projects.forEach((proj) => {
        proj.bullets.forEach((b, idx) => {
          if (b.trim().length > 0) {
            bulletsToValidate.push({ id: `${proj.id}-b-${idx}`, text: b.trim() });
          }
        });
      });

      if (bulletsToValidate.length === 0) {
        setError("Please enter at least one bullet point or summary note to audit.");
        return;
      }

      const res = await apiFetch<{ results: BulletClassification[] }>("/api/resume/validate-claims", {
        method: "POST",
        body: JSON.stringify({ bullets: bulletsToValidate.slice(0, 50) }),
      });

      const map: Record<string, BulletClassification> = {};
      if (Array.isArray(res.results)) {
        for (const item of res.results) {
          map[item.id] = item;
        }
      }
      setClaimAuditResults(map);
    } catch (err: any) {
      setError(err.message || "Failed to audit claims. Please verify your AI settings.");
    } finally {
      setValidatingClaims(false);
    }
  };

  // Save Resume
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await apiFetch<{ resume: SavedResumeRecord }>("/api/resume/save", {
        method: "POST",
        body: JSON.stringify({
          id: resumeId,
          templateId,
          sourceMode,
          formData,
          generatedContent,
        }),
      });

      setResumeId(res.resume.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save resume.");
    } finally {
      setSaving(false);
    }
  };

  // Export PDF
  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      // apiFetchBlob attaches the JWT and respects VITE_API_BASE_URL
      const blob = await apiFetchBlob("/api/resume/export-pdf", {
        method: "POST",
        body: JSON.stringify({
          templateId,
          generatedContent,
        }),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${generatedContent.contactInfo?.fullName || "Resume"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  // ATS Validation on Exported PDF
  const [atsReport, setAtsReport] = useState<AtsAuditReport | null>(null);
  const [runningAtsCheck, setRunningAtsCheck] = useState(false);
  const [showAtsModal, setShowAtsModal] = useState(false);

  const handleRunAtsCheck = async () => {
    setShowAtsModal(true);
    setRunningAtsCheck(true);
    setError(null);
    try {
      const report = await apiFetch<AtsAuditReport>("/api/resume/validate-ats", {
        method: "POST",
        body: JSON.stringify({
          templateId,
          generatedContent,
        }),
      });
      setAtsReport(report);
    } catch (err: any) {
      setError(err.message || "Failed to run ATS validation on PDF.");
    } finally {
      setRunningAtsCheck(false);
    }
  };

  // Selected template component renderer
  const TemplateComp =
    templateId === "classic"
      ? ClassicTemplate
      : templateId === "compact"
      ? CompactTemplate
      : ModernTemplate;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Back to Resumes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-white flex items-center gap-2">
              Resume Editor
              <span className="text-[11px] font-medium text-[#818cf8] bg-[#4f6ef7]/15 border border-[#4f6ef7]/30 px-2 py-0.5 rounded-full capitalize">
                {sourceMode.replace("_", " ")}
              </span>
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}

          <button
            onClick={handleAuditClaims}
            disabled={validatingClaims}
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
            title="Audit bullets for action verbs, metric quantification, and verifiability"
          >
            {validatingClaims ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-purple-400" />}
            {validatingClaims ? "Auditing Claims..." : "Audit Claims"}
          </button>

          <button
            onClick={handleRunAtsCheck}
            disabled={runningAtsCheck}
            className="px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            title="Run deterministic ATS Parser & Readability check on the compiled PDF"
          >
            {runningAtsCheck ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-teal-400" />}
            {runningAtsCheck ? "Analyzing PDF..." : "ATS Audit"}
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/20 cursor-pointer"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate AI Polish
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#4f6ef7] hover:bg-[#3b5bf6] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-teal-600/20"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Claim Audit Summary Banner */}
      {Object.keys(claimAuditResults).length > 0 && (
        <div className="mb-4 p-3.5 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-transparent border border-purple-500/30 rounded-2xl flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-semibold text-white">Bullet Claim Audit:</span>
            <span>
              {Object.keys(claimAuditResults).length} items analyzed •{" "}
              <strong className="text-emerald-300">
                {Object.values(claimAuditResults).filter((r) => r.actionVerb === "strong").length} strong verbs
              </strong>{" "}
              •{" "}
              <strong className="text-teal-300">
                {Object.values(claimAuditResults).filter((r) => r.quantified).length} quantified
              </strong>{" "}
              •{" "}
              <strong className="text-amber-300">
                {Object.values(claimAuditResults).filter((r) => r.issues.length > 0).length} need refinement
              </strong>
            </span>
          </div>
          <button
            onClick={() => setClaimAuditResults({})}
            className="text-white/40 hover:text-white text-xs px-2 py-1 rounded bg-white/5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-12 gap-8 items-start flex-1">
        {/* Left Column: Real-time Live Preview */}
        <div className="col-span-6 bg-[#090f1e] border border-white/10 rounded-2xl p-6 sticky top-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">Live Preview</span>
              <span className="flex items-center gap-1 text-[10px] text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-semibold">
                <ShieldCheck className="w-3 h-3" /> Selectable PDF Text
              </span>
            </div>

            {/* Template Switcher Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              {(["classic", "modern", "compact"] as const).map((tId) => (
                <button
                  key={tId}
                  onClick={() => setTemplateId(tId)}
                  className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all cursor-pointer ${
                    templateId === tId
                      ? "bg-[#4f6ef7] text-white shadow-sm"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {tId}
                </button>
              ))}
            </div>
          </div>

          {/* Render Active Template */}
          <div className="overflow-y-auto max-h-[750px] pr-2 custom-scrollbar">
            <TemplateComp data={generatedContent} />
          </div>
        </div>

        {/* Right Column: Form Accordion */}
        <div className="col-span-6 space-y-4">
          {/* Section 1: Contact Info */}
          <div className="bg-[#0d1730] border border-white/8 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("contact")}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-white text-sm bg-white/2 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>Contact Information</span>
              {openSections.contact ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>

            {openSections.contact && (
              <div className="p-5 grid grid-cols-2 gap-4 border-t border-white/6 text-xs">
                <div>
                  <label className="text-white/50 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={formData.contactInfo.fullName}
                    onChange={(e) => updateContact("fullName", e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#4f6ef7] outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/50 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={formData.contactInfo.email}
                    onChange={(e) => updateContact("email", e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#4f6ef7] outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/50 mb-1 block">Phone</label>
                  <input
                    type="text"
                    value={formData.contactInfo.phone}
                    onChange={(e) => updateContact("phone", e.target.value)}
                    placeholder="(555) 019-2834"
                    className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#4f6ef7] outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/50 mb-1 block">Location</label>
                  <input
                    type="text"
                    value={formData.contactInfo.location}
                    onChange={(e) => updateContact("location", e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#4f6ef7] outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/50 mb-1 block">LinkedIn URL</label>
                  <input
                    type="text"
                    value={formData.contactInfo.linkedin}
                    onChange={(e) => updateContact("linkedin", e.target.value)}
                    placeholder="linkedin.com/in/alex"
                    className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#4f6ef7] outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/50 mb-1 block">Portfolio URL</label>
                  <input
                    type="text"
                    value={formData.contactInfo.portfolio}
                    onChange={(e) => updateContact("portfolio", e.target.value)}
                    placeholder="alexmorgan.dev"
                    className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#4f6ef7] outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Summary */}
          <div className="bg-[#0d1730] border border-white/8 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("summary")}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-white text-sm bg-white/2 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>Professional Summary</span>
              {openSections.summary ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>

            {openSections.summary && (
              <div className="p-5 border-t border-white/6 text-xs">
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                  placeholder="Enter raw notes or summary..."
                  className="w-full bg-white/4 border border-white/10 rounded-xl p-3 text-white focus:border-[#4f6ef7] outline-none resize-none leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Section 3: Work Experience */}
          <div className="bg-[#0d1730] border border-white/8 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("experience")}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-white text-sm bg-white/2 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>Work Experience ({formData.experience.length})</span>
              {openSections.experience ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>

            {openSections.experience && (
              <div className="p-5 border-t border-white/6 space-y-6 text-xs">
                {formData.experience.map((exp, expIdx) => (
                  <div key={exp.id} className="p-4 rounded-xl bg-white/2 border border-white/6 relative group">
                    <button
                      onClick={() => removeExperience(exp.id)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      title="Remove Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-white/50 mb-1 block">Job Title</label>
                        <input
                          type="text"
                          value={exp.title}
                          onChange={(e) => updateExpField(exp.id, "title", e.target.value)}
                          placeholder="Software Engineer"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-[#4f6ef7] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 mb-1 block">Company</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExpField(exp.id, "company", e.target.value)}
                          placeholder="Google"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-[#4f6ef7] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 mb-1 block">Start Date</label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => updateExpField(exp.id, "startDate", e.target.value)}
                          placeholder="Jan 2022"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-[#4f6ef7] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 mb-1 block">End Date</label>
                        <input
                          type="text"
                          value={exp.endDate}
                          onChange={(e) => updateExpField(exp.id, "endDate", e.target.value)}
                          placeholder="Present"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-[#4f6ef7] outline-none"
                        />
                      </div>
                    </div>

                    {/* Bullet Points */}
                    <div className="space-y-2 mt-3">
                      <label className="text-white/50 block font-semibold">Bullet Points</label>
                      {exp.bullets.map((bullet, bIdx) => {
                        const audit = claimAuditResults[`${exp.id}-b-${bIdx}`];
                        return (
                          <div key={bIdx} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white/30">•</span>
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) => updateExpBullet(exp.id, bIdx, e.target.value)}
                                placeholder="Describe achievement or responsibility..."
                                className="flex-1 bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-[#4f6ef7] outline-none"
                              />
                              <button
                                onClick={() => removeExpBullet(exp.id, bIdx)}
                                className="text-white/30 hover:text-red-400 p-1 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                            {audit && (
                              <div className="ml-5 p-2 rounded-lg bg-black/40 border border-white/8 text-[11px] space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                    audit.actionVerb === "strong"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : audit.actionVerb === "weak"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  }`}>
                                    {audit.actionVerb} verb
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                    audit.quantified
                                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                      : "bg-neutral-500/20 text-neutral-400 border border-neutral-500/30"
                                  }`}>
                                    {audit.quantified ? "Quantified" : "Unquantified"}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                    audit.verifiable === "verified"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                  }`}>
                                    {audit.verifiable}
                                  </span>
                                </div>
                                {audit.issues.length > 0 && (
                                  <div className="text-amber-300/90 flex items-start gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                                    <span>{audit.issues.join(" • ")}</span>
                                  </div>
                                )}
                                {audit.suggestion && (
                                  <div className="text-white/70 italic flex items-start gap-1">
                                    <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
                                    <span>{audit.suggestion}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        onClick={() => addExpBullet(exp.id)}
                        className="text-xs text-[#818cf8] hover:underline font-semibold flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        + Add Bullet
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addExperience}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/15 hover:border-[#4f6ef7] text-white/70 hover:text-white font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Experience Item
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Projects (with Repo Auto-Fill) */}
          <div className="bg-[#0d1730] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between bg-white/2 border-b border-white/6">
              <button
                onClick={() => toggleSection("projects")}
                className="font-bold text-white text-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Key Projects ({formData.projects.length})</span>
                {openSections.projects ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
              </button>

              <button
                onClick={() => setShowRepoImport(true)}
                className="px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-teal-500/25 cursor-pointer transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" /> Add from ZIP or Repo
              </button>
            </div>

            {openSections.projects && (
              <div className="p-5 space-y-6 text-xs">
                {/* Repo Import Drawer / Form */}
                {showRepoImport && (
                  <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-teal-300 flex items-center gap-2">
                        <FileCode className="w-4 h-4" /> Auto-Fill Project from Repository
                      </h4>
                      <button
                        onClick={() => setShowRepoImport(false)}
                        className="text-white/40 hover:text-white cursor-pointer"
                      >
                        ×
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setRepoMode("zip")}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                          repoMode === "zip" ? "bg-teal-500 text-black" : "bg-white/5 text-white/60"
                        }`}
                      >
                        Upload ZIP Archive
                      </button>
                      <button
                        onClick={() => setRepoMode("github")}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                          repoMode === "github" ? "bg-teal-500 text-black" : "bg-white/5 text-white/60"
                        }`}
                      >
                        GitHub Public URL
                      </button>
                    </div>

                    {repoError && (
                      <p className="text-red-400 text-xs">{repoError}</p>
                    )}

                    {repoMode === "zip" ? (
                      <div>
                        <input
                          type="file"
                          accept=".zip"
                          onChange={(e) => setRepoFile(e.target.files?.[0] || null)}
                          className="w-full text-white/70 text-xs"
                        />
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          placeholder="https://github.com/owner/repository"
                          className="w-full bg-black/40 border border-teal-500/30 rounded-lg px-3 py-2 text-white outline-none"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleExtractProjectFromRepo}
                      disabled={extractingRepo}
                      className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      {extractingRepo ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Codebase...</> : <><Sparkles className="w-4 h-4" /> Extract Project Bullets</>}
                    </button>
                  </div>
                )}

                {formData.projects.map((proj) => (
                  <div key={proj.id} className="p-4 rounded-xl bg-white/2 border border-white/6 relative">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Project Entry</span>
                        {proj.source === "repo" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 border border-teal-500/30 text-teal-300">
                            Auto-filled from Repo (Fact Grounded)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeProject(proj.id)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                        title="Remove Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-white/50 mb-1 block">Project Name</label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => updateProjField(proj.id, "name", e.target.value)}
                          placeholder="InterviewPrep AI"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 mb-1 block">Tech Stack</label>
                        <input
                          type="text"
                          value={proj.techStack}
                          onChange={(e) => updateProjField(proj.id, "techStack", e.target.value)}
                          placeholder="React, Node.js, Express"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-white/50 block font-semibold">Bullets</label>
                      {proj.bullets.map((bullet, bIdx) => {
                        const audit = claimAuditResults[`${proj.id}-b-${bIdx}`];
                        return (
                          <div key={bIdx} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white/30">•</span>
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) => updateProjBullet(proj.id, bIdx, e.target.value)}
                                className="flex-1 bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
                              />
                            </div>
                            {audit && (
                              <div className="ml-5 p-2 rounded-lg bg-black/40 border border-white/8 text-[11px] space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                    audit.actionVerb === "strong"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : audit.actionVerb === "weak"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  }`}>
                                    {audit.actionVerb} verb
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                    audit.quantified
                                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                      : "bg-neutral-500/20 text-neutral-400 border border-neutral-500/30"
                                  }`}>
                                    {audit.quantified ? "Quantified" : "Unquantified"}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                    audit.verifiable === "verified"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                  }`}>
                                    {audit.verifiable}
                                  </span>
                                </div>
                                {audit.issues.length > 0 && (
                                  <div className="text-amber-300/90 flex items-start gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                                    <span>{audit.issues.join(" • ")}</span>
                                  </div>
                                )}
                                {audit.suggestion && (
                                  <div className="text-white/70 italic flex items-start gap-1">
                                    <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
                                    <span>{audit.suggestion}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <button
                  onClick={addManualProject}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/15 hover:border-[#4f6ef7] text-white/70 hover:text-white font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Project Manually
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Education */}
          <div className="bg-[#0d1730] border border-white/8 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("education")}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-white text-sm bg-white/2 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>Education ({formData.education.length})</span>
              {openSections.education ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>

            {openSections.education && (
              <div className="p-5 border-t border-white/6 space-y-4 text-xs">
                {formData.education.map((edu) => (
                  <div key={edu.id} className="p-4 rounded-xl bg-white/2 border border-white/6 relative">
                    <button
                      onClick={() => removeEducation(edu.id)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-300 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white/50 mb-1 block">Degree</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEduField(edu.id, "degree", e.target.value)}
                          placeholder="B.S. Computer Science"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 mb-1 block">Institution</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => updateEduField(edu.id, "institution", e.target.value)}
                          placeholder="UC Berkeley"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 mb-1 block">Dates</label>
                        <input
                          type="text"
                          value={edu.startDate}
                          onChange={(e) => updateEduField(edu.id, "startDate", e.target.value)}
                          placeholder="2018 - 2022"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white/50 mb-1 block">GPA (Optional)</label>
                        <input
                          type="text"
                          value={edu.gpa || ""}
                          onChange={(e) => updateEduField(edu.id, "gpa", e.target.value)}
                          placeholder="3.8"
                          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-1.5 text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addEducation}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/15 hover:border-[#4f6ef7] text-white/70 hover:text-white font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Education Item
                </button>
              </div>
            )}
          </div>

          {/* Section 6: Skills */}
          <div className="bg-[#0d1730] border border-white/8 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("skills")}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-white text-sm bg-white/2 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>Technical Skills</span>
              {openSections.skills ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>

            {openSections.skills && (
              <div className="p-5 border-t border-white/6 text-xs">
                <label className="text-white/50 mb-1 block">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills.join(", ")}
                  onChange={(e) => updateSkills(e.target.value)}
                  placeholder="React, TypeScript, Node.js, PostgreSQL, Docker, AWS"
                  className="w-full bg-white/4 border border-white/10 rounded-xl p-3 text-white outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ATS Readability & Parser Audit Modal */}
      {showAtsModal && (
        <AtsAuditModal
          report={atsReport}
          loading={runningAtsCheck}
          onClose={() => setShowAtsModal(false)}
          onExport={handleDownloadPdf}
        />
      )}
    </div>
  );
}
