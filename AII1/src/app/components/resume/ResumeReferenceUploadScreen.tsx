import React, { useState, useRef } from "react";
import { apiFetch } from "../../../lib/api";
import { Upload, FileText, Loader2, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import type { ResumeFormData } from "../../../types/resume";

export function ResumeReferenceUploadScreen({
  onProceed,
  onCancel,
}: {
  onProceed: (data: { prefillData: ResumeFormData; toneNote: string }) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    detectedSections: string[];
    toneNote: string;
    prefillData: ResumeFormData;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (f: File) => {
    if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
      setFile(f);
      setError(null);
      setResult(null);
    } else {
      setError("Please select a valid text-based PDF file.");
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("pdf", file);

      const data = await apiFetch<{
        detectedSections: string[];
        toneNote: string;
        prefillData: ResumeFormData;
      }>("/api/resume/extract-reference", {
        method: "POST",
        body: fd,
      });

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to extract reference resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white mb-1">
          Match My Reference Resume
        </h1>
        <p className="text-white/40 text-sm">
          Upload an existing resume draft. We will extract its content structure, section order, and tone, then map it into an ATS-friendly template.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Scope Clarification Banner */}
      <div className="mb-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold block mb-0.5">ATS Layout Standard Notice:</span>
          We extract your reference resume's <strong>content structure and tone</strong> — never raw visual styling (multi-column tables, custom fonts, or graphics), because those break ATS parsers. Your output will render in a 100% ATS-compliant single-column template.
        </div>
      </div>

      {/* Upload Widget */}
      {!result && (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            dragging ? "border-[#4f6ef7] bg-[#4f6ef7]/5" : "border-white/10 bg-white/2"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFileSelect(f);
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-[#818cf8]" />
          </div>
          {file ? (
            <>
              <p className="text-white font-semibold mb-1">{file.name}</p>
              <p className="text-white/35 text-sm mb-5">{(file.size / 1024).toFixed(0)} KB · PDF selected</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-[#4f6ef7] hover:bg-[#3b5bf6] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-[#4f6ef7]/20"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Structure...</> : <><Sparkles className="w-4 h-4" /> Extract Content Structure</>}
                </button>
                <button
                  onClick={() => setFile(null)}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-semibold cursor-pointer transition-colors"
                >
                  Change PDF
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-white font-semibold mb-1">Drop your reference resume PDF here</p>
              <p className="text-white/35 text-sm mb-5">or click to browse files</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold cursor-pointer transition-colors"
              >
                Browse PDF Files
              </button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
        </div>
      )}

      {/* Analysis Result Card */}
      {result && (
        <div className="bg-[#0d1730] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            <h3 className="text-lg font-bold text-white">Reference Content Extracted Successfully!</h3>
          </div>

          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Detected Tone &amp; Style</p>
            <div className="p-4 rounded-xl bg-white/3 border border-white/8 text-sm text-white/80 leading-relaxed">
              "{result.toneNote}"
            </div>
          </div>

          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Detected Sections</p>
            <div className="flex flex-wrap gap-2">
              {result.detectedSections.map((sec, i) => (
                <span key={i} className="px-3 py-1 rounded-lg text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                  ✓ {sec}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/8 flex justify-between items-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => onProceed({ prefillData: result.prefillData, toneNote: result.toneNote })}
              className="px-6 py-2.5 rounded-xl bg-[#4f6ef7] hover:bg-[#3b5bf6] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-[#4f6ef7]/20"
            >
              Proceed to Editor <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
