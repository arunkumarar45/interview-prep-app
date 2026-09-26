import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  FileText,
  User,
  Mail,
  Phone,
  Linkedin,
  Layers,
  Sparkles,
  X
} from "lucide-react";
import type { AtsAuditReport } from "../../../types/resume";

export function AtsAuditModal({
  report,
  loading,
  onClose,
  onExport,
}: {
  report: AtsAuditReport | null;
  loading: boolean;
  onClose: () => void;
  onExport: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1329] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#070d1e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">ATS Readability &amp; Parser Audit</h2>
              <p className="text-xs text-white/40">Verified against compiled multi-page PDF text streams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-white font-medium text-sm">Compiling PDF &amp; Running ATS Parser...</p>
              <p className="text-xs text-white/40">Extracting text streams, testing contact cards, and verifying reading order hierarchy.</p>
            </div>
          ) : !report ? (
            <div className="py-12 text-center text-white/40 text-sm">
              No audit report generated.
            </div>
          ) : (
            <>
              {/* Score Banner */}
              <div className={`p-6 rounded-2xl border flex items-center gap-6 ${
                report.status === "PASS"
                  ? "bg-teal-500/10 border-teal-500/25"
                  : report.status === "WARNING"
                  ? "bg-amber-500/10 border-amber-500/25"
                  : "bg-red-500/10 border-red-500/25"
              }`}>
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                    <circle
                      cx="40" cy="40" r="32" fill="none"
                      stroke={report.status === "PASS" ? "#2dd4bf" : report.status === "WARNING" ? "#f59e0b" : "#f87171"}
                      strokeWidth="7"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - report.overallScore / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold font-['JetBrains_Mono'] text-white">
                      {report.overallScore}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                      report.status === "PASS"
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                        : report.status === "WARNING"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}>
                      {report.status === "PASS" ? "ATS Verified: PASS" : report.status === "WARNING" ? "ATS Status: WARNING" : "ATS Status: NEEDS REVISION"}
                    </span>
                    <span className="text-xs text-white/40 font-['JetBrains_Mono']">{report.pageCount} page(s) · {report.extractedTextLength} chars</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{report.summary}</p>
                </div>
              </div>

              {/* Detected Contact Card */}
              <div className="bg-white/3 border border-white/7 rounded-xl p-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Extracted Contact Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-white/3 p-2.5 rounded-lg border border-white/5">
                    <User className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-white/30">Name</p>
                      <p className={`truncate font-medium ${report.detectedContact.name.found ? "text-white" : "text-red-400"}`}>
                        {report.detectedContact.name.value || "Not found"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/3 p-2.5 rounded-lg border border-white/5">
                    <Mail className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-white/30">Email</p>
                      <p className={`truncate font-medium ${report.detectedContact.email.found ? "text-white" : "text-red-400"}`}>
                        {report.detectedContact.email.value || "Not found"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/3 p-2.5 rounded-lg border border-white/5">
                    <Phone className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-white/30">Phone</p>
                      <p className={`truncate font-medium ${report.detectedContact.phone.found ? "text-white" : "text-amber-400"}`}>
                        {report.detectedContact.phone.value || "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/3 p-2.5 rounded-lg border border-white/5">
                    <Linkedin className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-white/30">LinkedIn</p>
                      <p className={`truncate font-medium ${report.detectedContact.linkedin.found ? "text-white" : "text-white/40"}`}>
                        {report.detectedContact.linkedin.value ? "Detected" : "Optional"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sections Checklist */}
              <div className="bg-white/3 border border-white/7 rounded-xl p-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Recognized Standard Section Headers</h3>
                <div className="flex flex-wrap gap-2">
                  {report.detectedSections.map((sec, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                        sec.status === "found"
                          ? "bg-teal-500/15 border-teal-500/25 text-teal-300"
                          : sec.status === "missing"
                          ? "bg-red-500/15 border-red-500/25 text-red-300"
                          : "bg-white/5 border-white/10 text-white/40"
                      }`}
                    >
                      {sec.status === "found" ? (
                        <CheckCircle2 className="w-3 h-3 text-teal-400" />
                      ) : sec.status === "missing" ? (
                        <XCircle className="w-3 h-3 text-red-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      )}
                      {sec.name} {sec.status === "missing" && "(Missing)"}
                    </span>
                  ))}
                </div>
              </div>

              {/* Detailed Itemized Checks */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Itemized ATS Parser Checks</h3>
                <div className="space-y-2.5">
                  {report.checks.map((chk, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                        chk.status === "PASS"
                          ? "bg-white/2 border-white/6 text-white/80"
                          : chk.status === "WARNING"
                          ? "bg-amber-500/5 border-amber-500/20 text-white/90"
                          : "bg-red-500/5 border-red-500/20 text-white/90"
                      }`}
                    >
                      {chk.status === "PASS" ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      ) : chk.status === "WARNING" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white">{chk.title}</span>
                          <span className="text-[10px] text-white/40 font-['JetBrains_Mono'] uppercase tracking-wider">{chk.category}</span>
                        </div>
                        <p className="text-white/60 leading-relaxed">{chk.details}</p>
                        {chk.recommendation && (
                          <div className="mt-1.5 text-amber-300/90 text-[11px] flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Recommendation: {chk.recommendation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 bg-[#070d1e] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold cursor-pointer transition-all"
          >
            Close Report
          </button>
          <button
            onClick={() => {
              onClose();
              onExport();
            }}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer transition-all"
          >
            <ShieldCheck className="w-4 h-4" /> Download ATS Verified PDF
          </button>
        </div>
      </div>
    </div>
  );
}
