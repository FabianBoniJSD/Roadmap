import React from 'react';
import { Project } from '../types';

interface CompactProjectCardProps {
  project: Project;
  categoryName: string;
  categoryColor: string;
  onClick: (projectId: string) => void;
}

const CompactProjectCard: React.FC<CompactProjectCardProps> = ({
  project,
  categoryName,
  categoryColor,
  onClick,
}) => {
  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : 'n/a');

  return (
    <div
      className="rounded-xl bg-gray-800/70 border border-gray-700 hover:border-gray-500 transition-colors shadow-md hover:shadow-lg p-3 md:p-4 cursor-pointer flex flex-col gap-2"
      onClick={() => onClick(project.id)}
      title={project.title}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-sm md:text-base truncate">{project.title}</h3>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full border border-white/10"
          style={{ backgroundColor: categoryColor, color: '#fff' }}
        >
          {categoryName}
        </span>
      </div>

      {/* Zeitraum */}
      <div className="text-[11px] text-gray-300">
        {formatDate(project.startDate)} – {formatDate(project.endDate)}
      </div>

      {/* Fortschritt */}
      {typeof project.fortschritt === 'number' && (
        <div className="w-full h-2 bg-gray-700/60 rounded overflow-hidden">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${Math.min(Math.max(project.fortschritt, 0), 100)}%` }}
          />
        </div>
      )}

      {/* Beschreibung */}
      {project.description && (
        <p className="text-xs text-gray-200 line-clamp-3">{project.description}</p>
      )}

      {/* Footer meta */}
      <div className="mt-auto pt-2 text-[11px] text-gray-300 flex flex-wrap gap-2">
        {project.ProjectFields && project.ProjectFields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.ProjectFields.map((tag, index) => (
              <span
                key={index}
                className="bg-sky-500/20 border border-sky-400/30 text-sky-300 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {project.links && project.links.length > 0 && (
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded-full">
            {project.links.length} Links
          </span>
        )}
        {project.teamMembers && project.teamMembers.length > 0 && (
          <span className="bg-black/30 border border-white/10 px-2 py-0.5 rounded-full">
            {project.teamMembers.length} Team
          </span>
        )}
      </div>
    </div>
  );
};

export default CompactProjectCard;
