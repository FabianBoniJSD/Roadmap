import Head from 'next/head';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import Link from 'next/link';
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
import SiteHeader from '@/components/SiteHeader';

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
    description: 'Projekte finden, Filter zurücksetzen, Ansichten wählen und Ergebnisse teilen.',
    href: '/help/projekte-ansehen',
    badge: 'Visualisierung',
    icon: FiBookOpen,
  },
  {
    title: 'Projekte melden',
    description: 'Inhaltskorrektur, Feature-Wunsch und Support richtig unterscheiden.',
    href: '/help/projekte-melden',
    badge: 'Input geben',
    icon: FiCheckCircle,
  },
  {
    title: 'Admin-Leitfaden',
    description: 'Projekte, Kategorien, Einstellungen und Rechte kontrolliert pflegen.',
    href: '/help/admin',
    badge: 'Für Admins',
    icon: FiSettings,
  },
];

const knowledgeBase: Guide[] = [
  {
    title: 'FAQ & Problemlösung',
    description: 'Antworten zu fehlenden Treffern, Zugriff, Anmeldung und Inhaltsänderungen.',
    href: '/help/faq',
    icon: FiHelpCircle,
  },
  {
    title: 'Berechtigungen & Rollen',
    description: 'Microsoft SSO, Leserechte, Instanz-Admins und Superadmins unterscheiden.',
    href: '/help/admin/rechte-und-zugang',
    icon: FiShield,
  },
  {
    title: 'Roadmap-Projekte verwalten',
    description: 'Projektarten, Pflichtfelder, Spiegelungen und sicheres Löschen verstehen.',
    href: '/help/admin/projekte-verwalten',
    icon: FiSliders,
  },
  {
    title: 'Design & Einstellungen',
    description:
      'Titel und Farbverlauf ändern, bisherigen Wert sichern und Ergebnis kontrollieren.',
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
  return (
    <>
      <Head>
        <title>Hilfe | JSDoIT Roadmap</title>
      </Head>
      <div className="ds-page-shell before:[position:absolute] before:[inset:0] before:[z-index:0] before:[pointer-events:none] before:[background-size:56px_56px] after:[position:absolute] after:[right:-10%] after:[bottom:-25%] after:[left:-10%] after:[z-index:0] after:[height:38vh] after:[pointer-events:none] [position:relative] [isolation:isolate] [display:flex] [min-height:100vh] [flex-direction:column] [overflow:hidden] [background:var(--ds-bg-page)] [color:var(--ds-text-default)] [font-family:var(--ds-font-sans)] [&>*]:[position:relative] [&>*]:[z-index:1]">
        <SiteHeader activeRoute="help" />

        <main className="ds-page-main ds-help-home [flex:1]">
          <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-hero [display:grid] [min-height:calc(100vh_-_78px)] [grid-template-columns:minmax(0,_1.08fr)_minmax(420px,_0.92fr)] [align-items:center] [gap:clamp(40px,_6vw,_86px)] [padding-block:clamp(56px,_7vw,_96px)] max-[1100px]:[grid-template-columns:1fr] max-[760px]:[padding-block:42px] ds-help-hero [min-height:auto] [padding-block:clamp(48px,_7vw,_88px)]">
            <div className="ds-hero-content [max-width:760px]">
              <div className="ds-eyebrow [display:inline-flex] [width:fit-content] [align-items:center] [gap:10px] [padding:9px_15px] [border:1px_solid_var(--ds-border-strong)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-accent-soft)] [color:var(--ds-text-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none] [&_svg]:[color:var(--ds-accent-strong)]">
                <FiLifeBuoy className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                Hilfe & Support
              </div>
              <h1 className="ds-hero-title [max-width:760px] [margin:28px_0_22px] [color:var(--ds-text-strong)] [font-size:clamp(2.625rem,_5.8vw,_4.75rem)] [font-weight:600] [letter-spacing:-0.06em] [line-height:0.98] [text-wrap:balance]">
                Hilfe zur Roadmap
              </h1>
              <p className="ds-hero-copy [max-width:660px] [margin:0] [color:var(--ds-text-default)] [font-size:1.0625rem] [line-height:1.75]">
                Anleitungen zum Lesen, Filtern und Pflegen Ihrer Roadmap sowie Antworten zu Zugriff
                und Support.
              </p>

              <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%]">
                <Link
                  className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
                  href="/help/faq"
                >
                  FAQ öffnen
                  <FiArrowUpRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                </Link>
                <Link
                  className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
                  href="/support"
                >
                  Support kontaktieren
                </Link>
              </div>
            </div>
          </section>

          <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-section [padding-block:70px_96px]">
            <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
              <div>
                <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                  Leitfäden im Fokus
                </p>
                <h2 className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]">
                  Leitfäden für Ihre Aufgaben
                </h2>
              </div>
              <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
                Diese Einstiege decken die häufigsten Situationen ab: Überblick gewinnen, Roadmap
                bedienen, Projekte melden und Administration starten.
              </p>
            </div>

            <div className="ds-help-grid [display:grid] [grid-template-columns:repeat(4,_minmax(0,_1fr))] [gap:var(--ds-space-5)] max-[1100px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[760px]:[grid-template-columns:1fr]">
              {spotlightGuides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] "
                >
                  <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
                    <div className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]">
                      <guide.icon className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                    </div>
                    {guide.badge && (
                      <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                        {guide.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
                    {guide.title}
                  </h3>
                  <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
                    {guide.description}
                  </p>
                  <span className="ds-help-link [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [margin-top:auto] [padding-top:24px] [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600]">
                    Weiterlesen
                    <FiArrowUpRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <details className="ds-container ds-help-orientation">
            <summary>Orientierung: Lesen, Melden und Administrieren</summary>
            <div className="ds-help-orientation-content">
              <div className="ds-feature-grid [display:grid] [max-width:760px] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:var(--ds-space-4)] [margin-top:34px] max-[760px]:[grid-template-columns:1fr] ds-help-feature-grid [max-width:820px]">
                <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-feature-card [min-height:164px] [padding:22px]">
                  <div className="ds-icon-box [display:grid] [width:38px] [height:38px] [place-items:center] [margin-bottom:22px] [border:1px_solid_var(--ds-border-default)] [border-radius:13px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]">
                    <FiBookOpen className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </div>
                  <p className="ds-kicker [margin:0_0_9px] [color:var(--ds-text-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Guides
                  </p>
                  <p className="ds-small-text [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
                    Kurze Wege zu den wichtigsten Arbeitsabläufen.
                  </p>
                </article>
                <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-feature-card [min-height:164px] [padding:22px]">
                  <div className="ds-icon-box [display:grid] [width:38px] [height:38px] [place-items:center] [margin-bottom:22px] [border:1px_solid_var(--ds-border-default)] [border-radius:13px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]">
                    <FiShield className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </div>
                  <p className="ds-kicker [margin:0_0_9px] [color:var(--ds-text-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Rollen
                  </p>
                  <p className="ds-small-text [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
                    Berechtigungen und Zugriff verständlich erklärt.
                  </p>
                </article>
                <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-feature-card [min-height:164px] [padding:22px]">
                  <div className="ds-icon-box [display:grid] [width:38px] [height:38px] [place-items:center] [margin-bottom:22px] [border:1px_solid_var(--ds-border-default)] [border-radius:13px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]">
                    <FiSettings className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </div>
                  <p className="ds-kicker [margin:0_0_9px] [color:var(--ds-text-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                    Admin
                  </p>
                  <p className="ds-small-text [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
                    Konfiguration, Kategorien und Inhalte gezielt pflegen.
                  </p>
                </article>
              </div>
              <aside
                className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-logic-panel [padding:30px] [border-color:var(--ds-border-strong)] [border-radius:var(--ds-radius-xl)] max-[1100px]:[max-width:760px]"
                aria-label="Hilfebereich Orientierung"
              >
                <div className="ds-panel-header [display:flex] [justify-content:space-between] [gap:var(--ds-space-5)] [margin-bottom:24px] max-[760px]:[flex-direction:column-reverse]">
                  <div>
                    <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                      Schnelle Orientierung
                    </p>
                    <h2 className="ds-panel-title [margin:0] [color:var(--ds-text-strong)] [font-size:clamp(1.5rem,_3vw,_2.125rem)] [letter-spacing:-0.04em] [line-height:1.15]">
                      Wählen Sie den passenden Einstieg
                    </h2>
                  </div>
                  <div
                    className="ds-panel-icon [display:grid] [flex:0_0_auto] [width:68px] [height:68px] [place-items:center] [border:1px_solid_var(--ds-border-strong)] [border-radius:24px] [background:var(--ds-accent)] [color:var(--ds-accent-strong)]"
                    aria-hidden="true"
                  >
                    <FiCompass className="ds-icon-md [flex:0_0_auto] [width:1.5rem] [height:1.5rem]" />
                  </div>
                </div>

                <div className="ds-steps [display:grid] [gap:14px]">
                  {helpSteps.map((step) => (
                    <article
                      key={step.title}
                      className="ds-step [display:grid] [grid-template-columns:64px_1fr] [align-items:start] [gap:var(--ds-space-4)] [padding:20px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_80%,_transparent)] max-[760px]:[grid-template-columns:1fr]"
                    >
                      <div>
                        <h3 className="ds-step-title [margin:0_0_8px] [color:var(--ds-text-strong)] [font-size:1rem] [font-weight:600]">
                          {step.title}
                        </h3>
                        <p className="ds-step-copy [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
                          {step.description}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="ds-note [display:grid] [grid-template-columns:48px_1fr] [align-items:center] [gap:var(--ds-space-4)] [margin-top:18px] [padding:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)]">
                  <span
                    className="ds-note-icon [display:grid] [width:40px] [height:40px] [place-items:center] [border:1px_solid_var(--ds-border-strong)] [border-radius:50%] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)] [font-weight:600]"
                    aria-hidden="true"
                  >
                    i
                  </span>
                  <p>
                    Die wichtigsten Inhalte sind rollenbasiert sortiert: Lesen, Melden,
                    Administrieren.
                  </p>
                </div>
              </aside>
            </div>
          </details>

          <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-section [padding-block:70px_96px] ds-help-knowledge-section [padding-top:0]">
            <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
              <div>
                <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                  Wissensdatenbank
                </p>
                <h2 className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]">
                  Vertiefung für wiederkehrende Fragen
                </h2>
              </div>
            </div>

            <div className="ds-help-list [display:grid] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-xl)] [background:var(--ds-bg-elevated)] ">
              {knowledgeBase.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="ds-help-list-item [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [gap:var(--ds-space-4)] [padding:22px_24px] [color:var(--ds-text-default)] [transition:background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] [&+.ds-help-list-item]:[border-top:1px_solid_var(--ds-border-default)] hover:[background:var(--ds-bg-soft)] hover:[color:var(--ds-text-strong)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:1rem] [&_h3]:[font-weight:600] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--ds-text-muted)] [&_p]:[font-size:0.875rem] [&_p]:[line-height:1.55] max-[760px]:[grid-template-columns:1fr]"
                >
                  <div className="ds-help-list-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]">
                    <item.icon className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <FiArrowUpRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                </Link>
              ))}
            </div>
          </section>

          <section className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-section [padding-block:70px_96px]">
            <div className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-support-panel [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-6)] [padding:32px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[align-items:flex-start] max-[1100px]:[flex-direction:column]">
              <div>
                <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                  Persönlicher Support
                </p>
                <h2 className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]">
                  Wenn die Anleitung nicht reicht
                </h2>
                <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
                  Das Roadmap-Team unterstützt bei Berechtigungen, Anpassungen und Fragen zum
                  Betrieb. Eine kurze Beschreibung des Anliegens reicht für den ersten Kontakt.
                </p>
              </div>
              <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%] ds-help-support-actions [flex:0_0_auto] [margin-top:0]">
                <a
                  className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
                  href="mailto:roadmap@jsd.bs.ch"
                >
                  E-Mail schreiben
                </a>
                <Link
                  className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
                  href="/docs"
                >
                  Technische Dokumentation
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="ds-footer [border-top:1px_solid_var(--ds-border-subtle)] [background:color-mix(in_srgb,_var(--ds-bg-page)_82%,_transparent)] ">
          <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-footer-inner [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-4)] [padding-block:24px] [color:var(--ds-text-muted)] [font-size:0.875rem] max-[760px]:[align-items:flex-start] max-[760px]:[flex-direction:column]">
            <span>JSDoIT Roadmap Center</span>
            <div className="ds-footer-links [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)]">
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/landing"
              >
                Start
              </Link>
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/instances"
              >
                Instanzen
              </Link>
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/docs"
              >
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
