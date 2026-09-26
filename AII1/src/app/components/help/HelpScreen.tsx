// AII1/src/app/components/help/HelpScreen.tsx
// Comprehensive In-App User Guide & Getting Started documentation.
// Explains every major user workflow and feature step-by-step so users
// never need to inspect source code or wonder how features operate.

import { useState } from "react";
import {
  BookOpen, Brain, MessageSquare, FolderGit2, FileText,
  Award, Key, CheckCircle2, ChevronRight, ExternalLink,
  Shield, Sparkles, HelpCircle, ArrowRight, Zap, AlertCircle
} from "lucide-react";

interface HelpScreenProps {
  onNavigate: (screen: string) => void;
  onOpenSettings?: () => void;
}

type TabKey = "overview" | "quiz" | "interview" | "project" | "resume" | "candidate" | "gemini";

export function HelpScreen({ onNavigate, onOpenSettings }: HelpScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
    { key: "overview", label: "Overview", icon: BookOpen },
    { key: "quiz", label: "Practice Quizzes", icon: Brain },
    { key: "interview", label: "Mock Interviews", icon: MessageSquare },
    { key: "project", label: "Project Analyzer", icon: FolderGit2 },
    { key: "resume", label: "Resume & ATS", icon: FileText },
    { key: "candidate", label: "Candidate Intelligence", icon: Award },
    { key: "gemini", label: "Gemini API Key", icon: Key },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 text-white">
      {/* Top Banner */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">
          <HelpCircle size={15} />
          <span>Documentation &amp; User Guide</span>
        </div>
        <h1 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-white">
          How to Use InterviewPrep AI
        </h1>
        <p className="text-sm text-white/60 mt-1 max-w-2xl leading-relaxed">
          Master computer science concepts, simulate realistic interviews, defend real projects, and craft ATS-optimized resumes with AI-driven guidance.
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-white/8 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "bg-white/4 text-white/60 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
      <div className="space-y-6">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-white/4 border border-white/8 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                  <Brain size={20} />
                </div>
                <h3 className="text-base font-bold text-white">1. Practice &amp; Knowledge</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Generate adaptive multiple-choice quizzes across 18 core technical domains (Data Structures, Algorithms, OS, DBMS, Networks, System Design, etc.) or from uploaded PDF lecture notes.
                </p>
                <button
                  onClick={() => onNavigate("quiz-select")}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  Start Practicing <ArrowRight size={13} />
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-white/4 border border-white/8 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-base font-bold text-white">2. AI Mock Interview</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Engage in conversational multi-turn technical or HR interview simulations. Includes voice input, realtime evaluation across correctness, depth, and communication, plus adaptive question branching.
                </p>
                <button
                  onClick={() => onNavigate("interview-setup")}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  Start Mock Interview <ArrowRight size={13} />
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-white/4 border border-white/8 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
                  <FolderGit2 size={20} />
                </div>
                <h3 className="text-base font-bold text-white">3. Project Defense Analyzer</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Analyze your GitHub repository or ZIP project. Generates grounded interview questions with verifiable code snippet evidence, detects unsupported resume claims, and scores your spoken 2-minute elevator pitch.
                </p>
                <button
                  onClick={() => onNavigate("project-upload")}
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                >
                  Analyze a Project <ArrowRight size={13} />
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-white/4 border border-white/8 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <FileText size={20} />
                </div>
                <h3 className="text-base font-bold text-white">4. Resume Builder &amp; ATS Audit</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Build ATS-optimized resumes from scratch or import reference PDFs. Run ATS audit scans, validate project bullet claims against ground truth, and export clean, authenticated PDFs.
                </p>
                <button
                  onClick={() => onNavigate("resume-home")}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  Open Resume Builder <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Quick BYOK callout */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Key size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Have your own Google Gemini API key?</h4>
                  <p className="text-xs text-white/60 mt-0.5">
                    Connect your free Gemini API key to enjoy higher rate limits and uninterrupted generation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => (onOpenSettings ? onOpenSettings() : onNavigate("settings"))}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 cursor-pointer transition-all"
              >
                Configure Gemini Key
              </button>
            </div>
          </div>
        )}

        {/* QUIZ WORKFLOW */}
        {activeTab === "quiz" && (
          <div className="p-7 rounded-2xl bg-white/4 border border-white/8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Brain size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Quiz Practice Exact Workflow</h2>
                <p className="text-xs text-white/50">Follow these 12 steps to practice canonical topics or study notes</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-white/80">
              {[
                { step: 1, title: "Open Practice", desc: "Navigate to Practice Quizzes from the sidebar or dashboard." },
                { step: 2, title: "Select subject", desc: "Choose from 18 technical domains (DSA, System Design, OS, DBMS, Web, etc.) or choose 'PDF Notes'." },
                { step: 3, title: "Select topic", desc: "Pick specific subtopics (e.g., Trees & Graphs, Indexing & Transactions, Concurrency)." },
                { step: 4, title: "Select difficulty", desc: "Select Easy, Medium, or Hard depending on your preparation level." },
                { step: 5, title: "Select question count", desc: "Choose how many questions to generate (default is 10 questions)." },
                { step: 6, title: "Start quiz", desc: "Click Start Quiz. The backend calls Gemini with injection-safe data boundaries." },
                { step: 7, title: "Answer questions", desc: "Select options for MCQs. You can navigate between questions with Next / Previous." },
                { step: 8, title: "Submit", desc: "Click Submit Quiz when you reach the final question." },
                { step: 9, title: "Review score", desc: "Your canonical score is computed deterministically by the server." },
                { step: 10, title: "Review explanations", desc: "Read detailed reasoning and correct answers for every question you answered." },
                { step: 11, title: "Save session", desc: "Your attempt is automatically persisted to Supabase and synced with your account." },
                { step: 12, title: "View progress", desc: "Check your updated accuracy, streak, and topics mastered on the Dashboard & History tabs." },
              ].map((item) => (
                <li key={item.step} className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    {item.step}
                  </span>
                  <div>
                    <strong className="text-white text-sm font-semibold">{item.title}</strong>
                    <p className="text-white/60 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* INTERVIEW WORKFLOW */}
        {activeTab === "interview" && (
          <div className="p-7 rounded-2xl bg-white/4 border border-white/8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Technical &amp; HR Mock Interview Workflow</h2>
                <p className="text-xs text-white/50">14-step guide to conducting AI-driven simulated interviews</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-white/80">
              {[
                { step: 1, title: "Open Interview", desc: "Navigate to Mock Interview from the sidebar." },
                { step: 2, title: "Choose role & mode", desc: "Select Technical (Coding / Systems / Fundamentals) or Behavioral / HR." },
                { step: 3, title: "Choose technology/topic", desc: "Select your primary focus (Java, Python, React, Cloud Architecture, etc.)." },
                { step: 4, title: "Choose difficulty", desc: "Pick Entry-level, Mid-level, or Senior difficulty." },
                { step: 5, title: "Start simulation", desc: "Click Start Interview to launch the interactive live session." },
                { step: 6, title: "Read/listen to question", desc: "Read the prompt on screen or listen via optional text-to-speech." },
                { step: 7, title: "Answer using speech or text", desc: "Type your answer or speak into your microphone with realtime speech recognition." },
                { step: 8, title: "Submit answer", desc: "Click Submit Answer to send your response for server-side evaluation." },
                { step: 9, title: "Receive AI evaluation", desc: "The server scores your answer across Technical Depth, Correctness, and Communication." },
                { step: 10, title: "Review feedback", desc: "Review strengths, missing details, and potential misconceptions." },
                { step: 11, title: "Continue interview", desc: "Click Next Question. The adaptive engine adjusts difficulty based on past answers." },
                { step: 12, title: "Finish session", desc: "Complete 3-5 questions and click Finish Interview." },
                { step: 13, title: "Save session", desc: "The summary displays your final scores and confirms persistence to database." },
                { step: 14, title: "Review competency changes", desc: "Check Candidate Intelligence to see your mastery levels grow." },
              ].map((item) => (
                <li key={item.step} className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    {item.step}
                  </span>
                  <div>
                    <strong className="text-white text-sm font-semibold">{item.title}</strong>
                    <p className="text-white/60 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* PROJECT ANALYZER WORKFLOW */}
        {activeTab === "project" && (
          <div className="p-7 rounded-2xl bg-white/4 border border-white/8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <FolderGit2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Project Analyzer &amp; Defense Workflow</h2>
                <p className="text-xs text-white/50">10 steps to analyzing repositories and practicing project questions</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-white/80">
              {[
                { step: 1, title: "Open Project Analyzer", desc: "Select Project Defense from the main navigation." },
                { step: 2, title: "Enter GitHub URL or Upload ZIP", desc: "Paste a public GitHub repository URL or upload a ZIP archive (up to 20MB limit)." },
                { step: 3, title: "Start analysis", desc: "Click Analyze Project. The server extracts files while rejecting path traversal and binary clutter." },
                { step: 4, title: "Wait for analysis", desc: "The engine runs deterministic AST/file analysis and queries Gemini." },
                { step: 5, title: "Review architecture", desc: "Inspect detected technologies, architectural patterns, and knowledge model." },
                { step: 6, title: "Review detected issues", desc: "Check flagged risks, missing unit tests, or potential security gaps." },
                { step: 7, title: "Practice generated questions", desc: "Every question is grounded by verbatim snippets from your code." },
                { step: 8, title: "Answer questions", desc: "Explain design choices, concurrency handling, or schema decisions." },
                { step: 9, title: "Review evaluation", desc: "Get graded against actual code evidence and see flagged unsupported claims." },
                { step: 10, title: "Evaluate project pitch", desc: "Practice your 2-minute elevator pitch with structure, ownership, and simplicity scoring." },
              ].map((item) => (
                <li key={item.step} className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    {item.step}
                  </span>
                  <div>
                    <strong className="text-white text-sm font-semibold">{item.title}</strong>
                    <p className="text-white/60 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* RESUME WORKFLOW */}
        {activeTab === "resume" && (
          <div className="p-7 rounded-2xl bg-white/4 border border-white/8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Resume &amp; ATS Audit Workflow</h2>
                <p className="text-xs text-white/50">6-step workflow for high-scoring, ATS-compliant resumes</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-white/80">
              {[
                { step: 1, title: "Open Resume", desc: "Click Resume in the sidebar to view your saved resumes." },
                { step: 2, title: "Create or import resume", desc: "Build from scratch with curated templates (Classic, Modern, Compact) or import an existing reference PDF." },
                { step: 3, title: "Edit sections", desc: "Add contact details, work experience, education, skills, and projects." },
                { step: 4, title: "Save resume", desc: "Persist your progress to your authenticated database anytime." },
                { step: 5, title: "Run ATS analysis & claim validation", desc: "Audit your resume for ATS parser compliance, keyword density, and grounded claims." },
                { step: 6, title: "Export PDF", desc: "Download clean, authenticated, printable PDF files ready for recruiters." },
              ].map((item) => (
                <li key={item.step} className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    {item.step}
                  </span>
                  <div>
                    <strong className="text-white text-sm font-semibold">{item.title}</strong>
                    <p className="text-white/60 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* CANDIDATE INTELLIGENCE */}
        {activeTab === "candidate" && (
          <div className="p-7 rounded-2xl bg-white/4 border border-white/8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                <Award size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Candidate Intelligence Architecture</h2>
                <p className="text-xs text-white/50">Understanding how your competencies, misconceptions, and scores work</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Zap size={15} className="text-blue-400" />
                  Competency Tracking
                </h3>
                <p className="text-white/60 leading-relaxed">
                  Competencies track your performance across technical domains (e.g. "Concurrency", "Database Indexing", "System Design"). Levels progress from <strong>Weak</strong> → <strong>Developing</strong> → <strong>Competent</strong> → <strong>Strong</strong> → <strong>Mastered</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <AlertCircle size={15} className="text-amber-400" />
                  Misconception Detection
                </h3>
                <p className="text-white/60 leading-relaxed">
                  When you hold an incorrect technical belief (such as confusing processes with threads or thinking primary keys cannot be composite), the system flags it in your Misconceptions panel. It is only resolved when subsequent answers demonstrate true understanding.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  Deterministic Scoring
                </h3>
                <p className="text-white/60 leading-relaxed">
                  All scores are computed server-side from answer submissions rather than trusting client variables. Dashboard, History, and Quiz screens use the identical canonical scoring logic.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Sparkles size={15} className="text-purple-400" />
                  Adaptive Question Engine
                </h3>
                <p className="text-white/60 leading-relaxed">
                  The system tracks your weak areas and dynamically balances question difficulty, ensuring you spend practice time where improvement is needed most.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* GEMINI SETUP */}
        {activeTab === "gemini" && (
          <div className="p-7 rounded-2xl bg-white/4 border border-white/8 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Key size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Gemini API Key Setup Guide</h2>
                <p className="text-xs text-white/50">Bring Your Own Key (BYOK) for higher rate limits and uninterrupted generation</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 leading-relaxed">
              Google provides free API keys through Google AI Studio for personal development. By connecting your key, AI calls are routed through your personal Google quota.
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                <strong className="text-white text-sm block mb-1">Step 1: Open Google AI Studio</strong>
                <p className="text-white/60 mb-2">Visit the official Google AI Studio API key portal:</p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:text-blue-200 font-mono"
                >
                  https://aistudio.google.com/app/apikey <ExternalLink size={12} />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                <strong className="text-white text-sm block mb-1">Step 2: Sign in with Google</strong>
                <p className="text-white/60">Log in with your Google account. Accept the terms of service if visiting for the first time.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                <strong className="text-white text-sm block mb-1">Step 3: Open API Keys</strong>
                <p className="text-white/60">Click on "Get API key" or "API Keys" in the main navigation.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                <strong className="text-white text-sm block mb-1">Step 4: Create API key</strong>
                <p className="text-white/60">Click "Create API key" and choose your Google Cloud project (or generate in a new project).</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                <strong className="text-white text-sm block mb-1">Step 5: Copy your API key</strong>
                <p className="text-white/60">Copy the key string (begins with <code className="bg-black/40 px-1 py-0.5 rounded text-white/80">AIzaSy...</code>).</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                <strong className="text-white text-sm block mb-1">Step 6: Paste, Test, and Save in Settings</strong>
                <p className="text-white/60 mb-3">Navigate to Settings → AI / Gemini in this app. Paste your key, click "Test API Key", and once verified, click "Save API Key".</p>
                <button
                  onClick={() => (onOpenSettings ? onOpenSettings() : onNavigate("settings"))}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Go to AI / Gemini Settings
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
