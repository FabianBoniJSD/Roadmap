import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import JSDoITLoader from '@/components/JSDoITLoader';

export type SharePointUserOption = {
  key: string;
  value: string;
  label: string;
  email: string | null;
  loginName: string | null;
  displayName: string;
};

type SharePointUserPickerProps = {
  instanceSlug?: string | null;
  disabled?: boolean;
  placeholder?: string;
  onSelect: (user: SharePointUserOption) => void;
  buttonLabel?: string;
  emptyMessage?: string;
};

const SharePointUserPicker: React.FC<SharePointUserPickerProps> = ({
  instanceSlug,
  disabled = false,
  placeholder = 'Person suchen …',
  onSelect,
  buttonLabel = 'Über SharePoint suchen',
  emptyMessage = 'Keine passenden Benutzer gefunden.',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SharePointUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSearch = useMemo(
    () => Boolean(instanceSlug && query.trim().length >= 2 && !disabled),
    [disabled, instanceSlug, query]
  );

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!canSearch) {
      setLoading(false);
      setResults([]);
      setOpen(false);
      setError(null);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ query: query.trim() });
        if (instanceSlug) params.set('roadmapInstance', instanceSlug);
        const resp = await fetch(`/api/sharepoint/users?${params.toString()}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        const payload = await resp.json().catch(() => null);
        if (!resp.ok) {
          throw new Error(payload?.error || 'Benutzer konnten nicht geladen werden');
        }
        setResults(Array.isArray(payload?.users) ? payload.users : []);
        setOpen(true);
      } catch (searchError) {
        const message =
          searchError instanceof Error
            ? searchError.message
            : 'Benutzer konnten nicht geladen werden';
        setResults([]);
        setOpen(true);
        setError(message);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [canSearch, instanceSlug, query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled || !instanceSlug}
          placeholder={instanceSlug ? placeholder : `${buttonLabel}: zuerst Instanz wählen`}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {loading ? (
          <div className="pointer-events-none flex items-center text-sky-200">
            <JSDoITLoader sizeRem={1} message="" showGlow={false} className="px-0 py-0" />
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 shadow-xl shadow-slate-950/40">
          {error ? (
            <div className="px-3 py-2 text-xs text-rose-200">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">{emptyMessage}</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((user) => (
                <li key={user.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(user);
                      setQuery('');
                      setResults([]);
                      setOpen(false);
                      setError(null);
                    }}
                    className={clsx(
                      'flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition hover:bg-slate-900',
                      disabled && 'cursor-not-allowed opacity-60'
                    )}
                    disabled={disabled}
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{user.label}</div>
                      <div className="text-xs text-slate-400">
                        {user.email || user.loginName || user.value}
                      </div>
                    </div>
                    <span className="rounded-full border border-sky-500/40 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
                      Auswählen
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SharePointUserPicker;
