import React from 'react';

const STATUS: { key: string; label: string; color: string }[] = [
  { key: 'planned', label: 'Geplant', color: '#6B7280' },
  { key: 'in-progress', label: 'In Bearbeitung', color: '#3B82F6' },
  { key: 'completed', label: 'Abgeschlossen', color: '#10B981' },
  { key: 'paused', label: 'Pausiert', color: '#F59E0B' },
  { key: 'cancelled', label: 'Abgebrochen', color: '#EF4444' }
];

const StatusLegend: React.FC = () => (
  <div className="flex flex-wrap gap-3 text-xs md:text-sm bg-gray-800 bg-opacity-60 px-3 py-2 rounded-lg border border-gray-700">
    {STATUS.map(s => (
      <div key={s.key} className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-full border border-white border-opacity-40" style={{ backgroundColor: s.color }} />
        <span className="text-gray-200">{s.label}</span>
      </div>
    ))}
  </div>
);

export default StatusLegend;