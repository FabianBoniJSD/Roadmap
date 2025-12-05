import React, { useState } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);

  const predefinedColors = [
    '#4299e1', // blue
    '#9f7aea', // purple
    '#f56565', // red
    '#48bb78', // green
    '#ed8936', // orange
    '#ecc94b', // yellow
    '#38b2ac', // teal
    '#f687b3', // pink
    '#a0aec0', // gray
  ];

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 rounded-2xl border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400 cursor-pointer"
        onClick={() => setShowPicker(!showPicker)}
      >
        <div
          className="h-8 w-8 rounded-full border border-slate-700"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
          {value}
        </span>
      </div>

      {showPicker && (
        <div className="absolute z-50 mt-2 rounded-3xl border border-slate-800/70 bg-slate-950/95 p-4 shadow-xl shadow-slate-950/40 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {predefinedColors.map((color) => (
              <div
                key={color}
                className="h-9 w-9 rounded-full border border-slate-700/80 shadow-inner shadow-slate-950/20 cursor-pointer transition hover:border-sky-400"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setShowPicker(false);
                }}
              />
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Eigene Farbe
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-full border border-slate-700 bg-transparent p-0"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 rounded-2xl border border-slate-800/70 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                placeholder="#RRGGBB"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-sky-400 hover:text-white"
              onClick={() => setShowPicker(false)}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
