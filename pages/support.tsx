import Link from 'next/link';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiEdit3,
  FiHelpCircle,
  FiMail,
  FiMessageSquare,
} from 'react-icons/fi';
import HelpLayout from '@/components/HelpLayout';
import { ORBIT_URL } from '@/utils/orbit';

const supportChecklist = [
  'Betroffene Roadmap-Instanz und Link zur Seite oder zum Projekt',
  'Was Sie tun wollten und welches Ergebnis Sie erwartet haben',
  'Was stattdessen passiert ist – inklusive genauer Fehlermeldung',
  'Datum und ungefähre Uhrzeit des Problems',
  'Browser und Gerät sowie bereits ausprobierte Lösungsschritte',
];

const SupportPage = () => {
  return (
    <HelpLayout
      eyebrow="Persönlicher Support"
      title="Schnell zur richtigen Unterstützung"
      description={
        <>
          Viele Fragen lassen sich direkt in der Hilfe klären. Wenn Sie persönliche Unterstützung
          benötigen, wählen Sie zuerst die Art Ihres Anliegens und senden anschließend die Angaben,
          die eine gezielte Prüfung ermöglichen.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'Support' }]}
      learningGoals={[
        'Einfache Ursachen vor der Kontaktaufnahme ausschließen.',
        'Den passenden Kanal für Störung, Inhalt oder Feature-Wunsch wählen.',
        'Eine vollständige und nachvollziehbare Supportanfrage verfassen.',
        'Passwörter und andere sensible Informationen sicher behandeln.',
      ]}
      actions={
        <>
          <a
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href={ORBIT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FiMessageSquare className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            Support öffnen
          </a>
          <a
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="mailto:roadmap@jsd.bs.ch"
          >
            <FiMail className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            Alternativ per E-Mail
          </a>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/help/faq"
          >
            Häufige Fragen prüfen
          </Link>
        </>
      }
    >
      <section aria-labelledby="selbsthilfe-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Vor der Kontaktaufnahme
            </p>
            <h2
              id="selbsthilfe-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Drei kurze Prüfungen lösen viele Probleme
            </h2>
          </div>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Führen Sie nur die Schritte aus, die zu Ihrer Situation passen. Notieren Sie das
            Ergebnis für den Support, falls das Problem bestehen bleibt.
          </p>
        </div>

        <div className="ds-steps [display:grid] [gap:14px]">
          {[
            {
              title: 'Seite neu laden und Anmeldung prüfen',
              copy: 'Laden Sie die Seite einmal neu. Bei einer Anmeldeschleife öffnen Sie die Anmeldung erneut und wählen „Status erneut prüfen“.',
            },
            {
              title: 'Instanz, Jahr und Filter kontrollieren',
              copy: 'Fehlende Projekte entstehen häufig durch eine andere Roadmap-Instanz, einen engen Zeitraum oder aktive Filter. Setzen Sie die Filter testweise zurück.',
            },
            {
              title: 'Passende Anleitung öffnen',
              copy: 'Die häufigen Fragen erklären Zugriffs-, Such- und Darstellungsprobleme. Für die Bedienung führt der Bereich „Erste Schritte“ durch den normalen Ablauf.',
            },
          ].map((step) => (
            <article
              key={step.title}
              className="ds-step [display:grid] [grid-template-columns:64px_1fr] [align-items:start] [gap:var(--ds-space-4)] [padding:20px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_80%,_transparent)] max-[760px]:[grid-template-columns:1fr]"
            >
              <div>
                <h3 className="ds-step-title [margin:0_0_8px] [color:var(--ds-text-strong)] [font-size:1rem] [font-weight:600]">
                  {step.title}
                </h3>
                <p className="ds-step-copy [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
                  {step.copy}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%]">
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/help/faq"
          >
            FAQ öffnen
            <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/help/erste-schritte"
          >
            Erste Schritte öffnen
          </Link>
        </div>
      </section>

      <section aria-labelledby="kanal-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Welcher Weg passt?
            </p>
            <h2
              id="kanal-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Anliegen richtig einordnen
            </h2>
          </div>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Die Auswahl verhindert unnötige Weiterleitungen und macht den nächsten Schritt
            eindeutig.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
            <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
              <div
                className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              >
                <FiAlertCircle className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
              </div>
              <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                Support-Portal
              </span>
            </div>
            <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
              Störung oder fehlender Zugriff
            </h3>
            <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
              Bei Fehlermeldungen, Anmeldeproblemen oder unerwartet fehlenden Berechtigungen öffnen
              Sie über die Schaltfläche Support unten rechts das Support-Portal.
            </p>
            <a
              className="ds-help-link [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [margin-top:auto] [padding-top:24px] [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600]"
              href="mailto:roadmap@jsd.bs.ch"
            >
              Alternativ E-Mail senden
              <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </a>
          </article>

          <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
            <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
              <div
                className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              >
                <FiEdit3 className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
              </div>
              <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                Inhalt
              </span>
            </div>
            <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
              Projekt ergänzen oder korrigieren
            </h3>
            <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
              Für fehlende Projekte, falsche Termine, Statusangaben oder Verantwortlichkeiten hilft
              die Anleitung für Inhaltsmeldungen.
            </p>
            <Link
              className="ds-help-link [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [margin-top:auto] [padding-top:24px] [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600]"
              href="/help/projekte-melden"
            >
              Inhaltsänderung vorbereiten
              <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </Link>
          </article>

          <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
            <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
              <div
                className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              >
                <FiMessageSquare className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
              </div>
              <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                Feedback
              </span>
            </div>
            <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
              Neue Funktion vorschlagen
            </h3>
            <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
              Wünsche für neue Filter, Ansichten oder Funktionen gehören auf die Feedback-Seite.
              Dort können angemeldete Personen Vorschläge bewerten.
            </p>
            <Link
              className="ds-help-link [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [margin-top:auto] [padding-top:24px] [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600]"
              href="/feedback"
            >
              Feature-Wunsch einreichen
              <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </Link>
          </article>
        </div>
      </section>

      <section
        className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]"
        aria-labelledby="anfrage-heading"
      >
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] p-6 sm:p-8">
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Vollständige Anfrage
          </p>
          <h2
            id="anfrage-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            Diese Angaben vermeiden Rückfragen
          </h2>
          <div className="ds-info-list [display:grid] [gap:var(--ds-space-3)] mt-6">
            {supportChecklist.map((item) => (
              <p
                key={item}
                className="ds-info-item [margin:0] [padding:16px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_72%,_transparent)] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.6]"
              >
                {item}
              </p>
            ))}
          </div>
        </article>

        <aside
          className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] p-6 sm:p-8"
          aria-label="Vorlage für eine Supportanfrage"
        >
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Kopiervorlage
          </p>
          <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Kurz und nachvollziehbar schreiben
          </h3>
          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-7 text-slate-300">
            <p>Instanz: …</p>
            <p>Seite oder Projektlink: …</p>
            <p>Zeitpunkt: …</p>
            <p>Mein Ziel: …</p>
            <p>Beobachtetes Verhalten: …</p>
            <p>Fehlermeldung: …</p>
            <p>Bereits geprüft: …</p>
          </div>
          <a
            className="ds-help-link [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [margin-top:auto] [padding-top:24px] [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600]"
            href="mailto:roadmap@jsd.bs.ch"
          >
            <FiMail className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            roadmap@jsd.bs.ch
          </a>
        </aside>
      </section>

      <section
        className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-support-panel [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-6)] [padding:32px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[align-items:flex-start] max-[1100px]:[flex-direction:column]"
        aria-labelledby="sicherheit-heading"
      >
        <div>
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Sicher kommunizieren
          </p>
          <h2
            id="sicherheit-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            Keine Zugangsdaten mitsenden
          </h2>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Senden Sie niemals Passwörter, Sitzungscookies, Zugangstokens oder geheime
            Konfigurationswerte. Prüfen Sie Screenshots auf personenbezogene oder vertrauliche
            Angaben und entfernen Sie alles, was für die Fehleranalyse nicht notwendig ist.
          </p>
        </div>
        <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%] ds-help-support-actions [flex:0_0_auto] [margin-top:0]">
          <a
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="mailto:roadmap@jsd.bs.ch"
          >
            <FiMail className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            E-Mail schreiben
          </a>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/docs/erste-schritte/uebersicht"
          >
            <FiHelpCircle className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            Technische Dokumentation
          </Link>
        </div>
      </section>

      <section aria-labelledby="danach-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Nach dem Absenden
            </p>
            <h2
              id="danach-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              So geht es weiter
            </h2>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: FiMail,
              title: 'Anfrage wird eingeordnet',
              copy: 'Das Roadmap-Team prüft, ob Bedienung, Inhalt, Berechtigung oder Technik betroffen ist.',
            },
            {
              icon: FiHelpCircle,
              title: 'Rückfragen beantworten',
              copy: 'Falls Informationen fehlen, antworten Sie möglichst im gleichen E-Mail-Verlauf, damit der Kontext erhalten bleibt.',
            },
            {
              icon: FiCheckCircle,
              title: 'Lösung überprüfen',
              copy: 'Öffnen Sie nach der Rückmeldung die betroffene Seite erneut und prüfen Sie den ursprünglichen Ablauf.',
            },
          ].map(({ icon: Icon, title, copy }) => (
            <article
              key={title}
              className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] "
            >
              <div
                className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              >
                <Icon className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
              </div>
              <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
                {title}
              </h3>
              <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
                {copy}
              </p>
            </article>
          ))}
        </div>
      </section>
    </HelpLayout>
  );
};

export default SupportPage;
