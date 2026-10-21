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
          ? 'border-slate-300 bg-white/90 text-slate-900 hover:bg-white'
          : 'border-slate-700 bg-slate-900/80 text-slate-100 hover:border-sky-400/70 hover:bg-slate-900',
        className
      )}
      aria-label={isLightMode ? 'Zum dunklen Modus wechseln' : 'Zum hellen Modus wechseln'}
      title={isLightMode ? 'Zum dunklen Modus wechseln' : 'Zum hellen Modus wechseln'}
    >
      <span className="color-mode-track" data-mode={colorMode} aria-hidden="true">
        <span className={clsx('color-mode-thumb', isLightMode ? 'bg-amber-300' : 'bg-sky-400')} />
        <FaMoon
          className={clsx('color-mode-icon', isLightMode ? 'text-slate-400' : 'text-slate-950')}
        />
        <FaSun
          className={clsx('color-mode-icon', isLightMode ? 'text-amber-600' : 'text-slate-500')}
        />
      </span>
      <span className="hidden text-xs font-semibold normal-case tracking-normal sm:inline">
        {isLightMode ? 'Hell' : 'Dunkel'}
      </span>
    </button>
  );
};

export default ColorModeToggle;
