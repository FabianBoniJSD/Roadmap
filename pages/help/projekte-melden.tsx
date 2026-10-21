import Link from 'next/link';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { FiArrowRight, FiEdit3, FiMessageSquare, FiShield } from 'react-icons/fi';
import HelpLayout from '@/components/HelpLayout';

const reportChecklist = [
  'Roadmap-Instanz und Link zum betroffenen Projekt',
  'Was aktuell angezeigt wird und was stattdessen gelten soll',
  'Quelle oder zuständige Kontaktperson für die Änderung',
  'Falls relevant: gewünschter Zeitraum oder nächster Meilenstein',
];

const ProjekteMelden = () => {
  return (
    <HelpLayout
      title="Neue Projekte und Korrekturen melden"
      description={
        <>
          Nutzen Sie für inhaltliche Änderungen den Kontakt zum Roadmap-Team. Feature-Wünsche zur
          Anwendung gehören dagegen auf die Feedback-Seite. Diese Trennung sorgt dafür, dass Ihr
          Anliegen direkt bei der richtigen Stelle landet.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'Projekte melden' }]}
      learningGoals={[
        'Den richtigen Kanal für Inhalt, Störung oder Feature-Wunsch wählen.',
        'Alle Angaben zusammenstellen, die Rückfragen vermeiden.',
        'Vertrauliche Daten aus der Meldung heraushalten.',
        'Nach der Aktualisierung das Ergebnis selbst prüfen.',
      ]}
      actions={
        <>
          <a
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="mailto:roadmap@jsd.bs.ch"
          >
            Roadmap-Team anschreiben
            <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
          </a>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/feedback"
          >
            Feature-Wunsch einreichen
          </Link>
        </>
      }
    >
      <section aria-labelledby="kanal-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Welcher Kanal passt?
            </p>
            <h2
              id="kanal-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Erst das Anliegen einordnen
            </h2>
          </div>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Eine eindeutige Zuordnung senkt die Wartezeit und verhindert, dass Informationen
            zwischen Teams verloren gehen.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
            <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
              <div
                className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              >
                <FiEdit3 className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
              </div>
              <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                E-Mail
              </span>
            </div>
            <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
              Roadmap-Inhalt
            </h3>
            <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
              Für neue Projekte, falsche Statusangaben, Termine, Verantwortliche, Texte, Links oder
              fehlende Projekte schreiben Sie an das Roadmap-Team.
            </p>
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
                Feedback-Seite
              </span>
            </div>
            <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
              Funktion der Anwendung
            </h3>
            <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
              Für neue Filter, Ansichten oder andere Produktideen nutzen Sie die Feedback-Seite.
              Dort können angemeldete Personen Wünsche sehen und bewerten.
            </p>
          </article>
          <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
            <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
              <div
                className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              >
                <FiShield className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
              </div>
              <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                Support
              </span>
            </div>
            <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
              Zugriff oder Störung
            </h3>
            <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
              Bei einer Fehlermeldung, einer Anmeldeschleife oder fehlendem Zugriff verwenden Sie
              die Support-Seite und nennen den genauen Wortlaut der Meldung.
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]" aria-labelledby="meldung-heading">
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] p-6 sm:p-8">
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Vor dem Absenden
          </p>
          <h2
            id="meldung-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            Diese Angaben ermöglichen eine eindeutige Prüfung
          </h2>
          <div className="ds-info-list [display:grid] [gap:var(--ds-space-3)] mt-6">
            {reportChecklist.map((item) => (
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
          aria-label="Vorlage für eine Meldung"
        >
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Kopiervorlage
          </p>
          <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Kurze, vollständige Nachricht
          </h3>
          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-7 text-slate-300">
            <p>Instanz: …</p>
            <p>Projekt/Link: …</p>
            <p>Aktueller Stand: …</p>
            <p>Gewünschte Änderung: …</p>
            <p>Quelle/Kontakt: …</p>
          </div>
        </aside>
      </section>

      <section aria-labelledby="ablauf-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Nach dem Absenden
            </p>
            <h2
              id="ablauf-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              So bleibt der weitere Ablauf nachvollziehbar
            </h2>
          </div>
        </div>
        <div className="ds-steps [display:grid] [gap:14px]">
          {[
            {
              title: 'Prüfung ermöglichen',
              copy: 'Das zuständige Team gleicht die Meldung mit der verantwortlichen Stelle ab. Bei fehlendem Kontext kann eine Rückfrage nötig sein.',
            },
            {
              title: 'Keine feste Frist voraussetzen',
              copy: 'Der Zeitpunkt der Aktualisierung hängt vom Umfang und von der fachlichen Freigabe ab. Dringlichkeit deshalb sachlich begründen.',
            },
            {
              title: 'Ergebnis kontrollieren',
              copy: 'Öffnen Sie nach der Rückmeldung die richtige Instanz neu und prüfen Sie Projekt-Detail, Zeitraum und Filterdarstellung.',
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
      </section>

      <section
        className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-support-panel [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-6)] [padding:32px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[align-items:flex-start] max-[1100px]:[flex-direction:column]"
        aria-labelledby="datenschutz-heading"
      >
        <div>
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Datenschutz
          </p>
          <h2
            id="datenschutz-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            Nur notwendige Informationen senden
          </h2>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Übermitteln Sie keine Passwörter, Zugangstokens oder besonders schützenswerte
            Personendaten. Verweisen Sie für vertrauliche Unterlagen auf den dafür vorgesehenen
            internen Ablageort, sofern die empfangende Person zugriffsberechtigt ist.
          </p>
        </div>
        <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%] ds-help-support-actions [flex:0_0_auto] [margin-top:0]">
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/support"
          >
            Support öffnen
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/help/faq"
          >
            Häufige Fragen
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default ProjekteMelden;
