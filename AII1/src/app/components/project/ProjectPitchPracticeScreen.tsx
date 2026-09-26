import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  Mic2,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ChevronRight
} from "lucide-react";
import { apiFetch } from "../../../lib/api";

export interface ProjectPitchPracticeContext {
  pitch: string;
  projectSummary: string;
  projectStack: string[];
  projectName?: string;
}

export function ProjectPitchPracticeScreen({
  context,
  onBack,
}: {
  context: ProjectPitchPracticeContext;
  onBack: () => void;
}) {
  const [duration, setDuration] = useState<"30s" | "60s" | "2min">("2min");
  const [showScript, setShowScript] = useState(false);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<{
    overallScore: number;
    dimensions: { structure: number; clarity: number; simplicity: number; technicalCorrectness: number; ownership: number };
    whatWasGood: string[];
    whatWasUnclear: string[];
    whatWasTooComplex: string[];
    whatWasMissing: string[];
    unsupportedClaims: string[];
    improvedAnswer: string;
    dynamicFollowUps: string[];
  } | null>(null);

  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const r = new SpeechRecognitionCtor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onresult = (event: any) => {
      let str = "";
      for (let i = 0; i < event.results.length; i++) {
        str += event.results[i][0].transcript + " ";
      }
      if (str.trim()) {
        setCandidateAnswer(str.trim());
      }
    };

    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);

    recognitionRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {}
    };
  }, []);

  // Timer interval
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setRecording(true);
        setTimer(0);
      } catch {
        setError("Could not access microphone.");
      }
    }
  };

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleEvaluate = async () => {
    const answer = candidateAnswer.trim();
    if (!answer) {
      setError("Please provide your project explanation before submitting.");
      return;
    }
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/project/evaluate-pitch", {
        method: "POST",
        body: JSON.stringify({
          pitchDuration: duration,
          pitchScript: context.pitch,
          candidateAnswer: answer,
          projectSummary: context.projectSummary,
          projectStack: context.projectStack,
        }),
      });
      setEvaluation(res);
    } catch (err: any) {
      setError(err.message || "Failed to evaluate pitch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setCandidateAnswer("");
    setTimer(0);
    setEvaluation(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Analysis
        </button>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/25 text-teal-300 font-medium">
          Project Pitch Coaching
        </span>
      </div>

      {/* Header & Target Duration Selector */}
      <div className="bg-[#0d1730] border border-white/10 rounded-2xl p-6 mb-6 shadow-xl space-y-4">
        <div>
          <h1 className="text-white text-2xl font-bold font-['Plus_Jakarta_Sans']">
            Practice Your Project Pitch
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Interviewer Question: <span className="text-white font-semibold italic">"Tell me about your project."</span>
          </p>
        </div>

        {/* Pitch Duration Targets */}
        <div>
          <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-2">
            Target Pitch Length
          </label>
          <div className="flex gap-2.5">
            {[
              { id: "30s", label: "30 Seconds", desc: "Elevator hook (Problem + Tech + Impact)" },
              { id: "60s", label: "60 Seconds", desc: "Standard screen (Stack + Architecture + Role)" },
              { id: "2min", label: "2 Minutes", desc: "Deep dive (Challenges + Decisions + Results)" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDuration(opt.id as any)}
                className={`flex-1 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  duration === opt.id
                    ? "bg-[#4f6ef7]/15 border-[#4f6ef7] text-white"
                    : "bg-white/2 border-white/6 text-white/50 hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{opt.label}</span>
                  <Clock className="w-3.5 h-3.5 text-white/30" />
                </div>
                <p className="text-[10px] text-white/40 line-clamp-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Reference Pitch Accordion */}
        <div className="pt-2 border-t border-white/6">
          <button
            onClick={() => setShowScript(!showScript)}
            className="flex items-center justify-between w-full text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-[#818cf8]" />
              {showScript ? "Hide Reference Script" : "Show AI-Generated Pitch Script"}
            </span>
            {showScript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showScript && (
            <div className="mt-3 p-4 bg-black/40 border border-white/8 rounded-xl text-xs text-white/70 leading-relaxed whitespace-pre-wrap font-sans">
              {context.pitch}
            </div>
          )}
        </div>
      </div>

      {/* Answer Recording & Input Area */}
      <div className="bg-[#0d1730] border border-white/10 rounded-2xl p-6 mb-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-white uppercase tracking-wider">
              Your Spoken Explanation
            </label>
            {recording && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-['JetBrains_Mono'] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                {formatTimer(timer)}
              </span>
            )}
          </div>
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              recording
                ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                : "bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30"
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            {recording ? "Stop Recording" : "Record Pitch"}
          </button>
        </div>

        <textarea
          value={candidateAnswer}
          onChange={(e) => setCandidateAnswer(e.target.value)}
          placeholder='Start with: "I built this project to solve..." Use simple spoken English and highlight your personal contribution.'
          rows={6}
          disabled={submitting}
          className="w-full bg-white/4 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-teal-500/50 leading-relaxed placeholder:text-white/30"
        />

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-white/40">
            Rules: Simple spoken English, short sentences, clear personal contribution, no marketing buzzwords.
          </p>
          <div className="flex gap-2">
            {evaluation && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            )}
            <button
              onClick={handleEvaluate}
              disabled={submitting || !candidateAnswer.trim()}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/20 disabled:opacity-50 cursor-pointer transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Analyzing Pitch..." : "Evaluate Pitch"}
            </button>
          </div>
        </div>
      </div>

      {/* Evaluation Results */}
      {evaluation && (
        <div className="bg-[#0d1730] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/8">
            <div>
              <h2 className="text-white font-bold text-base">Pitch Coaching Breakdown</h2>
              <p className="text-xs text-white/40">Analyzed for structure, clarity, simplicity, and ownership</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold font-['JetBrains_Mono'] ${
                evaluation.overallScore >= 80 ? "text-[#2dd4bf]" : evaluation.overallScore >= 60 ? "text-amber-400" : "text-red-400"
              }`}>
                {evaluation.overallScore}%
              </span>
            </div>
          </div>

          {/* Dimension Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Structure</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.structure}%
              </p>
            </div>
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Clarity</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.clarity}%
              </p>
            </div>
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Simplicity</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.simplicity}%
              </p>
            </div>
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Tech Accuracy</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.technicalCorrectness}%
              </p>
            </div>
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Ownership</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.ownership}%
              </p>
            </div>
          </div>

          {/* Unsupported Claims Flag */}
          {evaluation.unsupportedClaims && evaluation.unsupportedClaims.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4" />
                <span>Unsupported Claims Flagged:</span>
              </div>
              {evaluation.unsupportedClaims.map((claim, idx) => (
                <p key={idx} className="text-amber-300">• {claim}</p>
              ))}
            </div>
          )}

          {/* Feedback Columns: What Was Good vs What Was Unclear / Missing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {evaluation.whatWasGood.length > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl space-y-1.5">
                <p className="font-bold text-green-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> What Was Good:
                </p>
                {evaluation.whatWasGood.map((item, idx) => (
                  <p key={idx} className="text-white/80">• {item}</p>
                ))}
              </div>
            )}
            {evaluation.whatWasMissing.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-1.5">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> What Was Missing:
                </p>
                {evaluation.whatWasMissing.map((item, idx) => (
                  <p key={idx} className="text-white/80">• {item}</p>
                ))}
              </div>
            )}
          </div>

          {/* Improved Spoken Answer (Section 9 & 10) */}
          {evaluation.improvedAnswer && (
            <div className="bg-teal-500/8 border border-teal-500/20 p-5 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-teal-300 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-teal-400" />
                Polished Spoken Answer (Simple English):
              </p>
              <p className="text-white/85 leading-relaxed text-sm italic whitespace-pre-wrap">
                "{evaluation.improvedAnswer}"
              </p>
            </div>
          )}

          {/* Dynamic Follow-Ups Drill */}
          {evaluation.dynamicFollowUps && evaluation.dynamicFollowUps.length > 0 && (
            <div className="bg-white/3 border border-white/6 p-5 rounded-xl space-y-3 text-xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-[#818cf8]" />
                Likely Technical Follow-Ups to Prepare For:
              </p>
              <div className="space-y-2">
                {evaluation.dynamicFollowUps.map((q, idx) => (
                  <div key={idx} className="p-3 bg-black/30 border border-white/5 rounded-lg flex items-center justify-between gap-3">
                    <span className="text-white/85 font-medium">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
