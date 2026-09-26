import React from "react";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { ModernTemplate } from "./templates/ModernTemplate";
import { CompactTemplate } from "./templates/CompactTemplate";
import { ShieldCheck, Check, ArrowRight } from "lucide-react";
import type { ResumeFormData } from "../../../types/resume";

const sampleData: ResumeFormData = {
  contactInfo: {
    fullName: "Alex Morgan",
    email: "alex.morgan@email.com",
    phone: "(555) 019-2834",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/alexmorgan",
    portfolio: "alexmorgan.dev",
  },
  summary: "Results-driven Software Engineer with 4+ years of experience building scalable backend services and responsive frontend applications.",
  experience: [
    {
      id: "1",
      title: "Senior Software Engineer",
      company: "TechCorp Inc.",
      location: "San Francisco, CA",
      startDate: "Jan 2022",
      endDate: "Present",
      bullets: [
        "Architected high-throughput microservices handling 2M+ daily active users.",
        "Optimized SQL queries reducing database query latency by 45%.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      degree: "B.S. Computer Science",
      institution: "UC Berkeley",
      location: "CA",
      startDate: "2018",
      endDate: "2022",
      gpa: "3.8",
    },
  ],
  skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"],
  projects: [
    {
      id: "1",
      name: "AI Quiz Generator",
      techStack: "React, Node.js, Gemini API",
      bullets: ["Built real-time quiz platform with automated score evaluations."],
    },
  ],
  certifications: [
    {
      id: "1",
      name: "AWS Certified Developer",
      issuer: "Amazon Web Services",
      date: "2023",
    },
  ],
};

export function ResumeTemplateGalleryScreen({
  onSelectTemplate,
  onCancel,
}: {
  onSelectTemplate: (templateId: "classic" | "modern" | "compact") => void;
  onCancel: () => void;
}) {
  const templates = [
    {
      id: "classic" as const,
      name: "Classic Serif",
      desc: "Traditional Times New Roman font, centered header, elegant line dividers. Ideal for banking, enterprise, and corporate roles.",
      Component: ClassicTemplate,
    },
    {
      id: "modern" as const,
      name: "Modern Clean",
      desc: "Clean Calibri sans-serif typography with accent color section headers. Excellent for tech startups, engineering, and product roles.",
      Component: ModernTemplate,
    },
    {
      id: "compact" as const,
      name: "Compact High-Density",
      desc: "High-density Arial layout maximizing content fit on a single page. Perfect for experienced candidates with long work histories.",
      Component: CompactTemplate,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">Select ATS Template</h1>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> ATS-Oriented (Single-Column)
          </span>
        </div>
        <p className="text-white/40 text-sm">
          All templates follow single-column layout, standard headers, and selectable text for optimal ATS readability. Run an ATS check after editing to test your exported PDF.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {templates.map(({ id, name, desc, Component }) => (
          <div
            key={id}
            className="flex flex-col justify-between bg-[#0d1730] border-2 border-white/8 hover:border-[#4f6ef7] rounded-2xl p-5 transition-all group"
          >
            <div>
              {/* Mini Preview Window */}
              <div className="w-full h-[320px] overflow-hidden rounded-xl border border-white/10 bg-gray-900 mb-4 relative shadow-inner">
                <div className="scale-[0.45] origin-top-left w-[220%] h-[220%] pointer-events-none select-none">
                  <Component data={sampleData} />
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-medium text-amber-300 border border-amber-500/30">
                  Sample Fictional Preview
                </div>
              </div>

              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-white text-lg mb-1">{name}</h3>
              <p className="text-xs text-white/40 leading-relaxed mb-4">{desc}</p>
            </div>

            <button
              onClick={() => onSelectTemplate(id)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#4f6ef7] hover:bg-[#3b5bf6] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#4f6ef7]/20"
            >
              Select &amp; Edit <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-start">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-semibold cursor-pointer"
        >
          ← Back to Resume Home
        </button>
      </div>
    </div>
  );
}
