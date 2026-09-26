import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard, BookOpen, Mic2, Code2, Clock, TrendingUp,
  LogOut, Settings, Github, FileText, ChevronDown, Award,
  Brain, MessageSquare, RefreshCw, AlertCircle, Star,
  GraduationCap, Sparkles, Check, X, Volume2, VolumeX,
  Activity, Headphones, Loader2, Link2, ChevronUp, ChevronRight,
  ArrowRight, Upload, Play, BarChart3, CheckCircle2, XCircle,
  Zap, Target, UserCircle2, Menu, Shield, Users, Eye, EyeOff,
  Flame, Plus, Minus, MoreHorizontal, Hash, Layers, HelpCircle
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

import { ResumeHomeScreen } from "./components/resume/ResumeHomeScreen";
import { ResumeReferenceUploadScreen } from "./components/resume/ResumeReferenceUploadScreen";
import { ResumeTemplateGalleryScreen } from "./components/resume/ResumeTemplateGalleryScreen";
import { ResumeEditorScreen } from "./components/resume/ResumeEditorScreen";
import type { SavedResumeRecord } from "./components/resume/ResumeHomeScreen";
import type { ResumeFormData } from "../types/resume";
import { AiProviderSettings } from "./components/settings/AiProviderSettings";
import { CandidateIntelligence } from "./components/candidate/CandidateIntelligence";
import { MisconceptionPanel } from "./components/candidate/MisconceptionPanel";
import { useCandidateIntelligence } from "./components/candidate/useCandidateIntelligence";
import {
  ProjectQuestionPracticeScreen,
  ProjectQuestionPracticeContext,
} from "./components/project/ProjectQuestionPracticeScreen";
import {
  ProjectPitchPracticeScreen,
  ProjectPitchPracticeContext,
} from "./components/project/ProjectPitchPracticeScreen";
import { HelpScreen } from "./components/help/HelpScreen";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { ResetPasswordScreen } from "./components/auth/ResetPasswordScreen";
import { calculateQuizScore } from "../lib/scoring";
import {
  TOPIC_REGISTRY,
  TopicCategory,
  TopicDefinition,
  getTopicsByCategory,
} from "../lib/topicRegistry";

// ─── API Types ────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: number;
  topic: string;
  question: string;
  type: "mcq" | "text";
  options?: string[];
  correct: number;       // 0-based for mcq; -1 for text (AI-graded)
  explanation: string;
}

export interface EvaluationResult {
  technicalScore: number;
  communicationScore: number;
  feedback: string[];
  fillerWords: Array<{ word: string; count: number }>;
}

export interface TranscriptEntry extends EvaluationResult {
  question: string;
  answer: string;
}

export interface ProjectAnalysis {
  summary: string;
  stack: string[];
  pitch: string;
  interviewQuestions: string[];
  knowledgeModel?: {
    languages?: string[];
    frameworks?: string[];
    hasTests?: boolean;
    hasCICD?: boolean;
    hasDocker?: boolean;
    primaryPattern?: string;
    apiEndpoints?: string[];
    databaseTables?: string[];
  };
  questionsWithEvidence?: Array<{
    question: string;
    difficulty: "easy" | "medium" | "hard";
    competency: string;
    expectedAnswer: string[];
    sourceEvidence: Array<{
      file: string;
      snippet: string;
    }>;
  }>;
}

// ─── Screen type ─────────────────────────────────────────────────────────────

type Screen =
  | "landing" | "auth" | "dashboard"
  | "quiz-select" | "quiz-progress" | "quiz-results"
  | "interview-setup" | "interview-live" | "interview-feedback" | "interview-summary"
  | "project-upload" | "project-results" | "project-question-practice" | "project-pitch-practice"
  | "history" | "profile" | "settings"
  | "resume-home" | "resume-upload" | "resume-gallery" | "resume-editor"
  | "help" | "reset-password";


// ─── Constants ───────────────────────────────────────────────────────────────

const TOPICS = ["DBMS", "OS", "CN", "OOP", "DSA"];

const TOPIC_COLORS: Record<string, string> = {
  DBMS: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  OS: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  CN: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  OOP: "bg-teal-500/15 text-teal-300 border-teal-500/25",
  DSA: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
};

const TOPIC_ACCENT: Record<string, string> = {
  DBMS: "#a78bfa",
  OS: "#60a5fa",
  CN: "#22d3ee",
  OOP: "#2dd4bf",
  DSA: "#818cf8",
};

// SCORE_DATA and MASTERY_DATA removed — charts now use real data from Supabase
// or show empty states. Hardcoded placeholder data was misleading users.

// ─── Utility Components ───────────────────────────────────────────────────────

function TopicTag({ topic }: { topic: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium font-['JetBrains_Mono'] ${TOPIC_COLORS[topic] || "bg-white/10 text-white/60 border-white/10"}`}>
      {topic}
    </span>
  );
}

function ScoreBar({ label, value, color = "bg-[#2dd4bf]" }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-semibold font-['JetBrains_Mono']">{value}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Btn({
  children, onClick, variant = "primary", size = "md", className = "", disabled = false, id
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "secondary" | "ghost" | "teal" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  id?: string;
}) {
  const variants = {
    primary: "bg-[#4f6ef7] hover:bg-[#3d5de6] text-white shadow-lg shadow-[#4f6ef7]/20",
    teal: "bg-[#2dd4bf] hover:bg-[#22c5b0] text-[#060d1f] font-semibold shadow-lg shadow-[#2dd4bf]/20",
    secondary: "bg-white/8 hover:bg-white/12 text-white border border-white/10",
    ghost: "hover:bg-white/6 text-white/70 hover:text-white",
    danger: "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-5 py-2.5 rounded-xl",
    lg: "px-7 py-3.5 text-lg rounded-xl",
  };
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 font-['Plus_Jakarta_Sans'] font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0d1730] border border-white/7 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

function ScoreCircle({ score, total }: { score: number; total: number }) {
  const pct = Math.round((score / total) * 100);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} strokeWidth="8" stroke="rgba(255,255,255,0.06)" fill="none" />
        <circle
          cx="72" cy="72" r={r} strokeWidth="8" stroke="#2dd4bf" fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-white">{score}/{total}</span>
        <span className="text-xs text-white/50">{pct}% score</span>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", screen: "dashboard" },
  { icon: BookOpen, label: "Quizzes", screen: "quiz-select" },
  { icon: Mic2, label: "Interview Room", screen: "interview-setup" },
  { icon: Code2, label: "Project Analyzer", screen: "project-upload" },
  { icon: FileText, label: "Resume Builder", screen: "resume-home" },
  { icon: TrendingUp, label: "History", screen: "history" },
  { icon: HelpCircle, label: "User Guide", screen: "help" },
  { icon: UserCircle2, label: "Profile", screen: "profile" },
];

function UserAvatar({ user, size = "md" }: { user: User | null; size?: "sm" | "md" }) {
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "U";
  const initials = name.slice(0, 2).toUpperCase();
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${dim} rounded-full object-cover ring-1 ring-white/10 shrink-0`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#2dd4bf] flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

function Sidebar({ current, navigate, streak, user }: { current: Screen; navigate: (s: Screen) => void; streak: number; user: User | null }) {
  return (
    <aside className="w-60 min-h-screen bg-[#0a1428] border-r border-white/5 flex flex-col py-6 shrink-0">
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4f6ef7] flex items-center justify-center shadow-lg shadow-[#4f6ef7]/30">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-['Plus_Jakarta_Sans'] font-bold text-white text-sm tracking-tight">InterviewPrep AI</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, screen }) => {
          const active = current === screen ||
            (screen === "quiz-select" && ["quiz-select", "quiz-progress", "quiz-results"].includes(current)) ||
            (screen === "interview-setup" && ["interview-setup", "interview-live", "interview-feedback", "interview-summary"].includes(current)) ||
            (screen === "project-upload" && ["project-upload", "project-results"].includes(current)) ||
            (screen === "resume-home" && ["resume-home", "resume-upload", "resume-gallery", "resume-editor"].includes(current));
          return (
            <button
              key={screen}
              onClick={() => navigate(screen as Screen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${active
                ? "bg-[#4f6ef7]/15 text-[#818cf8] border border-[#4f6ef7]/20"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-[#4f6ef7]" : ""}`} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 mt-4 space-y-1 border-t border-white/5 pt-4">
        {/* User identity pill */}
        {user && (
          <button
            onClick={() => navigate("profile")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group mb-1"
          >
            <UserAvatar user={user} size="sm" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-white/80 truncate group-hover:text-white transition-colors">
                {user.user_metadata?.full_name || user.user_metadata?.name || "My Profile"}
              </p>
              <p className="text-[10px] text-white/30 truncate">{user.email}</p>
            </div>
          </button>
        )}
        <button
          onClick={() => navigate("settings")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("landing");
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Real streak from DB — only shown if user has activity */}
      {streak > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-[#1a253d]/60 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-semibold text-white/80">{streak}-day streak</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function AppLayout({ screen, navigate, streak, user, children }: { screen: Screen; navigate: (s: Screen) => void; streak?: number; user?: User | null; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#060d1f]">
      <Sidebar current={screen} navigate={navigate} streak={streak ?? 0} user={user ?? null} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// ─── 1. Landing Screen ────────────────────────────────────────────────────────

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
}

function LandingScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="min-h-screen bg-[#060d1f] text-white overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#4f6ef7]/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#2dd4bf]/6 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-10 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4f6ef7] flex items-center justify-center shadow-lg shadow-[#4f6ef7]/30">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-['Plus_Jakarta_Sans'] font-bold text-white tracking-tight">InterviewPrep AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-gray-700 hover:bg-gray-50 transition-all duration-150 shadow-sm shadow-black/20 cursor-pointer"
          >
            <GoogleIcon className="w-4 h-4" />
            Sign in with Google
          </button>
          <Btn variant="ghost" size="sm" onClick={() => navigate("auth")}>Email login</Btn>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-10 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 rounded-full px-4 py-1.5 text-sm text-[#818cf8] mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered interview practice for CS students
        </div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6">
          Practice real interviews.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4f6ef7] to-[#2dd4bf]">Get AI feedback.</span><br />
          Land your dream job.
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Master technical and HR interviews with an AI that gives you personalized feedback, identifies weak areas, and helps you improve with every session.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl text-base font-bold bg-white text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/30 cursor-pointer group"
          >
            <GoogleIcon className="w-5 h-5" />
            Continue with Google
          </button>
          <button
            onClick={() => navigate("auth")}
            className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            or sign in with email →
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-10 pb-24">
        <div className="text-center mb-14">
          <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-white mb-3">Everything you need to crack it</h2>
          <p className="text-white/40">Three powerful tools built for your success</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: BookOpen, color: "#818cf8", bg: "bg-violet-500/10 border-violet-500/15",
              title: "Core Subject Quizzes",
              desc: "Upload your own notes or pick from DBMS, OS, CN, OOP, DSA. AI generates adaptive MCQ and short-answer questions tailored to your weak spots.",
            },
            {
              icon: Mic2, color: "#2dd4bf", bg: "bg-teal-500/10 border-teal-500/15",
              title: "Mock Interview Room",
              desc: "Simulate a real technical or HR interview with an AI interviewer. Get per-answer feedback on accuracy, communication, and filler word usage.",
            },
            {
              icon: Code2, color: "#60a5fa", bg: "bg-blue-500/10 border-blue-500/15",
              title: "Project Analyzer",
              desc: "Upload your GitHub repo or ZIP. AI extracts your tech stack, generates a 2-minute pitch script, and predicts interview questions about your project.",
            },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className={`bg-[#0d1730] border rounded-2xl p-7 hover:border-white/15 transition-all duration-300 group`}>
              <div className={`w-11 h-11 rounded-xl ${bg} border flex items-center justify-center mb-5`}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-lg mb-2.5">{title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key capability callouts */}
      <section className="relative z-10 border-y border-white/5 py-16">
        <div className="max-w-4xl mx-auto px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: "5 Topics", label: "Core CS subjects" },
              { num: "3 Modes", label: "Technical, HR & Project" },
              { num: "Real AI", label: "Powered by Gemini" },
              { num: "Free", label: "No credit card needed" },
            ].map(({ num, label }) => (
              <div key={label}>
                <div className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold text-white mb-1">{num}</div>
                <div className="text-sm text-white/40">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-10 pb-24 text-center">
        <div className="bg-gradient-to-br from-[#0d1730] to-[#0a1428] border border-[#4f6ef7]/20 rounded-3xl p-14">
          <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-white mb-3">Ready to ace your next interview?</h2>
          <p className="text-white/40 mb-8">Free to use. No credit card required. Start practicing in seconds.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl text-base font-bold bg-white text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/30 cursor-pointer"
            >
              <GoogleIcon className="w-5 h-5" />
              Continue with Google
            </button>
            <Btn variant="teal" size="lg" onClick={() => navigate("auth")}>
              Sign up with Email <ArrowRight className="w-5 h-5" />
            </Btn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-white/30">
          <span>© 2025 InterviewPrep AI. All rights reserved.</span>
          <div className="flex gap-5">
            <a className="hover:text-white/60 cursor-pointer">Privacy</a>
            <a className="hover:text-white/60 cursor-pointer">Terms</a>
            <a className="hover:text-white/60 cursor-pointer">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── 2. Auth Screen ───────────────────────────────────────────────────────────

function AuthScreen({ navigate, initialMessage }: { navigate: (s: Screen) => void; initialMessage?: string | null }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialMessage ?? null);
  const [resetSent, setResetSent] = useState(false);

  // Detect OAuth error params from redirect (e.g. user cancelled Google sign-in)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      setError(oauthError.replace(/\+/g, " "));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (e) throw e;
      // Browser will redirect to Google — loading state stays until navigation
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to start Google sign-in.");
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email address above, then click Forgot password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}#type=recovery`,
      });
      if (e) throw e;
      setResetSent(true);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() || undefined } },
        });
        if (e) throw e;
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (e) throw e;
      }
      navigate("dashboard");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060d1f] flex">
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4f6ef7]/20 to-[#2dd4bf]/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#4f6ef7]/20 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 rounded-lg bg-[#4f6ef7] flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-['Plus_Jakarta_Sans'] font-bold text-white">InterviewPrep AI</span>
          </div>
          <h2 className="font-['Plus_Jakarta_Sans'] text-4xl font-extrabold text-white leading-tight mb-6">
            Your AI-powered<br />interview coach<br />never sleeps.
          </h2>
          <div className="space-y-4">
            {["Instant feedback on every answer", "Track weak topics automatically", "Practice at any hour, any pace"].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#2dd4bf]/15 border border-[#2dd4bf]/30 flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#2dd4bf]" />
                </div>
                <span className="text-white/60 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 lg:px-14 py-12 bg-[#0a1428]">
        <button onClick={() => navigate("landing")} className="text-white/40 hover:text-white/70 text-sm mb-10 text-left cursor-pointer transition-colors">
          ← Back to home
        </button>
        <div className="flex bg-white/5 rounded-xl p-1 mb-8">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${mode === m ? "bg-[#4f6ef7] text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white hover:bg-gray-50 active:scale-[0.99] text-gray-800 text-sm font-bold transition-all duration-150 mb-6 cursor-pointer shadow-md shadow-black/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/8" />
          </div>
          <div className="relative flex justify-center text-xs text-white/30">
            <span className="bg-[#0a1428] px-3">or continue with email</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {mode === "signup" && (
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Arjun Mehta"
                className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-[#4f6ef7]/50 transition-colors text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Email address</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-[#4f6ef7]/50 transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Password</label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-[#4f6ef7]/50 transition-colors text-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <Btn
          id="auth-submit"
          variant="primary"
          className="w-full justify-center"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === "login" ? "Logging in..." : "Creating account..."}</>
            : <>{mode === "login" ? "Log in" : "Create account"} <ArrowRight className="w-4 h-4" /></>}
        </Btn>

        {mode === "login" && (
          <p className="text-center text-xs text-white/30 mt-4">
            {resetSent
              ? <span className="text-green-400">Reset link sent! Check your inbox.</span>
              : <button type="button" onClick={handleForgotPassword} className="hover:text-white/60 cursor-pointer underline-offset-2 hover:underline">Forgot password?</button>
            }
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 3. Dashboard Screen ──────────────────────────────────────────────────────

function DashboardScreen({ navigate, user }: { navigate: (s: Screen) => void; user: User | null }) {
  const [stats, setStats] = useState({
    questionsPracticed: 0,
    avgQuizScore: 0,
    interviewsDone: 0,
    topicsMastered: 0,
    distinctTopicsCount: 0,
    streak: 0,
  });
  const [weakTopics, setWeakTopics] = useState<Array<{ topic: string; subtopic: string; accuracy: number }>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ label: string; score: number; date: string; type: "quiz" | "interview" }>>([]);
  const [loading, setLoading] = useState(true);

  // Candidate Intelligence data — sourced from competency_scores + misconceptions
  const candidateIntel = useCandidateIntelligence();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const [quizRes, interviewRes] = await Promise.all([
          supabase
            .from("quiz_attempts")
            .select("id, topic, difficulty, score, total, questions, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("interview_sessions")
            .select("id, mode, topic, technical_score, communication_score, transcript, created_at")
            .order("created_at", { ascending: false }),
        ]);

        const quizzes = quizRes.data ?? [];
        const interviews = interviewRes.data ?? [];

        // 1. Questions Practiced
        let qCount = 0;
        quizzes.forEach((q) => {
          const { total } = calculateQuizScore(q);
          qCount += total;
        });
        interviews.forEach((i) => {
          const tList = Array.isArray(i.transcript) ? i.transcript : [];
          qCount += tList.length || 1;
        });

        // 2. Avg Quiz Score using canonical calculateQuizScore
        let quizScoresSum = 0;
        let quizCount = 0;
        quizzes.forEach((q) => {
          const { percentage } = calculateQuizScore(q);
          quizScoresSum += percentage;
          quizCount++;
        });
        const avgQuizScore = quizCount > 0 ? Math.round(quizScoresSum / quizCount) : 0;

        // 3. Interviews Done
        const interviewsDone = interviews.length;

        // 4. Topic accuracy & Mastery & Weak Topics
        const topicScoresMap: Record<string, number[]> = {};
        quizzes.forEach((q) => {
          const t = q.topic ?? "General";
          const { percentage } = calculateQuizScore(q);
          if (!topicScoresMap[t]) topicScoresMap[t] = [];
          topicScoresMap[t].push(percentage);
        });

        interviews.forEach((i) => {
          const t = i.topic ?? "General";
          const pct = Math.round(((i.technical_score ?? 0) + (i.communication_score ?? 0)) / 2);
          if (!topicScoresMap[t]) topicScoresMap[t] = [];
          topicScoresMap[t].push(pct);
        });

        const topicAverages = Object.entries(topicScoresMap).map(([t, scores]) => ({
          topic: t,
          avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        }));

        const topicsMastered = topicAverages.filter((t) => t.avg >= 80).length;
        const distinctTopicsCount = topicAverages.length;

        // Weak topics: topics with avg < 70%, sorted ascending
        const weakList = topicAverages
          .filter((t) => t.avg < 70)
          .sort((a, b) => a.avg - b.avg)
          .slice(0, 3)
          .map((t) => ({
            topic: t.topic,
            subtopic: `${t.topic} Practice`,
            accuracy: t.avg,
          }));

        // 5. Streak calculation — consecutive calendar days with activity in local time
        const toLocalDateStr = (d: string | Date) => {
          const date = typeof d === "string" ? new Date(d) : d;
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };

        const datesSet = new Set<string>();
        [...quizzes, ...interviews].forEach((item) => {
          if (item.created_at) {
            datesSet.add(toLocalDateStr(item.created_at));
          }
        });

        let streak = 0;
        const now = new Date();
        const todayStr = toLocalDateStr(now);
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = toLocalDateStr(yesterday);

        let startDate: Date | null = null;
        if (datesSet.has(todayStr)) {
          startDate = now;
        } else if (datesSet.has(yesterdayStr)) {
          startDate = yesterday;
        }

        if (startDate) {
          for (let d = 0; d < 365; d++) {
            const check = new Date(startDate);
            check.setDate(startDate.getDate() - d);
            const checkStr = toLocalDateStr(check);
            if (datesSet.has(checkStr)) {
              streak++;
            } else {
              break;
            }
          }
        }

        // 6. Recent Activity using canonical calculateQuizScore
        const quizItems = quizzes.map((q) => {
          const { percentage } = calculateQuizScore(q);
          return {
            label: `${q.topic ?? "CS"} Quiz`,
            score: percentage,
            dateRaw: new Date(q.created_at),
            date: new Date(q.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            type: "quiz" as const,
          };
        });

        const interviewItems = interviews.map((i) => {
          const modeLabel = i.mode ? i.mode.charAt(0).toUpperCase() + i.mode.slice(1) : "Mock";
          return {
            label: `${modeLabel} Interview – ${i.topic ?? "CS"}`,
            score: Math.round(((i.technical_score ?? 0) + (i.communication_score ?? 0)) / 2),
            dateRaw: new Date(i.created_at),
            date: new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            type: "interview" as const,
          };
        });

        const combined = [...quizItems, ...interviewItems]
          .sort((a, b) => b.dateRaw.getTime() - a.dateRaw.getTime())
          .slice(0, 4);

        setStats({
          questionsPracticed: qCount,
          avgQuizScore,
          interviewsDone,
          topicsMastered,
          distinctTopicsCount,
          streak,
        });
        setWeakTopics(weakList);
        setRecentActivity(combined);
      } catch (err) {
        console.error("[dashboard]", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const displayName = user?.user_metadata?.full_name
    || user?.email?.split("@")[0]
    || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppLayout screen="dashboard" navigate={navigate} streak={stats.streak}>
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">{greeting}, {displayName} 👋</h1>
            <p className="text-white/40 text-sm mt-1">Ready to practice? Pick a quiz or mock interview to get started.</p>
          </div>
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-300">
              {stats.streak > 0 ? `${stats.streak}-day active streak` : "Start active streak!"}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Questions practiced", val: loading ? "..." : stats.questionsPracticed.toLocaleString(), icon: Target, color: "text-[#818cf8]", bg: "bg-violet-500/10" },
            { label: "Avg quiz score", val: loading ? "..." : `${stats.avgQuizScore}%`, icon: BarChart3, color: "text-[#2dd4bf]", bg: "bg-teal-500/10" },
            { label: "Interviews done", val: loading ? "..." : String(stats.interviewsDone), icon: Mic2, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Topics mastered", val: loading ? "..." : `${stats.topicsMastered} / ${stats.distinctTopicsCount}`, icon: Award, color: "text-amber-400", bg: "bg-amber-500/10" },
          ].map(({ label, val, icon: Icon, color, bg }) => (
            <Card key={label} className="p-5">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="font-['JetBrains_Mono'] text-2xl font-bold text-white mb-1">{val}</div>
              <div className="text-xs text-white/40">{label}</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: weak topics + quick start */}
          <div className="col-span-2 space-y-6">
            {/* Weak topics */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white">Weak Topics</h3>
                  <p className="text-xs text-white/40 mt-0.5">Topics with score below 70%</p>
                </div>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-white/40 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading topic stats...
                </div>
              ) : weakTopics.length === 0 ? (
                <div className="p-4 bg-green-500/8 border border-green-500/20 rounded-xl text-xs text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span>Great job! No weak topics identified yet (&lt; 70%). Take more quizzes to track your performance.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {weakTopics.map(({ topic, subtopic, accuracy }) => (
                    <div key={subtopic} className="flex items-center gap-4 p-4 bg-white/3 rounded-xl border border-white/5">
                      <TopicTag topic={topic} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{subtopic}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400/60 rounded-full" style={{ width: `${accuracy}%` }} />
                          </div>
                          <span className="text-xs font-['JetBrains_Mono'] text-red-400">{accuracy}%</span>
                        </div>
                      </div>
                      <Btn variant="secondary" size="sm" onClick={() => navigate("quiz-select")}>
                        Practice now
                      </Btn>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick start */}
            <Card className="p-6">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white mb-5">Quick Start</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Take a Quiz", desc: "Choose count & topic", icon: BookOpen, color: "text-violet-400", bg: "bg-violet-500/10", screen: "quiz-select" },
                  { label: "Start Mock Interview", desc: "AI live voice session", icon: Mic2, color: "text-[#2dd4bf]", bg: "bg-teal-500/10", screen: "interview-setup" },
                  { label: "Analyze My Project", desc: "Upload code or ZIP", icon: Code2, color: "text-blue-400", bg: "bg-blue-500/10", screen: "project-upload" },
                ].map(({ label, desc, icon: Icon, color, bg, screen: s }) => (
                  <button
                    key={label}
                    onClick={() => navigate(s as Screen)}
                    className="flex flex-col p-5 bg-white/3 border border-white/5 rounded-xl hover:bg-white/6 hover:border-white/10 transition-all group text-left cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">{label}</p>
                    <p className="text-xs text-white/35">{desc}</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: recent activity */}
          <div>
            <Card className="p-6 h-full">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white mb-5">Recent Activity</h3>
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-white/40 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading recent activity...
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="py-8 text-center text-white/30 text-xs space-y-2">
                  <p>No recent activity yet.</p>
                  <Btn variant="primary" size="sm" onClick={() => navigate("quiz-select")}>
                    Take your first quiz
                  </Btn>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map(({ label, score, date, type }, idx) => (
                    <div key={idx} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${type === "quiz" ? "bg-violet-500/15" : "bg-teal-500/15"}`}>
                        {type === "quiz"
                          ? <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                          : <Mic2 className="w-3.5 h-3.5 text-teal-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white leading-tight truncate">{label}</p>
                        <p className="text-xs text-white/35 mt-0.5">{date}</p>
                      </div>
                      <span className={`text-sm font-bold font-['JetBrains_Mono'] ${score >= 80 ? "text-[#2dd4bf]" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                        {score}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Btn variant="ghost" size="sm" className="w-full justify-center mt-4 text-white/40" onClick={() => navigate("history")}>
                View all history <ChevronRight className="w-3.5 h-3.5" />
              </Btn>
            </Card>
          </div>
        </div>

        {/* Candidate Intelligence — competency heatmap + misconceptions */}
        <div className="mt-8">
          <CandidateIntelligence
            competencyScores={candidateIntel.competencyScores}
            unresolvedMisconceptions={candidateIntel.unresolvedMisconceptions}
            loading={candidateIntel.loading}
            error={candidateIntel.error}
            onReviewMisconceptions={() => navigate("profile")}
          />
        </div>
      </div>
    </AppLayout>
  );
}

// ─── 4. Quiz Select Screen ────────────────────────────────────────────────────

function QuizSelectScreen({
  navigate,
  onQuestionsReady,
  initialTopic,
  initialDifficulty,
}: {
  navigate: (s: Screen) => void;
  onQuestionsReady: (questions: QuizQuestion[], topic: string, difficulty: string) => void;
  initialTopic?: string | null;
  initialDifficulty?: string | null;
}) {
  const [mode, setMode] = useState<"upload" | "topic">("topic");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(initialTopic || null);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    (initialDifficulty?.toLowerCase() as any) || "medium"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    "All",
    "Programming",
    "Web Development",
    "Backend / Java",
    "Databases",
    "CS Fundamentals",
    "DevOps",
    "Security",
  ];

  const filteredTopics = TOPIC_REGISTRY.filter((t) => {
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    const matchesQuery =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtopics.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "upload" && selectedFile) {
        const fd = new FormData();
        fd.append("pdf", selectedFile);
        fd.append("difficulty", difficulty);
        fd.append("count", String(questionCount));
        const data = await apiFetch<{ questions: QuizQuestion[] }>("/api/quiz/pdf", {
          method: "POST",
          body: fd,
        });
        onQuestionsReady(data.questions, selectedFile.name.replace(/\.pdf$/i, ""), difficulty);
        navigate("quiz-progress");
      } else if (mode === "topic" && selectedTopic) {
        const data = await apiFetch<{ questions: QuizQuestion[] }>("/api/quiz/generate", {
          method: "POST",
          body: JSON.stringify({ topic: selectedTopic, difficulty, count: questionCount }),
        });
        onQuestionsReady(data.questions, selectedTopic, difficulty);
        navigate("quiz-progress");
      }
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (file: File) => {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError("Only PDF files are accepted.");
    }
  };

  return (
    <AppLayout screen="quiz-select" navigate={navigate}>
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white mb-1">Generate a Quiz</h1>
          <p className="text-white/40 text-sm">Upload your notes or choose a verified subject from our canonical curriculum</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5 mb-8">
          {/* Upload PDF */}
          <button
            onClick={() => setMode("upload")}
            className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer ${mode === "upload" ? "border-[#4f6ef7] bg-[#4f6ef7]/8" : "border-white/8 bg-[#0d1730] hover:border-white/15"}`}
          >
            <div className="w-11 h-11 rounded-xl bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 flex items-center justify-center mb-4">
              <Upload className="w-5 h-5 text-[#818cf8]" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-lg mb-1.5">Upload your PDF notes</h3>
            <p className="text-sm text-white/40 leading-relaxed">AI will generate questions directly from your study material</p>
          </button>

          {/* Choose topic */}
          <button
            onClick={() => setMode("topic")}
            className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer ${mode === "topic" ? "border-[#4f6ef7] bg-[#4f6ef7]/8" : "border-white/8 bg-[#0d1730] hover:border-white/15"}`}
          >
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5 text-[#2dd4bf]" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-lg mb-1.5">Curriculum Topics ({TOPIC_REGISTRY.length})</h3>
            <p className="text-sm text-white/40 leading-relaxed">Programming, Web, Backend, Databases, CS Fundamentals, DevOps, Security</p>
          </button>
        </div>

        {mode === "upload" ? (
          <div
            className={`mb-8 border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragging ? "border-[#4f6ef7] bg-[#4f6ef7]/5" : "border-white/10 bg-white/2"}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-[#818cf8]" />
            </div>
            {selectedFile ? (
              <>
                <p className="text-white font-semibold mb-1">{selectedFile.name}</p>
                <p className="text-white/35 text-sm mb-5">{(selectedFile.size / 1024).toFixed(0)} KB · PDF ready</p>
                <Btn variant="secondary" size="sm" onClick={() => setSelectedFile(null)}>Remove</Btn>
              </>
            ) : (
              <>
                <p className="text-white font-semibold mb-1">Drop your PDF here</p>
                <p className="text-white/35 text-sm mb-5">or click to browse files</p>
                <Btn variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Browse files</Btn>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); }}
            />
          </div>
        ) : (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-sm text-white/70 font-medium">Select a Subject Area</label>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search topics or concepts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4f6ef7]"
                />
              </div>
            </div>

            {/* Category filter pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-all ${selectedCategory === cat
                    ? "bg-[#4f6ef7] text-white font-medium shadow-md shadow-[#4f6ef7]/20"
                    : "bg-white/4 text-white/50 hover:bg-white/8 hover:text-white"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Topic Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
              {filteredTopics.map((t) => {
                const isSelected = selectedTopic === t.name;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(isSelected ? null : t.name)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isSelected
                      ? "border-[#4f6ef7] bg-[#4f6ef7]/15 ring-1 ring-[#4f6ef7]/40 shadow-lg"
                      : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${t.color}`}>
                          {t.category}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#818cf8]" />}
                      </div>
                      <p className="font-semibold text-sm text-white">{t.name}</p>
                      <p className="text-xs text-white/45 line-clamp-2 mt-1 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {t.subtopics.slice(0, 3).map((sub, idx) => (
                        <span key={idx} className="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded">
                          {sub}
                        </span>
                      ))}
                      {t.subtopics.length > 3 && (
                        <span className="text-[10px] text-white/30 px-1 py-0.5">
                          +{t.subtopics.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredTopics.length === 0 && (
              <p className="text-center text-xs text-white/30 py-6">No matching topics found for "{searchQuery}".</p>
            )}
          </div>
        )}

        {/* Options: Difficulty & Question Count */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Difficulty */}
          <div>
            <label className="block text-sm text-white/50 mb-3">Difficulty</label>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border capitalize cursor-pointer transition-all ${difficulty === d
                    ? d === "easy" ? "bg-green-500/15 border-green-500/30 text-green-400"
                      : d === "medium" ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                        : "bg-red-500/15 border-red-500/30 text-red-400"
                    : "bg-white/3 border-white/8 text-white/50 hover:border-white/15"
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count Selector */}
          <div>
            <label className="block text-sm text-white/50 mb-3">Number of MCQ Questions</label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border cursor-pointer transition-all ${questionCount === count
                    ? "bg-[#4f6ef7]/15 border-[#4f6ef7]/40 text-[#818cf8]"
                    : "bg-white/3 border-white/8 text-white/50 hover:border-white/15"
                    }`}
                >
                  {count} Qs
                </button>
              ))}
            </div>
          </div>
        </div>

        <Btn
          variant="primary"
          size="lg"
          onClick={handleGenerate}
          disabled={loading || (mode === "topic" && !selectedTopic) || (mode === "upload" && !selectedFile)}
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating {questionCount} MCQs with AI...</> : <><Zap className="w-5 h-5" /> Generate {questionCount}-Question MCQ Quiz</>}
        </Btn>
      </div>
    </AppLayout>
  );
}

// ─── 5. Quiz In Progress ──────────────────────────────────────────────────────

function QuizProgressScreen({
  navigate,
  questions,
  userAnswers,
  onAnswer,
}: {
  navigate: (s: Screen) => void;
  questions: QuizQuestion[];
  userAnswers: Array<{ selectedIndex: number | null; textAnswer: string }>;
  onAnswer: (index: number, selectedIndex: number | null, textAnswer: string) => void;
}) {
  const [qIndex, setQIndex] = useState(0);
  const total = questions.length;

  if (total === 0) {
    return (
      <AppLayout screen="quiz-select" navigate={navigate}>
        <div className="max-w-3xl mx-auto px-8 py-8 text-center">
          <p className="text-white/40">No questions found. Please generate a quiz first.</p>
          <Btn variant="primary" className="mt-4" onClick={() => navigate("quiz-select")}>Generate Quiz</Btn>
        </div>
      </AppLayout>
    );
  }

  const q = questions[qIndex];
  const currentAnswer = userAnswers[qIndex] ?? { selectedIndex: null, textAnswer: "" };
  const current = qIndex + 1;

  const handleNext = () => {
    if (qIndex < total - 1) {
      setQIndex(qIndex + 1);
    } else {
      navigate("quiz-results");
    }
  };

  const canProceed = q.type === "mcq"
    ? currentAnswer.selectedIndex !== null
    : currentAnswer.textAnswer.trim().length >= 5;

  return (
    <AppLayout screen="quiz-select" navigate={navigate}>
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TopicTag topic={q.topic} />
            <span className="text-sm text-white/40">Question {current} of {total}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Clock className="w-4 h-4" />
            <span className="font-['JetBrains_Mono']">{String(Math.floor((total - qIndex) * 1.5)).padStart(2, "0")}:00</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${i < qIndex ? "bg-[#2dd4bf]"
                  : i === qIndex ? "bg-[#4f6ef7]"
                    : "bg-white/8"
                  }`}
              />
            ))}
          </div>
        </div>

        <Card className="p-8 mb-6">
          <p className="text-white font-['Plus_Jakarta_Sans'] text-lg font-semibold leading-relaxed">{q.question}</p>
        </Card>

        {q.type === "mcq" ? (
          <div className="space-y-3 mb-8">
            {q.options!.map((opt, i) => (
              <button
                key={i}
                onClick={() => onAnswer(qIndex, i, "")}
                className={`w-full text-left px-5 py-4 rounded-xl border transition-all cursor-pointer text-sm ${currentAnswer.selectedIndex === i
                  ? "border-[#4f6ef7] bg-[#4f6ef7]/10 text-white"
                  : "border-white/8 bg-white/3 text-white/70 hover:border-white/15 hover:text-white"
                  }`}
              >
                <span className={`inline-flex w-6 h-6 rounded-full border mr-3 text-xs items-center justify-center font-['JetBrains_Mono'] shrink-0 ${currentAnswer.selectedIndex === i ? "border-[#4f6ef7] bg-[#4f6ef7] text-white" : "border-white/20 text-white/40"
                  }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-8">
            <textarea
              rows={5}
              value={currentAnswer.textAnswer}
              onChange={(e) => onAnswer(qIndex, null, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-5 py-4 bg-white/3 border border-white/8 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-[#4f6ef7]/50 resize-none text-sm leading-relaxed"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => navigate("quiz-select")} className="text-sm text-white/30 hover:text-white/60 cursor-pointer transition-colors">
            Quit quiz
          </button>
          <Btn
            variant="primary"
            onClick={handleNext}
            disabled={!canProceed}
          >
            {qIndex < total - 1 ? "Next question" : "Finish quiz"} <ChevronRight className="w-4 h-4" />
          </Btn>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── 6. Quiz Results ──────────────────────────────────────────────────────────

function QuizResultsScreen({
  navigate,
  questions,
  userAnswers,
  topic,
  difficulty,
}: {
  navigate: (s: Screen) => void;
  questions: QuizQuestion[];
  userAnswers: Array<{ selectedIndex: number | null; textAnswer: string }>;
  topic: string;
  difficulty: string;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Evaluate MCQ correctness locally; text answers are "ungraded" (shown with explanation)
  const results = questions.map((q, i) => {
    const ans = userAnswers[i] ?? { selectedIndex: null, textAnswer: "" };
    const isCorrect = q.type === "mcq" ? ans.selectedIndex === q.correct : null; // null = ungraded
    return {
      q: q.question,
      userAns: q.type === "mcq"
        ? (q.options?.[ans.selectedIndex ?? -1] ?? "No answer")
        : (ans.textAnswer || "No answer"),
      correct: q.type === "mcq" ? (q.options?.[q.correct] ?? "") : q.explanation,
      ok: isCorrect === true,
      ungraded: isCorrect === null,
      topic: q.topic,
      explanation: q.explanation,
    };
  });

  const mcqResults = results.filter((r) => !r.ungraded);
  const correct = mcqResults.filter((r) => r.ok).length;
  const total = questions.length;
  const mcqTotal = mcqResults.length;

  const doSave = async () => {
    if (questions.length === 0 || saved || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch("/api/quiz/save", {
        method: "POST",
        body: JSON.stringify({
          topic,
          difficulty,
          score: correct,
          total: mcqTotal || total,
          questions: questions.map((q, i) => ({
            ...q,
            userAnswer: userAnswers[i],
            ok: results[i]?.ok ?? false,
          })),
        }),
      });
      setSaved(true);
    } catch (err: unknown) {
      setSaveError((err as Error).message ?? "Could not save results. Tap \"Retry\" to try again.");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save on mount
  useEffect(() => { doSave(); }, []);

  if (questions.length === 0) {
    return (
      <AppLayout screen="quiz-select" navigate={navigate}>
        <div className="max-w-3xl mx-auto px-8 py-8 text-center">
          <p className="text-white/40">No results to show. Please complete a quiz first.</p>
          <Btn variant="primary" className="mt-4" onClick={() => navigate("quiz-select")}>Generate Quiz</Btn>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout screen="quiz-select" navigate={navigate}>
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">Quiz Results</h1>
          {/* Save status badge */}
          {saving && (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </div>
          )}
          {saved && !saving && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4" /> Saved to history
            </div>
          )}
        </div>

        {/* Save error banner */}
        {saveError && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{saveError}</p>
            </div>
            <Btn variant="secondary" size="sm" onClick={doSave} disabled={saving}>
              Retry save
            </Btn>
          </div>
        )}

        {/* Score */}
        <Card className="p-8 mb-6 flex flex-col sm:flex-row items-center gap-8">
          <ScoreCircle score={correct} total={mcqTotal || total} />
          <div className="flex-1">
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-xl mb-1">
              {correct >= mcqTotal * 0.8 ? "Excellent work!" : correct >= mcqTotal * 0.6 ? "Good effort!" : "Keep practicing!"}
            </h3>
            <p className="text-white/40 text-sm mb-5">
              You answered {correct} out of {mcqTotal} MCQ questions correctly.
              {results.some((r) => r.ungraded) && " Short-answer questions are shown below with model explanations."}
            </p>
            <div className="space-y-3">
              <ScoreBar label={topic} value={Math.round((correct / (mcqTotal || 1)) * 100)} />
            </div>
          </div>
        </Card>

        {/* Weak topics callout */}
        {correct < mcqTotal * 0.6 && (
          <div className="mb-6 bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Score below 60% — practice recommended</p>
              <p className="text-xs text-white/40">Try the Interview Room for deeper reinforcement on this topic.</p>
            </div>
          </div>
        )}

        {/* Q&A Review */}
        <Card className="p-6 mb-6">
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white mb-4">Question Review</h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`rounded-xl border overflow-hidden ${r.ungraded ? "border-blue-500/15" : r.ok ? "border-green-500/15" : "border-red-500/15"}`}>
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-white/3 transition-all"
                >
                  {r.ungraded
                    ? <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    : r.ok
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  <span className="flex-1 text-sm text-white truncate">{r.q}</span>
                  <TopicTag topic={r.topic} />
                  {expanded === i ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
                </button>
                {expanded === i && (
                  <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-white/40 w-24 shrink-0">Your answer:</span>
                      <span className={`text-xs ${r.ungraded ? "text-blue-300" : r.ok ? "text-green-400" : "text-red-400"}`}>{r.userAns}</span>
                    </div>
                    {!r.ok && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-white/40 w-24 shrink-0">{r.ungraded ? "Explanation:" : "Correct:"}</span>
                        <span className="text-xs text-[#2dd4bf]">{r.correct}</span>
                      </div>
                    )}
                    {r.explanation && !r.ungraded && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-white/40 w-24 shrink-0">Explanation:</span>
                        <span className="text-xs text-white/60">{r.explanation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Btn variant="teal" onClick={() => navigate("interview-setup")}>
            <Mic2 className="w-4 h-4" /> Practice these in Interview Room
          </Btn>
          <Btn variant="secondary" onClick={() => navigate("quiz-select")}>
            <RefreshCw className="w-4 h-4" /> Take another quiz
          </Btn>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── 7. Interview Setup ───────────────────────────────────────────────────────

function InterviewSetupScreen({
  navigate,
  onStart,
  initialMode,
  initialTopic,
}: {
  navigate: (s: Screen) => void;
  onStart: (mode: "technical" | "hr" | "project" | "resume", topic: string, resumeText?: string) => void;
  initialMode?: "technical" | "hr" | "project" | "resume";
  initialTopic?: string;
}) {
  const [mode, setMode] = useState<"technical" | "hr" | "project" | "resume">(initialMode || "technical");
  const [topic, setTopic] = useState<string>(initialTopic || "Java");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedResumes, setSavedResumes] = useState<SavedResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [customResumeText, setCustomResumeText] = useState("");
  const [resumeSource, setResumeSource] = useState<"saved" | "paste">("saved");

  useEffect(() => {
    apiFetch<{ resumes: SavedResumeRecord[] }>("/api/resume/list")
      .then((res) => {
        if (res.resumes && res.resumes.length > 0) {
          setSavedResumes(res.resumes);
          setSelectedResumeId(res.resumes[0].id);
        }
      })
      .catch((err) => console.warn("[interview-setup] resume fetch error:", err));
  }, []);

  const categories = [
    "All",
    "Programming",
    "Web Development",
    "Backend / Java",
    "Databases",
    "CS Fundamentals",
    "DevOps",
    "Security",
  ];

  const filteredTopics = TOPIC_REGISTRY.filter((t) => {
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    const matchesQuery =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const getResolvedResumeText = (): string => {
    if (resumeSource === "paste") return customResumeText.trim();
    const sel = savedResumes.find((r) => r.id === selectedResumeId);
    if (!sel || !sel.form_data) return customResumeText.trim();
    const p = sel.form_data;
    const parts: string[] = [];
    if (p.contactInfo?.fullName) parts.push(`Candidate: ${p.contactInfo.fullName}`);
    if (p.summary) parts.push(`Professional Summary: ${p.summary}`);
    if (p.experience?.length) {
      parts.push("Work Experience:\n" + p.experience.map((e) => `- ${e.title} at ${e.company} (${e.startDate} - ${e.endDate}): ${Array.isArray(e.bullets) ? e.bullets.join("; ") : e.bullets}`).join("\n"));
    }
    if (p.projects?.length) {
      parts.push("Key Projects:\n" + p.projects.map((pr) => `- ${pr.name} [Tech: ${pr.techStack}]: ${Array.isArray(pr.bullets) ? pr.bullets.join("; ") : pr.bullets}`).join("\n"));
    }
    if (p.skills?.length) {
      parts.push(`Core Skills: ${Array.isArray(p.skills) ? p.skills.join(", ") : p.skills}`);
    }
    if (p.education?.length) {
      parts.push("Education:\n" + p.education.map((ed) => `- ${ed.degree} from ${ed.institution}`).join("\n"));
    }
    return parts.join("\n\n");
  };

  const handleStart = () => {
    const resumeText = mode === "resume" ? getResolvedResumeText() : undefined;
    const selectedResume = savedResumes.find((r) => r.id === selectedResumeId);
    const effectiveTopic =
      mode === "technical"
        ? topic
        : mode === "resume"
          ? (selectedResume?.form_data?.contactInfo?.fullName
            ? `${selectedResume.form_data.contactInfo.fullName}'s Resume`
            : "Resume Deep-Dive")
          : mode;
    onStart(mode, effectiveTopic, resumeText);
    navigate("interview-live");
  };

  return (
    <AppLayout screen="interview-setup" navigate={navigate}>
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white mb-1">Interview Room Setup</h1>
          <p className="text-white/40 text-sm">Configure your mock interview session with AI</p>
        </div>

        {/* Mode selector */}
        <div className="mb-8">
          <label className="block text-sm text-white/50 mb-3">Interview mode</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[
              { id: "technical", icon: Brain, label: "Technical", desc: "CS concepts, system internals, DSA, programming" },
              { id: "hr", icon: MessageSquare, label: "HR & Behavioral", desc: "STAR method, situational, culture fit, leadership" },
              { id: "resume", icon: FileText, label: "Resume Deep-Dive", desc: "Rigorous verification of your resume claims & projects" },
              { id: "project", icon: Code2, label: "Project-based", desc: "Examine repository code, architecture, trade-offs" },
            ].map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                onClick={() => setMode(id as typeof mode)}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${mode === id ? "border-[#4f6ef7] bg-[#4f6ef7]/10 ring-1 ring-[#4f6ef7]/30" : "border-white/8 bg-[#0d1730] hover:border-white/15"
                  }`}
              >
                <div>
                  <Icon className={`w-5 h-5 mb-2.5 ${mode === id ? "text-[#818cf8]" : "text-white/40"}`} />
                  <p className={`font-semibold text-sm mb-1 ${mode === id ? "text-white" : "text-white/70"}`}>{label}</p>
                </div>
                <p className="text-xs text-white/35 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Technical Mode: Canonical Topic Selection */}
        {mode === "technical" && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-sm text-white/70 font-medium">Select Technical Subject ({TOPIC_REGISTRY.length} Available)</label>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filter subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4f6ef7]"
                />
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-all ${selectedCategory === cat
                    ? "bg-[#4f6ef7] text-white font-medium"
                    : "bg-white/4 text-white/50 hover:bg-white/8 hover:text-white"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
              {filteredTopics.map((t) => {
                const isSelected = topic === t.name;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTopic(t.name)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isSelected
                      ? "border-[#4f6ef7] bg-[#4f6ef7]/15 ring-1 ring-[#4f6ef7]/40 shadow-lg"
                      : "border-white/8 bg-white/3 hover:border-white/15"
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${t.color}`}>
                          {t.category}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#818cf8]" />}
                      </div>
                      <p className="font-semibold text-sm text-white">{t.name}</p>
                      <p className="text-xs text-white/40 line-clamp-2 mt-1">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Resume Mode: Select saved resume or paste bullets */}
        {mode === "resume" && (
          <div className="mb-8 p-5 bg-white/3 border border-white/8 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Resume Context Source</h3>
                <p className="text-xs text-white/40">The AI interviewer will ground questions directly in your project claims</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setResumeSource("saved")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${resumeSource === "saved" ? "bg-[#4f6ef7] text-white" : "bg-white/5 text-white/40 hover:text-white"
                    }`}
                >
                  Saved Resumes ({savedResumes.length})
                </button>
                <button
                  onClick={() => setResumeSource("paste")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${resumeSource === "paste" ? "bg-[#4f6ef7] text-white" : "bg-white/5 text-white/40 hover:text-white"
                    }`}
                >
                  Paste Text
                </button>
              </div>
            </div>

            {resumeSource === "saved" ? (
              savedResumes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {savedResumes.map((r) => {
                    const isSelected = selectedResumeId === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedResumeId(r.id)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${isSelected
                          ? "border-[#4f6ef7] bg-[#4f6ef7]/15 ring-1 ring-[#4f6ef7]/40"
                          : "border-white/8 bg-white/2 hover:border-white/15"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-white">
                            {r.form_data?.contactInfo?.fullName ? `${r.form_data.contactInfo.fullName}'s Resume` : `Resume (${r.template_id})`}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#818cf8]" />}
                        </div>
                        <p className="text-xs text-white/50 line-clamp-1">
                          {r.form_data?.summary || (r.form_data?.projects?.[0]?.name ? `Project: ${r.form_data.projects[0].name}` : "General Engineering Resume")}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                  <p className="text-xs text-white/40 mb-3">No saved resumes found in your account.</p>
                  <div className="flex justify-center gap-3">
                    <Btn variant="secondary" size="sm" onClick={() => setResumeSource("paste")}>
                      Paste Project Bullets
                    </Btn>
                    <Btn variant="teal" size="sm" onClick={() => navigate("resume-home")}>
                      Open Resume Builder
                    </Btn>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-2 pt-2">
                <label className="block text-xs text-white/50">Paste your resume bullet points, projects, and tech stack:</label>
                <textarea
                  rows={5}
                  value={customResumeText}
                  onChange={(e) => setCustomResumeText(e.target.value)}
                  placeholder="e.g. Developed high-throughput order matching engine in Go with Redis streams and PostgreSQL. Reduced latency from 180ms to 24ms for 50k DAU..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4f6ef7]"
                />
              </div>
            )}
          </div>
        )}

        {/* Project-based: direct to project analyzer */}
        {mode === "project" && (
          <div className="mb-8 p-5 bg-blue-500/8 border border-blue-500/20 rounded-xl flex items-start gap-4">
            <Code2 className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">Analyze a project first</p>
              <p className="text-xs text-white/50 mb-3">
                Project-based interviews ground questions in your actual repository files, code snippets, and architecture.
              </p>
              <Btn variant="secondary" size="sm" onClick={() => navigate("project-upload")}>
                <Code2 className="w-3.5 h-3.5" /> Go to Project Analyzer
              </Btn>
            </div>
          </div>
        )}

        {/* Input mode */}
        <div className="mb-10">
          <label className="block text-sm text-white/50 mb-3">Response mode</label>
          <div className="flex gap-3">
            {[
              { id: "voice", icon: Mic2, label: "Voice mode", desc: "Speak your answers (recommended)" },
              { id: "text", icon: FileText, label: "Text mode", desc: "Type your answers" },
            ].map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                onClick={() => setInputMode(id as "voice" | "text")}
                className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${inputMode === id ? "border-[#2dd4bf] bg-[#2dd4bf]/6" : "border-white/8 bg-white/3 hover:border-white/15"
                  }`}
              >
                <Icon className={`w-5 h-5 ${inputMode === id ? "text-[#2dd4bf]" : "text-white/40"}`} />
                <div>
                  <p className={`text-sm font-semibold ${inputMode === id ? "text-white" : "text-white/60"}`}>{label}</p>
                  <p className="text-xs text-white/35">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Btn
          variant="primary"
          size="lg"
          onClick={handleStart}
          disabled={mode === "resume" && resumeSource === "paste" && !customResumeText.trim()}
        >
          <Play className="w-5 h-5" /> Start Interview
        </Btn>
      </div>
    </AppLayout>
  );
}

// ─── 8. Interview Live ────────────────────────────────────────────────────────

function InterviewLiveScreen({
  navigate,
  mode,
  topic,
  history,
  resumeText,
  onAnswerSubmitted,
}: {
  navigate: (s: Screen) => void;
  mode: string;
  topic: string;
  history: Array<{ question: string; answer: string }>;
  resumeText?: string;
  onAnswerSubmitted: (question: string, answer: string, evaluation: EvaluationResult) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false); // TTS state
  const [userAnswer, setUserAnswer] = useState("");
  const [interimText, setInterimText] = useState(""); // live speech preview
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalAnswerRef = useRef(""); // accumulates final transcript across sessions
  const mutedRef = useRef(false); // ref so TTS helpers read latest value without stale closure

  // ── Text-to-Speech helper ───────────────────────────────────────────────────
  const speakQuestion = (text: string) => {
    if (!text || mutedRef.current) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel(); // cancel any previous utterance

    const doSpeak = (voices: SpeechSynthesisVoice[]) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.93;  // slightly slower = clearer for interview context
      utter.pitch = 1.05;
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") || v.name.includes("Natural") ||
            v.name.includes("Samantha") || v.name.includes("Alex") ||
            v.name.includes("Zira") || v.name.includes("David"))
      ) ?? voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utter.voice = preferred;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      synth.speak(utter);
    };

    const voices = synth.getVoices();
    if (voices.length > 0) {
      doSpeak(voices);
    } else {
      // Chrome loads voices asynchronously — wait for the event
      const onVoicesChanged = () => {
        doSpeak(synth.getVoices());
        synth.removeEventListener("voiceschanged", onVoicesChanged);
      };
      synth.addEventListener("voiceschanged", onVoicesChanged);
    }
  };

  // ── Web Speech API setup ────────────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognitionCtor: (new () => SpeechRecognition) | undefined =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceSupported(false);
      return;
    }

    const r = new (SpeechRecognitionCtor as new () => SpeechRecognition)();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalAnswerRef.current += (finalAnswerRef.current ? " " : "") + t.trim();
          setUserAnswer(finalAnswerRef.current);
          setInterimText("");
        } else {
          interim += t;
        }
      }
      if (interim) setInterimText(interim);
    };

    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone permission and try again.");
      } else if (event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}. You can still type your answer below.`);
      }
      setRecording(false);
      setInterimText("");
    };

    r.onend = () => {
      // Auto-restart while still in recording mode (recognition stops on silence)
      if (recognitionRef.current === r) {
        setRecording((prev) => {
          if (prev) {
            try { r.start(); } catch { }
          }
          return prev;
        });
      }
    };

    recognitionRef.current = r;
    return () => {
      r.onend = null;
      r.abort();
    };
  }, []);

  // ── Speak question when it arrives ─────────────────────────────────────────
  useEffect(() => {
    if (currentQuestion && !questionLoading) speakQuestion(currentQuestion);
  }, [currentQuestion, questionLoading]);

  // ── Cancel TTS on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // ── AI question fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    setQuestionLoading(true);
    setError(null);
    apiFetch<{ question: string; questionId?: string }>("/api/interview/question", {
      method: "POST",
      body: JSON.stringify({ mode, topic, history, resumeText }),
    })
      .then((data) => {
        setCurrentQuestion(data.question);
        if (data.questionId) setCurrentQuestionId(data.questionId);
      })
      .catch((err) => setError(err.message ?? "Failed to load question"))
      .finally(() => setQuestionLoading(false));
  }, []);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Mic toggle ──────────────────────────────────────────────────────────────
  const toggleRecording = () => {
    const r = recognitionRef.current;
    if (!r) {
      // No Speech API — just toggle visual state, user types manually
      setRecording((prev) => !prev);
      return;
    }
    if (recording) {
      r.stop();
      setRecording(false);
      setInterimText("");
    } else {
      setError(null);
      finalAnswerRef.current = userAnswer; // preserve any already-typed text
      try {
        r.start();
        setRecording(true);
        setTimer(0);
      } catch {
        setError("Could not start microphone. Please check permissions.");
      }
    }
  };

  // ── Submit answer ───────────────────────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    const answer = userAnswer.trim();
    if (!answer) return;
    // Stop recording if still active
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      setInterimText("");
    }
    setSubmitting(true);
    setError(null);
    try {
      const evaluation = await apiFetch<EvaluationResult>("/api/interview/evaluate", {
        method: "POST",
        body: JSON.stringify({
          question: currentQuestion,
          userAnswer: answer,
          mode,
          questionId: currentQuestionId,
        }),
      });
      onAnswerSubmitted(currentQuestion, answer, evaluation);
      navigate("interview-feedback");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to evaluate answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout screen="interview-setup" navigate={navigate}>
      <div className="flex flex-col h-[calc(100vh-0px)] max-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-white">Live Session</span>
            <span className="text-xs text-white/35 font-['JetBrains_Mono']">{mode.charAt(0).toUpperCase() + mode.slice(1)} · {topic}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = !muted;
                setMuted(next);
                mutedRef.current = next;
                if (next) {
                  // Muting — cancel any speech in progress
                  window.speechSynthesis?.cancel();
                  setIsSpeaking(false);
                } else {
                  // Un-muting — re-read the current question
                  if (currentQuestion) speakQuestion(currentQuestion);
                }
              }}
              className={`p-2 rounded-lg cursor-pointer transition-all ${muted ? "bg-red-500/15 text-red-400" : "bg-white/5 text-white/50 hover:text-white"}`}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <Btn variant="danger" size="sm" onClick={() => navigate("interview-summary")}>
              End interview
            </Btn>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">

            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* AI + User side by side */}
            <div className="grid grid-cols-2 gap-5 flex-1">
              {/* AI Interviewer */}
              <Card className="p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4f6ef7] to-[#2dd4bf]" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#818cf8] flex items-center justify-center transition-all ${isSpeaking ? "shadow-lg shadow-[#4f6ef7]/40" : ""
                      }`}>
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d1730] ${isSpeaking ? "bg-blue-400 animate-pulse" : "bg-green-400"
                      }`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Alex — AI Interviewer</p>
                    <p className={`text-xs ${questionLoading ? "text-white/40" :
                      isSpeaking ? "text-blue-400" :
                        recording ? "text-white/40" :
                          "text-green-400"
                      }`}>
                      {questionLoading ? "Thinking..." :
                        isSpeaking ? "Speaking — listen carefully" :
                          recording ? "Listening to you..." :
                            "Ready for your answer"}
                    </p>
                  </div>
                </div>

                {/* Speech bubble */}
                <div className="flex-1 bg-[#4f6ef7]/8 border border-[#4f6ef7]/15 rounded-2xl p-5 relative">
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-[#4f6ef7]/8 border-l border-t border-[#4f6ef7]/15 rotate-45" />
                  {questionLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-[#818cf8] animate-spin" />
                      <span className="text-white/50 text-sm">Preparing your question...</span>
                    </div>
                  ) : (
                    <p className="text-white/80 text-sm leading-relaxed font-['Plus_Jakarta_Sans']">
                      "{currentQuestion}"
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-white/30">
                  {isSpeaking
                    ? <>
                      <div className="flex items-center gap-0.5">
                        {[3, 5, 4, 6, 3].map((h, i) => (
                          <div key={i} className="w-0.5 bg-blue-400 rounded-full animate-pulse" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                      <span className="text-blue-400">Alex is speaking{muted ? " (muted)" : ""}</span>
                    </>
                    : <>
                      <Headphones className="w-3.5 h-3.5" />
                      <span>{muted ? "Audio muted — question shown above" : "Listen, then tap the mic to answer"}</span>
                    </>
                  }
                </div>
              </Card>

              {/* User response panel */}
              <Card className="p-6 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#1a253d] border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                      You
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">You</p>
                      <p className={`text-xs ${recording ? "text-red-400" : "text-white/35"}`}>{recording ? "Recording..." : "Not recording"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-sm text-white/50">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(timer)}
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  {/* Waveform */}
                  <div className="flex items-center gap-1.5 h-10 justify-center">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all ${recording ? "bg-[#2dd4bf]" : "bg-white/10"}`}
                        style={{
                          height: recording ? `${Math.random() * 28 + 6}px` : "6px",
                          animation: recording ? `waveform ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : "none",
                          animationDelay: `${i * 0.04}s`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Mic button */}
                  <div className="relative flex justify-center">
                    {recording && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                        <div className="absolute -inset-3 rounded-full bg-red-500/10" />
                      </>
                    )}
                    <button
                      onClick={toggleRecording}
                      disabled={questionLoading}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-40 ${recording
                        ? "bg-red-500 shadow-red-500/30 scale-110"
                        : "bg-[#4f6ef7] shadow-[#4f6ef7]/30 hover:scale-105"
                        }`}
                    >
                      <Mic2 className="w-8 h-8 text-white" />
                    </button>
                  </div>
                  <p className="text-xs text-white/35 text-center">
                    {!voiceSupported
                      ? "Voice not supported in this browser — type below"
                      : recording
                        ? "Tap to stop · Speaking..."
                        : "Tap mic to start speaking"}
                  </p>

                  {/* Live interim transcript preview */}
                  {interimText && (
                    <div className="px-3 py-2 bg-[#4f6ef7]/6 border border-[#4f6ef7]/15 rounded-lg">
                      <p className="text-xs text-[#818cf8]/70 italic leading-relaxed">{interimText}</p>
                    </div>
                  )}

                  {/* Answer textarea — final transcript, editable */}
                  <div className="mt-1">
                    <p className="text-xs text-white/30 mb-1.5">
                      {voiceSupported ? "Transcript (tap mic, then edit if needed)" : "Your answer"}
                    </p>
                    <textarea
                      rows={4}
                      value={userAnswer}
                      onChange={(e) => {
                        setUserAnswer(e.target.value);
                        finalAnswerRef.current = e.target.value;
                      }}
                      placeholder={voiceSupported ? "Start speaking — your words will appear here..." : "Type your answer here..."}
                      className="w-full px-4 py-3 bg-white/3 border border-white/8 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#4f6ef7]/50 resize-none text-sm leading-relaxed"
                    />
                  </div>

                  <Btn
                    variant="teal"
                    className="w-full justify-center"
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim() || submitting || questionLoading}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
                      : "Submit Answer"}
                  </Btn>
                </div>
              </Card>
            </div>

            {/* Past questions (collapsible) */}
            {history.length > 0 && (
              <div>
                <button
                  onClick={() => setShowQuestions(!showQuestions)}
                  className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer mb-2"
                >
                  {showQuestions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Questions asked ({history.length})
                </button>
                {showQuestions && (
                  <div className="bg-white/3 rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        <span className="text-xs font-['JetBrains_Mono'] text-white/30 mt-0.5">Q{i + 1}</span>
                        <p className="text-sm text-white/50">{h.question}</p>
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── 9. Interview Feedback ────────────────────────────────────────────────────

function InterviewFeedbackScreen({
  navigate,
  question,
  evaluation,
  questionNumber,
  onNextQuestion,
}: {
  navigate: (s: Screen) => void;
  question: string;
  evaluation: EvaluationResult | null;
  questionNumber: number;
  onNextQuestion: () => void;
}) {
  if (!evaluation) {
    return (
      <AppLayout screen="interview-setup" navigate={navigate}>
        <div className="max-w-2xl mx-auto px-8 py-8 text-center">
          <p className="text-white/40">No feedback available. Complete a question first.</p>
          <Btn variant="primary" className="mt-4" onClick={() => navigate("interview-live")}>Back to Interview</Btn>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout screen="interview-setup" navigate={navigate}>
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#4f6ef7]/15 border border-[#4f6ef7]/25 flex items-center justify-center">
            <Brain className="w-4 h-4 text-[#818cf8]" />
          </div>
          <div>
            <p className="text-xs text-white/40">Feedback for Question {questionNumber}</p>
            <p className="text-sm font-semibold text-white truncate max-w-xs">{question}</p>
          </div>
        </div>

        <Card className="p-7 mb-5">
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white mb-5">Score Breakdown</h3>
          <div className="space-y-5">
            <ScoreBar label="Technical Accuracy" value={evaluation.technicalScore} color="bg-[#4f6ef7]" />
            <ScoreBar label="Communication Clarity" value={evaluation.communicationScore} color="bg-[#2dd4bf]" />
          </div>
        </Card>

        <Card className="p-7 mb-5">
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white mb-4">Improvement Points</h3>
          <div className="space-y-3">
            {evaluation.feedback.map((text, i) => (
              <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${i === evaluation.feedback.length - 1 ? "bg-green-500/6 border-green-500/15" : "bg-amber-500/6 border-amber-500/15"
                }`}>
                {i === evaluation.feedback.length - 1
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
                <p className="text-sm text-white/70 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Filler words */}
        {evaluation.fillerWords.length > 0 && (
          <div className="mb-8 bg-[#0d1730] border border-white/7 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-0.5">Filler word detection</p>
              <p className="text-sm text-white/50">
                You used:{" "}
                {evaluation.fillerWords.map((fw, i) => (
                  <span key={i}>
                    <span className="text-orange-400 font-semibold">"{fw.word}" {fw.count}×</span>
                    {i < evaluation.fillerWords.length - 1 ? " · " : ""}
                  </span>
                ))}
              </p>
            </div>
            <span className="text-2xl font-bold font-['JetBrains_Mono'] text-orange-400">
              {evaluation.fillerWords.reduce((sum, fw) => sum + fw.count, 0)}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <Btn variant="primary" onClick={onNextQuestion}>
            Next question <ChevronRight className="w-4 h-4" />
          </Btn>
          <Btn variant="secondary" onClick={() => navigate("interview-summary")}>
            End session
          </Btn>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── 10. Interview Summary ────────────────────────────────────────────────────

function InterviewSummaryScreen({
  navigate,
  mode,
  topic,
  transcript,
}: {
  navigate: (s: Screen) => void;
  mode: string;
  topic: string;
  transcript: TranscriptEntry[];
}) {
  const [openQ, setOpenQ] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">("saving");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Compute aggregate scores
  const techScore = transcript.length > 0
    ? Math.round(transcript.reduce((s, e) => s + e.technicalScore, 0) / transcript.length)
    : 0;
  const commScore = transcript.length > 0
    ? Math.round(transcript.reduce((s, e) => s + e.communicationScore, 0) / transcript.length)
    : 0;

  const handleSave = async () => {
    if (transcript.length === 0) {
      setSaveStatus("saved");
      return;
    }
    setSaveStatus("saving");
    setSaveError(null);
    try {
      await apiFetch("/api/interview/save", {
        method: "POST",
        body: JSON.stringify({
          mode,
          topic,
          technicalScore: techScore,
          communicationScore: commScore,
          transcript,
        }),
      });
      setSaveStatus("saved");
    } catch (err: any) {
      console.error("[interview/save]", err);
      setSaveStatus("error");
      setSaveError(err.message || "Failed to save session to cloud.");
    }
  };

  // Save session once on render
  useEffect(() => {
    handleSave();
  }, []);

  const strengths = transcript.flatMap((e) => e.feedback.slice(-1)); // last bullet (positive) per answer
  const improvements = transcript.flatMap((e) => e.feedback.slice(0, -1)); // earlier bullets (improvement) per answer

  return (
    <AppLayout screen="interview-setup" navigate={navigate}>
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">Session Complete</h1>
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  <CheckCircle2 className="w-3 h-3 text-teal-400" />
                  Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20">
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  Save failed
                  <button
                    onClick={handleSave}
                    className="ml-1 underline font-semibold text-red-200 hover:text-white cursor-pointer"
                  >
                    Retry
                  </button>
                </span>
              )}
            </div>
            <p className="text-sm text-white/40 mt-1">{mode.charAt(0).toUpperCase() + mode.slice(1)} Interview — {topic}</p>
          </div>
          <div className="flex gap-3">
            <Btn variant="secondary" size="sm" onClick={() => navigate("interview-setup")}>
              <RefreshCw className="w-4 h-4" /> Practice again
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => navigate("interview-setup")}>
              Try different topic
            </Btn>
          </div>
        </div>

        {transcript.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-white/40">No answers were recorded this session.</p>
            <Btn variant="primary" className="mt-4" onClick={() => navigate("interview-setup")}>Start a new session</Btn>
          </Card>
        ) : (
          <>
            {/* Score breakdown */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <Card className="p-7">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-[#818cf8]" />
                  <span className="font-semibold text-white">Technical Score</span>
                </div>
                <div className="font-['JetBrains_Mono'] text-5xl font-bold text-white mb-1">{techScore}<span className="text-xl text-white/30">/100</span></div>
                <p className="text-xs text-white/40 mb-4">{techScore >= 80 ? "Strong fundamentals." : techScore >= 60 ? "Solid base, room to grow." : "Needs more practice."}</p>
                <ScoreBar label="Accuracy" value={techScore} color="bg-[#4f6ef7]" />
              </Card>
              <Card className="p-7">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-[#2dd4bf]" />
                  <span className="font-semibold text-white">Communication Score</span>
                </div>
                <div className="font-['JetBrains_Mono'] text-5xl font-bold text-white mb-1">{commScore}<span className="text-xl text-white/30">/100</span></div>
                <p className="text-xs text-white/40 mb-4">{commScore >= 80 ? "Clear and structured." : "Good effort; work on structure."}</p>
                <ScoreBar label="Clarity" value={commScore} />
              </Card>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <h3 className="font-semibold text-white">Strengths</h3>
                </div>
                <div className="space-y-2.5">
                  {strengths.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                      <p className="text-sm text-white/60">{s}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-white">Improvements</h3>
                </div>
                <div className="space-y-2.5">
                  {improvements.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <p className="text-sm text-white/60">{s}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Transcript accordion */}
            <Card className="p-6">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white mb-4">Full Transcript</h3>
              <div className="space-y-2">
                {transcript.map(({ question, answer }, i) => (
                  <div key={i} className="border border-white/7 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenQ(openQ === i ? null : i)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer hover:bg-white/3 transition-all"
                    >
                      <span className="text-xs font-['JetBrains_Mono'] text-white/30 w-5 shrink-0">Q{i + 1}</span>
                      <span className="flex-1 text-sm text-white/80">{question}</span>
                      {openQ === i ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                    </button>
                    {openQ === i && (
                      <div className="px-5 pb-4 pt-2 border-t border-white/5">
                        <p className="text-xs text-white/35 mb-1.5">Your response:</p>
                        <p className="text-sm text-white/60 leading-relaxed">{answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

// ─── 11. Project Upload ───────────────────────────────────────────────────────

function ProjectUploadScreen({
  navigate,
  onResults,
}: {
  navigate: (s: Screen) => void;
  onResults: (results: ProjectAnalysis) => void;
}) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = ["Reading files...", "Understanding structure...", "Detecting tech stack...", "Generating questions..."];

  const validateAndSelectFile = (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".zip") && file.type !== "application/zip" && file.type !== "application/x-zip-compressed") {
      setError("Only .zip files are supported. Please upload a standard ZIP archive.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File size exceeds 20MB limit. Please upload a smaller ZIP archive.");
      return;
    }
    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setStep(0);

    // Animate steps while API runs
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, 1200);

    try {
      let data: ProjectAnalysis;
      if (tab === "url") {
        data = await apiFetch<ProjectAnalysis>("/api/project/analyze", {
          method: "POST",
          body: JSON.stringify({ githubUrl: url.trim() }),
        });
      } else {
        if (!selectedFile) {
          throw new Error("Please select a ZIP file to analyze.");
        }
        const fd = new FormData();
        fd.append("zip", selectedFile);
        data = await apiFetch<ProjectAnalysis>("/api/project/analyze", {
          method: "POST",
          body: fd,
        });
      }
      clearInterval(interval);
      onResults(data);
      navigate("project-results");
    } catch (err: unknown) {
      clearInterval(interval);
      setError((err as Error).message ?? "Failed to analyze project. Please try again.");
      setAnalyzing(false);
    }
  };

  return (
    <AppLayout screen="project-upload" navigate={navigate}>
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white mb-1">Project Analyzer</h1>
          <p className="text-white/40 text-sm">Upload your project and get interview-ready in minutes</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
          {(["upload", "url"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${tab === t ? "bg-[#4f6ef7] text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {t === "upload" ? <><Upload className="w-4 h-4" /> Upload ZIP</> : <><Link2 className="w-4 h-4" /> GitHub URL</>}
            </button>
          ))}
        </div>

        {tab === "upload" ? (
          <div
            className={`border-2 border-dashed rounded-2xl p-14 text-center mb-6 transition-colors cursor-pointer ${isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-white/10 hover:border-white/20"
              }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) validateAndSelectFile(f);
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Code2 className="w-7 h-7 text-blue-400" />
            </div>
            {selectedFile ? (
              <>
                <p className="text-white font-semibold mb-1">{selectedFile.name}</p>
                <p className="text-white/35 text-sm mb-5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · ZIP ready</p>
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove
                </Btn>
              </>
            ) : (
              <>
                <p className="text-white font-semibold mb-1">Drop your project ZIP here</p>
                <p className="text-white/35 text-sm mb-5">Max 20MB · ZIP archive</p>
                <Btn variant="secondary" size="sm">Browse files</Btn>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) validateAndSelectFile(f);
              }}
            />
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm text-white/50 mb-2">GitHub repository URL</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-[#4f6ef7]/50 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {analyzing ? (
          <div className="bg-[#0d1730] border border-white/7 rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="w-5 h-5 text-[#4f6ef7] animate-spin" />
              <span className="font-semibold text-white">Analyzing your project...</span>
            </div>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${i < step ? "bg-[#2dd4bf] border-[#2dd4bf]" : i === step ? "border-[#4f6ef7]" : "border-white/15"
                    }`}>
                    {i < step && <Check className="w-3 h-3 text-[#060d1f]" />}
                    {i === step && <div className="w-1.5 h-1.5 rounded-full bg-[#4f6ef7] animate-pulse" />}
                  </div>
                  <span className={`text-sm ${i <= step ? "text-white" : "text-white/30"}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Btn
            variant="primary"
            size="lg"
            onClick={handleAnalyze}
            disabled={(tab === "url" && !url.trim()) || (tab === "upload" && !selectedFile)}
          >
            <Sparkles className="w-5 h-5" /> Analyze Project
          </Btn>
        )}
      </div>
    </AppLayout>
  );
}

// ─── 12. Project Results ──────────────────────────────────────────────────────

function ProjectResultsScreen({
  navigate,
  results,
  onPracticeQuestion,
  onPracticePitch,
}: {
  navigate: (s: Screen) => void;
  results: ProjectAnalysis | null;
  onPracticeQuestion: (ctx: ProjectQuestionPracticeContext) => void;
  onPracticePitch: (ctx: ProjectPitchPracticeContext) => void;
}) {
  const [openQ, setOpenQ] = useState<number | null>(null);

  if (!results) {
    return (
      <AppLayout screen="project-upload" navigate={navigate}>
        <div className="max-w-4xl mx-auto px-8 py-8 text-center">
          <p className="text-white/40">No project analyzed yet.</p>
          <Btn variant="primary" className="mt-4" onClick={() => navigate("project-upload")}>Analyze a Project</Btn>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout screen="project-upload" navigate={navigate}>
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">Project Analysis</h1>
            <p className="text-sm text-white/40 mt-1">AI-powered code verification &amp; interview readiness</p>
          </div>
          <Btn variant="secondary" size="sm" onClick={() => navigate("project-upload")}>
            <Upload className="w-4 h-4" /> New project
          </Btn>
        </div>

        {/* Project summary */}
        <Card className="p-7 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Code2 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-lg mb-1.5">Repository Architecture</h3>
              <p className="text-sm text-white/50 mb-4 leading-relaxed">{results.summary}</p>
              <div>
                <p className="text-xs text-white/30 mb-2 font-['JetBrains_Mono'] uppercase tracking-wider">Detected tech stack</p>
                <div className="flex flex-wrap gap-2">
                  {results.stack.map((t) => (
                    <span key={t} className="px-2.5 py-1 bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 rounded-lg text-xs text-[#818cf8] font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 2-min pitch */}
        <Card className="p-7 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white">How to Explain This Project</h3>
              <p className="text-xs text-white/35 mt-0.5">AI-generated 2-minute pitch script (timed delivery)</p>
            </div>
            <Btn
              variant="teal"
              size="sm"
              onClick={() =>
                onPracticePitch({
                  pitch: results.pitch,
                  projectSummary: results.summary,
                  projectStack: results.stack,
                  projectName: "Uploaded Repository",
                })
              }
            >
              <Play className="w-3.5 h-3.5" /> Practice this script
            </Btn>
          </div>
          <div className="bg-white/3 border border-white/5 rounded-xl p-5 text-sm text-white/65 leading-relaxed whitespace-pre-wrap">
            {results.pitch}
          </div>
        </Card>

        {/* Likely questions */}
        <Card className="p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white">Likely Technical Questions</h3>
              <p className="text-xs text-white/40 mt-0.5">Grounded in actual file anchors and architectural decisions</p>
            </div>
          </div>
          <div className="space-y-3">
            {results.interviewQuestions.map((q, i) => {
              const matched =
                results.questionsWithEvidence?.find(
                  (item) => item.question === q || item.question.toLowerCase().includes(q.toLowerCase().slice(0, 30))
                ) || results.questionsWithEvidence?.[i];

              const diffColor =
                matched?.difficulty === "hard"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : matched?.difficulty === "medium"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-green-500/10 text-green-400 border-green-500/20";

              return (
                <div key={i} className="border border-white/7 rounded-xl overflow-hidden bg-white/2">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button onClick={() => setOpenQ(openQ === i ? null : i)} className="flex-1 flex items-center gap-3 text-left cursor-pointer">
                      <span className="text-xs font-['JetBrains_Mono'] text-white/30 w-5 shrink-0">Q{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {matched?.competency && (
                            <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-white/50 font-medium">
                              {matched.competency}
                            </span>
                          )}
                          {matched?.difficulty && (
                            <span className={`text-[10px] px-2 py-0.5 border rounded-full font-medium uppercase ${diffColor}`}>
                              {matched.difficulty}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-white/80 font-medium">{q}</span>
                      </div>
                      {openQ === i ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                    </button>
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        onPracticeQuestion({
                          question: matched?.question || q,
                          difficulty: (matched?.difficulty?.toLowerCase() as any) || "medium",
                          competency: matched?.competency || "System Architecture",
                          expectedAnswer: matched?.expectedAnswer || [
                            "Explain architectural trade-offs and implementation choices",
                            "Reference actual code modules, libraries, and data schemas",
                            "Discuss scalability, security, and edge-case handling",
                          ],
                          sourceEvidence: matched?.sourceEvidence || [],
                          projectName: "Uploaded Repository",
                          projectSummary: results.summary,
                          projectStack: results.stack,
                        })
                      }
                    >
                      Practice
                    </Btn>
                  </div>
                  {openQ === i && (
                    <div className="px-5 pb-4 border-t border-white/5 pt-3 space-y-3">
                      {matched?.sourceEvidence && matched.sourceEvidence.length > 0 && (
                        <div>
                          <p className="text-[11px] font-['JetBrains_Mono'] text-white/40 uppercase tracking-wider mb-1.5">
                            Code Anchor Evidence:
                          </p>
                          <div className="space-y-1.5">
                            {matched.sourceEvidence.map((ev, evIdx) => (
                              <div key={evIdx} className="bg-black/40 border border-white/8 rounded-lg p-2.5 text-xs font-mono">
                                <span className="text-blue-400 font-semibold">{ev.file}:</span>{" "}
                                <span className="text-white/60">"{ev.snippet}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {matched?.expectedAnswer && matched.expectedAnswer.length > 0 && (
                        <div>
                          <p className="text-[11px] font-['JetBrains_Mono'] text-white/40 uppercase tracking-wider mb-1">
                            Key Concepts Expected:
                          </p>
                          <ul className="list-disc list-inside text-xs text-white/50 space-y-0.5">
                            {matched.expectedAnswer.map((pt, ptIdx) => (
                              <li key={ptIdx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs text-white/40 leading-relaxed">
                        Tip: Structure your answer using the STAR format (Situation, Task, Action, Result) and clearly state trade-offs made in the implementation.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

// ─── 13. History Screen ───────────────────────────────────────────────────────

function HistoryScreen({
  navigate,
  onPracticeAgain,
}: {
  navigate: (s: Screen) => void;
  onPracticeAgain: (type: "Quiz" | "Interview", topic: string, difficulty?: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "quiz" | "interview">("all");
  type HistoryItem = {
    id: string;
    date: string;
    rawDate: string;  // ISO timestamp for correct chronological sorting
    type: "Quiz" | "Interview";
    topic: string;
    difficulty?: string;
    score: number;
    scoreText?: string;
    questions?: Array<{
      id?: number;
      question: string;
      type?: "mcq" | "text";
      options?: string[];
      correct?: number;
      explanation?: string;
      userAnswer?: { selectedIndex?: number | null; textAnswer?: string };
      ok?: boolean;
    }>;
    transcript?: Array<{
      question: string;
      answer: string;
      technicalScore?: number;
      communicationScore?: number;
      feedback?: string[];
      fillerWords?: Array<{ word: string; count: number }>;
    }>;
  };
  const [rows, setRows] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const [quizRes, interviewRes] = await Promise.all([
          supabase
            .from("quiz_attempts")
            .select("id, topic, difficulty, score, total, questions, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("interview_sessions")
            .select("id, mode, topic, technical_score, communication_score, transcript, created_at")
            .order("created_at", { ascending: false }),
        ]);

        const quizRows: HistoryItem[] = (quizRes.data ?? []).map((r) => {
          const qList = Array.isArray(r.questions) ? r.questions : [];
          const mcqQuestions = qList.filter((q: any) => q.type === "mcq" || (q.options && q.options.length > 0));
          const correctCount = qList.length > 0
            ? qList.filter((q: any) => q.ok === true).length
            : (r.score ?? 0);
          const gradedTotal = mcqQuestions.length > 0 ? mcqQuestions.length : (r.total > 0 ? r.total : qList.length);
          const finalTotal = Math.max(gradedTotal, correctCount, 1);
          const percentage = Math.min(100, Math.round((correctCount / finalTotal) * 100));

          return {
            id: r.id,
            date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            rawDate: r.created_at,  // ISO timestamp — used for correct chronological sorting
            type: "Quiz",
            topic: r.topic ?? "—",
            difficulty: r.difficulty ?? "medium",
            score: percentage,
            scoreText: `${correctCount}/${finalTotal} correct`,
            questions: qList,
          };
        });

        const interviewRows: HistoryItem[] = (interviewRes.data ?? []).map((r) => ({
          id: r.id,
          date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          rawDate: r.created_at,  // ISO timestamp — used for correct chronological sorting
          type: "Interview",
          topic: `${r.mode ? r.mode.charAt(0).toUpperCase() + r.mode.slice(1) : ""} — ${r.topic ?? "—"}`,
          score: Math.round(((r.technical_score ?? 0) + (r.communication_score ?? 0)) / 2),
          transcript: Array.isArray(r.transcript) ? r.transcript : [],
        }));

        // Sort newest-first using raw ISO timestamps (not locale strings)
        setRows([...quizRows, ...interviewRows].sort(
          (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
        ));
      } catch (err) {
        console.error("[history]", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.type.toLowerCase() === filter);

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-[#0d1730] border border-white/10 rounded-xl p-3 text-xs">
        <p className="text-white/50 mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.dataKey}: {p.value}%</p>
        ))}
      </div>
    );
  };

  const chartData = [...rows]
    .reverse()
    .slice(-8)
    .map((r, i) => ({
      date: `S${i + 1} (${r.type[0]}: ${r.topic.slice(0, 10)})`,
      quiz: r.type === "Quiz" ? r.score : undefined,
      interview: r.type === "Interview" ? r.score : undefined,
    }));

  return (
    <AppLayout screen="history" navigate={navigate}>
      <div className="max-w-6xl mx-auto px-8 py-8">
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white mb-8">Performance &amp; History</h1>

        {/* Progress chart */}
        <Card className="p-6 mb-8">
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white mb-4">Score Trends</h3>
          {chartData.length > 0 ? (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={customTooltip} />
                    <Line type="monotone" dataKey="quiz" stroke="#4f6ef7" strokeWidth={2} dot={true} connectNulls />
                    <Line type="monotone" dataKey="interview" stroke="#2dd4bf" strokeWidth={2} dot={true} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-6 mt-4 text-xs text-white/50 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#4f6ef7]" /> Quiz Accuracy
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#2dd4bf]" /> Mock Interview Overall Score
                </div>
              </div>
            </>
          ) : (
            <div className="h-44 w-full flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-sm font-semibold text-white/60">No Practice Sessions Recorded Yet</p>
              <p className="text-xs text-white/35 max-w-sm mt-1">Complete your first quiz or mock interview to start tracking your performance trends over time.</p>
            </div>
          )}
        </Card>

        {/* Filter bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-white/3 border border-white/8 p-1 rounded-xl">
            {(["all", "quiz", "interview"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-all ${filter === f ? "bg-[#4f6ef7] text-white shadow-md shadow-[#4f6ef7]/20" : "text-white/40 hover:text-white"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center gap-3 py-8 justify-center">
                <Loader2 className="w-5 h-5 text-[#4f6ef7] animate-spin" />
                <span className="text-white/40 text-sm">Loading history...</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-white/30 text-sm py-8">No sessions yet. Complete a quiz or interview to see your history here.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Date", "Type", "Topic", "Score", ""].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-xs text-white/30 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                      <td className="py-3.5 px-3 text-white/50 text-xs font-['JetBrains_Mono']">{row.date}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${row.type === "Quiz" ? "bg-violet-500/15 text-violet-300" : "bg-teal-500/15 text-teal-300"
                          }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-white/70">{row.topic}</td>
                      <td className="py-3.5 px-3">
                        <span className={`font-bold font-['JetBrains_Mono'] ${row.score >= 80 ? "text-[#2dd4bf]" : row.score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                          {row.score}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          onClick={() => setSelectedRow(row)}
                          className="text-xs text-[#4f6ef7] hover:text-[#818cf8] font-medium cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-[#4f6ef7]/10"
                        >
                          View Report →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* ── Detailed Q&A Report Overlay Modal ─────────────────────────────────── */}
      {selectedRow && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSelectedRow(null)}
          />
          {/* Slide-over Drawer / Wide Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-[#0d1730] border-l border-white/8 z-50 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 bg-[#091024]">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${selectedRow.type === "Quiz"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                  }`}>
                  {selectedRow.type} Report
                </span>
                <span className="text-white/40 text-xs font-['JetBrains_Mono']">{selectedRow.date}</span>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
              {/* Session Overview Card */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle
                      cx="40" cy="40" r="32" fill="none"
                      stroke={selectedRow.score >= 80 ? "#2dd4bf" : selectedRow.score >= 60 ? "#f59e0b" : "#f87171"}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - selectedRow.score / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold font-['JetBrains_Mono'] ${selectedRow.score >= 80 ? "text-[#2dd4bf]" : selectedRow.score >= 60 ? "text-amber-400" : "text-red-400"
                      }`}>{selectedRow.score}%</span>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs text-white/35 uppercase tracking-widest mb-1">Topic</p>
                  <h3 className="text-white font-bold text-lg leading-snug mb-2">{selectedRow.topic}</h3>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-white/50">
                    {selectedRow.difficulty && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 capitalize">
                        Difficulty: {selectedRow.difficulty}
                      </span>
                    )}
                    {selectedRow.scoreText && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {selectedRow.scoreText}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className={`rounded-xl p-4 border ${selectedRow.score >= 80
                ? "bg-teal-500/8 border-teal-500/20"
                : selectedRow.score >= 60
                  ? "bg-amber-500/8 border-amber-500/20"
                  : "bg-red-500/8 border-red-500/20"
                }`}>
                <p className={`text-sm font-semibold mb-1 ${selectedRow.score >= 80 ? "text-teal-300" : selectedRow.score >= 60 ? "text-amber-300" : "text-red-300"
                  }`}>
                  {selectedRow.score >= 80
                    ? "🎉 Strong performance — keep it up!"
                    : selectedRow.score >= 60
                      ? "📈 Good start — a bit more practice recommended"
                      : "📚 Score below 60% — focused review needed"}
                </p>
                <p className="text-xs text-white/40">
                  {selectedRow.type === "Quiz"
                    ? selectedRow.score >= 80
                      ? "Try a harder difficulty or a different topic to keep improving."
                      : "Retake this quiz or try an interview session on the same topic."
                    : selectedRow.score >= 80
                      ? "Great interview performance. Try a project analysis next."
                      : "Practice more interview questions on this topic to improve your scores."}
                </p>
              </div>

              {/* ── Section: Questions & Answers Report ── */}
              <div className="pt-2">
                <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-base mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4f6ef7]" />
                  Question &amp; Answer Report
                </h4>

                {/* IF QUIZ REPORT */}
                {selectedRow.type === "Quiz" && (
                  !selectedRow.questions || selectedRow.questions.length === 0 ? (
                    <div className="p-6 bg-white/2 border border-white/6 rounded-xl text-center text-white/40 text-sm">
                      No detailed question data saved for this attempt.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedRow.questions.map((q, idx) => {
                        const userAns = q.userAnswer ?? { selectedIndex: null, textAnswer: "" };
                        const isCorrect = q.ok === true;
                        const isIncorrect = q.ok === false;
                        const isText = q.type === "text" || q.correct === -1;

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border transition-all ${isCorrect
                              ? "bg-green-500/5 border-green-500/20"
                              : isIncorrect
                                ? "bg-red-500/5 border-red-500/20"
                                : "bg-blue-500/5 border-blue-500/20"
                              }`}
                          >
                            {/* Header */}
                            <div className="flex items-center justify-between gap-3 mb-2.5">
                              <span className="text-xs font-semibold text-white/40 font-['JetBrains_Mono']">
                                Q{idx + 1}
                              </span>
                              <div>
                                {isCorrect && (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full border border-green-500/20">
                                    <CheckCircle2 className="w-3 h-3" /> Correct
                                  </span>
                                )}
                                {isIncorrect && (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/20">
                                    <XCircle className="w-3 h-3" /> Incorrect
                                  </span>
                                )}
                                {isText && (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/20">
                                    <Sparkles className="w-3 h-3" /> Short Answer
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Question text */}
                            <p className="text-white text-xs font-medium leading-relaxed mb-3">
                              {q.question}
                            </p>

                            {/* Options for MCQ */}
                            {q.options && q.options.length > 0 && (
                              <div className="space-y-1.5 mb-3">
                                {q.options.map((opt, optIdx) => {
                                  const isUserSelected = userAns.selectedIndex === optIdx;
                                  const isRightAnswer = q.correct === optIdx;

                                  let style = "bg-white/2 border-white/6 text-white/50";
                                  if (isRightAnswer) {
                                    style = "bg-green-500/15 border-green-500/30 text-green-300 font-medium";
                                  } else if (isUserSelected && !isRightAnswer) {
                                    style = "bg-red-500/15 border-red-500/30 text-red-300";
                                  }

                                  return (
                                    <div key={optIdx} className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${style}`}>
                                      <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">
                                          {String.fromCharCode(65 + optIdx)}
                                        </span>
                                        {opt}
                                      </span>
                                      {isUserSelected && (
                                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10">
                                          {isRightAnswer ? "Your Answer ✓" : "Your Answer ✕"}
                                        </span>
                                      )}
                                      {!isUserSelected && isRightAnswer && (
                                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">
                                          Correct Option
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Short answer text */}
                            {isText && (
                              <div className="mb-3 bg-white/3 border border-white/6 rounded-lg p-2.5">
                                <p className="text-[10px] text-white/35 mb-0.5">Your Answer:</p>
                                <p className="text-xs text-white/80 italic">{userAns.textAnswer || "No answer provided"}</p>
                              </div>
                            )}

                            {/* Explanation */}
                            {q.explanation && (
                              <div className="bg-[#4f6ef7]/8 border border-[#4f6ef7]/15 rounded-lg p-2.5 text-xs text-white/70 leading-relaxed">
                                <span className="font-semibold text-[#818cf8] block mb-0.5">💡 Explanation:</span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* IF INTERVIEW REPORT */}
                {selectedRow.type === "Interview" && (
                  !selectedRow.transcript || selectedRow.transcript.length === 0 ? (
                    <div className="p-6 bg-white/2 border border-white/6 rounded-xl text-center text-white/40 text-sm">
                      No transcript details recorded for this session.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedRow.transcript.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white/40 font-['JetBrains_Mono']">
                              Question {idx + 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.technicalScore != null && (
                                <span className="text-[10px] font-semibold text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded border border-teal-500/20">
                                  Tech: {item.technicalScore}%
                                </span>
                              )}
                              {item.communicationScore != null && (
                                <span className="text-[10px] font-semibold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/20">
                                  Comm: {item.communicationScore}%
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Question</p>
                            <p className="text-xs font-medium text-white leading-relaxed">{item.question}</p>
                          </div>

                          <div className="bg-white/4 border border-white/6 rounded-lg p-2.5">
                            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Your Response</p>
                            <p className="text-xs text-white/80 leading-relaxed italic">{item.answer || "No spoken answer recorded."}</p>
                          </div>

                          {item.feedback && item.feedback.length > 0 && (
                            <div className="bg-[#4f6ef7]/8 border border-[#4f6ef7]/15 rounded-lg p-2.5 text-xs space-y-1">
                              <p className="font-semibold text-[#818cf8] mb-0.5">AI Feedback:</p>
                              {item.feedback.map((fb, fIdx) => (
                                <p key={fIdx} className="text-white/70 flex items-start gap-1 text-[11px]">
                                  <span className="text-[#818cf8]">•</span> {fb}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Footer CTAs */}
            <div className="px-6 py-5 border-t border-white/8 flex gap-3">
              <Btn
                variant="primary"
                className="flex-1"
                onClick={() => {
                  const row = selectedRow;
                  setSelectedRow(null);
                  onPracticeAgain(row.type, row.topic, row.difficulty);
                }}
              >
                Practice again
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => setSelectedRow(null)}
              >
                Close
              </Btn>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

// ─── 14. Profile Screen ───────────────────────────────────────────────────────

function ProfileScreen({ navigate, user }: { navigate: (s: Screen) => void; user: User | null }) {
  const [difficulty, setDifficulty] = useState(
    user?.user_metadata?.preferred_difficulty || "medium"
  );
  const [inputMode, setInputMode] = useState(
    user?.user_metadata?.preferred_response_mode || "voice"
  );
  const [name, setName] = useState(
    user?.user_metadata?.full_name || user?.user_metadata?.name || ""
  );
  const [college, setCollege] = useState(
    user?.user_metadata?.college || ""
  );
  const [gradYear, setGradYear] = useState(
    user?.user_metadata?.grad_year || "2026"
  );
  const realEmail = user?.email || "";

  // Candidate Intelligence — fetch misconceptions and competency stats
  const candidateIntel = useCandidateIntelligence();

  const totalAnswered = candidateIntel.competencyScores.reduce((sum, c) => sum + (c.attempts || 0), 0);
  const competenciesTracked = candidateIntel.competencyScores.length;
  const activeMisconceptions = candidateIntel.unresolvedMisconceptions.length;

  // When a misconception is resolved, refresh the full CI data so dashboard count updates
  const handleMisconceptionResolved = () => {
    candidateIntel.refresh();
  };

  // Google-signed-in users can't change their password via the app
  const isGoogleUser = user?.app_metadata?.provider === "google";
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          name: name.trim(),
          college: college.trim(),
          grad_year: gradYear,
          preferred_difficulty: difficulty,
          preferred_response_mode: inputMode,
        },
      });
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(
      "⚠️ This will permanently delete your account and all data (quiz history, interview sessions, resumes, saved keys). This cannot be undone. Continue?"
    )) return;
    if (!confirm("Last confirmation: Delete my account and all data permanently?")) return;

    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      await apiFetch("/api/account", { method: "DELETE" });
      await supabase.auth.signOut();
      navigate("landing");
    } catch (err: any) {
      console.error("[account deletion]", err);
      setDeleteAccountError("Account deletion failed. Your account has not been deleted. Please check your connection and try again.");
      setDeletingAccount(false);
    }
  };

  return (
    <AppLayout screen="profile" navigate={navigate} user={user}>
      <div className="max-w-3xl mx-auto px-8 py-8">
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white mb-8">Profile &amp; Settings</h1>

        {/* Avatar + basic info */}
        <Card className="p-7 mb-5">
          <div className="flex items-start gap-6 mb-6">
            <div className="relative">
              {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                <img
                  src={user.user_metadata.avatar_url || user.user_metadata.picture}
                  alt={name || "Profile"}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4f6ef7] to-[#2dd4bf] flex items-center justify-center text-2xl font-bold text-white">
                  {(name || realEmail).slice(0, 2).toUpperCase() || "U"}
                </div>
              )}
              {isGoogleUser && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center ring-2 ring-[#060d1f]">
                  <GoogleIcon className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-xl">{name || realEmail}</h3>
              <p className="text-white/40 text-sm mt-0.5">{realEmail}</p>
              {isGoogleUser && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">
                  <GoogleIcon className="w-3 h-3" /> Signed in with Google
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2.5 py-1 rounded-lg border border-white/8">
                  <Target className="w-3.5 h-3.5 text-[#4f6ef7]" />
                  <span><strong className="text-white font-['JetBrains_Mono']">{totalAnswered}</strong> answers evaluated</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-2.5 py-1 rounded-lg border border-white/8">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span><strong className="text-white font-['JetBrains_Mono']">{competenciesTracked}</strong> competencies</span>
                </div>
                {activeMisconceptions > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span><strong className="text-amber-200 font-['JetBrains_Mono']">{activeMisconceptions}</strong> active misconception{activeMisconceptions === 1 ? "" : "s"}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>0 active misconceptions</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white text-sm focus:outline-none focus:border-[#4f6ef7]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">College / Institution</label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. University / College name"
                className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white text-sm focus:outline-none focus:border-[#4f6ef7]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Email</label>
              <input
                type="email"
                value={realEmail}
                readOnly
                className="w-full px-4 py-3 bg-white/3 border border-white/5 rounded-xl text-white/40 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Graduation year</label>
              <div className="relative">
                <select
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white text-sm appearance-none focus:outline-none focus:border-[#4f6ef7]/50 cursor-pointer"
                >
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              </div>
            </div>

            {saveSuccess && (
              <div className="col-span-2 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Profile updated successfully.
              </div>
            )}
            {saveError && (
              <div className="col-span-2 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {saveError}
              </div>
            )}
            <div className="col-span-2 flex justify-end pt-2">
              <Btn
                variant="primary"
                onClick={handleSaveProfile}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Save Profile
                  </>
                )}
              </Btn>
            </div>
          </div>
        </Card>

        {/* Preferences */}
        <Card className="p-7 mb-5">
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white mb-5">Practice Preferences</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-white/50 mb-3">Default difficulty</label>
              <div className="flex gap-3">
                {["easy", "medium", "hard"].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDifficulty(d);
                    }}
                    className={`px-5 py-2 rounded-xl text-sm font-medium border capitalize cursor-pointer transition-all ${difficulty === d
                      ? d === "easy" ? "bg-green-500/15 border-green-500/30 text-green-400"
                        : d === "medium" ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          : "bg-red-500/15 border-red-500/30 text-red-400"
                      : "bg-white/3 border-white/8 text-white/50 hover:border-white/15"
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-3">Default response mode</label>
              <div className="flex gap-3">
                {[
                  { id: "voice", label: "Voice mode", icon: Mic2 },
                  { id: "text", label: "Text mode", icon: FileText },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setInputMode(id);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border cursor-pointer transition-all ${inputMode === id ? "border-[#2dd4bf] bg-[#2dd4bf]/10 text-[#2dd4bf]" : "border-white/8 bg-white/3 text-white/50 hover:border-white/15"}`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Misconceptions — Candidate Intelligence learning loop */}
        <Card className="p-7 mb-5">
          <MisconceptionPanel
            misconceptions={candidateIntel.unresolvedMisconceptions}
            loading={candidateIntel.loading}
            error={candidateIntel.error}
            onResolved={handleMisconceptionResolved}
          />
        </Card>

        {/* Plan & Features */}
        <Card className="p-7 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white">Developer Edition</h3>
                <span className="px-2.5 py-0.5 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">Active</span>
              </div>
              <p className="text-sm text-white/40">Full access to canonical technical topics, candidate intelligence mastery, ATS audits, and AI interview simulations.</p>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 18 Canonical Technical Domains</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Evidence-Grounded Project &amp; Resume Q&amp;A</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Adaptive Competency Mastery</span>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="p-7 mb-5 border border-red-500/15">
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-red-400 mb-2 text-sm uppercase tracking-wider">Danger Zone</h3>
          <p className="text-sm text-white/40 mb-4">
            Permanently deletes your account and all data — quiz history, interview sessions, resumes, and saved API keys. This cannot be undone.
          </p>
          {deleteAccountError && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200">{deleteAccountError}</p>
                <p className="text-white/40 mt-1">Check your connection and click below to retry.</p>
              </div>
            </div>
          )}
          <Btn
            id="delete-account-btn"
            variant="danger"
            size="sm"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? "Deleting…" : "Delete my account"}
          </Btn>
        </Card>
      </div>
    </AppLayout>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const PROTECTED_SCREENS: Screen[] = [
  "dashboard", "quiz-select", "quiz-progress", "quiz-results",
  "interview-setup", "interview-live", "interview-feedback", "interview-summary",
  "project-upload", "project-results", "project-question-practice", "project-pitch-practice",
  "history", "profile", "settings",
  "resume-home", "resume-upload", "resume-gallery", "resume-editor",
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // ── Shared quiz state ───────────────────────────────────────────────────────
  const [quizSession, setQuizSession] = useState<{
    topic: string;
    difficulty: string;
    questions: QuizQuestion[];
    userAnswers: Array<{ selectedIndex: number | null; textAnswer: string }>;
  } | null>(null);

  // ── Shared interview state ──────────────────────────────────────────────────
  const [interviewConfig, setInterviewConfig] = useState<{
    mode: "technical" | "hr" | "project" | "resume";
    topic: string;
    resumeText?: string;
  }>({ mode: "technical", topic: "Java" });

  const [interviewHistory, setInterviewHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [interviewTranscript, setInterviewTranscript] = useState<TranscriptEntry[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationResult | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");

  // ── Shared project state ────────────────────────────────────────────────────
  const [projectResults, setProjectResults] = useState<ProjectAnalysis | null>(null);
  const [selectedProjectQuestion, setSelectedProjectQuestion] = useState<ProjectQuestionPracticeContext | null>(null);
  const [selectedProjectPitch, setSelectedProjectPitch] = useState<ProjectPitchPracticeContext | null>(null);

  // ── History prefill state ───────────────────────────────────────────────────
  const [prefilledQuizTopic, setPrefilledQuizTopic] = useState<string | null>(null);
  const [prefilledQuizDifficulty, setPrefilledQuizDifficulty] = useState<string | null>(null);
  const [prefilledInterviewMode, setPrefilledInterviewMode] = useState<"technical" | "hr" | "project" | "resume" | null>(null);
  const [prefilledInterviewTopic, setPrefilledInterviewTopic] = useState<string | null>(null);

  // ── Resume state ─────────────────────────────────────────────────────────────
  const [selectedResume, setSelectedResume] = useState<SavedResumeRecord | null>(null);
  const [resumePrefillData, setResumePrefillData] = useState<ResumeFormData | null>(null);
  const [resumeToneNote, setResumeToneNote] = useState<string | null>(null);
  const [resumeTemplateId, setResumeTemplateId] = useState<"classic" | "modern" | "compact">("modern");
  const [resumeSourceMode, setResumeSourceMode] = useState<"reference_upload" | "from_scratch">("from_scratch");
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Listen for global session expiration events dispatched by apiFetch
  useEffect(() => {
    const handleSessionExpired = () => {
      supabase.auth.signOut().catch(() => { });
      setUser(null);
      setScreen("auth");
    };
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  useEffect(() => {
    // Check if recovery link was clicked (contains type=recovery in hash or query)
    const hash = window.location.hash || "";
    const query = window.location.search || "";
    if (hash.includes("type=recovery") || query.includes("type=recovery")) {
      setScreen("reset-password");
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthChecked(true);

      // Check first-time onboarding
      if (currentUser) {
        const completed = localStorage.getItem(`interviewprep_onboarding_completed_${currentUser.id}`);
        if (!completed) {
          setShowOnboarding(true);
        }

        // After Google OAuth redirect, land on dashboard instead of landing/auth
        const currentScreen = screen;
        if (currentScreen === "landing" || currentScreen === "auth") {
          setScreen("dashboard");
        }
        // Strip OAuth code / tokens from the URL bar
        if (window.location.hash || window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (!newUser) {
        setScreen("landing");
      } else if (event === "PASSWORD_RECOVERY") {
        setScreen("reset-password");
      } else if (event === "SIGNED_IN") {
        // Handle fresh sign-in (email or OAuth callback)
        setScreen((prev) =>
          prev === "landing" || prev === "auth" ? "dashboard" : prev
        );
        // Check first-time onboarding
        const completed = localStorage.getItem(`interviewprep_onboarding_completed_${newUser.id}`);
        if (!completed) {
          setShowOnboarding(true);
        }
        // Strip OAuth code / tokens from the URL bar
        if (window.location.hash || window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigate = (s: Screen) => {
    if (PROTECTED_SCREENS.includes(s) && !user) {
      setScreen("auth");
      return;
    }
    setScreen(s);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#060d1f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4f6ef7] animate-spin" />
      </div>
    );
  }

  // ── Quiz helpers ────────────────────────────────────────────────────────────
  const handleQuestionsReady = (questions: QuizQuestion[], topic: string, difficulty: string) => {
    setQuizSession({
      topic,
      difficulty,
      questions,
      userAnswers: questions.map(() => ({ selectedIndex: null, textAnswer: "" })),
    });
  };

  const handleQuizAnswer = (index: number, selectedIndex: number | null, textAnswer: string) => {
    setQuizSession((prev) => {
      if (!prev) return prev;
      const updated = [...prev.userAnswers];
      updated[index] = { selectedIndex, textAnswer };
      return { ...prev, userAnswers: updated };
    });
  };

  // ── Interview helpers ───────────────────────────────────────────────────────
  const handleInterviewStart = (
    mode: "technical" | "hr" | "project" | "resume",
    topic: string,
    resumeText?: string
  ) => {
    setInterviewConfig({ mode, topic, resumeText });
    setInterviewHistory([]);
    setInterviewTranscript([]);
    setCurrentEvaluation(null);
    setCurrentQuestion("");
  };

  const handleAnswerSubmitted = (question: string, answer: string, evaluation: EvaluationResult) => {
    setCurrentQuestion(question);
    setCurrentEvaluation(evaluation);
    const entry: TranscriptEntry = { question, answer, ...evaluation };
    setInterviewTranscript((prev) => [...prev, entry]);
    setInterviewHistory((prev) => [...prev, { question, answer }]);
  };

  const handleNextQuestion = () => {
    setCurrentEvaluation(null);
    navigate("interview-live");
  };

  const handlePracticeAgain = (type: "Quiz" | "Interview", topic: string, difficulty?: string) => {
    if (type === "Quiz") {
      setPrefilledQuizTopic(topic);
      setPrefilledQuizDifficulty(difficulty || "medium");
      navigate("quiz-select");
    } else {
      const mode = (topic.toLowerCase().includes("hr") || topic.toLowerCase().includes("behavioral"))
        ? "hr"
        : topic.toLowerCase().includes("project")
          ? "project"
          : topic.toLowerCase().includes("resume")
            ? "resume"
            : "technical";
      setPrefilledInterviewMode(mode);
      setPrefilledInterviewTopic(topic);
      navigate("interview-setup");
    }
  };

  // ── Screen map ───────────────────────────────────────────────────────────────
  const screens: Record<Screen, React.ReactNode> = {
    landing: <LandingScreen navigate={navigate} />,
    auth: <AuthScreen navigate={navigate} />,
    dashboard: <DashboardScreen navigate={navigate} user={user} />,

    "quiz-select": (
      <QuizSelectScreen
        navigate={navigate}
        onQuestionsReady={handleQuestionsReady}
        initialTopic={prefilledQuizTopic}
        initialDifficulty={prefilledQuizDifficulty}
      />
    ),
    "quiz-progress": (
      <QuizProgressScreen
        navigate={navigate}
        questions={quizSession?.questions ?? []}
        userAnswers={quizSession?.userAnswers ?? []}
        onAnswer={handleQuizAnswer}
      />
    ),
    "quiz-results": (
      <QuizResultsScreen
        navigate={navigate}
        questions={quizSession?.questions ?? []}
        userAnswers={quizSession?.userAnswers ?? []}
        topic={quizSession?.topic ?? ""}
        difficulty={quizSession?.difficulty ?? "medium"}
      />
    ),

    "interview-setup": (
      <InterviewSetupScreen
        navigate={navigate}
        onStart={handleInterviewStart}
        initialMode={prefilledInterviewMode || undefined}
        initialTopic={prefilledInterviewTopic || undefined}
      />
    ),
    "interview-live": (
      <InterviewLiveScreen
        navigate={navigate}
        mode={interviewConfig.mode}
        topic={interviewConfig.topic}
        history={interviewHistory}
        resumeText={interviewConfig.resumeText}
        onAnswerSubmitted={handleAnswerSubmitted}
      />
    ),
    "interview-feedback": (
      <InterviewFeedbackScreen
        navigate={navigate}
        question={currentQuestion}
        evaluation={currentEvaluation}
        questionNumber={interviewTranscript.length}
        onNextQuestion={handleNextQuestion}
      />
    ),
    "interview-summary": (
      <InterviewSummaryScreen
        navigate={navigate}
        mode={interviewConfig.mode}
        topic={interviewConfig.topic}
        transcript={interviewTranscript}
      />
    ),

    "project-upload": (
      <ProjectUploadScreen
        navigate={navigate}
        onResults={setProjectResults}
      />
    ),
    "project-results": (
      <ProjectResultsScreen
        navigate={navigate}
        results={projectResults}
        onPracticeQuestion={(ctx) => {
          setSelectedProjectQuestion(ctx);
          navigate("project-question-practice");
        }}
        onPracticePitch={(ctx) => {
          setSelectedProjectPitch(ctx);
          navigate("project-pitch-practice");
        }}
      />
    ),
    "project-question-practice": selectedProjectQuestion ? (
      <ProjectQuestionPracticeScreen
        context={selectedProjectQuestion}
        onBack={() => navigate("project-results")}
      />
    ) : (
      <ProjectUploadScreen
        navigate={navigate}
        onResults={setProjectResults}
      />
    ),
    "project-pitch-practice": selectedProjectPitch ? (
      <ProjectPitchPracticeScreen
        context={selectedProjectPitch}
        onBack={() => navigate("project-results")}
      />
    ) : (
      <ProjectUploadScreen
        navigate={navigate}
        onResults={setProjectResults}
      />
    ),

    "resume-home": (
      <AppLayout screen="resume-home" navigate={navigate}>
        <ResumeHomeScreen
          navigate={navigate as (s: string) => void}
          onSelectResume={(r) => {
            setSelectedResume(r);
            navigate("resume-editor");
          }}
          onStartScratch={() => {
            setSelectedResume(null);
            setResumePrefillData(null);
            setResumeSourceMode("from_scratch");
            navigate("resume-gallery");
          }}
          onStartUpload={() => {
            setSelectedResume(null);
            setResumePrefillData(null);
            setResumeSourceMode("reference_upload");
            navigate("resume-upload");
          }}
        />
      </AppLayout>
    ),

    "resume-upload": (
      <AppLayout screen="resume-home" navigate={navigate}>
        <ResumeReferenceUploadScreen
          onProceed={({ prefillData, toneNote }) => {
            setResumePrefillData(prefillData);
            setResumeToneNote(toneNote);
            navigate("resume-editor");
          }}
          onCancel={() => navigate("resume-home")}
        />
      </AppLayout>
    ),

    "resume-gallery": (
      <AppLayout screen="resume-home" navigate={navigate}>
        <ResumeTemplateGalleryScreen
          onSelectTemplate={(tId) => {
            setResumeTemplateId(tId);
            navigate("resume-editor");
          }}
          onCancel={() => navigate("resume-home")}
        />
      </AppLayout>
    ),

    "resume-editor": (
      <AppLayout screen="resume-home" navigate={navigate}>
        <ResumeEditorScreen
          initialResume={selectedResume}
          initialPrefillData={resumePrefillData}
          initialToneNote={resumeToneNote}
          initialTemplateId={resumeTemplateId}
          initialSourceMode={resumeSourceMode}
          onBack={() => navigate("resume-home")}
        />
      </AppLayout>
    ),

    history: (
      <HistoryScreen
        navigate={navigate}
        onPracticeAgain={handlePracticeAgain}
      />
    ),
    profile: <ProfileScreen navigate={navigate} user={user} />,
    settings: (
      <AppLayout screen="settings" navigate={navigate} user={user}>
        <div className="max-w-4xl mx-auto px-8 py-8">
          <AiProviderSettings onBack={() => navigate("profile")} />
        </div>
      </AppLayout>
    ),
    help: (
      <AppLayout screen="help" navigate={navigate} user={user}>
        <HelpScreen
          onNavigate={(s) => navigate(s as Screen)}
          onOpenSettings={() => navigate("settings")}
        />
      </AppLayout>
    ),
    "reset-password": (
      <ResetPasswordScreen
        onSuccess={() => navigate("dashboard")}
        onCancel={() => navigate("auth")}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-[#060d1f]">
      {screens[screen]}
      {user && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => {
            if (user) {
              localStorage.setItem(`interviewprep_onboarding_completed_${user.id}`, "true");
            }
            setShowOnboarding(false);
          }}
          onNavigate={(s) => {
            setShowOnboarding(false);
            navigate(s as Screen);
          }}
          onOpenSettings={() => {
            setShowOnboarding(false);
            navigate("settings");
          }}
        />
      )}
    </div>
  );
}

