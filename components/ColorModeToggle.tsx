import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import {
  applyColorMode,
  DEFAULT_COLOR_MODE,
  getActiveColorMode,
  type ColorMode,
} from '@/utils/colorMode';

type ColorModeToggleProps = {
  className?: string;
};

const ColorModeToggle: React.FC<ColorModeToggleProps> = ({ className }) => {
  const [colorMode, setColorMode] = useState<ColorMode>(DEFAULT_COLOR_MODE);

  useEffect(() => {
    setColorMode(getActiveColorMode());
  }, []);

  const isLightMode = colorMode === 'light';

  const handleToggle = () => {
    const nextColorMode: ColorMode = isLightMode ? 'dark' : 'light';
    setColorMode(nextColorMode);
    applyColorMode(nextColorMode);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={clsx(
        'inline-flex items-center gap-3 rounded-full border px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-sky-400/40',
        isLightMode
          ? 'border-slate-300 bg-white/90 text-slate-900 shadow-sm shadow-slate-300/40 hover:bg-white'
          : 'border-slate-700 bg-slate-900/80 text-slate-100 shadow-sm shadow-slate-950/30 hover:border-sky-400/70 hover:bg-slate-900',
        className
      )}
      aria-label={isLightMode ? 'Zum dunklen Modus wechseln' : 'Zum hellen Modus wechseln'}
      title={isLightMode ? 'Zum dunklen Modus wechseln' : 'Zum hellen Modus wechseln'}
    >
      <span
        className={clsx(
          'relative flex h-8 w-16 items-center rounded-full border transition',
          isLightMode ? 'border-amber-200 bg-amber-50/90' : 'border-slate-700 bg-slate-950/90'
        )}
      >
        <span
          className={clsx(
            'absolute left-1 top-1 h-6 w-6 rounded-full shadow-sm transition-transform duration-200',
            isLightMode
              ? 'translate-x-8 bg-amber-300 shadow-amber-200/70'
              : 'translate-x-0 bg-sky-400 shadow-sky-500/30'
          )}
        />
        <FaMoon
          className={clsx(
            'relative z-10 ml-2 h-3.5 w-3.5 transition',
            isLightMode ? 'text-slate-400' : 'text-slate-950'
          )}
        />
        <FaSun
          className={clsx(
            'relative z-10 ml-auto mr-2 h-3.5 w-3.5 transition',
            isLightMode ? 'text-amber-600' : 'text-slate-500'
          )}
        />
      </span>
      <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] sm:inline">
        {isLightMode ? 'Hell' : 'Dunkel'}
      </span>
    </button>
  );
};

export default ColorModeToggle;
