import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FiArrowUpRight,
  FiBookOpen,
  FiCheckCircle,
  FiCompass,
  FiHelpCircle,
  FiLifeBuoy,
  FiSettings,
  FiShield,
  FiSliders,
} from 'react-icons/fi';
import ColorModeToggle from '@/components/ColorModeToggle';
import { ADMIN_SESSION_CHANGED_EVENT, getAdminSessionToken } from '@/utils/auth';

type Guide = {
  title: string;
  description: string;
  href: string;
  badge?: string;
  icon: typeof FiBookOpen;
};

const spotlightGuides: Guide[] = [
  {
    title: 'Erste Schritte',
    description: 'In drei Minuten wissen, wo Sie starten und welche Informationen relevant sind.',
    href: '/help/erste-schritte',
    badge: 'Schnellstart',
    icon: FiCompass,
  },
  {
    title: 'Roadmap lesen & filtern',
    description: 'Suchen, filtern und Ansichten nutzen, um Projekte gezielt einzugrenzen.',
    href: '/help/projekte-ansehen',
    badge: 'Visualisierung',
    icon: FiBookOpen,
  },
  {
    title: 'Projekte melden',
    description: 'Welche Angaben helfen und wie neue Vorhaben strukturiert eingereicht werden.',
    href: '/help/projekte-melden',
    badge: 'Input geben',
    icon: FiCheckCircle,
  },
  {
    title: 'Admin-Leitfaden',
    description: 'Instanzen pflegen, Kategorien steuern und Einstellungen nachvollziehbar ändern.',
    href: '/help/admin',
    badge: 'Für Admins',
    icon: FiSettings,
  },
];

const knowledgeBase: Guide[] = [
  {
    title: 'FAQ & Problemlösung',
    description: 'Schnelle Antworten auf wiederkehrende Fragen und Tipps bei Störungen.',
    href: '/help/faq',
    icon: FiHelpCircle,
  },
  {
    title: 'Berechtigungen & Rollen',
    description: 'Wer sieht welche Roadmap? Überblick über SSO, Rollen und Instanzfreigaben.',
    href: '/help/admin/rechte-und-zugang',
    icon: FiShield,
  },
  {
    title: 'Roadmap-Projekte verwalten',
    description: 'Status, Phasen und Meilensteine pflegen, inklusive Best Practices.',
    href: '/help/admin/projekte-verwalten',
    icon: FiSliders,
  },
  {
    title: 'Design & Einstellungen',
    description:
      'Farben, Branding und Texte so konfigurieren, dass die Instanz verständlich bleibt.',
    href: '/help/admin/einstellungen-und-design',
    icon: FiSettings,
  },
];

const helpSteps = [
  {
    title: 'Orientieren',
    description:
      'Starten Sie mit den Grundlagen, wenn Sie die Roadmap nur lesen oder teilen möchten.',
  },
  {
    title: 'Vertiefen',
    description: 'Nutzen Sie FAQ und Wissensdatenbank für konkrete Fragen im Arbeitsalltag.',
  },
  {
    title: 'Administrieren',
    description:
      'Wechseln Sie in den Admin-Leitfaden, wenn Sie Inhalte oder Einstellungen pflegen.',
  },
];

const HelpHome = () => {
  const [showFeedbackLink, setShowFeedbackLink] = useState(false);

  useEffect(() => {
    const updateFeedbackLink = () => setShowFeedbackLink(Boolean(getAdminSessionToken()));
    updateFeedbackLink();
    window.addEventListener(ADMIN_SESSION_CHANGED_EVENT, updateFeedbackLink);
    return () => window.removeEventListener(ADMIN_SESSION_CHANGED_EVENT, updateFeedbackLink);
  }, []);

  return (
    <>
      <Head>
        <title>Hilfe | JSDoIT Roadmap</title>
      </Head>
      <div className="ds-page-shell">
        <header className="ds-topbar">
          <Link className="ds-brand" href="/landing">
            <span className="ds-brand-mark">JS</span>
            <span className="ds-brand-name">JSDOIT Roadmap Center</span>
          </Link>

          <nav className="ds-nav" aria-label="Hauptnavigation">
            <Link className="ds-nav-link" href="/landing">
              Start
            </Link>
            <Link className="ds-nav-link" href="/instances">
              Instanzübersicht
            </Link>
            <Link className="ds-nav-link is-active" href="/help">
              Hilfe
            </Link>
            {showFeedbackLink && (
              <Link className="ds-nav-link" href="/feedback">
                Feedback
              </Link>
            )}
          </nav>

          <ColorModeToggle className="ds-color-mode-toggle" />
        </header>

        <main className="ds-page-main">
          <section className="ds-container ds-hero ds-help-hero">
            <div className="ds-hero-content">
              <div className="ds-eyebrow">
                <FiLifeBuoy className="ds-icon-sm" />
                Hilfe & Support
              </div>
              <h1 className="ds-hero-title">Antworten finden, Roadmaps sicher nutzen.</h1>
              <p className="ds-hero-copy">
                Der Hilfebereich bündelt schnelle Einstiege, vertiefende Anleitungen und
                Admin-Themen für alle, die Roadmap-Instanzen lesen, pflegen oder weiterentwickeln.
              </p>

              <div className="ds-actions">
                <Link className="ds-button ds-button-primary" href="/help/faq">
                  FAQ öffnen
                  <FiArrowUpRight className="ds-icon-sm" />
                </Link>
                <Link className="ds-button ds-button-secondary" href="/support">
                  Support kontaktieren
                </Link>
              </div>

              <div className="ds-feature-grid ds-help-feature-grid">
                <article className="ds-card ds-feature-card">
                  <div className="ds-icon-box">
                    <FiBookOpen className="ds-icon-sm" />
                  </div>
                  <p className="ds-kicker">Guides</p>
                  <p className="ds-small-text">Kurze Wege zu den wichtigsten Arbeitsabläufen.</p>
                </article>
                <article className="ds-card ds-feature-card">
                  <div className="ds-icon-box">
                    <FiShield className="ds-icon-sm" />
                  </div>
                  <p className="ds-kicker">Rollen</p>
                  <p className="ds-small-text">Berechtigungen und Zugriff verständlich erklärt.</p>
                </article>
                <article className="ds-card ds-feature-card">
                  <div className="ds-icon-box">
                    <FiSettings className="ds-icon-sm" />
                  </div>
                  <p className="ds-kicker">Admin</p>
                  <p className="ds-small-text">
                    Konfiguration, Kategorien und Inhalte gezielt pflegen.
                  </p>
                </article>
              </div>
            </div>

            <aside className="ds-card ds-logic-panel" aria-label="Hilfebereich Orientierung">
              <div className="ds-panel-header">
                <div>
                  <p className="ds-panel-label">Schnelle Orientierung</p>
                  <h2 className="ds-panel-title">Wählen Sie den passenden Einstieg</h2>
                </div>
                <div className="ds-panel-icon" aria-hidden="true">
                  <FiCompass className="ds-icon-md" />
                </div>
              </div>

              <div className="ds-steps">
                {helpSteps.map((step, index) => (
                  <article key={step.title} className="ds-step">
                    <span className="ds-step-number">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3 className="ds-step-title">{step.title}</h3>
                      <p className="ds-step-copy">{step.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="ds-note">
                <span className="ds-note-icon" aria-hidden="true">
                  i
                </span>
                <p>
                  Die wichtigsten Inhalte sind rollenbasiert sortiert: Lesen, Melden,
                  Administrieren.
                </p>
              </div>
            </aside>
          </section>

          <section className="ds-container ds-section">
            <div className="ds-section-header">
              <div>
                <p className="ds-panel-label">Leitfäden im Fokus</p>
                <h2 className="ds-section-title">Direkt in die wichtigsten Hilfen einsteigen</h2>
              </div>
              <p className="ds-section-copy">
                Diese Einstiege decken die häufigsten Situationen ab: Überblick gewinnen, Roadmap
                bedienen, Projekte melden und Administration starten.
              </p>
            </div>

            <div className="ds-help-grid">
              {spotlightGuides.map((guide) => (
                <Link key={guide.href} href={guide.href} className="ds-card ds-help-card">
                  <div className="ds-help-card-header">
                    <div className="ds-help-card-icon">
                      <guide.icon className="ds-icon-sm" />
                    </div>
                    {guide.badge && <span className="ds-help-card-badge">{guide.badge}</span>}
                  </div>
                  <h3 className="ds-help-card-title">{guide.title}</h3>
                  <p className="ds-help-card-copy">{guide.description}</p>
                  <span className="ds-help-link">
                    Weiterlesen
                    <FiArrowUpRight className="ds-icon-sm" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="ds-container ds-section ds-help-knowledge-section">
            <div className="ds-section-header">
              <div>
                <p className="ds-panel-label">Wissensdatenbank</p>
                <h2 className="ds-section-title">Vertiefung für wiederkehrende Fragen</h2>
              </div>
            </div>

            <div className="ds-help-list">
              {knowledgeBase.map((item) => (
                <Link key={item.href} href={item.href} className="ds-help-list-item">
                  <div className="ds-help-list-icon">
                    <item.icon className="ds-icon-sm" />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <FiArrowUpRight className="ds-icon-sm" />
                </Link>
              ))}
            </div>
          </section>

          <section className="ds-container ds-section">
            <div className="ds-card ds-help-support-panel">
              <div>
                <p className="ds-panel-label">Persönlicher Support</p>
                <h2 className="ds-section-title">Wenn die Anleitung nicht reicht</h2>
                <p className="ds-section-copy">
                  Das Roadmap-Team unterstützt bei Berechtigungen, Anpassungen und Fragen zum
                  Betrieb. Eine kurze Beschreibung des Anliegens reicht für den ersten Kontakt.
                </p>
              </div>
              <div className="ds-actions ds-help-support-actions">
                <a className="ds-button ds-button-primary" href="mailto:roadmap@jsd.bs.ch">
                  E-Mail schreiben
                </a>
                <Link className="ds-button ds-button-secondary" href="/docs">
                  Technische Dokumentation
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="ds-footer">
          <div className="ds-container ds-footer-inner">
            <span>JSDoIT Roadmap Center</span>
            <div className="ds-footer-links">
              <Link className="ds-footer-link" href="/landing">
                Start
              </Link>
              <Link className="ds-footer-link" href="/instances">
                Instanzen
              </Link>
              <Link className="ds-footer-link" href="/docs">
                Dokumentation
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HelpHome;
