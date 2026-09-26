import React from "react";
import type { ResumeFormData } from "../../../../types/resume";

export function ClassicTemplate({ data }: { data: ResumeFormData }) {
  const { contactInfo, summary, experience, education, skills, projects, certifications } = data;

  return (
    <div className="bg-white text-gray-900 p-8 shadow-md rounded-sm min-h-[842px] max-w-[650px] mx-auto font-serif text-[11px] leading-normal select-text">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-300">
        <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900 mb-1">
          {contactInfo?.fullName || "Your Full Name"}
        </h1>
        <div className="text-[10px] text-gray-600 space-x-2">
          {contactInfo?.email && <span>{contactInfo.email}</span>}
          {contactInfo?.phone && <span>• {contactInfo.phone}</span>}
          {contactInfo?.location && <span>• {contactInfo.location}</span>}
          {contactInfo?.linkedin && <span>• {contactInfo.linkedin}</span>}
          {contactInfo?.portfolio && <span>• {contactInfo.portfolio}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary?.trim() && (
        <div className="mt-4">
          <h2 className="text-[12px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1.5 text-gray-900">
            Professional Summary
          </h2>
          <p className="text-gray-800 leading-relaxed text-justify">{summary}</p>
        </div>
      )}

      {/* Work Experience */}
      {experience?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[12px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-2 text-gray-900">
            Work Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp, idx) => (
              <div key={exp.id || idx}>
                <div className="flex justify-between items-baseline font-bold text-gray-900">
                  <span>{exp.title} — <span className="font-normal italic">{exp.company}</span></span>
                  <span className="text-[10px] font-normal text-gray-600">{exp.startDate} – {exp.endDate || "Present"}</span>
                </div>
                {exp.bullets?.length > 0 && (
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-800">
                    {exp.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-snug">
                        <span>{bullet}</span>
                      </li>
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
          <h2 className="text-[12px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-2 text-gray-900">
            Education
          </h2>
          <div className="space-y-2">
            {education.map((edu, idx) => (
              <div key={edu.id || idx} className="flex justify-between items-baseline text-gray-900">
                <div>
                  <span className="font-bold">{edu.degree}</span>, {edu.institution}
                  {edu.gpa && <span className="text-[10px] text-gray-600 italic"> (GPA: {edu.gpa})</span>}
                </div>
                <span className="text-[10px] text-gray-600">{edu.startDate} – {edu.endDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[12px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-2 text-gray-900">
            Key Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, idx) => (
              <div key={proj.id || idx}>
                <div className="font-bold text-gray-900">
                  {proj.name} {proj.techStack && <span className="font-normal text-[10px] text-gray-600">[{proj.techStack}]</span>}
                </div>
                {proj.bullets?.length > 0 && (
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-800">
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

      {/* Skills */}
      {skills?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[12px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1.5 text-gray-900">
            Skills
          </h2>
          <p className="text-gray-800">{skills.join(" • ")}</p>
        </div>
      )}

      {/* Certifications */}
      {certifications?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-[12px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1.5 text-gray-900">
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
