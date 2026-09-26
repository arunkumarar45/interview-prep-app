import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Code2,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  RefreshCw,
  Send,
  Mic2,
  FileText,
  Loader2,
  Eye,
  EyeOff,
  Layers,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { apiFetch } from "../../../lib/api";

export interface ProjectQuestionPracticeContext {
  question: string;
  difficulty: "easy" | "medium" | "hard";
  competency: string;
  expectedAnswer: string[];
  sourceEvidence: Array<{
    file: string;
    snippet: string;
  }>;
  projectName?: string;
  projectSummary?: string;
  projectStack?: string[];
}

export function ProjectQuestionPracticeScreen({
  context,
  onBack,
}: {
  context: ProjectQuestionPracticeContext;
  onBack: () => void;
}) {
  const [activeQuestion, setActiveQuestion] = useState(context.question);
  const [userAnswer, setUserAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    overallScore: number;
    dimensions: { correctness: number; completeness: number; depth: number; clarity: number };
    coveredPoints: string[];
    missingPoints: string[];
    unsupportedClaims: string[];
    feedback: string[];
    modelAnswer: string;
    followUpQuestion: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceSupported(false);
      return;
    }
    const r = new SpeechRecognitionCtor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onresult = (event: any) => {
      let finalStr = "";
      for (let i = 0; i < event.results.length; i++) {
        finalStr += event.results[i][0].transcript + " ";
      }
      if (finalStr.trim()) {
        setUserAnswer(finalStr.trim());
      }
    };

    r.onerror = () => {
      setRecording(false);
    };

    r.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {}
    };
  }, []);

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
      } catch {
        setError("Could not access microphone.");
      }
    }
  };

  const handleEvaluate = async () => {
    const answer = userAnswer.trim();
    if (!answer) {
      setError("Please provide an answer before submitting.");
      return;
    }
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/project/evaluate-question", {
        method: "POST",
        body: JSON.stringify({
          question: activeQuestion,
          userAnswer: answer,
          expectedAnswer: context.expectedAnswer,
          sourceEvidence: context.sourceEvidence,
          competency: context.competency,
          difficulty: context.difficulty,
          projectSummary: context.projectSummary || "",
          projectStack: context.projectStack || [],
        }),
      });
      setEvaluation(res);
    } catch (err: any) {
      setError(err.message || "Failed to evaluate answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setUserAnswer("");
    setEvaluation(null);
    setError(null);
  };

  const handlePracticeFollowUp = (followUp: string) => {
    setActiveQuestion(followUp);
    setUserAnswer("");
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
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 font-medium">
            Project Practice
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 capitalize font-medium">
            {context.difficulty}
          </span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-[#0d1730] border border-white/10 rounded-2xl p-6 mb-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-['JetBrains_Mono'] text-white/40 uppercase tracking-wider">
            Competency: <span className="text-[#818cf8]">{context.competency}</span>
          </span>
        </div>

        <h1 className="text-white text-xl font-bold font-['Plus_Jakarta_Sans'] leading-snug">
          {activeQuestion}
        </h1>

        {/* Source Evidence Section (Ground Truth from repo) */}
        {context.sourceEvidence && context.sourceEvidence.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/8">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/50 mb-2">
              <FileCode className="w-4 h-4 text-teal-400" />
              <span>Ground Truth Source Evidence (from your repository):</span>
            </div>
            <div className="space-y-2">
              {context.sourceEvidence.map((ev, idx) => (
                <div key={idx} className="bg-black/40 border border-white/8 rounded-xl p-3 text-xs font-['JetBrains_Mono']">
                  <p className="text-teal-300 text-[11px] mb-1 font-bold">📄 {ev.file}</p>
                  <p className="text-white/70 italic text-[11px] bg-white/3 p-2 rounded border border-white/5 whitespace-pre-wrap">
                    "{ev.snippet}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What a strong answer should cover */}
        {context.expectedAnswer && context.expectedAnswer.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowModelAnswer(!showModelAnswer)}
              className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {showModelAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showModelAnswer ? "Hide key concepts hint" : "Show what a strong answer should cover"}</span>
            </button>
            {showModelAnswer && (
              <div className="mt-2.5 p-3.5 bg-white/3 border border-white/6 rounded-xl text-xs space-y-1.5">
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">Key concepts to mention:</p>
                {context.expectedAnswer.map((point, idx) => (
                  <p key={idx} className="text-white/70 flex items-start gap-1.5">
                    <span className="text-[#818cf8]">•</span> {point}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer Input Area */}
      <div className="bg-[#0d1730] border border-white/10 rounded-2xl p-6 mb-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white uppercase tracking-wider">
            Your Answer
          </label>
          {voiceSupported && (
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                recording
                  ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                  : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" /> {recording ? "Listening... (Click to stop)" : "Speak answer"}
            </button>
          )}
        </div>

        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Explain your technical implementation, trade-offs, and personal contribution..."
          rows={5}
          disabled={submitting}
          className="w-full bg-white/4 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#4f6ef7]/50 leading-relaxed placeholder:text-white/30"
        />

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-white/40">
            Explain in clear, first-person spoken English. Avoid claiming unverified technologies.
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
              disabled={submitting || !userAnswer.trim()}
              className="px-5 py-2 rounded-xl bg-[#4f6ef7] hover:bg-[#3b5bf6] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-[#4f6ef7]/20 disabled:opacity-50 cursor-pointer transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Evaluating..." : "Evaluate Answer"}
            </button>
          </div>
        </div>
      </div>

      {/* AI Evaluation Report */}
      {evaluation && (
        <div className="bg-[#0d1730] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/8">
            <div>
              <h2 className="text-white font-bold text-base">AI Evaluation &amp; Feedback</h2>
              <p className="text-xs text-white/40">Evaluated against repository ground truth</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold font-['JetBrains_Mono'] ${
                evaluation.overallScore >= 80 ? "text-[#2dd4bf]" : evaluation.overallScore >= 60 ? "text-amber-400" : "text-red-400"
              }`}>
                {evaluation.overallScore}%
              </span>
            </div>
          </div>

          {/* Dimension Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Correctness</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.correctness}%
              </p>
            </div>
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Completeness</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.completeness}%
              </p>
            </div>
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Technical Depth</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.depth}%
              </p>
            </div>
            <div className="bg-white/3 border border-white/6 p-3 rounded-xl">
              <p className="text-white/40 text-[10px] uppercase font-bold">Clarity</p>
              <p className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1">
                {evaluation.dimensions.clarity}%
              </p>
            </div>
          </div>

          {/* Unsupported Claims Warning (Section 5, 8) */}
          {evaluation.unsupportedClaims && evaluation.unsupportedClaims.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1.5 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4" />
                <span>Unsupported Claims Detected:</span>
              </div>
              <p className="text-[11px] text-white/60">
                The following statements could not be verified from the project repository code:
              </p>
              {evaluation.unsupportedClaims.map((claim, idx) => (
                <p key={idx} className="text-amber-300 flex items-start gap-1">
                  <span>•</span> {claim}
                </p>
              ))}
            </div>
          )}

          {/* Points Covered vs Missing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {evaluation.coveredPoints.length > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl space-y-2">
                <p className="font-bold text-green-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Covered Well:
                </p>
                {evaluation.coveredPoints.map((pt, idx) => (
                  <p key={idx} className="text-white/80">• {pt}</p>
                ))}
              </div>
            )}
            {evaluation.missingPoints.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-2">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Missing Key Details:
                </p>
                {evaluation.missingPoints.map((pt, idx) => (
                  <p key={idx} className="text-white/80">• {pt}</p>
                ))}
              </div>
            )}
          </div>

          {/* Feedback Points */}
          {evaluation.feedback && evaluation.feedback.length > 0 && (
            <div className="bg-white/3 border border-white/6 p-4 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-[#818cf8]" /> Coaching Feedback:
              </p>
              {evaluation.feedback.map((fb, idx) => (
                <p key={idx} className="text-white/75">• {fb}</p>
              ))}
            </div>
          )}

          {/* Model Answer */}
          {evaluation.modelAnswer && (
            <div className="bg-[#4f6ef7]/8 border border-[#4f6ef7]/20 p-4 rounded-xl space-y-1.5 text-xs">
              <p className="font-bold text-[#818cf8] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Grounded Model Answer:
              </p>
              <p className="text-white/80 leading-relaxed italic">{evaluation.modelAnswer}</p>
            </div>
          )}

          {/* Follow-Up Question Drill */}
          {evaluation.followUpQuestion && (
            <div className="pt-2 flex items-center justify-between border-t border-white/8">
              <div>
                <p className="text-[10px] text-white/40 uppercase font-bold">Follow-Up Question</p>
                <p className="text-xs text-white/90 font-medium mt-0.5">{evaluation.followUpQuestion}</p>
              </div>
              <button
                onClick={() => handlePracticeFollowUp(evaluation.followUpQuestion)}
                className="px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                Practice Follow-Up <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
