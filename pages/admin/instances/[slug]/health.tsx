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

const InstanceHealthPage = () => {
  const router = useRouter();
  const { slug } = router.query;
  const [instance, setInstance] = useState<RoadmapInstanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

          {schema && Object.keys(schema).length > 0 && (
            <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
              <h3 className="text-sm font-semibold text-white">Schema-Abweichungen</h3>
              <p className="mt-1 text-xs text-slate-400">
                Unterschiede zwischen erwartetem und vorhandenem Listen-Schema pro Instanz.
              </p>
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
                            <li key={f}>{f}</li>
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
                            <li key={m.field}>
                              {m.field}: erwartet {m.expected}, vorhanden {m.actual}
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
                            <li key={f}>{f}</li>
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
            </section>
          )}
        </>
      )}
    </AdminSubpageLayout>
  );
};

export default withAdminAuth(InstanceHealthPage);
