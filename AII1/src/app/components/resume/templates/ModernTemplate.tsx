import React from "react";
import type { ResumeFormData } from "../../../../types/resume";

export function ModernTemplate({ data }: { data: ResumeFormData }) {
  const { contactInfo, summary, experience, education, skills, projects, certifications } = data;

  return (
    <div className="bg-white text-gray-800 p-8 shadow-md rounded-sm min-h-[842px] max-w-[650px] mx-auto font-sans text-[11px] leading-relaxed select-text">
      {/* Header */}
      <div className="pb-4 border-b-2 border-teal-600">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {contactInfo?.fullName || "Your Full Name"}
        </h1>
        <div className="text-[10px] text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {contactInfo?.email && <span>{contactInfo.email}</span>}
          {contactInfo?.phone && <span>| {contactInfo.phone}</span>}
          {contactInfo?.location && <span>| {contactInfo.location}</span>}
          {contactInfo?.linkedin && <span>| {contactInfo.linkedin}</span>}
          {contactInfo?.portfolio && <span>| {contactInfo.portfolio}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary?.trim() && (
        <div className="mt-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-1">
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-normal">{summary}</p>
        </div>
      )}

      {/* Experience */}
      {experience?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-2">
            Work Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp, idx) => (
              <div key={exp.id || idx}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900">{exp.title}</span>
                  <span className="text-[10px] font-medium text-gray-500">{exp.startDate} – {exp.endDate || "Present"}</span>
                </div>
                <div className="text-[10px] font-medium text-teal-800 mb-1">{exp.company} {exp.location && `• ${exp.location}`}</div>
                {exp.bullets?.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {exp.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-normal">{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-2">
            Education
          </h2>
          <div className="space-y-2">
            {education.map((edu, idx) => (
              <div key={edu.id || idx} className="flex justify-between items-baseline">
                <div>
                  <span className="font-bold text-gray-900">{edu.degree}</span> — <span className="text-gray-700">{edu.institution}</span>
                  {edu.gpa && <span className="text-[10px] text-gray-500"> (GPA: {edu.gpa})</span>}
                </div>
                <span className="text-[10px] font-medium text-gray-500">{edu.startDate} – {edu.endDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-2">
            Key Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, idx) => (
              <div key={proj.id || idx}>
                <div className="font-bold text-gray-900">
                  {proj.name} {proj.techStack && <span className="font-normal text-[10px] text-teal-800">({proj.techStack})</span>}
                </div>
                {proj.bullets?.length > 0 && (
                  <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
                    {proj.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-normal">{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-1.5">
            Technical Skills
          </h2>
          <p className="text-gray-700">{skills.join("  •  ")}</p>
        </div>
      )}

      {/* Certifications */}
      {certifications?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-1.5">
            Certifications
          </h2>
          <ul className="list-disc list-inside space-y-0.5 text-gray-700">
            {certifications.map((cert, idx) => (
              <li key={cert.id || idx}>
                <span className="font-semibold text-gray-900">{cert.name}</span> — {cert.issuer} ({cert.date})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
