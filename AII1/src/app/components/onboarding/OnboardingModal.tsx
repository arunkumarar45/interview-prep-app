// AII1/src/app/components/onboarding/OnboardingModal.tsx
// First-time user onboarding wizard:
// Welcome → choose target role → choose technologies → connect Gemini → start practicing

import { useState } from "react";
import {
  Brain, Check, ArrowRight, Key, Sparkles, X,
  Layers, Code2, Cpu, Database, Cloud
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onOpenSettings: () => void;
}

const ROLES = [
  { id: "frontend", label: "Frontend Engineer", icon: Code2, desc: "React, Vue, TypeScript, CSS, Web APIs" },
  { id: "backend", label: "Backend Engineer", icon: Database, desc: "Node.js, Python, Java, Go, Databases, System Design" },
  { id: "fullstack", label: "Full-Stack Engineer", icon: Layers, desc: "End-to-end web apps, APIs, State, DB" },
  { id: "devops", label: "DevOps & Cloud", icon: Cloud, desc: "Docker, Kubernetes, CI/CD, AWS, Linux" },
  { id: "ml", label: "AI & Data Engineer", icon: Cpu, desc: "Python, Data Pipelines, ML Models, SQL" },
];

const TECH_OPTIONS = [
  "React", "TypeScript", "Node.js", "Python", "Java",
  "SQL & PostgreSQL", "Docker", "System Design", "Go",
  "Data Structures & Algorithms", "REST APIs", "AWS"
];

export function OnboardingModal({ isOpen, onClose, onNavigate, onOpenSettings }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRole, setSelectedRole] = useState<string>("fullstack");
  const [selectedTechs, setSelectedTechs] = useState<string[]>(["React", "TypeScript", "Node.js"]);

  if (!isOpen) return null;

  const toggleTech = (tech: string) => {
    setSelectedTechs((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const handleFinish = async () => {
    try {
      localStorage.setItem("interviewprep_onboarding_completed", "true");
      await supabase.auth.updateUser({
        data: {
          target_role: selectedRole,
          target_technologies: selectedTechs,
        },
      });
    } catch {
      // Non-blocking
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-[#0a1226] border border-white/12 rounded-3xl p-8 shadow-2xl overflow-hidden animate-scale-up text-white">
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleFinish}
          className="absolute top-5 right-5 text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? "bg-blue-500" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* STEP 1: WELCOME & TARGET ROLE */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Brain size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Welcome to InterviewPrep AI</h2>
                <p className="text-xs text-white/50">Step 1 of 4: Select your primary target career path</p>
              </div>
            </div>

            <p className="text-sm text-white/70">
              Personalize your question blueprints, technical interviews, and difficulty progression.
            </p>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500/50 text-white"
                        : "bg-white/3 border-white/6 hover:bg-white/6 text-white/70"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? "bg-blue-500 text-white" : "bg-white/6 text-white/60"}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{r.label}</div>
                      <div className="text-xs text-white/40">{r.desc}</div>
                    </div>
                    {isSelected && <Check size={16} className="text-blue-400 shrink-0" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-all"
              >
                Next: Select Technologies <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TECHNOLOGIES */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Select Key Technologies</h2>
              <p className="text-xs text-white/50 mt-1">Step 2 of 4: What skills are you actively practicing?</p>
            </div>

            <p className="text-xs text-white/60">
              Choose the topics you want emphasized in mock questions and project analysis:
            </p>

            <div className="flex flex-wrap gap-2">
              {TECH_OPTIONS.map((tech) => {
                const isSelected = selectedTechs.includes(tech);
                return (
                  <button
                    key={tech}
                    onClick={() => toggleTech(tech)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                        : "bg-white/4 text-white/60 border-white/8 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {tech}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/8">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-white/50 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-all"
              >
                Next: AI Provider Setup <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONNECT GEMINI */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Key size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Connect Google Gemini (Optional)</h2>
                <p className="text-xs text-white/50">Step 3 of 4: Unlock higher AI generation limits</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/4 border border-white/8 space-y-3 text-xs">
              <p className="text-white/80 leading-relaxed">
                InterviewPrep AI provides a shared platform key, but connecting your own free <strong>Google AI Studio API key</strong> guarantees maximum quota, fast response times, and uninterrupted simulations.
              </p>
              <ul className="space-y-1.5 text-white/60">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400 shrink-0" />
                  Free through Google AI Studio (personal projects)
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400 shrink-0" />
                  Encrypted at rest with AES-256-GCM
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400 shrink-0" />
                  Can be added, replaced, or removed anytime
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/8">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-white/50 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2.5 rounded-xl text-xs text-white/60 hover:text-white cursor-pointer"
                >
                  Skip for Now
                </button>
                <button
                  onClick={() => {
                    handleFinish();
                    onOpenSettings();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Configure Key Now <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: ALL SET */}
        {step === 4 && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <Sparkles size={28} />
            </div>

            <div>
              <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-white">You're All Set!</h2>
              <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto">
                Your profile is configured. Choose what you would like to tackle first:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <button
                onClick={() => {
                  handleFinish();
                  onNavigate("quiz-select");
                }}
                className="p-3.5 rounded-2xl bg-white/4 hover:bg-white/8 border border-white/8 transition-all cursor-pointer"
              >
                <div className="text-sm font-bold text-white mb-0.5">Practice Quiz</div>
                <div className="text-xs text-white/40">Test knowledge in 10-question MCQ sprints</div>
              </button>

              <button
                onClick={() => {
                  handleFinish();
                  onNavigate("interview-setup");
                }}
                className="p-3.5 rounded-2xl bg-white/4 hover:bg-white/8 border border-white/8 transition-all cursor-pointer"
              >
                <div className="text-sm font-bold text-white mb-0.5">Mock Interview</div>
                <div className="text-xs text-white/40">Conversational AI interview with voice input</div>
              </button>

              <button
                onClick={() => {
                  handleFinish();
                  onNavigate("project-upload");
                }}
                className="p-3.5 rounded-2xl bg-white/4 hover:bg-white/8 border border-white/8 transition-all cursor-pointer"
              >
                <div className="text-sm font-bold text-white mb-0.5">Project Defense</div>
                <div className="text-xs text-white/40">Analyze GitHub or ZIP repo code</div>
              </button>

              <button
                onClick={() => {
                  handleFinish();
                  onNavigate("resume-home");
                }}
                className="p-3.5 rounded-2xl bg-white/4 hover:bg-white/8 border border-white/8 transition-all cursor-pointer"
              >
                <div className="text-sm font-bold text-white mb-0.5">Resume &amp; ATS</div>
                <div className="text-xs text-white/40">Create an ATS-safe technical resume</div>
              </button>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-lg shadow-blue-500/25"
            >
              Go to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
