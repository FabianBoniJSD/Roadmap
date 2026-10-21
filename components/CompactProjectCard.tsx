import React from 'react';
import { Project } from '../types';
import { getRichTextPlainText } from '@/utils/richText';

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
  const descriptionPreview = getRichTextPlainText(project.description);
  const progress =
    typeof project.fortschritt === 'number' && Number.isFinite(project.fortschritt)
      ? Math.min(Math.max(project.fortschritt, 0), 100)
      : null;

  return (
    <div
      className="compact-project-card rounded-xl bg-gray-800/70 border border-gray-700 hover:border-gray-500 transition-colors p-3 md:p-4 cursor-pointer flex flex-col gap-2"
      title={project.title}
    >
      {/* Header */}
      <div className="compact-project-heading flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-sm md:text-base text-slate-100">
            <button
              type="button"
              className="compact-project-open"
              onClick={() => onClick(project.id)}
            >
              {project.title}
            </button>
          </h3>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full border border-white/10"
          style={{ backgroundColor: categoryColor, color: '#fff' }}
        >
          {categoryName}
        </span>
      </div>

      {/* Zeitraum */}
      <div className="text-xs text-slate-300">
        {formatDate(project.startDate)} – {formatDate(project.endDate)}
      </div>

      {project.badges && project.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-amber-100"
            >
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Fortschritt */}
      {progress !== null && (
        <div className="grid gap-1.5">
          <span className="text-xs text-slate-300">Fortschritt {progress}%</span>
          <div
            className="w-full h-2 bg-gray-700/60 rounded overflow-hidden"
            role="progressbar"
            aria-label={`Fortschritt: ${project.title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Beschreibung */}
      {descriptionPreview && (
        <p className="text-xs text-slate-300 line-clamp-3">{descriptionPreview}</p>
      )}

      {/* Footer meta */}
      <div className="mt-auto pt-2 text-xs text-slate-300 flex flex-wrap gap-2">
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
