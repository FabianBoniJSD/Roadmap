import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import AdminSubpageLayout from '@/components/AdminSubpageLayout';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import {
  buildInstanceAwareUrl,
  getAdminSessionToken,
  hasAdminAccess,
  persistAdminSession,
} from '@/utils/auth';
import type { RoadmapInstanceSummary } from '@/types/roadmapInstance';
import { SHAREPOINT_LIST_DEFINITIONS } from '@/utils/sharePointLists';

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
  landingPage: string;
  sharePointSiteUrlDev: string;
  sharePointSiteUrlProd: string;
  sharePointStrategy: string;
  spUsername: string;
  spPassword: string;
  allowSelfSigned: boolean;
  trustedCaPath: string;
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
  landingPage: '',
  sharePointSiteUrlDev: '',
  sharePointSiteUrlProd: '',
  sharePointStrategy: 'kerberos',
  spUsername: '',
  spPassword: '',
  allowSelfSigned: false,
  trustedCaPath: '',
  hostsInput: '',
};

type SharePointListStatus = 'created' | 'ensured' | 'missing' | 'unknown';

const listStatusLabels: Record<SharePointListStatus, string> = {
  created: 'neu erstellt',
  ensured: 'vorhanden',
  missing: 'fehlend',
  unknown: 'offen',
};

const listStatusStyles: Record<SharePointListStatus, string> = {
  created: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
  ensured: 'bg-sky-500/10 text-sky-200 border border-sky-400/40',
  missing: 'bg-rose-500/10 text-rose-200 border border-rose-500/40',
  unknown: 'bg-slate-700/30 text-slate-200 border border-slate-700/50',
};

type InstanceListOverviewEntry = {
  key: string;
  title: string;
  exists: boolean;
  resolvedTitle?: string;
  matchedAlias?: string;
  itemCount?: number;
  created?: string;
  modified?: string;
  defaultViewUrl?: string;
  serverRelativeUrl?: string;
  errors?: string[];
};

type InstanceListPanelState = {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  errorDetails: string[] | null;
  lists: InstanceListOverviewEntry[] | null;
  pending: Record<string, boolean>;
};

const createListPanelState = (): InstanceListPanelState => ({
  isOpen: false,
  loading: false,
  error: null,
  errorDetails: null,
  lists: null,
  pending: {},
});

const extractDetailMessages = (details: unknown): string[] => {
  const lines: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown, prefix?: string) => {
    if (value === null || value === undefined) return;
    const text = String(value).trim();
    if (!text) return;
    const line = prefix ? `${prefix}: ${text}` : text;
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  };
  const walk = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => walk(entry));
      return;
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.phase === 'string') add(record.phase, 'Phase');
      if (typeof record.listKey === 'string') add(record.listKey, 'Liste');
      if (Array.isArray(record.messages)) record.messages.forEach((msg) => add(msg));
      const errors = record.errors;
      if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
        Object.entries(errors as Record<string, unknown>).forEach(([key, message]) => {
          add(message, key);
        });
      }
      const permissions = record.permissions;
      if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
        const p = permissions as { status?: unknown; message?: unknown };
        if (p.status) add(p.status, 'Berechtigungen');
        if (p.message) add(p.message);
      }
      const handledKeys = new Set(['phase', 'listKey', 'messages', 'errors', 'permissions']);
      Object.keys(record).forEach((key) => {
        if (!handledKeys.has(key)) {
          walk(record[key]);
        }
      });
      return;
    }
    add(value);
  };
  walk(details);
  return lines;
};

const getErrorDetailLines = (error: unknown): string[] | null => {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { detailLines?: string[]; details?: unknown };
  if (Array.isArray(candidate.detailLines) && candidate.detailLines.length > 0) {
    return candidate.detailLines;
  }
  const extracted = extractDetailMessages(candidate.details);
  return extracted.length > 0 ? extracted : null;
};

const resolveListStatus = (
  health: RoadmapInstanceSummary['health'],
  def: (typeof SHAREPOINT_LIST_DEFINITIONS)[number]
): SharePointListStatus => {
  if (!health?.lists) return 'unknown';
  const { missing = [], created = [], ensured = [] } = health.lists;
  const identifiers = [def.title, def.key, ...(def.aliases ?? [])].map((value) =>
    value.toLowerCase()
  );
  const matches = (value: string) => identifiers.includes(value.toLowerCase());
  if (missing.some(matches)) return 'missing';
  if (created.some(matches)) return 'created';
  if (ensured.some(matches)) return 'ensured';
  return 'unknown';
};

const InstancesLanding = (props: {
  returnUrl: string;
  entraEnabled: boolean;
  onStartSso: () => void;
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader activeRoute="admin" />
      <main className="flex-1">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 sm:px-8">
          <header className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sky-300/90">
              Roadmap Administration
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Instanzen verwalten</h1>
            <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
              Die Roadmap bündelt Projekte, Status und Planung zentral — mit SharePoint-Integration,
              Kategorien, Teamzuordnung und übersichtlicher Timeline. Melde dich an, um Instanzen zu
              erstellen, zu konfigurieren und zu migrieren.
            </p>
          </header>

          <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/40 sm:p-10">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Warum Roadmap?</h2>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• SharePoint als Backend (On-Prem kompatibel)</li>
                  <li>• Rollen/Allowlist & Admin-Bereich</li>
                  <li>• Kategorien, Links, Team Members, Attachments</li>
                  <li>• Instanzbetrieb (mehrere Organisationen/Teams)</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Anmeldung</h2>
                <div className="flex flex-wrap gap-3">
                  {props.entraEnabled ? (
                    <button
                      onClick={props.onStartSso}
                      className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                    >
                      Mit Microsoft anmelden (SSO)
                    </button>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Microsoft SSO ist nicht konfiguriert.
                    </span>
                  )}

                  <Link
                    href={buildInstanceAwareUrl(
                      `/admin/login?manual=1&returnUrl=${encodeURIComponent(props.returnUrl)}`
                    )}
                    className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                  >
                    Admin Login
                  </Link>
                </div>
                <p className="text-xs text-slate-400">
                  Hinweis: Wenn du automatisch per SSO eingeloggt werden möchtest, setze
                  <span className="font-mono"> NEXT_PUBLIC_ENTRA_AUTO_LOGIN=true</span>.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

const AdminInstancesPage = () => {
  const [instances, setInstances] = useState<RoadmapInstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AdminFormState>(defaultForm);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkProvisioning, setBulkProvisioning] = useState(false);
  const [bulkProvisionSummary, setBulkProvisionSummary] = useState<string | null>(null);
  const [bulkProvisionFailures, setBulkProvisionFailures] = useState<
    Array<{ slug: string; message?: string }>
  >([]);
  const [tokenMissing, setTokenMissing] = useState(true);
  const [listPanels, setListPanels] = useState<Record<string, InstanceListPanelState>>({});

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

  const provisionAllInstances = async () => {
    if (!instances.length) return;
    if (
      !window.confirm(
        `Jetzt alle ${instances.length} Instanzen provisionieren?\n\nDas versucht fehlende Listen/Spalten in SharePoint anzulegen (Migration).`
      )
    ) {
      return;
    }

    setBulkProvisioning(true);
    setBulkProvisionSummary(null);
    setBulkProvisionFailures([]);
    setError(null);
    try {
      const resp = await fetch('/api/instances/provision', {
        method: 'POST',
        headers: { ...headersWithAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(payload?.error || 'Provisioning fehlgeschlagen');
      }

      const results = Array.isArray(payload?.results) ? payload.results : [];
      const asRecord = (value: unknown): Record<string, unknown> | null =>
        value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
      const failures = (results as unknown[])
        .map((r) => asRecord(r))
        .filter((r): r is Record<string, unknown> => !!r)
        .filter((r) => r.ok === false && typeof r.slug === 'string')
        .map((r) => ({
          slug: String(r.slug),
          message: typeof r.message === 'string' ? r.message : r.message ? String(r.message) : '',
        }));
      setBulkProvisionFailures(failures);

      const summary = payload?.summary;
      if (summary && typeof summary.total === 'number') {
        setBulkProvisionSummary(
          `Provisioning abgeschlossen: ${summary.ok}/${summary.total} OK, ${summary.failed} Fehler.`
        );
      } else {
        setBulkProvisionSummary('Provisioning abgeschlossen.');
      }

      await fetchInstances();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setBulkProvisioning(false);
    }
  };

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
      landingPage: instance.landingPage || '',
      sharePointSiteUrlDev: instance.sharePoint.siteUrlDev,
      sharePointSiteUrlProd: instance.sharePoint.siteUrlProd,
      sharePointStrategy: instance.sharePoint.strategy || 'kerberos',
      spUsername: '',
      spPassword: '',
      allowSelfSigned: Boolean(instance.sharePoint.allowSelfSigned),
      trustedCaPath: instance.sharePoint.trustedCaPath || '',
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
      landingPage,
      sharePointSiteUrlDev,
      sharePointSiteUrlProd,
      sharePointStrategy,
      spUsername,
      spPassword,
      allowSelfSigned,
      trustedCaPath,
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
      landingPage: landingPage.trim() ? landingPage.trim() : null,
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
        allowSelfSigned,
        trustedCaPath: trustedCaPath || undefined,
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

  const updateListPanelState = (
    slug: string,
    updater: (current: InstanceListPanelState) => InstanceListPanelState
  ) => {
    setListPanels((prev) => ({
      ...prev,
      [slug]: updater(prev[slug] ?? createListPanelState()),
    }));
  };

  const setListActionPending = (slug: string, key: string, pending: boolean) => {
    updateListPanelState(slug, (current) => {
      const nextPending = { ...current.pending };
      if (pending) nextPending[key] = true;
      else delete nextPending[key];
      return { ...current, pending: nextPending };
    });
  };

  const ensureAllListsForInstance = async (instance: RoadmapInstanceSummary) => {
    const slug = instance.slug;
    setListActionPending(slug, '__all__', true);
    updateListPanelState(slug, (current) => ({ ...current, error: null, errorDetails: null }));
    try {
      const resp = await fetch(`/api/instances/${encodeURIComponent(slug)}/lists`, {
        method: 'POST',
        headers: { ...headersWithAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: '__all__' }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const err = new Error(payload?.error || 'Fehler beim Anlegen der Listen') as Error & {
          detailLines?: string[];
          details?: unknown;
        };
        const detailLines = extractDetailMessages(payload?.details);
        err.detailLines = detailLines.length ? detailLines : undefined;
        err.details = payload?.details;
        throw err;
      }
      await fetchListOverview(slug);
      await fetchInstances();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      const detailLines = getErrorDetailLines(err);
      updateListPanelState(slug, (current) => ({
        ...current,
        error: message,
        errorDetails: detailLines,
      }));
    } finally {
      setListActionPending(slug, '__all__', false);
    }
  };

  const fetchListOverview = async (slug: string) => {
    updateListPanelState(slug, (current) => ({
      ...current,
      isOpen: true,
      loading: true,
      error: null,
      errorDetails: null,
    }));
    try {
      const resp = await fetch(`/api/instances/${encodeURIComponent(slug)}/lists`, {
        headers: headersWithAuth(),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const err = new Error(payload?.error || 'Fehler beim Laden der Listen') as Error & {
          detailLines?: string[];
          details?: unknown;
        };
        const detailLines = extractDetailMessages(payload?.details);
        err.detailLines = detailLines.length ? detailLines : undefined;
        err.details = payload?.details;
        throw err;
      }
      const lists = (payload?.lists ?? []) as InstanceListOverviewEntry[];
      updateListPanelState(slug, (current) => ({
        ...current,
        loading: false,
        error: null,
        errorDetails: null,
        lists,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      const detailLines = getErrorDetailLines(err);
      updateListPanelState(slug, (current) => ({
        ...current,
        loading: false,
        error: message,
        errorDetails: detailLines,
      }));
    }
  };

  const toggleListPanel = (instance: RoadmapInstanceSummary) => {
    const slug = instance.slug;
    const previous = listPanels[slug] ?? createListPanelState();
    const willOpen = !previous.isOpen;
    updateListPanelState(slug, (current) => ({
      ...current,
      isOpen: willOpen,
      error: willOpen ? null : current.error,
      errorDetails: willOpen ? null : current.errorDetails,
    }));
    if (willOpen && !previous.lists && !previous.loading) {
      void fetchListOverview(slug);
    }
  };

  const buildListUrl = (
    instance: RoadmapInstanceSummary,
    entry: InstanceListOverviewEntry
  ): string | null => {
    const rawBase = instance.sharePoint.siteUrlProd || instance.sharePoint.siteUrlDev || '';
    const base = rawBase.replace(/\/$/, '');
    if (!base) return null;
    const candidateRaw = (entry.defaultViewUrl || entry.serverRelativeUrl || '').trim();
    if (!candidateRaw) return null;
    if (candidateRaw.startsWith('http')) return candidateRaw;

    const cleanedCandidate = candidateRaw.replace(/^\/+/, '');

    try {
      const parsedBase = new URL(base);
      const origin = parsedBase.origin;
      const basePath = parsedBase.pathname.replace(/\/$/, '');
      const normalizedBasePath = basePath.replace(/^\/+/, '').toLowerCase();
      const normalizedCandidate = cleanedCandidate.toLowerCase();

      if (candidateRaw.startsWith('/')) {
        return `${origin}/${cleanedCandidate}`;
      }
      if (normalizedBasePath && normalizedCandidate.startsWith(normalizedBasePath)) {
        return `${origin}/${cleanedCandidate}`;
      }
      return `${base}/${cleanedCandidate}`;
    } catch {
      if (candidateRaw.startsWith('/')) {
        return `${base}${candidateRaw}`;
      }
      return `${base}/${cleanedCandidate}`;
    }
  };

  const ensureListForInstance = async (
    instance: RoadmapInstanceSummary,
    entry: InstanceListOverviewEntry
  ) => {
    const slug = instance.slug;
    setListActionPending(slug, `ensure:${entry.key}`, true);
    updateListPanelState(slug, (current) => ({ ...current, error: null, errorDetails: null }));
    try {
      const resp = await fetch(`/api/instances/${encodeURIComponent(slug)}/lists`, {
        method: 'POST',
        headers: { ...headersWithAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: entry.key }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const err = new Error(payload?.error || 'Fehler beim Anlegen der Liste') as Error & {
          detailLines?: string[];
          details?: unknown;
        };
        const detailLines = extractDetailMessages(payload?.details);
        err.detailLines = detailLines.length ? detailLines : undefined;
        err.details = payload?.details;
        throw err;
      }
      await fetchListOverview(slug);
      await fetchInstances();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      const detailLines = getErrorDetailLines(err);
      updateListPanelState(slug, (current) => ({
        ...current,
        error: message,
        errorDetails: detailLines,
      }));
    } finally {
      setListActionPending(slug, `ensure:${entry.key}`, false);
    }
  };

  const deleteListForInstance = async (
    instance: RoadmapInstanceSummary,
    entry: InstanceListOverviewEntry
  ) => {
    const slug = instance.slug;
    const displayName = entry.resolvedTitle || entry.title;
    if (!window.confirm(`Liste "${displayName}" wirklich löschen?`)) return;
    setListActionPending(slug, `delete:${entry.key}`, true);
    updateListPanelState(slug, (current) => ({ ...current, error: null, errorDetails: null }));
    try {
      const resp = await fetch(`/api/instances/${encodeURIComponent(slug)}/lists`, {
        method: 'DELETE',
        headers: { ...headersWithAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: entry.key }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const err = new Error(payload?.error || 'Fehler beim Löschen der Liste') as Error & {
          detailLines?: string[];
          details?: unknown;
        };
        const detailLines = extractDetailMessages(payload?.details);
        err.detailLines = detailLines.length ? detailLines : undefined;
        err.details = payload?.details;
        throw err;
      }
      await fetchListOverview(slug);
      await fetchInstances();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      const detailLines = getErrorDetailLines(err);
      updateListPanelState(slug, (current) => ({
        ...current,
        error: message,
        errorDetails: detailLines,
      }));
    } finally {
      setListActionPending(slug, `delete:${entry.key}`, false);
    }
  };

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Intl.DateTimeFormat('de-CH', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  if (tokenMissing) {
    return (
      <AdminSubpageLayout
        eyebrow="Admin"
        title="Admin Instanzen"
        description="Bitte melde dich zuerst über den Admin-Login an, um Instanzen verwalten zu können."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Instanzen' }]}
        actions={
          <Link
            href="/admin/login"
            className="inline-flex rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Zum Login
          </Link>
        }
        maxWidthClassName="max-w-3xl"
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300 shadow-lg shadow-slate-950/40 sm:p-8">
          <p>
            Dir fehlt aktuell eine gültige Admin-Session. Nach dem Login kannst du Instanzen
            anlegen, bearbeiten oder löschen.
          </p>
        </div>
      </AdminSubpageLayout>
    );
  }

  return (
    <AdminSubpageLayout
      eyebrow="Admin"
      title="Roadmap Instanzen"
      description={
        <>
          Erstelle neue Instanzen, ändere SharePoint-Zugänge oder ordne Hostnamen zu. Bereite
          Hostnamen, Service-Accounts und Umgebungsvariablen zentral vor.
        </>
      }
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Instanzen' }]}
      actions={
        <button
          type="button"
          onClick={resetForm}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-white"
        >
          Neue Instanz anlegen
        </button>
      }
      maxWidthClassName="max-w-6xl"
    >
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-2">
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
              <label className="space-y-1 sm:col-span-2">
                <span className="text-slate-300">Landing Page (optional)</span>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                  placeholder="z. B. jsd-projekte"
                  value={form.landingPage}
                  onChange={(e) => updateField('landingPage', e.target.value)}
                />
                <span className="text-xs text-slate-500">
                  Wird für individuelle Landing Pages verwendet (ohne führenden /).
                </span>
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

            <div className="grid gap-4 sm:grid-cols-1">
              <label className="space-y-1">
                <span className="text-slate-300">Hosts (Komma oder Zeilenumbrüche)</span>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                  value={form.hostsInput}
                  onChange={(e) => updateField('hostsInput', e.target.value)}
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

            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                checked={Boolean(form.allowSelfSigned)}
                onChange={(e) => updateField('allowSelfSigned', e.target.checked)}
              />
              <span>Self-Signed Zertifikate erlauben</span>
            </label>

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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={provisionAllInstances}
                disabled={bulkProvisioning || loading || tokenMissing}
                className={clsx(
                  'rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white',
                  (bulkProvisioning || loading || tokenMissing) && 'cursor-not-allowed opacity-60'
                )}
                title="Versucht fehlende Listen/Spalten für alle Instanzen anzulegen"
              >
                {bulkProvisioning ? 'Provisioniere …' : 'Alle provisionieren'}
              </button>
              <button
                type="button"
                onClick={fetchInstances}
                className="text-sm text-slate-400 underline underline-offset-4 hover:text-white"
              >
                Aktualisieren
              </button>
            </div>
          </div>
          {bulkProvisionSummary && (
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              <p>{bulkProvisionSummary}</p>
              {bulkProvisionFailures.length > 0 && (
                <details className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                  <summary className="cursor-pointer text-slate-200">
                    Fehlgeschlagen ({bulkProvisionFailures.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-slate-300">
                    {bulkProvisionFailures.map((f) => (
                      <li key={f.slug} className="break-words">
                        <span className="font-semibold text-slate-200">{f.slug}</span>
                        {f.message ? <span className="text-slate-400"> — {f.message}</span> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {loading ? (
            <p className="mt-8 text-slate-400">Lade Daten …</p>
          ) : (
            <div className="mt-6 space-y-4">
              {instances.map((instance) => {
                const panelState = listPanels[instance.slug] ?? createListPanelState();
                return (
                  <article
                    key={instance.slug}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    {instance.health && (
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                            instance.health.permissions.status === 'ok' &&
                              'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
                            instance.health.permissions.status === 'insufficient' &&
                              'bg-amber-500/20 text-amber-200 border border-amber-500/40',
                            instance.health.permissions.status === 'error' &&
                              'bg-rose-500/20 text-rose-200 border border-rose-500/40',
                            instance.health.permissions.status === 'unknown' &&
                              'bg-slate-700/40 text-slate-300 border border-slate-700/60'
                          )}
                          title={instance.health.permissions.message || undefined}
                        >
                          {instance.health.permissions.status === 'ok' && 'SharePoint bereit'}
                          {instance.health.permissions.status === 'insufficient' &&
                            'Berechtigungen fehlen'}
                          {instance.health.permissions.status === 'error' && 'SharePoint-Fehler'}
                          {instance.health.permissions.status === 'unknown' && 'Status unbekannt'}
                        </span>
                        {instance.health.checkedAt && (
                          <span className="text-xs text-slate-500">
                            geprüft: {formatTimestamp(instance.health.checkedAt) || ''}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{instance.displayName}</h3>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {instance.slug} • {instance.sharePoint.strategy || 'kerberos'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/instances/${instance.slug}/health`}
                          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                        >
                          Health
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleEdit(instance)}
                          className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleListPanel(instance)}
                          className={clsx(
                            'rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white',
                            panelState.isOpen && 'border-sky-400 text-white'
                          )}
                        >
                          Listen
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
                          {instance.hosts.length ? instance.hosts.join(', ') : '-'}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-slate-500">Credentials:</dt>
                        <dd className="text-slate-300">
                          Benutzer {instance.sharePoint.usernameSet ? 'gesetzt' : 'fehlt'} /
                          Passwort {instance.sharePoint.passwordSet ? 'gesetzt' : 'fehlt'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Automatische Listen:</dt>
                        <dd className="mt-1">
                          <ul className="flex flex-wrap gap-2">
                            {SHAREPOINT_LIST_DEFINITIONS.map((listDef) => {
                              const status = resolveListStatus(instance.health, listDef);
                              return (
                                <li
                                  key={`${instance.slug}-${listDef.key}`}
                                  className={clsx(
                                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold capitalize',
                                    listStatusStyles[status]
                                  )}
                                >
                                  <span className="text-slate-100">{listDef.title}</span>
                                  <span className="text-slate-300/80">
                                    {listStatusLabels[status]}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </dd>
                      </div>
                      {instance.health?.lists.missing.length ? (
                        <div className="flex gap-2">
                          <dt className="text-slate-500">Fehlende Listen:</dt>
                          <dd className="text-slate-300">
                            {instance.health.lists.missing.join(', ')}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    {panelState.isOpen ? (
                      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Listenverwaltung
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => ensureAllListsForInstance(instance)}
                              disabled={
                                panelState.loading || Boolean(panelState.pending['__all__'])
                              }
                              className={clsx(
                                'rounded-md border border-sky-500/40 px-3 py-1 text-xs font-semibold text-sky-200 transition hover:border-sky-400 hover:text-white',
                                (panelState.loading || panelState.pending['__all__']) &&
                                  'cursor-not-allowed opacity-60'
                              )}
                            >
                              {panelState.pending['__all__']
                                ? 'Erstelle Listen …'
                                : 'Alle Listen erstellen'}
                            </button>
                            <button
                              type="button"
                              onClick={() => fetchListOverview(instance.slug)}
                              disabled={panelState.loading}
                              className={clsx(
                                'text-xs text-slate-400 underline underline-offset-4 hover:text-white',
                                panelState.loading && 'cursor-not-allowed opacity-60'
                              )}
                            >
                              Aktualisieren
                            </button>
                          </div>
                        </div>
                        {panelState.error ? (
                          <div className="mb-2 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                            <div>{panelState.error}</div>
                            {panelState.errorDetails?.length ? (
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-[10px] text-rose-100/90">
                                {panelState.errorDetails.map((detail, idx) => (
                                  <li key={`detail-${idx}`}>{detail}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}
                        {panelState.loading ? (
                          <p className="text-xs text-slate-400">Lade Listen …</p>
                        ) : panelState.lists && panelState.lists.length > 0 ? (
                          <ul className="space-y-2">
                            {panelState.lists.map((list) => {
                              const ensurePending = Boolean(
                                panelState.pending[`ensure:${list.key}`]
                              );
                              const deletePending = Boolean(
                                panelState.pending[`delete:${list.key}`]
                              );
                              const pending = ensurePending || deletePending;
                              const exists = list.exists;
                              const statusClass = exists
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-200 border border-rose-500/40';
                              const statusLabel = exists ? 'vorhanden' : 'fehlend';
                              const viewUrl = buildListUrl(instance, list);
                              const createdLabel =
                                formatTimestamp(list.created) || list.created || '—';
                              const modifiedLabel =
                                formatTimestamp(list.modified) || list.modified || '—';
                              return (
                                <li
                                  key={`${instance.slug}-${list.key}`}
                                  className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-white">
                                          {list.title}
                                        </span>
                                        <span
                                          className={clsx(
                                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                                            statusClass
                                          )}
                                        >
                                          {statusLabel}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                                        <span>
                                          Einträge:{' '}
                                          <span className="text-slate-300">
                                            {typeof list.itemCount === 'number'
                                              ? list.itemCount
                                              : '—'}
                                          </span>
                                        </span>
                                        <span>
                                          Erstellt:{' '}
                                          <span className="text-slate-300">{createdLabel}</span>
                                        </span>
                                        <span>
                                          Geändert:{' '}
                                          <span className="text-slate-300">{modifiedLabel}</span>
                                        </span>
                                      </div>
                                      {list.matchedAlias && list.matchedAlias !== list.title ? (
                                        <div className="text-[11px] text-slate-500">
                                          Gefundener Name:{' '}
                                          <span className="text-slate-300">
                                            {list.matchedAlias}
                                          </span>
                                        </div>
                                      ) : null}
                                      {list.errors?.length ? (
                                        <div className="text-[11px] text-rose-300">
                                          Fehler: {list.errors.join('; ')}
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
                                      {exists ? (
                                        <>
                                          {viewUrl ? (
                                            <a
                                              href={viewUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-1 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
                                            >
                                              Öffnen
                                            </a>
                                          ) : null}
                                          <button
                                            type="button"
                                            onClick={() => ensureListForInstance(instance, list)}
                                            disabled={panelState.loading || pending}
                                            className={clsx(
                                              'inline-flex items-center justify-center rounded-md border border-sky-500/40 px-3 py-1 font-semibold text-sky-200 transition hover:border-sky-400 hover:text-white',
                                              (panelState.loading || pending) &&
                                                'cursor-not-allowed opacity-60'
                                            )}
                                          >
                                            {ensurePending
                                              ? 'Aktualisiere …'
                                              : 'Spalten aktualisieren'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => deleteListForInstance(instance, list)}
                                            disabled={panelState.loading || pending}
                                            className={clsx(
                                              'inline-flex items-center justify-center rounded-md border border-rose-500/40 px-3 py-1 font-semibold text-rose-200 transition hover:border-rose-400 hover:text-white',
                                              (panelState.loading || pending) &&
                                                'cursor-not-allowed opacity-60'
                                            )}
                                          >
                                            {deletePending ? 'Lösche …' : 'Liste löschen'}
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => ensureListForInstance(instance, list)}
                                          disabled={panelState.loading || pending}
                                          className={clsx(
                                            'inline-flex items-center justify-center rounded-md border border-sky-500/40 px-3 py-1 font-semibold text-sky-200 transition hover:border-sky-400 hover:text-white',
                                            (panelState.loading || pending) &&
                                              'cursor-not-allowed opacity-60'
                                          )}
                                        >
                                          {ensurePending ? 'Erstelle …' : 'Liste erstellen'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Keine bekannten Listen-Definitionen gefunden.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {!instances.length && (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
                  <p className="font-medium text-white">Noch keine Instanzen</p>
                  <p className="text-sm">Fülle das Formular aus, um die erste Instanz anzulegen.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </AdminSubpageLayout>
  );
};

type SlugInstance = { slug: string; displayName: string };

const AdminInstancePicker = () => {
  const router = useRouter();
  const [instances, setInstances] = useState<SlugInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getAdminSessionToken();
        if (!token) {
          setInstances([]);
          setError('Keine gültige Admin-Session gefunden.');
          return;
        }
        const resp = await fetch(buildInstanceAwareUrl('/api/instances/slugs'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await resp.json().catch(() => null);
        if (!resp.ok) {
          throw new Error(payload?.error || `Fehler ${resp.status}`);
        }
        const list = Array.isArray(payload?.instances) ? payload.instances : [];
        const next = list
          .map((e: unknown) => (e && typeof e === 'object' ? (e as Record<string, unknown>) : {}))
          .map((e) => ({
            slug: typeof e.slug === 'string' ? e.slug : '',
            displayName: typeof e.displayName === 'string' ? e.displayName : '',
          }))
          .filter((e) => Boolean(e.slug));
        if (!cancelled) setInstances(next);
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

  const selectInstance = async (slug: string) => {
    setSelecting(slug);
    setError(null);
    try {
      const resp = await fetch(buildInstanceAwareUrl('/api/instances/select'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(payload?.error || `Fehler ${resp.status}`);
      await router.push(
        buildInstanceAwareUrl(`/admin?roadmapInstance=${encodeURIComponent(slug)}`)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setSelecting(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader activeRoute="admin" />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
          <div className="space-y-6">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sky-300/90">
                Roadmap Administration
              </p>
              <h1 className="text-3xl font-semibold text-white">Instanz wählen</h1>
              <p className="text-sm text-slate-300">
                Du siehst nur Instanzen, für die du eine Gruppe im Format{' '}
                <span className="font-mono">admin-&lt;instanz&gt;</span> hast.
              </p>
            </header>

            <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/40">
              {loading ? (
                <JSDoITLoader message="Instanzen werden geladen …" />
              ) : instances.length === 0 ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                  <h2 className="text-lg font-semibold text-white">Kein Zugriff</h2>
                  <p className="mt-2 text-sm text-slate-200">
                    Du hast keinen Zugriff auf eine Roadmap-Instanz. Bitte lasse dir eine passende
                    Gruppe (z.B. <span className="font-mono">admin-bdm-projects</span>) zuweisen.
                    Für Vollzugriff gibt es die Gruppe <span className="font-mono">superadmin</span>
                    .
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {instances.map((inst) => (
                    <button
                      key={inst.slug}
                      type="button"
                      onClick={() => void selectInstance(inst.slug)}
                      disabled={Boolean(selecting)}
                      className={clsx(
                        'flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition',
                        selecting === inst.slug
                          ? 'border-sky-400 bg-sky-500/10'
                          : 'border-slate-800 bg-slate-950/40 hover:border-sky-500/60'
                      )}
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {inst.displayName || inst.slug}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">{inst.slug}</div>
                      </div>
                      <div className="text-xs font-semibold text-sky-200">
                        {selecting === inst.slug ? 'wird gesetzt…' : 'Auswählen'}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {error && !loading && <p className="mt-4 text-sm text-amber-200">{error}</p>}
            </section>

            <p className="text-xs text-slate-500">
              Hinweis: Instanzen verwalten (Create/Provisioning) ist nur für{' '}
              <span className="font-mono">superadmin</span> möglich.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

const AdminInstancesGate = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [entraEnabled, setEntraEnabled] = useState(false);
  const [status, setStatus] = useState<string>('');

  const returnUrl = useMemo(() => {
    const raw = typeof router.asPath === 'string' ? router.asPath : '/admin/instances';
    return raw.split('#')[0] || '/admin/instances';
  }, [router.asPath]);

  const manual = String(router.query.manual || '') === '1';
  const autoEntraSso =
    String(process.env.NEXT_PUBLIC_ENTRA_AUTO_LOGIN || '').toLowerCase() === 'true' ||
    String(router.query.autoSso || '') === '1';

  // Consume non-popup Entra callback token
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof window === 'undefined') return;
    try {
      const hash = window.location.hash || '';
      if (!hash.startsWith('#')) return;
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('token');
      const u = params.get('username');
      if (!token) return;

      persistAdminSession(token, u || 'Microsoft SSO');
      window.location.hash = '';
      setStatus('Anmeldung erfolgreich. Lade Instanzen …');
    } catch {
      // ignore
    }
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;

    const run = async () => {
      try {
        setChecking(true);

        // Load Entra availability (used for landing + optional auto-login)
        try {
          const resp = await fetch(buildInstanceAwareUrl('/api/auth/entra/status'));
          if (resp.ok) {
            const data = await resp.json();
            if (!cancelled) setEntraEnabled(Boolean(data.enabled));
          }
        } catch {
          // ignore
        }

        const ok = await hasAdminAccess();
        if (!cancelled) setAuthed(ok);

        if (ok) {
          const token = getAdminSessionToken();
          if (!token) {
            if (!cancelled) setSuperAdmin(false);
          } else {
            try {
              const resp = await fetch(buildInstanceAwareUrl('/api/auth/check-admin-session'), {
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await resp.json().catch(() => null);
              if (!cancelled) setSuperAdmin(Boolean(data && data.isSuperAdmin));
            } catch {
              if (!cancelled) setSuperAdmin(false);
            }
          }
        } else {
          if (!cancelled) setSuperAdmin(false);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router.isReady]);

  // Optional auto-start SSO (full page redirect)
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof window === 'undefined') return;
    if (checking) return;
    if (authed) return;
    if (!entraEnabled) return;
    if (!autoEntraSso) return;
    if (manual) return;

    // Don't auto-retry if an error is present
    if (
      typeof router.query.error === 'string' ||
      typeof router.query.error_description === 'string'
    ) {
      return;
    }

    setStatus('Weiterleitung zu Microsoft SSO …');
    const loginUrl = buildInstanceAwareUrl(
      `/api/auth/entra/login?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    window.location.assign(loginUrl);
  }, [
    router.isReady,
    checking,
    authed,
    entraEnabled,
    autoEntraSso,
    manual,
    returnUrl,
    router.query,
  ]);

  const startSso = () => {
    const loginUrl = buildInstanceAwareUrl(
      `/api/auth/entra/login?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    window.location.assign(loginUrl);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <JSDoITLoader sizeRem={2.5} message={status || 'Anmeldung wird geprüft …'} />
      </div>
    );
  }

  if (!authed) {
    return (
      <InstancesLanding returnUrl={returnUrl} entraEnabled={entraEnabled} onStartSso={startSso} />
    );
  }

  if (!superAdmin) {
    return <AdminInstancePicker />;
  }

  return <AdminInstancesPage />;
};

export default AdminInstancesGate;
