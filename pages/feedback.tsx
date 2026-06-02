import Head from 'next/head';
import { useRouter } from 'next/router';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiArrowDown,
  FiArrowUp,
  FiLock,
  FiMessageSquare,
  FiPlus,
  FiTrendingUp,
} from 'react-icons/fi';
import JSDoITLoader from '@/components/JSDoITLoader';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { buildInstanceAwareUrl, getAdminSessionToken } from '@/utils/auth';

type FeedbackVoteValue = -1 | 0 | 1;

type FeedbackItem = {
  id: number;
  title: string;
  description: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  upVotes: number;
  downVotes: number;
  score: number;
  userVote: FeedbackVoteValue;
};

type EntraStatus = {
  enabled: boolean;
};

const getAuthHeaders = (): HeadersInit => {
  const token = getAdminSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  const [entraStatus, setEntraStatus] = useState<EntraStatus>({ enabled: false });
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const returnUrl = useMemo(() => {
    const raw = typeof router.asPath === 'string' ? router.asPath : '/feedback';
    return raw.split('#')[0] || '/feedback';
  }, [router.asPath]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [items]
  );

  const loadFeedback = useCallback(async () => {
    setLoadingItems(true);
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
    } catch (err) {
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
        const token = getAdminSessionToken();
        if (!cancelled) setAuthenticated(Boolean(token));

        try {
          const response = await fetch(buildInstanceAwareUrl('/api/auth/entra/status'));
          if (response.ok) {
            const data = (await response.json()) as EntraStatus;
            if (!cancelled) setEntraStatus({ enabled: Boolean(data.enabled) });
          }
        } catch {
          if (!cancelled) setEntraStatus({ enabled: false });
        }

        if (token && !cancelled) {
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
      setError('Bitte gib einen Titel mit mindestens 4 Zeichen ein.');
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
        throw new Error('Bitte melde dich erneut an.');
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
        throw new Error('Bitte melde dich erneut an.');
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

  return (
    <>
      <Head>
        <title>Feedback | JSDoIT Roadmap</title>
      </Head>
      <div className="theme-page-shell flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <div className="ds-container py-12 sm:py-16">
            <section className="ds-feedback-hero">
              <div>
                <div className="ds-eyebrow">
                  <FiMessageSquare className="ds-icon-sm" />
                  Feature Feedback
                </div>
                <h1 className="ds-hero-title">Wünsche sammeln, priorisieren, sichtbar machen.</h1>
                <p className="ds-hero-copy">
                  Poste einen Feature-Wunsch und stimme für die Ideen ab, die den Roadmap-Alltag am
                  stärksten verbessern würden.
                </p>
              </div>
              <div className="ds-card ds-feedback-summary" aria-label="Feedback Übersicht">
                <div className="ds-panel-icon" aria-hidden="true">
                  <FiTrendingUp className="ds-icon-md" />
                </div>
                <p className="ds-panel-label">Aktive Wünsche</p>
                <p className="ds-feedback-count">{items.length}</p>
                <p className="ds-empty-copy">
                  Votes sortieren die Liste automatisch nach Relevanz. Jede Person hat pro Wunsch
                  genau eine Stimme.
                </p>
              </div>
            </section>

            {checkingSession ? (
              <div className="ds-centered-state">
                <JSDoITLoader sizeRem={2.25} message="Anmeldung wird geprüft ..." />
              </div>
            ) : !authenticated ? (
              <section className="ds-card ds-auth-panel ds-feedback-auth-panel">
                <div className="ds-panel-icon" aria-hidden="true">
                  <FiLock className="ds-icon-md" />
                </div>
                <div>
                  <p className="ds-panel-label">Anmeldung erforderlich</p>
                  <h2 className="ds-section-title">Feedback ist für angemeldete Nutzer sichtbar</h2>
                </div>
                <p className="ds-section-copy">
                  Melde dich mit Microsoft SSO an, um Feature-Wünsche zu posten und abzustimmen.
                </p>
                {entraStatus.enabled ? (
                  <button type="button" onClick={startSso} className="ds-button ds-button-primary">
                    Mit Microsoft anmelden
                  </button>
                ) : (
                  <p className="ds-note">
                    Microsoft SSO ist nicht konfiguriert. Feedback kann erst nach aktivierter
                    Entra-Anmeldung genutzt werden.
                  </p>
                )}
              </section>
            ) : (
              <div className="ds-feedback-layout">
                <form className="ds-card ds-feedback-form" onSubmit={submitFeedback}>
                  <div>
                    <p className="ds-panel-label">Neuer Wunsch</p>
                    <h2 className="ds-section-title">Feature-Wunsch posten</h2>
                  </div>
                  <label className="ds-field">
                    <span>Titel</span>
                    <input
                      className="ds-input"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={120}
                      placeholder="Zum Beispiel: Export der Roadmap als PDF"
                    />
                  </label>
                  <label className="ds-field">
                    <span>Beschreibung</span>
                    <textarea
                      className="ds-input ds-textarea"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={1200}
                      rows={6}
                      placeholder="Was soll die Funktion lösen, und wann wäre sie hilfreich?"
                    />
                  </label>
                  {error && <p className="ds-form-error">{error}</p>}
                  <button
                    type="submit"
                    className="ds-button ds-button-primary"
                    disabled={saving || title.trim().length < 4}
                  >
                    <FiPlus className="ds-icon-sm" />
                    {saving ? 'Wird gespeichert ...' : 'Feature-Wunsch posten'}
                  </button>
                </form>

                <section className="ds-feedback-list" aria-label="Feature-Wünsche">
                  <div className="ds-section-header ds-feedback-list-header">
                    <div>
                      <p className="ds-panel-label">Voting</p>
                      <h2 className="ds-section-title">Priorisierte Wünsche</h2>
                    </div>
                    <button
                      type="button"
                      className="ds-button ds-button-secondary ds-feedback-refresh"
                      onClick={loadFeedback}
                      disabled={loadingItems}
                    >
                      {loadingItems ? 'Lädt ...' : 'Aktualisieren'}
                    </button>
                  </div>

                  {loadingItems && !items.length ? (
                    <div className="ds-centered-state">
                      <JSDoITLoader sizeRem={2} message="Feature-Wünsche werden geladen ..." />
                    </div>
                  ) : sortedItems.length ? (
                    <div className="ds-feedback-items">
                      {sortedItems.map((item) => (
                        <article key={item.id} className="ds-card ds-feedback-item">
                          <div
                            className="ds-vote-stack"
                            aria-label={`Abstimmung für ${item.title}`}
                          >
                            <button
                              type="button"
                              className={`ds-vote-button ${item.userVote === 1 ? 'is-active' : ''}`}
                              onClick={() => vote(item, 1)}
                              disabled={votingId === item.id}
                              aria-label="Upvote"
                            >
                              <FiArrowUp className="ds-icon-sm" />
                            </button>
                            <span className="ds-vote-score">{item.score}</span>
                            <button
                              type="button"
                              className={`ds-vote-button ${item.userVote === -1 ? 'is-active' : ''}`}
                              onClick={() => vote(item, -1)}
                              disabled={votingId === item.id}
                              aria-label="Downvote"
                            >
                              <FiArrowDown className="ds-icon-sm" />
                            </button>
                          </div>
                          <div className="ds-feedback-body">
                            <div className="ds-feedback-meta">
                              <span>{formatDate(item.createdAt)}</span>
                              {item.createdByName && <span>von {item.createdByName}</span>}
                            </div>
                            <h3 className="ds-feedback-title">{item.title}</h3>
                            {item.description && (
                              <p className="ds-feedback-description">{item.description}</p>
                            )}
                            <div className="ds-badge-row">
                              <span className="ds-badge ds-badge-success">
                                {item.upVotes} Upvotes
                              </span>
                              <span className="ds-badge ds-badge-danger">
                                {item.downVotes} Downvotes
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="ds-empty-state">
                      <p className="ds-empty-title">Noch keine Feature-Wünsche</p>
                      <p className="ds-empty-copy">
                        Starte mit dem ersten Vorschlag. Je konkreter der Nutzen, desto leichter
                        können andere abstimmen.
                      </p>
                    </div>
                  )}
                </section>
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
