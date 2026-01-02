import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

export type InstanceOption = { slug: string; displayName: string };

const COOKIE_NAME = 'roadmap-instance';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const parseCookie = (raw: string | undefined): Record<string, string> => {
  if (!raw) return {};
  return raw.split(';').reduce<Record<string, string>>((acc, pair) => {
    const [key, ...rest] = pair.split('=');
    if (!key) return acc;
    acc[key.trim()] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {});
};

const InstanceSwitcher = () => {
  const router = useRouter();
  const querySlug = useMemo(() => {
    const raw = router.query?.roadmapInstance;
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  }, [router.query]);

  const [options, setOptions] = useState<InstanceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');

  // Initialize selected from query or cookie
  useEffect(() => {
    if (querySlug) {
      setSelected(querySlug);
      return;
    }
    if (typeof document !== 'undefined') {
      const cookies = parseCookie(document.cookie);
      if (cookies[COOKIE_NAME]) setSelected(cookies[COOKIE_NAME]);
    }
  }, [querySlug]);

  // Load available instances (public slugs)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch('/api/instances/slugs');
        if (!resp.ok) {
          const payload = await resp.json().catch(() => null);
          throw new Error(payload?.error || 'Konnte Instanzen nicht laden');
        }
        const data = await resp.json();
        if (!cancelled) setOptions(Array.isArray(data.instances) ? data.instances : []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildQuery = (slug: string) => {
    const { roadmapInstance, ...rest } = router.query;
    return slug ? { ...rest, roadmapInstance: slug } : { ...rest };
  };

  const applySelection = (slug: string) => {
    setSelected(slug);
    if (typeof document !== 'undefined') {
      const cookieValue = slug
        ? `${COOKIE_NAME}=${slug}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
        : `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
      document.cookie = cookieValue;
    }
    router.push({ pathname: router.pathname, query: buildQuery(slug) }, undefined, {
      shallow: false,
      scroll: true,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    applySelection(slug);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 shadow-sm">
      <span className="text-xs uppercase tracking-wide text-slate-400">Instanz</span>
      <select
        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-50 focus:border-amber-400 focus:outline-none"
        value={selected}
        onChange={handleChange}
        disabled={loading || (!!error && options.length === 0)}
        aria-label="Roadmap Instanz auswählen"
      >
        <option value="">Default</option>
        {options.map((opt) => (
          <option key={opt.slug} value={opt.slug}>
            {opt.displayName || opt.slug}
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-slate-400">lädt…</span>}
      {error && !loading && <span className="text-xs text-amber-300">{error}</span>}
    </div>
  );
};

export default InstanceSwitcher;
