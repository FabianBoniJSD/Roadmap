import Head from 'next/head';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { useRouter } from 'next/router';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiCheckCircle,
  FiEdit2,
  FiLock,
  FiMessageSquare,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { buildInstanceAwareUrl, getAdminSessionState } from '@/utils/auth';

type FeedbackVoteValue = -1 | 0 | 1;

type FeedbackItem = {
  id: number;
  title: string;
  description: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  status: 'OPEN' | 'COMPLETED';
  completedAt: string | null;
  upVotes: number;
  downVotes: number;
  score: number;
  userVote: FeedbackVoteValue;
};

type EntraStatus = {
  enabled: boolean;
};

const getAuthHeaders = (): HeadersInit => {
  return {};
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const FeedbackPage = () => {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [entraStatus, setEntraStatus] = useState<EntraStatus>({ enabled: false });
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [hasLoadedItems, setHasLoadedItems] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [managingId, setManagingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const returnUrl = useMemo(() => {
    const raw = typeof router.asPath === 'string' ? router.asPath : '/feedback';
    return raw.split('#')[0] || '/feedback';
  }, [router.asPath]);

  const activeItems = useMemo(
    () =>
      items
        .filter((item) => item.status !== 'COMPLETED')
        .sort((left, right) => {
          if (right.score !== left.score) return right.score - left.score;
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }),
    [items]
  );

  const completedItems = useMemo(
    () =>
      items
        .filter((item) => item.status === 'COMPLETED')
        .sort(
          (left, right) =>
            new Date(right.completedAt || right.updatedAt).getTime() -
            new Date(left.completedAt || left.updatedAt).getTime()
        ),
    [items]
  );

  const loadFeedback = useCallback(async () => {
    setLoadingItems(true);
    setHasLoadedItems(false);
    setLoadError('');
    setError('');
    try {
      const response = await fetch(buildInstanceAwareUrl('/api/feedback'), {
        headers: getAuthHeaders(),
      });
      if (response.status === 401) {
        setAuthenticated(false);
        setItems([]);
        return;
      }
      if (!response.ok) {
        throw new Error('Feedback konnte nicht geladen werden.');
      }
      const data = (await response.json()) as { items?: FeedbackItem[] };
      setItems(Array.isArray(data.items) ? data.items : []);
      setHasLoadedItems(true);
    } catch (err) {
      setLoadError('Feedback konnte nicht geladen werden.');
      setError(err instanceof Error ? err.message : 'Feedback konnte nicht geladen werden.');
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setCheckingSession(true);
      try {
        const session = await getAdminSessionState(true);
        if (!cancelled) {
          setAuthenticated(Boolean(session?.authenticated));
          setIsSuperAdmin(Boolean(session?.isSuperAdmin));
        }

        try {
          const response = await fetch(buildInstanceAwareUrl('/api/auth/entra/status'));
          if (response.ok) {
            const data = (await response.json()) as EntraStatus;
            if (!cancelled) setEntraStatus({ enabled: Boolean(data.enabled) });
          }
        } catch {
          if (!cancelled) setEntraStatus({ enabled: false });
        }

        if (session?.authenticated && !cancelled) {
          await loadFeedback();
        }
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [loadFeedback]);

  const startSso = () => {
    const loginUrl = buildInstanceAwareUrl(
      `/api/auth/entra/login?returnUrl=${encodeURIComponent(returnUrl)}`
    );
    window.location.assign(loginUrl);
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 4) {
      setError('Bitte geben Sie einen Titel mit mindestens 4 Zeichen ein.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(buildInstanceAwareUrl('/api/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title: trimmedTitle, description: trimmedDescription }),
      });
      const data = (await response.json().catch(() => null)) as {
        item?: FeedbackItem;
        error?: string;
      } | null;

      if (response.status === 401) {
        setAuthenticated(false);
        setIsSuperAdmin(false);
        throw new Error('Bitte melden Sie sich erneut an.');
      }
      if (!response.ok || !data?.item) {
        throw new Error(data?.error || 'Feature-Wunsch konnte nicht gespeichert werden.');
      }

      setItems((current) => [data.item as FeedbackItem, ...current]);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Feature-Wunsch konnte nicht gespeichert werden.'
      );
    } finally {
      setSaving(false);
    }
  };

  const vote = async (item: FeedbackItem, value: Exclude<FeedbackVoteValue, 0>) => {
    const nextVote = item.userVote === value ? 0 : value;
    setVotingId(item.id);
    setError('');
    try {
      const response = await fetch(buildInstanceAwareUrl(`/api/feedback/${item.id}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ value: nextVote }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error('Bitte melden Sie sich erneut an.');
      }
      if (!response.ok) {
        throw new Error(data?.error || 'Stimme konnte nicht gespeichert werden.');
      }
      await loadFeedback();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stimme konnte nicht gespeichert werden.');
    } finally {
      setVotingId(null);
    }
  };

  const updateFeedback = async (
    item: FeedbackItem,
    changes: { title?: string; description?: string; status?: FeedbackItem['status'] }
  ): Promise<boolean> => {
    setManagingId(item.id);
    setError('');
    try {
      const response = await fetch(buildInstanceAwareUrl(`/api/feedback/${item.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(changes),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (response.status === 401) {
        setAuthenticated(false);
        setIsSuperAdmin(false);
        throw new Error('Bitte melden Sie sich erneut an.');
      }
      if (!response.ok) {
        throw new Error(data?.error || 'Feedback konnte nicht aktualisiert werden.');
      }
      await loadFeedback();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback konnte nicht aktualisiert werden.');
      return false;
    } finally {
      setManagingId(null);
    }
  };

  const startEditing = (item: FeedbackItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setError('');
  };

  const saveEdit = async (item: FeedbackItem) => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle.length < 4) {
      setError('Bitte geben Sie einen Titel mit mindestens 4 Zeichen ein.');
      return;
    }
    const updated = await updateFeedback(item, {
      title: trimmedTitle,
      description: editDescription.trim(),
    });
    if (updated) setEditingId(null);
  };

  const deleteFeedback = async (item: FeedbackItem) => {
    if (!window.confirm(`Feedback „${item.title}“ wirklich löschen?`)) return;
    setManagingId(item.id);
    setError('');
    try {
      const response = await fetch(buildInstanceAwareUrl(`/api/feedback/${item.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (response.status === 401) {
        setAuthenticated(false);
        setIsSuperAdmin(false);
        throw new Error('Bitte melden Sie sich erneut an.');
      }
      if (!response.ok) throw new Error(data?.error || 'Feedback konnte nicht gelöscht werden.');
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback konnte nicht gelöscht werden.');
    } finally {
      setManagingId(null);
    }
  };

  const renderFeedbackItem = (item: FeedbackItem) => {
    const isCompleted = item.status === 'COMPLETED';
    const isEditing = editingId === item.id;
    const isManaging = managingId === item.id;

    return (
      <article
        key={item.id}
        className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-feedback-item [display:grid] [grid-template-columns:76px_minmax(0,_1fr)] [gap:var(--ds-space-4)] [padding:24px] [border-radius:var(--ds-radius-xl)] max-[760px]:[grid-template-columns:1fr]"
      >
        {isCompleted ? (
          <div className="[display:grid] [align-content:start] [justify-items:center] [gap:8px] max-[760px]:[grid-template-columns:auto_auto] max-[760px]:[justify-content:start] max-[760px]:[align-items:center]">
            <span className="[display:grid] [width:48px] [height:48px] [place-items:center] [border-radius:16px] [background:color-mix(in_srgb,_var(--ds-success)_16%,_transparent)] [color:var(--ds-success)]">
              <FiCheckCircle className="[width:1.5rem] [height:1.5rem]" />
            </span>
            <span className="[color:var(--ds-success)] [font-size:0.7rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Neu
            </span>
          </div>
        ) : (
          <div
            className="ds-vote-stack [display:grid] [justify-items:center] [gap:8px] max-[760px]:[grid-template-columns:repeat(3,_auto)] max-[760px]:[justify-content:start]"
            aria-label={`Abstimmung für ${item.title}`}
          >
            <button
              type="button"
              className={`ds-vote-button [display:grid] [width:42px] [height:42px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:14px] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_border-color_var(--ds-duration-fast)_var(--ds-ease-out),_background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] hover:[color:var(--ds-text-strong)] disabled:[cursor:wait] disabled:[opacity:0.6] disabled:[transform:none] [&.is-active]:[border-color:var(--ds-border-strong)] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-accent-strong)] ${item.userVote === 1 ? 'is-active' : ''}`}
              onClick={() => vote(item, 1)}
              disabled={votingId === item.id || isManaging}
              aria-label="Upvote"
            >
              <FiArrowUp className="ds-icon-sm [width:1rem] [height:1rem]" />
            </button>
            <span className="ds-vote-score [color:var(--ds-text-strong)] [font-size:1.35rem] [font-weight:600] [line-height:1]">
              {item.score}
            </span>
            <button
              type="button"
              className={`ds-vote-button [display:grid] [width:42px] [height:42px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:14px] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_border-color_var(--ds-duration-fast)_var(--ds-ease-out),_background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] hover:[color:var(--ds-text-strong)] disabled:[cursor:wait] disabled:[opacity:0.6] disabled:[transform:none] [&.is-active]:[border-color:var(--ds-border-strong)] [&.is-active]:[background:var(--ds-accent-soft)] [&.is-active]:[color:var(--ds-accent-strong)] ${item.userVote === -1 ? 'is-active' : ''}`}
              onClick={() => vote(item, -1)}
              disabled={votingId === item.id || isManaging}
              aria-label="Downvote"
            >
              <FiArrowDown className="ds-icon-sm [width:1rem] [height:1rem]" />
            </button>
          </div>
        )}

        <div className="ds-feedback-body [min-width:0]">
          <div className="ds-feedback-meta [display:flex] [flex-wrap:wrap] [gap:8px_14px] [margin-bottom:8px] [color:var(--ds-text-muted)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            <span>
              {isCompleted && item.completedAt ? 'Umgesetzt am ' : ''}
              {formatDate(isCompleted && item.completedAt ? item.completedAt : item.createdAt)}
            </span>
            {item.createdByName && <span>von {item.createdByName}</span>}
          </div>

          {isEditing ? (
            <div className="[display:grid] [gap:12px]">
              <input
                className="ds-input [width:100%] [height:48px] [padding-inline:14px] [border:1px_solid_var(--ds-border-default)] [border-radius:14px] [outline:none] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)] focus:[border-color:var(--ds-border-strong)]"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={120}
                aria-label="Titel bearbeiten"
              />
              <textarea
                className="ds-input [width:100%] [min-height:120px] [padding:13px_14px] [border:1px_solid_var(--ds-border-default)] [border-radius:14px] [outline:none] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)] [resize:vertical] focus:[border-color:var(--ds-border-strong)]"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                maxLength={1200}
                aria-label="Beschreibung bearbeiten"
              />
              <div className="[display:flex] [flex-wrap:wrap] [gap:10px]">
                <button
                  type="button"
                  className="ds-button [display:inline-flex] [min-height:40px] [align-items:center] [gap:8px] [padding-inline:14px] [border:1px_solid_transparent] [border-radius:12px] [background:var(--ds-accent)] [color:var(--ds-text-inverse)] [font-weight:600] disabled:[opacity:0.6]"
                  onClick={() => saveEdit(item)}
                  disabled={isManaging || editTitle.trim().length < 4}
                >
                  <FiCheck /> {isManaging ? 'Speichert ...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  className="ds-button [display:inline-flex] [min-height:40px] [align-items:center] [gap:8px] [padding-inline:14px] [border:1px_solid_var(--ds-border-default)] [border-radius:12px] [background:var(--ds-bg-soft)] [color:var(--ds-text-strong)] [font-weight:600]"
                  onClick={() => setEditingId(null)}
                  disabled={isManaging}
                >
                  <FiX /> Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="ds-feedback-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.2rem] [font-weight:600] [line-height:1.25]">
                {item.title}
              </h3>
              {item.description && (
                <p className="ds-feedback-description [margin:12px_0_18px] [color:var(--ds-text-default)] [font-size:0.9375rem] [line-height:1.65] [white-space:pre-line]">
                  {item.description}
                </p>
              )}
              <div className="ds-badge-row [display:flex] [flex-wrap:wrap] [gap:10px]">
                {isCompleted ? (
                  <span className="ds-badge [display:inline-flex] [align-items:center] [gap:8px] [padding:7px_10px] [border-radius:var(--ds-radius-pill)] [background:color-mix(in_srgb,_var(--ds-success)_13%,_transparent)] [color:var(--ds-success)] [font-size:0.75rem] [font-weight:600]">
                    <FiCheckCircle /> Neues Feature
                  </span>
                ) : (
                  <>
                    <span className="ds-badge [display:inline-flex] [padding:7px_10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-success)] [font-size:0.75rem] [font-weight:600]">
                      {item.upVotes} Upvotes
                    </span>
                    <span className="ds-badge [display:inline-flex] [padding:7px_10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-danger)] [font-size:0.75rem] [font-weight:600]">
                      {item.downVotes} Downvotes
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {isSuperAdmin && !isEditing && (
            <div className="[display:flex] [flex-wrap:wrap] [gap:8px] [margin-top:18px] [padding-top:16px] [border-top:1px_solid_var(--ds-border-default)]">
              <button
                type="button"
                className="ds-button [display:inline-flex] [min-height:38px] [align-items:center] [gap:7px] [padding-inline:12px] [border:1px_solid_var(--ds-border-default)] [border-radius:11px] [background:var(--ds-bg-soft)] [color:var(--ds-text-strong)] [font-size:0.8rem] [font-weight:600] disabled:[opacity:0.6]"
                onClick={() => startEditing(item)}
                disabled={isManaging}
              >
                <FiEdit2 /> Bearbeiten
              </button>
              <button
                type="button"
                className="ds-button [display:inline-flex] [min-height:38px] [align-items:center] [gap:7px] [padding-inline:12px] [border:1px_solid_var(--ds-border-default)] [border-radius:11px] [background:var(--ds-bg-soft)] [color:var(--ds-success)] [font-size:0.8rem] [font-weight:600] disabled:[opacity:0.6]"
                onClick={() => updateFeedback(item, { status: isCompleted ? 'OPEN' : 'COMPLETED' })}
                disabled={isManaging}
              >
                {isCompleted ? <FiRotateCcw /> : <FiCheckCircle />}
                {isCompleted ? 'Wieder öffnen' : 'Als erledigt markieren'}
              </button>
              <button
                type="button"
                className="ds-button [display:inline-flex] [min-height:38px] [align-items:center] [gap:7px] [padding-inline:12px] [border:1px_solid_color-mix(in_srgb,_var(--ds-danger)_32%,_transparent)] [border-radius:11px] [background:color-mix(in_srgb,_var(--ds-danger)_9%,_transparent)] [color:var(--ds-danger)] [font-size:0.8rem] [font-weight:600] disabled:[opacity:0.6]"
                onClick={() => deleteFeedback(item)}
                disabled={isManaging}
              >
                <FiTrash2 /> Löschen
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <>
      <Head>
        <title>Feedback | JSDoIT Roadmap</title>
      </Head>
      <div className="theme-page-shell [background:var(--ds-bg-page)] [color:var(--ds-text-strong)] flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] py-12 sm:py-16">
            <section className="ds-feedback-hero [display:grid] [grid-template-columns:minmax(0,_1fr)_minmax(280px,_360px)] [gap:clamp(28px,_5vw,_64px)] [align-items:end] [padding-block:clamp(36px,_6vw,_74px)] max-[1100px]:[grid-template-columns:1fr]">
              <div>
                <div className="ds-eyebrow [display:inline-flex] [width:fit-content] [align-items:center] [gap:10px] [padding:9px_15px] [border:1px_solid_var(--ds-border-strong)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-accent-soft)] [color:var(--ds-text-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [&_svg]:[color:var(--ds-accent-strong)]">
                  <FiMessageSquare className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  Feature Feedback
                </div>
                <h1 className="ds-hero-title [max-width:760px] [margin:28px_0_22px] [color:var(--ds-text-strong)] [font-size:clamp(2.625rem,_5.8vw,_4.75rem)] [font-weight:600] [letter-spacing:-0.06em] [line-height:0.98] [text-wrap:balance]">
                  Feature-Wünsche
                </h1>
                <p className="ds-hero-copy [max-width:660px] [margin:0] [color:var(--ds-text-default)] [font-size:1.0625rem] [line-height:1.75]">
                  Reichen Sie einen Feature-Wunsch ein und stimmen Sie für Ideen, die den
                  Roadmap-Alltag am stärksten verbessern würden.
                </p>
              </div>
              {authenticated && !checkingSession && (
                <div
                  className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-feedback-summary [display:grid] [gap:var(--ds-space-3)] [padding:28px] [border-radius:var(--ds-radius-xl)]"
                  aria-label="Feedback Übersicht"
                >
                  <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Aktive Wünsche
                  </p>
                  <p
                    aria-live="polite"
                    aria-busy={loadingItems}
                    className="ds-feedback-count [margin:0] [color:var(--ds-text-strong)] [font-size:clamp(3rem,_8vw,_5rem)] [font-weight:600] [letter-spacing:-0.04em] [line-height:0.9]"
                  >
                    {hasLoadedItems && !loadingItems ? activeItems.length : loadError ? '–' : '…'}
                  </p>
                  <p className="ds-empty-copy [max-width:680px] [margin:10px_auto_0] [color:var(--ds-text-muted)] [font-size:0.875rem] [line-height:1.6]">
                    {loadError ||
                      'Stimmen sortieren die Liste nach Relevanz. Jede Person hat pro Wunsch eine Stimme.'}
                  </p>
                </div>
              )}
            </section>

            {checkingSession ? (
              <div className="ds-centered-state [display:flex] [justify-content:center] [padding-block:var(--ds-space-8)]">
                <JSDoITLoader sizeRem={2.25} message="Anmeldung wird geprüft ..." />
              </div>
            ) : !authenticated ? (
              <section className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-auth-panel [display:grid] [gap:var(--ds-space-4)] [padding:32px] [border-radius:var(--ds-radius-xl)] ds-feedback-auth-panel [max-width:760px] [margin-inline:auto]">
                <div
                  className="ds-panel-icon [display:grid] [flex:0_0_auto] [width:68px] [height:68px] [place-items:center] [border:1px_solid_var(--ds-border-strong)] [border-radius:24px] [background:var(--ds-accent)] [color:var(--ds-accent-strong)]"
                  aria-hidden="true"
                >
                  <FiLock className="ds-icon-md [flex:0_0_auto] [width:1.5rem] [height:1.5rem]" />
                </div>
                <div>
                  <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Anmeldung erforderlich
                  </p>
                  <h2 className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]">
                    Feedback ist für angemeldete Nutzer sichtbar
                  </h2>
                </div>
                <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
                  Melden Sie sich mit Microsoft SSO an, um Feature-Wünsche einzureichen und
                  abzustimmen.
                </p>
                {entraStatus.enabled ? (
                  <button
                    type="button"
                    onClick={startSso}
                    className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
                  >
                    Mit Microsoft anmelden
                  </button>
                ) : (
                  <p className="ds-note [display:grid] [grid-template-columns:48px_1fr] [align-items:center] [gap:var(--ds-space-4)] [margin-top:18px] [padding:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)]">
                    Microsoft SSO ist nicht konfiguriert. Feedback kann erst nach aktivierter
                    Entra-Anmeldung genutzt werden.
                  </p>
                )}
              </section>
            ) : (
              <div className="ds-feedback-layout [display:grid] [grid-template-columns:minmax(280px,_420px)_minmax(0,_1fr)] [gap:clamp(24px,_4vw,_42px)] [align-items:start] max-[1100px]:[grid-template-columns:1fr]">
                <section className="ds-feedback-list [min-width:0]" aria-label="Feature-Wünsche">
                  {error && (
                    <p
                      role="alert"
                      className="[margin:0_0_18px] [padding:12px_14px] [border:1px_solid_color-mix(in_srgb,_var(--ds-danger)_36%,_transparent)] [border-radius:var(--ds-radius-sm)] [background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [color:var(--ds-danger)] [font-size:0.875rem] [line-height:1.5]"
                    >
                      {error}
                    </p>
                  )}
                  {completedItems.length > 0 && (
                    <div className="[margin-bottom:42px]" aria-labelledby="new-features-heading">
                      <div className="[margin-bottom:18px]">
                        <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-success)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                          Umgesetzt
                        </p>
                        <h2
                          id="new-features-heading"
                          className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
                        >
                          Neue Features
                        </h2>
                      </div>
                      <div className="ds-feedback-items [display:grid] [gap:var(--ds-space-4)]">
                        {completedItems.map(renderFeedbackItem)}
                      </div>
                    </div>
                  )}

                  <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px] ds-feedback-list-header [margin-bottom:18px]">
                    <div>
                      <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                        Voting
                      </p>
                      <h2 className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]">
                        Priorisierte Wünsche
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)] ds-feedback-refresh [min-height:46px] [padding-inline:18px]"
                      onClick={loadFeedback}
                      disabled={loadingItems}
                    >
                      {loadingItems ? 'Lädt ...' : 'Aktualisieren'}
                    </button>
                  </div>

                  {loadingItems && !items.length ? (
                    <div className="ds-centered-state [display:flex] [justify-content:center] [padding-block:var(--ds-space-8)]">
                      <JSDoITLoader sizeRem={2} message="Feature-Wünsche werden geladen ..." />
                    </div>
                  ) : loadError ? (
                    <p role="status" className="ds-feedback-load-error">
                      {loadError} Bitte erneut aktualisieren.
                    </p>
                  ) : activeItems.length ? (
                    <div className="ds-feedback-items [display:grid] [gap:var(--ds-space-4)]">
                      {activeItems.map(renderFeedbackItem)}
                    </div>
                  ) : (
                    <div className="ds-empty-state [margin-top:48px] [padding:32px] [border:1px_dashed_var(--ds-border-default)] [border-radius:var(--ds-radius-xl)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_72%,_transparent)] [color:var(--ds-text-default)] [text-align:center]">
                      <p className="ds-empty-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600]">
                        Noch keine Feature-Wünsche
                      </p>
                      <p className="ds-empty-copy [max-width:680px] [margin:10px_auto_0] [color:var(--ds-text-muted)] [font-size:0.875rem] [line-height:1.6]">
                        Reichen Sie den ersten Vorschlag ein. Je konkreter der Nutzen, desto
                        leichter können andere abstimmen.
                      </p>
                    </div>
                  )}
                </section>
                <form
                  className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-feedback-form [position:sticky] [top:104px] [display:grid] [gap:var(--ds-space-4)] [padding:28px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[position:static]"
                  onSubmit={submitFeedback}
                >
                  <div>
                    <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                      Neuer Wunsch
                    </p>
                    <h2 className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]">
                      Feature-Wunsch posten
                    </h2>
                  </div>
                  <label className="ds-field [display:grid] [gap:var(--ds-space-2)] [color:var(--ds-text-default)] [font-size:0.8125rem] [font-weight:600]">
                    <span>Titel</span>
                    <input
                      className="ds-input [width:100%] [height:48px] [padding-inline:14px] [border:1px_solid_var(--ds-border-default)] [border-radius:14px] [outline:none] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)] focus:[border-color:var(--ds-border-strong)] "
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={120}
                      placeholder="Zum Beispiel: Export der Roadmap als PDF"
                    />
                  </label>
                  <label className="ds-field [display:grid] [gap:var(--ds-space-2)] [color:var(--ds-text-default)] [font-size:0.8125rem] [font-weight:600]">
                    <span>Beschreibung</span>
                    <textarea
                      className="ds-input [width:100%] [height:48px] [padding-inline:14px] [border:1px_solid_var(--ds-border-default)] [border-radius:14px] [outline:none] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)] focus:[border-color:var(--ds-border-strong)] ds-textarea [min-height:148px] [height:auto] [padding-block:13px] [resize:vertical] [line-height:1.55]"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={1200}
                      rows={6}
                      placeholder="Was soll die Funktion lösen, und wann wäre sie hilfreich?"
                    />
                  </label>
                  {error && (
                    <p className="ds-form-error [margin:0] [padding:12px_14px] [border:1px_solid_color-mix(in_srgb,_var(--ds-danger)_36%,_transparent)] [border-radius:var(--ds-radius-sm)] [background:color-mix(in_srgb,_var(--ds-danger)_12%,_transparent)] [color:var(--ds-danger)] [font-size:0.875rem] [line-height:1.5]">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
                    disabled={saving || title.trim().length < 4}
                  >
                    <FiPlus className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                    {saving ? 'Wird gespeichert ...' : 'Feature-Wunsch posten'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FeedbackPage;
