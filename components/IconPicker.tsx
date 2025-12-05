import React, { useState, useEffect } from 'react';
import { searchIcons, getIconSamples, getIconByName, getIconCount } from '../utils/reactIcons';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [samples, setSamples] = useState<Record<string, string[]>>({});
  const [totalIcons, setTotalIcons] = useState<number>(0);

  // Load initial samples and total icon count
  useEffect(() => {
    setSamples(getIconSamples(10));
    setTotalIcons(getIconCount());
  }, []);

  // Search when term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      setResults(searchIcons(searchTerm, 100));
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  // Render icon or fallback
  const renderIcon = (iconName: string) => {
    const IconComponent = getIconByName(iconName);
    if (IconComponent) {
      return <IconComponent className="text-slate-100" width="20" height="20" />;
    } else {
      console.warn(`Icon not found: ${iconName}`);
      return <span className="text-rose-400">?</span>;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
      <h2 className="text-base font-semibold text-white">
        Icon Explorer <span className="text-slate-400 text-xs">({totalIcons} verfügbar)</span>
      </h2>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Icons durchsuchen …"
          className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {searchTerm ? (
        <div>
          <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Suchergebnisse ({results.length})
          </h3>
          <div className="mt-2 grid max-h-60 grid-cols-6 gap-2 overflow-y-auto">
            {results.length > 0 ? (
              results.map((iconName) => (
                <div
                  key={iconName}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-transparent px-2 py-3 text-xs transition hover:border-sky-500/60 hover:bg-slate-900/80 ${
                    value === iconName
                      ? 'border-sky-500/70 bg-sky-500/10 text-sky-100'
                      : 'text-slate-200'
                  }`}
                  onClick={() => onChange(iconName)}
                  title={iconName}
                >
                  {renderIcon(iconName)}
                  <span className="mt-1 w-full truncate text-[10px] uppercase tracking-[0.25em] text-slate-400">
                    {iconName}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-6 py-4 text-center text-sm text-slate-400">
                Keine Treffer für „{searchTerm}“ gefunden.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Beispiele nach Bibliothek
          </h3>
          {Object.entries(samples).map(([library, icons]) => (
            <div key={library} className="mt-3 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {library} Icons
              </h4>
              <div className="grid grid-cols-6 gap-2">
                {icons.map((iconName) => (
                  <div
                    key={iconName}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-transparent px-2 py-3 text-xs transition hover:border-sky-500/60 hover:bg-slate-900/80 ${
                      value === iconName
                        ? 'border-sky-500/70 bg-sky-500/10 text-sky-100'
                        : 'text-slate-200'
                    }`}
                    onClick={() => onChange(iconName)}
                    title={iconName}
                  >
                    {renderIcon(iconName)}
                    <span className="mt-1 w-full truncate text-[10px] uppercase tracking-[0.25em] text-slate-400">
                      {iconName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IconPicker;
