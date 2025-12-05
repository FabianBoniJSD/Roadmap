import clsx from 'clsx';
import React from 'react';

type JSDoITLoaderProps = {
  sizeRem?: number;
  cycleMs?: number;
  message?: string;
  className?: string;
  showGlow?: boolean;
};

/**
 * Animated JSDoIT word mark with shared styling for loading states.
 * Uses a typing effect with a soft glow that matches the dark application theme.
 */
const JSDoITLoader: React.FC<JSDoITLoaderProps> = ({
  sizeRem = 5,
  cycleMs = 2600,
  message = 'Daten werden geladen …',
  className,
  showGlow = true,
}) => {
  const label = 'JSDoIT';
  const letters = label.split('');
  const typingDuration = Math.max(cycleMs, 1600);
  const charWidth = letters.length;
  const clampedSize = Number.isFinite(sizeRem) ? Math.max(sizeRem, 1.4) : 5;
  const caretWidthEm = Math.min(Math.max(clampedSize * 0.05, 0.12), 0.22);
  const minHeightRem = clampedSize * 1.28;
  const glowSizePx = Math.round(clampedSize * 34);
  const typedWidth = `calc(${charWidth}ch + 1.8ch)`;
  const keyframeCss = `
@keyframes jsdoit-type {
  0%, 7% { width: 0ch; }
  40%, 64% { width: ${typedWidth}; }
  93%, 100% { width: 0ch; }
}
@keyframes jsdoit-caret {
  0%, 40%, 64%, 100% { opacity: 1; }
  52% { opacity: 0; }
}
@keyframes jsdoit-glow {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.08); }
}
@media (prefers-reduced-motion: reduce) {
  .jsdoit-loader-typing {
    animation: none !important;
    border-right-color: transparent !important;
    width: ${typedWidth} !important;
  }
  .jsdoit-loader-orb {
    animation: none !important;
    opacity: 0.4;
  }
}`;

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-5 px-6 py-6 text-slate-100',
        'overflow-visible',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message || 'Ladevorgang'}
    >
      <style>{keyframeCss}</style>

      <div className="relative flex items-center justify-center">
        {showGlow && (
          <div
            className="jsdoit-loader-orb pointer-events-none absolute rounded-full bg-sky-500/35 blur-3xl"
            style={{
              animation: 'jsdoit-glow 3.4s ease-in-out infinite',
              height: `${glowSizePx}px`,
              width: `${glowSizePx}px`,
            }}
            aria-hidden="true"
          />
        )}
        <div className="relative flex items-center">
          <div
            className="jsdoit-loader-typing overflow-hidden whitespace-nowrap border-r border-sky-200/80 pr-2 font-mono font-semibold tracking-[0.18ch]"
            style={{
              fontSize: `${sizeRem}rem`,
              minHeight: `${minHeightRem}rem`,
              paddingInline: '0.5ch',
              paddingBlock: '0.18em',
              width: typedWidth,
              animation: `jsdoit-type ${typingDuration}ms steps(${charWidth}) infinite, jsdoit-caret 850ms steps(1) infinite`,
              lineHeight: 1.22,
              borderRightWidth: `${caretWidthEm}em`,
            }}
          >
            <span className="text-slate-100">JS</span>
            <span className="text-amber-300">Do</span>
            <span className="text-sky-300">IT</span>
          </div>
        </div>
      </div>

      {message && (
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-300/80">
          {message}
        </p>
      )}
    </div>
  );
};

export default JSDoITLoader;
