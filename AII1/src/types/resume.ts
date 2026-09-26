// src/types/resume.ts
// Shared type definitions for the Resume Builder.
// These types mirror the interfaces in server/routes/resume.ts.
// Keeping them here avoids importing server code into the frontend bundle.

export interface ResumeContactInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
}

export interface ResumeExperienceItem {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface ResumeEducationItem {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  techStack: string;
  bullets: string[];
  source?: "manual" | "repo";
}

export interface ResumeCertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface ResumeFormData {
  contactInfo: ResumeContactInfo;
  summary: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  skills: string[];
  projects: ResumeProjectItem[];
  certifications: ResumeCertificationItem[];
}

export interface AtsAuditCheck {
  category: "Extraction" | "Contact" | "Sections" | "Layout" | "Formatting";
  title: string;
  status: "PASS" | "WARNING" | "FAIL";
  details: string;
  recommendation?: string;
}

export interface AtsAuditReport {
  overallScore: number;
  status: "PASS" | "WARNING" | "FAIL";
  pageCount: number;
  extractedTextLength: number;
  detectedContact: {
    name: { found: boolean; value?: string };
    email: { found: boolean; value?: string };
    phone: { found: boolean; value?: string };
    linkedin: { found: boolean; value?: string };
  };
  detectedSections: Array<{ name: string; status: "found" | "missing" | "optional" }>;
  checks: AtsAuditCheck[];
  summary: string;
}
