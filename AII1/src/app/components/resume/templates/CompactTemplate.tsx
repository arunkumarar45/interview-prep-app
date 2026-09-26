import React from "react";
import type { ResumeFormData } from "../../../../types/resume";

export function CompactTemplate({ data }: { data: ResumeFormData }) {
  const { contactInfo, summary, experience, education, skills, projects, certifications } = data;

  return (
    <div className="bg-white text-gray-900 p-6 shadow-md rounded-sm min-h-[842px] max-w-[650px] mx-auto font-sans text-[10px] leading-tight select-text">
      {/* Header */}
      <div className="pb-3 border-b border-gray-400 flex justify-between items-end">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-gray-900">
            {contactInfo?.fullName || "Your Full Name"}
          </h1>
          <p className="text-[9px] text-gray-600 mt-0.5">
            {[contactInfo?.location, contactInfo?.phone].filter(Boolean).join(" • ")}
          </p>
        </div>
        <div className="text-[9px] text-right text-gray-600 space-y-0.5">
          {contactInfo?.email && <div>{contactInfo.email}</div>}
          {contactInfo?.linkedin && <div>{contactInfo.linkedin}</div>}
          {contactInfo?.portfolio && <div>{contactInfo.portfolio}</div>}
        </div>
      </div>

      {/* Summary */}
      {summary?.trim() && (
        <div className="mt-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-0.5 mb-1">
            Summary
          </h2>
          <p className="text-gray-800 leading-snug">{summary}</p>
        </div>
      )}

      {/* Skills */}
      {skills?.length > 0 && (
        <div className="mt-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-0.5 mb-1">
            Skills
          </h2>
          <p className="text-gray-800 font-medium">{skills.join(" • ")}</p>
        </div>
      )}

      {/* Experience */}
      {experience?.length > 0 && (
        <div className="mt-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-0.5 mb-1.5">
            Experience
          </h2>
          <div className="space-y-2">
            {experience.map((exp, idx) => (
              <div key={exp.id || idx}>
                <div className="flex justify-between items-baseline font-bold text-gray-900">
                  <span>{exp.title} — <span className="font-semibold">{exp.company}</span></span>
                  <span className="text-[9px] font-normal text-gray-600">{exp.startDate} – {exp.endDate || "Present"}</span>
                </div>
                {exp.bullets?.length > 0 && (
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-gray-800">
                    {exp.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-snug">{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects?.length > 0 && (
        <div className="mt-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-0.5 mb-1.5">
            Projects
          </h2>
          <div className="space-y-2">
            {projects.map((proj, idx) => (
              <div key={proj.id || idx}>
                <div className="font-bold text-gray-900">
                  {proj.name} {proj.techStack && <span className="font-normal text-[9px] text-gray-600">({proj.techStack})</span>}
                </div>
                {proj.bullets?.length > 0 && (
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-gray-800">
                    {proj.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-snug">{bullet}</li>
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
        <div className="mt-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-0.5 mb-1">
            Education
          </h2>
          <div className="space-y-1">
            {education.map((edu, idx) => (
              <div key={edu.id || idx} className="flex justify-between items-baseline text-gray-900">
                <div>
                  <span className="font-bold">{edu.degree}</span>, {edu.institution}
                  {edu.gpa && <span className="text-[9px] text-gray-600 font-normal"> (GPA: {edu.gpa})</span>}
                </div>
                <span className="text-[9px] text-gray-600">{edu.startDate} – {edu.endDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications?.length > 0 && (
        <div className="mt-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-0.5 mb-1">
            Certifications
          </h2>
          <ul className="list-disc list-inside space-y-0.5 text-gray-800">
            {certifications.map((cert, idx) => (
              <li key={cert.id || idx}>
                <span className="font-bold">{cert.name}</span> — {cert.issuer} ({cert.date})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
