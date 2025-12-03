import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import withAdminAuth from '@/components/withAdminAuth';
import { getAdminSessionToken } from '@/utils/auth';
import type { RoadmapInstanceSummary } from '@/types/roadmapInstance';

type ApiInstanceResponse = {
  instances: RoadmapInstanceSummary[];
};

type AdminFormState = {
  slug: string;
  displayName: string;
  department: string;
  description: string;
  deploymentEnv: string;
  defaultLocale: string;
  defaultTimeZone: string;
  sharePointSiteUrlDev: string;
  sharePointSiteUrlProd: string;
  sharePointStrategy: string;
  spUsername: string;
  spPassword: string;
  spDomain: string;
  spWorkstation: string;
  allowSelfSigned: boolean;
  needsProxy: boolean;
  forceSingleCreds: boolean;
  authNoCache: boolean;
  manualNtlmFallback: boolean;
  ntlmPersistentSocket: boolean;
  ntlmSocketProbe: boolean;
  trustedCaPath: string;
  extraModes: string;
  hostsInput: string;
};

const defaultForm: AdminFormState = {
  slug: '',
  displayName: '',
  department: '',
  description: '',
  deploymentEnv: '',
  defaultLocale: '',
  defaultTimeZone: '',
  sharePointSiteUrlDev: '',
  sharePointSiteUrlProd: '',
  sharePointStrategy: 'onprem',
  spUsername: '',
  spPassword: '',
  spDomain: '',
  spWorkstation: '',
  allowSelfSigned: false,
  needsProxy: false,
  forceSingleCreds: false,
  authNoCache: false,
  manualNtlmFallback: false,
  ntlmPersistentSocket: false,
  ntlmSocketProbe: false,
  trustedCaPath: '',
  extraModes: '',
  hostsInput: '',
};

const AdminInstancesPage = () => {
  const [instances, setInstances] = useState<RoadmapInstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AdminFormState>(defaultForm);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTokenMissing(!getAdminSessionToken());
  }, []);

  const headersWithAuth = () => {
    const token = getAdminSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const resetForm = () => {
    setForm(defaultForm);
    setMode('create');
    setSelectedSlug(null);
  };

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/instances', {
        headers: headersWithAuth(),
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        throw new Error(payload?.error || 'Fehler beim Laden der Instanzen');
      }
      const data = (await resp.json()) as ApiInstanceResponse;
      setInstances(data.instances || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tokenMissing) fetchInstances();
    else setLoading(false);
  }, [fetchInstances, tokenMissing]);

  const updateField = (key: keyof AdminFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = (instance: RoadmapInstanceSummary) => {
    setSelectedSlug(instance.slug);
    setMode('edit');
    setForm({
      slug: instance.slug,
      displayName: instance.displayName,
      department: instance.department || '',
      description: instance.description || '',
      deploymentEnv: instance.deploymentEnv || '',
      defaultLocale: instance.defaultLocale || '',
      defaultTimeZone: instance.defaultTimeZone || '',
      sharePointSiteUrlDev: instance.sharePoint.siteUrlDev,
      sharePointSiteUrlProd: instance.sharePoint.siteUrlProd,
      sharePointStrategy: instance.sharePoint.strategy || 'onprem',
      spUsername: '',
      spPassword: '',
      spDomain: instance.sharePoint.domain || '',
      spWorkstation: instance.sharePoint.workstation || '',
      allowSelfSigned: Boolean(instance.sharePoint.allowSelfSigned),
      needsProxy: Boolean(instance.sharePoint.needsProxy),
      forceSingleCreds: Boolean(instance.sharePoint.forceSingleCreds),
      authNoCache: Boolean(instance.sharePoint.authNoCache),
      manualNtlmFallback: Boolean(instance.sharePoint.manualNtlmFallback),
      ntlmPersistentSocket: Boolean(instance.sharePoint.ntlmPersistentSocket),
      ntlmSocketProbe: Boolean(instance.sharePoint.ntlmSocketProbe),
      trustedCaPath: instance.sharePoint.trustedCaPath || '',
      extraModes: instance.sharePoint.extraModes.join(', '),
      hostsInput: instance.hosts.join(', '),
    });
  };

  const buildPayload = () => {
    const {
      slug,
      displayName,
      department,
      description,
      deploymentEnv,
      defaultLocale,
      defaultTimeZone,
      sharePointSiteUrlDev,
      sharePointSiteUrlProd,
      sharePointStrategy,
      spUsername,
      spPassword,
      spDomain,
      spWorkstation,
      allowSelfSigned,
      needsProxy,
      forceSingleCreds,
      authNoCache,
      manualNtlmFallback,
      ntlmPersistentSocket,
      ntlmSocketProbe,
      trustedCaPath,
      extraModes,
      hostsInput,
    } = form;

    const hostEntries = hostsInput
      .split(/[\n,]/)
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);

    return {
      slug,
      displayName,
      department: department || undefined,
      description: description || undefined,
      deploymentEnv: deploymentEnv || undefined,
      defaultLocale: defaultLocale || undefined,
      defaultTimeZone: defaultTimeZone || undefined,
      hosts: hostEntries,
      sharePoint: {
        siteUrlDev: sharePointSiteUrlDev,
        siteUrlProd: sharePointSiteUrlProd || sharePointSiteUrlDev,
        strategy: sharePointStrategy,
        username: spUsername || undefined,
        password: spPassword || undefined,
        domain: spDomain || undefined,
        workstation: spWorkstation || undefined,
        allowSelfSigned,
        needsProxy,
        forceSingleCreds,
        authNoCache,
        manualNtlmFallback,
        ntlmPersistentSocket,
        ntlmSocketProbe,
        trustedCaPath: trustedCaPath || undefined,
        extraModes: extraModes
          .split(',')
          .map((mode) => mode.trim().toLowerCase())
          .filter(Boolean),
      },
    };
  };

  const submitForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const endpoint =
        mode === 'create'
          ? '/api/instances'
          : `/api/instances/${encodeURIComponent(selectedSlug || payload.slug)}`;
      const resp = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: headersWithAuth(),
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.error || 'Speichern fehlgeschlagen');
      }
      await fetchInstances();
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteInstance = async (slug: string) => {
    if (!window.confirm(`Instanz "${slug}" wirklich löschen?`)) return;
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(`/api/instances/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
        headers: headersWithAuth(),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.error || 'Löschen fehlgeschlagen');
      }
      await fetchInstances();
      if (selectedSlug === slug) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  };

  if (tokenMissing) {
    return (
      <div className="min-h-screen bg-slate-950 p-10 text-slate-200">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-lg shadow-slate-950/40">
          <h1 className="text-2xl font-semibold text-white">Admin Instanzen</h1>
          <p className="mt-4 text-slate-300">
            Bitte melde dich zuerst über den Admin-Login an, um Instanzen verwalten zu können.
          </p>
          <Link
            href="/admin/login"
            className="mt-6 inline-flex rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Zum Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white sm:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-3xl font-semibold text-white">Roadmap Instanzen</h1>
            <p className="text-sm text-slate-400">
              Erstelle neue Instanzen, ändere SharePoint-Zugänge oder ordne Hostnamen zu.
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-white"
          >
            Neue Instanz anlegen
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {mode === 'create' ? 'Neue Instanz' : `Instanz bearbeiten (${selectedSlug})`}
              </h2>
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm text-slate-400 underline underline-offset-4 hover:text-white"
                >
                  Abbrechen
                </button>
              )}
            </div>
            <div className="mt-6 space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-300">Anzeigename</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Slug</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white disabled:opacity-70"
                    value={form.slug}
                    disabled={mode === 'edit'}
                    onChange={(e) => updateField('slug', e.target.value.toLowerCase())}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-300">Department</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.department}
                    onChange={(e) => updateField('department', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Beschreibung</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-300">SharePoint DEV URL</span>
                  <input
                    type="url"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.sharePointSiteUrlDev}
                    onChange={(e) => updateField('sharePointSiteUrlDev', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">SharePoint PROD URL</span>
                  <input
                    type="url"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.sharePointSiteUrlProd}
                    onChange={(e) => updateField('sharePointSiteUrlProd', e.target.value)}
                  />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-slate-300">Strategy</span>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                  value={form.sharePointStrategy}
                  onChange={(e) => updateField('sharePointStrategy', e.target.value)}
                >
                  <option value="onprem">onprem</option>
                  <option value="online">online</option>
                  <option value="kerberos">kerberos</option>
                  <option value="fba">fba</option>
                  <option value="basic">basic</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-300">
                    Service Account (neuer Wert optional beim Bearbeiten)
                  </span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    placeholder={
                      mode === 'edit' ? 'leer lassen falls unverändert' : 'z. B. DOMAIN\\user'
                    }
                    value={form.spUsername}
                    onChange={(e) => updateField('spUsername', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">
                    Passwort (nur ausfüllen, wenn du es neu setzen willst)
                  </span>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.spPassword}
                    onChange={(e) => updateField('spPassword', e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-300">Domain</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.spDomain}
                    onChange={(e) => updateField('spDomain', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Workstation</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.spWorkstation}
                    onChange={(e) => updateField('spWorkstation', e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-300">Hosts (Komma oder Zeilenumbrüche)</span>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.hostsInput}
                    onChange={(e) => updateField('hostsInput', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Extra Modes (comma separated)</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.extraModes}
                    onChange={(e) => updateField('extraModes', e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-300">Trusted CA Pfad</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.trustedCaPath}
                    onChange={(e) => updateField('trustedCaPath', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Deployment Umgebung</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.deploymentEnv}
                    onChange={(e) => updateField('deploymentEnv', e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-300">Standard Locale</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.defaultLocale}
                    onChange={(e) => updateField('defaultLocale', e.target.value)}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300">Standard Zeitzone</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    value={form.defaultTimeZone}
                    onChange={(e) => updateField('defaultTimeZone', e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['allowSelfSigned', 'Self-Signed Zertifikate erlauben'],
                  ['needsProxy', 'Proxy erzwingen (node-sp-auth)'],
                  ['forceSingleCreds', 'Nur primäre Credential-Permutation'],
                  ['authNoCache', 'Keine Cache Nutzung'],
                  ['manualNtlmFallback', 'Manuelles NTLM Fallback'],
                  ['ntlmPersistentSocket', 'Persistente NTLM Socket'],
                  ['ntlmSocketProbe', 'NTLM Socket Probe'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                      checked={Boolean(form[key as keyof AdminFormState])}
                      onChange={(e) => updateField(key as keyof AdminFormState, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={submitForm}
                disabled={saving}
                className={clsx(
                  'w-full rounded-xl bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-400',
                  saving && 'cursor-not-allowed opacity-60'
                )}
              >
                {saving
                  ? 'Speichere …'
                  : mode === 'create'
                    ? 'Instanz anlegen'
                    : 'Änderungen speichern'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Bestehende Instanzen</h2>
              <button
                type="button"
                onClick={fetchInstances}
                className="text-sm text-slate-400 underline underline-offset-4 hover:text-white"
              >
                Aktualisieren
              </button>
            </div>
            {loading ? (
              <p className="mt-8 text-slate-400">Lade Daten …</p>
            ) : (
              <div className="mt-6 space-y-4">
                {instances.map((instance) => (
                  <article
                    key={instance.slug}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{instance.displayName}</h3>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {instance.slug} • {instance.sharePoint.strategy || 'onprem'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(instance)}
                          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteInstance(instance.slug)}
                          className="rounded-lg border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400 hover:text-white"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                    <dl className="mt-3 space-y-1 text-xs text-slate-400">
                      <div className="flex gap-2">
                        <dt className="text-slate-500">SharePoint:</dt>
                        <dd className="truncate text-slate-200">
                          {(
                            instance.sharePoint.siteUrlProd || instance.sharePoint.siteUrlDev
                          ).replace(/\/$/, '')}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-slate-500">Hosts:</dt>
                        <dd className="text-slate-300">
                          {instance.hosts.length ? instance.hosts.join(', ') : '—'}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-slate-500">Credentials:</dt>
                        <dd className="text-slate-300">
                          Benutzer {instance.sharePoint.usernameSet ? 'gesetzt' : 'fehlt'} ·
                          Passwort {instance.sharePoint.passwordSet ? 'gesetzt' : 'fehlt'}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
                {!instances.length && (
                  <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
                    <p className="font-medium text-white">Noch keine Instanzen</p>
                    <p className="text-sm">
                      Fülle das Formular aus, um die erste Instanz anzulegen.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default withAdminAuth(AdminInstancesPage);
