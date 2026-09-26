import React, { useState, useEffect } from "react";
import { apiFetch, apiFetchBlob } from "../../../lib/api";
import { FileText, Plus, Upload, Download, Copy, Trash2, Edit3, Loader2, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import type { ResumeFormData } from "../../../types/resume";

export interface SavedResumeRecord {
  id: string;
  template_id: string;
  source_mode: string;
  form_data: ResumeFormData;
  generated_content: ResumeFormData;
  created_at: string;
  updated_at: string;
}

export function ResumeHomeScreen({
  navigate,
  onSelectResume,
  onStartScratch,
  onStartUpload,
}: {
  navigate: (s: string) => void;
  onSelectResume: (resume: SavedResumeRecord) => void;
  onStartScratch: () => void;
  onStartUpload: () => void;
}) {
  const [resumes, setResumes] = useState<SavedResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadResumes = async () => {
    try {
      const data = await apiFetch<{ resumes: SavedResumeRecord[] }>("/api/resume/list");
      setResumes(data.resumes ?? []);
    } catch (err) {
      console.error("[resume/list]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;
    try {
      await apiFetch(`/api/resume/${id}`, { method: "DELETE" });
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Failed to delete resume.");
    }
  };

  const handleDownload = async (resume: SavedResumeRecord) => {
    setDownloadingId(resume.id);
    try {
      // apiFetchBlob attaches the JWT and respects VITE_API_BASE_URL
      const blob = await apiFetchBlob("/api/resume/export-pdf", {
        method: "POST",
        body: JSON.stringify({
          templateId: resume.template_id,
          generatedContent: resume.generated_content,
        }),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume.generated_content.contactInfo?.fullName || "Resume"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDuplicate = async (resume: SavedResumeRecord) => {
    try {
      const data = await apiFetch<{ resume: SavedResumeRecord }>("/api/resume/save", {
        method: "POST",
        body: JSON.stringify({
          templateId: resume.template_id,
          sourceMode: resume.source_mode,
          formData: resume.form_data,
          generatedContent: resume.generated_content,
        }),
      });
      setResumes((prev) => [data.resume, ...prev]);
    } catch (err) {
      alert("Failed to duplicate resume.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">ATS Resume Builder</h1>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% ATS Compatible
          </span>
        </div>
        <p className="text-white/40 text-sm">
          Create single-column, parseable resumes that pass Applicant Tracking Systems with high scores.
        </p>
      </div>

      {/* Two build paths */}
      <div className="grid grid-cols-2 gap-6 mb-12">
        {/* Path 1: Match reference */}
        <button
          onClick={onStartUpload}
          className="p-8 rounded-2xl border-2 border-white/8 bg-[#0d1730] hover:border-[#4f6ef7] hover:bg-[#4f6ef7]/5 transition-all text-left group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6 text-violet-400" />
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-xl mb-2">
            Match my reference resume
          </h3>
          <p className="text-sm text-white/40 leading-relaxed mb-4">
            Upload an existing draft or sample PDF. We'll extract its structure, tone, and data, then render it cleanly into an ATS-safe template.
          </p>
          <span className="text-xs text-[#818cf8] font-semibold flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
            Upload Reference PDF →
          </span>
        </button>

        {/* Path 2: Start from template */}
        <button
          onClick={onStartScratch}
          className="p-8 rounded-2xl border-2 border-white/8 bg-[#0d1730] hover:border-[#2dd4bf] hover:bg-[#2dd4bf]/5 transition-all text-left group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6 text-[#2dd4bf]" />
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-xl mb-2">
            Start from a template
          </h3>
          <p className="text-sm text-white/40 leading-relaxed mb-4">
            Pick from 3 pre-vetted ATS templates (Classic, Modern Clean, Compact). Fill raw notes and let AI write polished action-verb bullets.
          </p>
          <span className="text-xs text-teal-300 font-semibold flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
            Browse ATS Templates →
          </span>
        </button>
      </div>

      {/* Saved Resumes List */}
      <div>
        <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-white mb-4">My Saved Resumes</h2>
        {loading ? (
          <div className="flex items-center gap-3 py-8 justify-center text-white/40 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-[#4f6ef7]" />
            Loading saved resumes...
          </div>
        ) : resumes.length === 0 ? (
          <div className="p-8 bg-white/2 border border-white/6 rounded-2xl text-center text-white/40 text-sm">
            No saved resumes yet. Choose a path above to build your first resume!
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {resumes.map((r) => {
              const name = r.generated_content?.contactInfo?.fullName || "Untitled Resume";
              const updated = new Date(r.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div key={r.id} className="p-5 rounded-2xl bg-[#0d1730] border border-white/8 hover:border-white/15 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-white/5 border border-white/10 text-white/60">
                        {r.template_id}
                      </span>
                      <span className="text-[11px] text-white/35 font-['JetBrains_Mono']">{updated}</span>
                    </div>
                    <h4 className="text-white font-bold text-base leading-snug mb-1 truncate">{name}</h4>
                    <p className="text-xs text-white/40 mb-4 capitalize">
                      Source: {r.source_mode.replace("_", " ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/6">
                    <button
                      onClick={() => onSelectResume(r)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#4f6ef7]/15 hover:bg-[#4f6ef7]/25 text-[#818cf8] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDownload(r)}
                      disabled={downloadingId === r.id}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                      title="Download PDF"
                    >
                      {downloadingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDuplicate(r)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
