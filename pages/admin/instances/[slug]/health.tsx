import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import withAdminAuth from '@/components/withAdminAuth';
import type { RoadmapInstanceSummary } from '@/types/roadmapInstance';
import { getAdminSessionToken } from '@/utils/auth';

const formatTimestamp = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('de-CH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const statusBadgeClasses = (status: string | undefined) =>
  clsx(
    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
    status === 'ok' && 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
    status === 'insufficient' && 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
    status === 'error' && 'bg-rose-500/20 text-rose-200 border border-rose-500/40',
    (!status || status === 'unknown') && 'bg-slate-700/40 text-slate-300 border border-slate-700/60'
  );

type ApiInstanceResponse = { instance: RoadmapInstanceSummary };

type IgnoreKind = 'missing' | 'unexpected' | 'typeMismatch';

const InstanceHealthPage = () => {
  const router = useRouter();
  const { slug } = router.query;
  const [instance, setInstance] = useState<RoadmapInstanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ignoreBusy, setIgnoreBusy] = useState<Record<string, boolean>>({});
  const [showIgnored, setShowIgnored] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInstance = async (slugValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = getAdminSessionToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(`/api/instances/${encodeURIComponent(slugValue)}`, {
        headers,
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        throw new Error(payload?.error || `Fehler ${resp.status}`);
      }
      const data = (await resp.json()) as ApiInstanceResponse;
      setInstance(data.instance);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return;
    void loadInstance(slug);
  }, [slug]);

  const triggerRefresh = async () => {
    if (!slug || typeof slug !== 'string') return;
    setRefreshing(true);
    setError(null);
    try {
      const token = getAdminSessionToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(`/api/instances/${encodeURIComponent(slug)}/health`, {
        method: 'POST',
        headers,
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        throw new Error(payload?.error || `Fehler ${resp.status}`);
      }
      const data = (await resp.json()) as ApiInstanceResponse;
      setInstance(data.instance);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  };

  const health = instance?.health;
  const lists = health?.lists;
  const schema = lists?.schemaMismatches || {};
  const schemaIgnored = lists?.schemaMismatchesIgnored || {};
  const hasSchema = Object.keys(schema).length > 0;
  const hasIgnoredSchema = Object.keys(schemaIgnored).length > 0;

  const setMismatchIgnore = async (payload: {
    op: 'ignore' | 'unignore';
    kind: IgnoreKind;
    listName: string;
    field: string;
    expected?: string;
    actual?: string;
  }) => {
    if (!slug || typeof slug !== 'string') return;
    const busyKey = `${payload.kind}:${payload.listName}:${payload.field}:${payload.expected ?? ''}:${payload.actual ?? ''}`;
    setIgnoreBusy((prev) => ({ ...prev, [busyKey]: true }));
    setError(null);
    try {
      const token = getAdminSessionToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`/api/instances/${encodeURIComponent(slug)}/health-ignore`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const apiPayload = await resp.json().catch(() => null);
        throw new Error(apiPayload?.error || `Fehler ${resp.status}`);
      }
      const data = (await resp.json()) as ApiInstanceResponse;
      setInstance(data.instance);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setIgnoreBusy((prev) => ({ ...prev, [busyKey]: false }));
    }
  };

  return (
    <AdminSubpageLayout
      title={`Health Check für ${slug ?? ''}`}
      eyebrow="Admin"
      description="Hier siehst du den aktuellen Zustand der SharePoint-Integration sowie automatisch angelegte Listen."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Instanzen', href: '/admin/instances' },
        { label: slug ? String(slug) : 'Health' },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/instances"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
          >
            Zurück zur Übersicht
          </Link>
          <button
            type="button"
            onClick={triggerRefresh}
            disabled={refreshing || loading}
            className={clsx(
              'rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-400',
              (refreshing || loading) && 'cursor-not-allowed opacity-60'
            )}
          >
            {refreshing ? 'Prüfung läuft…' : 'Health neu prüfen'}
          </button>
        </div>
      }
    >
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Lade Gesundheitsdaten…
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Statusübersicht</h2>
                <p className="text-xs text-slate-400">
                  Letzte Prüfung: {formatTimestamp(health?.checkedAt)}
                </p>
              </div>
              <span className={statusBadgeClasses(health?.permissions.status)}>
                {health?.permissions.status === 'ok' && 'SharePoint bereit'}
                {health?.permissions.status === 'insufficient' && 'Berechtigungen fehlen'}
                {health?.permissions.status === 'error' && 'SharePoint-Fehler'}
                {(!health || health.permissions.status === 'unknown') && 'Status unbekannt'}
              </span>
            </header>

            {health?.permissions.message && (
              <p className="mt-3 text-sm text-amber-200">Hinweis: {health.permissions.message}</p>
            )}

            {health?.compatibility && (
              <div className="mt-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Kompatibilität
                    </div>
                    <div className="mt-1 text-sm text-slate-200">
                      {health.compatibility.sharePointTeamServices
                        ? `Version: ${health.compatibility.sharePointTeamServices}`
                        : 'Version: unbekannt'}
                    </div>
                    {(health.compatibility.webTitle || health.compatibility.webTemplate) && (
                      <div className="mt-1 text-xs text-slate-400">
                        {health.compatibility.webTitle ? `${health.compatibility.webTitle}` : ''}
                        {health.compatibility.webTemplate
                          ? ` · Template: ${health.compatibility.webTemplate}${
                              typeof health.compatibility.webTemplateConfiguration === 'number'
                                ? ` (${health.compatibility.webTemplateConfiguration})`
                                : ''
                            }`
                          : ''}
                      </div>
                    )}
                  </div>
                  <span className={statusBadgeClasses(health.compatibility.status)}>
                    {health.compatibility.status === 'ok' && 'Kompatibel'}
                    {health.compatibility.status === 'insufficient' && 'Hinweis'}
                    {health.compatibility.status === 'error' && 'Problem'}
                    {health.compatibility.status === 'unknown' && 'Unbekannt'}
                  </span>
                </div>

                {Array.isArray(health.compatibility.warnings) &&
                  health.compatibility.warnings.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-amber-100/90">
                      {health.compatibility.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                {Array.isArray(health.compatibility.errors) &&
                  health.compatibility.errors.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-rose-100/90">
                      {health.compatibility.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
              </div>
            )}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
              <h3 className="text-sm font-semibold text-white">Erstellte Listen</h3>
              <p className="mt-1 text-xs text-slate-400">
                Listen, die automatisch angelegt oder bestätigt wurden.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {(lists?.created?.length ?? 0) === 0 ? (
                  <li className="text-slate-500">Keine neuen Listen erstellt.</li>
                ) : (
                  lists?.created?.map((name) => (
                    <li
                      key={name}
                      className="rounded-lg border border-slate-800/60 bg-slate-900/70 px-3 py-2"
                    >
                      {name}
                    </li>
                  ))
                )}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
              <h3 className="text-sm font-semibold text-white">Fehlende Listen</h3>
              <p className="mt-1 text-xs text-slate-400">
                Elemente, die nicht angelegt werden konnten und manuell geprüft werden sollten.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {(lists?.missing?.length ?? 0) === 0 ? (
                  <li className="text-emerald-300">Alle erwarteten Listen sind vorhanden.</li>
                ) : (
                  lists?.missing?.map((name) => (
                    <li
                      key={name}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100"
                    >
                      {name}
                    </li>
                  ))
                )}
              </ul>
            </article>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
              <h3 className="text-sm font-semibold text-white">Bestätigte Listen</h3>
              <p className="mt-1 text-xs text-slate-400">
                Diese Listen wurden bei der letzten Prüfung gefunden.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {(lists?.ensured?.length ?? 0) === 0 ? (
                  <li className="text-slate-500">Keine Listen bestätigt.</li>
                ) : (
                  lists?.ensured?.map((name) => (
                    <li
                      key={name}
                      className="rounded-lg border border-slate-800/60 bg-slate-900/70 px-3 py-2"
                    >
                      {name}
                    </li>
                  ))
                )}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
              <h3 className="text-sm font-semibold text-white">Fehlermeldungen</h3>
              <p className="mt-1 text-xs text-slate-400">Details zu aufgetretenen Problemen.</p>
              {lists && Object.keys(lists.errors || {}).length > 0 ? (
                <ul className="mt-4 space-y-2 text-xs text-rose-200">
                  {Object.entries(lists.errors).map(([key, message]) => (
                    <li
                      key={key}
                      className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-100"
                    >
                      <strong className="block text-rose-200">{key}</strong>
                      <span className="block text-rose-100/80">{message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-emerald-300">Keine Fehler gemeldet.</p>
              )}
            </article>
          </section>

          {lists && Object.keys(lists.fieldsCreated).length > 0 && (
            <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
              <h3 className="text-sm font-semibold text-white">Neu angelegte Felder</h3>
              <p className="mt-1 text-xs text-slate-400">
                Überblick über Felder, die während der Provisionierung ergänzt wurden.
              </p>
              <div className="mt-4 space-y-4 text-sm text-slate-200">
                {Object.entries(lists.fieldsCreated).map(([listName, fields]) => (
                  <div
                    key={listName}
                    className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4"
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      {listName}
                    </h4>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {fields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(hasSchema || hasIgnoredSchema) && (
            <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">Schema-Abweichungen</h3>
                {hasIgnoredSchema && (
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={showIgnored}
                      onChange={(e) => setShowIgnored(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                    />
                    Ignorierte anzeigen
                  </label>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Unterschiede zwischen erwartetem und vorhandenem Listen-Schema pro Instanz.
              </p>

              {!hasSchema && (
                <p className="mt-4 text-sm text-emerald-300">
                  Keine (nicht ignorierten) Schema-Abweichungen.
                </p>
              )}

              <div className="mt-4 space-y-4 text-sm text-slate-200">
                {Object.entries(schema).map(([listName, details]) => (
                  <div
                    key={listName}
                    className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-50"
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                      {listName}
                    </h4>
                    {details.missing.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] font-semibold text-amber-100">
                          Fehlende Felder
                        </div>
                        <ul className="ml-4 list-disc space-y-1 text-amber-50/90">
                          {details.missing.map((f) => (
                            <li key={f} className="flex items-start justify-between gap-3">
                              <span className="break-all">{f}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  void setMismatchIgnore({
                                    op: 'ignore',
                                    kind: 'missing',
                                    listName,
                                    field: f,
                                  })
                                }
                                disabled={Boolean(ignoreBusy[`missing:${listName}:${f}:::`])}
                                className={clsx(
                                  'shrink-0 rounded-md border border-amber-200/40 bg-amber-200/10 px-2 py-1 text-[11px] font-semibold text-amber-50 transition hover:bg-amber-200/20',
                                  ignoreBusy[`missing:${listName}:${f}:::`] &&
                                    'cursor-not-allowed opacity-60'
                                )}
                              >
                                Ignorieren
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {details.typeMismatches.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] font-semibold text-amber-100">
                          Typ-Abweichungen
                        </div>
                        <ul className="ml-4 list-disc space-y-1 text-amber-50/90">
                          {details.typeMismatches.map((m) => (
                            <li
                              key={`${m.field}:${m.expected}:${m.actual}`}
                              className="flex items-start justify-between gap-3"
                            >
                              <span className="break-words">
                                {m.field}: erwartet {m.expected}, vorhanden {m.actual}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void setMismatchIgnore({
                                    op: 'ignore',
                                    kind: 'typeMismatch',
                                    listName,
                                    field: m.field,
                                    expected: m.expected,
                                    actual: m.actual,
                                  })
                                }
                                disabled={Boolean(
                                  ignoreBusy[
                                    `typeMismatch:${listName}:${m.field}:${m.expected}:${m.actual}`
                                  ]
                                )}
                                className={clsx(
                                  'shrink-0 rounded-md border border-amber-200/40 bg-amber-200/10 px-2 py-1 text-[11px] font-semibold text-amber-50 transition hover:bg-amber-200/20',
                                  ignoreBusy[
                                    `typeMismatch:${listName}:${m.field}:${m.expected}:${m.actual}`
                                  ] && 'cursor-not-allowed opacity-60'
                                )}
                              >
                                Ignorieren
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {details.unexpected.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] font-semibold text-amber-100">
                          Zusätzliche Felder
                        </div>
                        <ul className="ml-4 list-disc space-y-1 text-amber-50/90">
                          {details.unexpected.map((f) => (
                            <li key={f} className="flex items-start justify-between gap-3">
                              <span className="break-all">{f}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  void setMismatchIgnore({
                                    op: 'ignore',
                                    kind: 'unexpected',
                                    listName,
                                    field: f,
                                  })
                                }
                                disabled={Boolean(ignoreBusy[`unexpected:${listName}:${f}:::`])}
                                className={clsx(
                                  'shrink-0 rounded-md border border-amber-200/40 bg-amber-200/10 px-2 py-1 text-[11px] font-semibold text-amber-50 transition hover:bg-amber-200/20',
                                  ignoreBusy[`unexpected:${listName}:${f}:::`] &&
                                    'cursor-not-allowed opacity-60'
                                )}
                              >
                                Ignorieren
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {details.missing.length === 0 &&
                      details.unexpected.length === 0 &&
                      details.typeMismatches.length === 0 && (
                        <p className="mt-2 text-xs text-emerald-200">Keine Abweichungen.</p>
                      )}
                  </div>
                ))}
              </div>

              {showIgnored && hasIgnoredSchema && (
                <div className="mt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Ignorierte Abweichungen
                  </h4>
                  <div className="mt-3 space-y-4 text-sm text-slate-200">
                    {Object.entries(schemaIgnored).map(([listName, details]) => (
                      <div
                        key={listName}
                        className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4"
                      >
                        <h5 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                          {listName}
                        </h5>

                        {details.missing.length > 0 && (
                          <div className="mt-2">
                            <div className="text-[11px] font-semibold text-slate-300">
                              Fehlende Felder (ignoriert)
                            </div>
                            <ul className="ml-4 list-disc space-y-1 text-slate-200">
                              {details.missing.map((f) => (
                                <li key={f} className="flex items-start justify-between gap-3">
                                  <span className="break-all">{f}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void setMismatchIgnore({
                                        op: 'unignore',
                                        kind: 'missing',
                                        listName,
                                        field: f,
                                      })
                                    }
                                    disabled={Boolean(ignoreBusy[`missing:${listName}:${f}:::`])}
                                    className={clsx(
                                      'shrink-0 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500',
                                      ignoreBusy[`missing:${listName}:${f}:::`] &&
                                        'cursor-not-allowed opacity-60'
                                    )}
                                  >
                                    Ignorierung aufheben
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {details.typeMismatches.length > 0 && (
                          <div className="mt-2">
                            <div className="text-[11px] font-semibold text-slate-300">
                              Typ-Abweichungen (ignoriert)
                            </div>
                            <ul className="ml-4 list-disc space-y-1 text-slate-200">
                              {details.typeMismatches.map((m) => (
                                <li
                                  key={`${m.field}:${m.expected}:${m.actual}`}
                                  className="flex items-start justify-between gap-3"
                                >
                                  <span className="break-words">
                                    {m.field}: erwartet {m.expected}, vorhanden {m.actual}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void setMismatchIgnore({
                                        op: 'unignore',
                                        kind: 'typeMismatch',
                                        listName,
                                        field: m.field,
                                        expected: m.expected,
                                        actual: m.actual,
                                      })
                                    }
                                    disabled={Boolean(
                                      ignoreBusy[
                                        `typeMismatch:${listName}:${m.field}:${m.expected}:${m.actual}`
                                      ]
                                    )}
                                    className={clsx(
                                      'shrink-0 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500',
                                      ignoreBusy[
                                        `typeMismatch:${listName}:${m.field}:${m.expected}:${m.actual}`
                                      ] && 'cursor-not-allowed opacity-60'
                                    )}
                                  >
                                    Ignorierung aufheben
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {details.unexpected.length > 0 && (
                          <div className="mt-2">
                            <div className="text-[11px] font-semibold text-slate-300">
                              Zusätzliche Felder (ignoriert)
                            </div>
                            <ul className="ml-4 list-disc space-y-1 text-slate-200">
                              {details.unexpected.map((f) => (
                                <li key={f} className="flex items-start justify-between gap-3">
                                  <span className="break-all">{f}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void setMismatchIgnore({
                                        op: 'unignore',
                                        kind: 'unexpected',
                                        listName,
                                        field: f,
                                      })
                                    }
                                    disabled={Boolean(ignoreBusy[`unexpected:${listName}:${f}:::`])}
                                    className={clsx(
                                      'shrink-0 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500',
                                      ignoreBusy[`unexpected:${listName}:${f}:::`] &&
                                        'cursor-not-allowed opacity-60'
                                    )}
                                  >
                                    Ignorierung aufheben
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </AdminSubpageLayout>
  );
};

export default withAdminAuth(InstanceHealthPage);
