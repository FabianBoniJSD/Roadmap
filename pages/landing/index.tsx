import Head from 'next/head';
import Link from 'next/link';
import {
  FiArrowUpRight,
  FiCheckCircle,
  FiCompass,
  FiGrid,
  FiLayers,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import SiteHeader from '@/components/SiteHeader';

const valueProps = [
  {
    title: 'Zentrale Transparenz',
    icon: FiLayers,
    description:
      'Roadmaps, Statusstände und Verantwortlichkeiten werden an einem Ort gebündelt und bleiben für Stakeholder nachvollziehbar.',
  },
  {
    title: 'SharePoint als Quelle',
    icon: FiShield,
    description:
      'Die Applikation nutzt die bestehende SharePoint-Struktur weiter, inklusive Rollen, Listen und vorhandenen Betriebsprozessen.',
  },
  {
    title: 'Schneller Zugang pro Instanz',
    icon: FiCompass,
    description:
      'Benutzer öffnen genau die Instanz, für die sie freigeschaltet sind, ohne manuell zwischen verschiedenen Umgebungen wechseln zu müssen.',
  },
];

const workflowSteps = [
  {
    title: 'Zugang prüfen',
    description: 'Benutzer melden sich an und sehen nur die Instanzen, für die Freigaben bestehen.',
  },
  {
    title: 'Instanz öffnen',
    description: 'Die passende Roadmap wird gezielt im separaten Übersichtsfenster ausgewählt.',
  },
  {
    title: 'Vorhaben steuern',
    description:
      'Status, Kategorien, Zuständigkeiten und Prioritäten bleiben für alle Rollen sichtbar.',
  },
];

const spotlightStats = [
  { label: 'Mehrinstanzfähig', value: 'Polizei, Feuerwehr, Rettungsdienste' },
  { label: 'Datenhaltung', value: 'SharePoint' },
  { label: 'Zugriffsmodell', value: 'Rollenbasiert' },
];

const audienceCards = [
  {
    title: 'Fachbereiche',
    description:
      'Verfolgen Prioritäten, Abhängigkeiten und geplante Deliverables in ihrer Instanz.',
  },
  {
    title: 'Portfoliosteuerung',
    description: 'Erhält einen belastbaren Überblick über Status, Reifegrad und Steuerungsbedarf.',
  },
  {
    title: 'Instanz-Admins',
    description: 'Pflegen Projekte, Kategorien und Inhalte innerhalb ihres abgegrenzten Bereichs.',
  },
  {
    title: 'Superadmins',
    description: 'Steuern Instanzen, technische Konfiguration und zentrale Zugriffslogik.',
  },
];

const LandingPage = () => {
  return (
    <>
      <Head>
        <title>JSDoIT Roadmap</title>
      </Head>
      <div className="ds-page-shell">
        <SiteHeader activeRoute="home" />

        <main className="ds-page-main">
          <section className="ds-container ds-hero">
            <div className="ds-hero-content">
              <div className="ds-eyebrow">
                <FiGrid className="ds-icon-sm" />
                JSDoIT Roadmap Center
              </div>

              <h1 className="ds-hero-title">
                Roadmaps, Prioritäten und Instanzen in einer{' '}
                <span className="ds-accent-text">klaren Einstiegsebene</span>
              </h1>
              <p className="ds-hero-copy">
                Die Anwendung verbindet SharePoint-basierte Roadmap-Daten mit einer zentralen,
                verständlichen Oberfläche. Fachbereiche, Steuerung und Administration starten von
                hier aus in die richtige Instanz und behalten gleichzeitig den Gesamtzweck der
                Plattform im Blick.
              </p>

              <div className="ds-actions">
                <Link
                  href="/instances"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ds-button ds-button-primary"
                >
                  <FiGrid className="ds-icon" />
                  Instanzübersicht öffnen
                  <FiArrowUpRight className="ds-icon-sm" />
                </Link>
                <Link href="/help" className="ds-button ds-button-secondary">
                  Mehr zur Nutzung
                </Link>
              </div>

              <div className="ds-feature-grid">
                {spotlightStats.map((stat, index) => (
                  <article key={stat.label} className="ds-card ds-feature-card">
                    <div className="ds-icon-box">0{index + 1}</div>
                    <h3 className="ds-kicker">{stat.label}</h3>
                    <p className="ds-small-text">{stat.value}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="ds-card ds-logic-panel" aria-label="Plattformlogik">
              <div className="ds-panel-header">
                <div>
                  <p className="ds-panel-label">Plattformlogik</p>
                  <h2 className="ds-panel-title">Ein sauberer Einstieg statt verstreuter Links</h2>
                </div>
                <div className="ds-panel-icon" aria-hidden="true">
                  <FiTrendingUp className="ds-icon-md" />
                </div>
              </div>

              <div className="ds-steps">
                {workflowSteps.map((step, index) => (
                  <article key={step.title} className="ds-step">
                    <div className="ds-step-number">0{index + 1}</div>
                    <div>
                      <h3 className="ds-step-title">{step.title}</h3>
                      <p className="ds-step-copy">{step.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="ds-note">
                <div className="ds-note-icon">i</div>
                <p className="ds-small-text">
                  Die Instanzübersicht öffnet sich bewusst separat. Dadurch bleibt diese Seite der
                  allgemeine Einstieg für Information, Orientierung und Navigation.
                </p>
              </div>
            </aside>
          </section>

          <section className="ds-container ds-section">
            <div className="ds-section-header">
              <div>
                <p className="ds-panel-label">Nutzen der Anwendung</p>
                <h2 className="ds-section-title">Was diese Plattform im Alltag besser macht</h2>
              </div>
              <p className="ds-section-copy">
                Das Roadmap Center dient als gemeinsamer Zugangspunkt für verteilte Roadmap-
                Instanzen. Inhalte können zentral präsentiert werden, während die Datenhaltung und
                Berechtigungen an die vorhandene SharePoint-Landschaft angebunden bleiben.
              </p>
            </div>

            <div className="ds-value-grid">
              {valueProps.map((item) => (
                <article key={item.title} className="ds-card ds-value-card">
                  <div className="ds-value-icon">
                    <item.icon className="ds-icon" />
                  </div>
                  <h3 className="ds-value-title">{item.title}</h3>
                  <p className="ds-value-copy">{item.description}</p>
                  <div className="ds-proof-line">
                    <FiCheckCircle className="ds-icon-sm" />
                    Für den produktiven Einsatz
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="ds-container ds-section">
            <div className="ds-audience-panel">
              <div className="ds-audience-intro">
                <div className="ds-eyebrow">
                  <FiUsers className="ds-icon-sm" />
                  Für wen die Plattform gedacht ist
                </div>
                <h2 className="ds-section-title">
                  Geeignet für Fachbereiche, Portfoliosteuerung und Administration
                </h2>
                <p className="ds-section-copy">
                  Die Anwendung unterstützt reine Leserollen ebenso wie operative Pflege und
                  übergreifende Governance. Das Design trennt Information, Navigation und Zugriff
                  klar, damit die Oberfläche auch bei mehreren Instanzen verständlich bleibt.
                </p>
              </div>
              <div className="ds-audience-grid">
                {audienceCards.map((item) => (
                  <div key={item.title} className="ds-audience-card">
                    <p className="ds-audience-title">{item.title}</p>
                    <p className="ds-audience-copy">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="ds-footer">
          <div className="ds-container ds-footer-inner">
            <span>JSDoIT Roadmap Center</span>
            <div className="ds-footer-links">
              <Link className="ds-footer-link" href="/help">
                Hilfe
              </Link>
              <Link className="ds-footer-link" href="/feedback">
                Feedback
              </Link>
              <Link className="ds-footer-link" href="/instances">
                Instanzen
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
