import Link from 'next/link';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { FiArrowRight, FiCheckCircle, FiEdit3, FiTrash2 } from 'react-icons/fi';
import HelpLayout from '@/components/HelpLayout';

const projectSteps = [
  {
    title: 'Instanz und vorhandene Einträge prüfen',
    description:
      'Kontrollieren Sie die aktive Instanz und suchen Sie nach ähnlichen Projekten. So vermeiden Sie Dubletten und Änderungen am falschen Datenbestand.',
  },
  {
    title: '„Projekte“ und „Neues Projekt“ wählen',
    description:
      'Im Admin-Dashboard ist der Reiter „Projekte“ standardmäßig geöffnet. Bestehende Einträge lassen sich dort bearbeiten.',
  },
  {
    title: 'Projektart zuerst festlegen',
    description:
      'Kurzzeitprojekte benötigen weniger Pflichtangaben. Langzeitprojekte verlangen zusätzlich ausführlichere Angaben zur Verantwortung und Entwicklung.',
  },
  {
    title: 'Pflichtfelder und Datenlogik prüfen',
    description:
      'Titel, Beschreibung, Status, Startdatum, Enddatum und Kategorie sind erforderlich. Das Enddatum muss am oder nach dem Startdatum liegen.',
  },
  {
    title: 'Speichern und in der Roadmap kontrollieren',
    description:
      'Öffnen Sie anschließend dieselbe Instanz und prüfen Sie Titel, Kategorie, zeitliche Lage, Status und Projekt-Detail.',
  },
];

const ProjekteVerwalten = () => {
  return (
    <HelpLayout
      eyebrow="Admin-Handbuch"
      title="Projekte anlegen, aktualisieren und entfernen"
      description={
        <>
          Gute Projektdaten beantworten die wichtigsten Fragen ohne Rückfrage: Worum geht es, wann
          findet es statt, wer ist verantwortlich und wie ist der aktuelle Stand? Pflegen Sie nur
          bestätigte Informationen und kontrollieren Sie die sichtbare Darstellung nach dem
          Speichern.
        </>
      }
      breadcrumbs={[
        { label: 'Hilfe', href: '/help' },
        { label: 'Admin', href: '/help/admin' },
        { label: 'Projekte verwalten' },
      ]}
      learningGoals={[
        'Dubletten und Änderungen an der falschen Instanz vermeiden.',
        'Kurzzeit- und Langzeitprojekt korrekt unterscheiden.',
        'Pflichtfelder, optionale Details und Datumslogik verstehen.',
        'Abschließen, Spiegelung und Löschen sicher handhaben.',
      ]}
      actions={
        <>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/admin"
          >
            Projekte im Adminbereich öffnen
            <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/help/admin"
          >
            Zur Admin-Übersicht
          </Link>
        </>
      }
    >
      <section aria-labelledby="anlegen-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Neues Projekt
            </p>
            <h2
              id="anlegen-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              In fünf kontrollierten Schritten anlegen
            </h2>
          </div>
        </div>
        <div className="ds-steps [display:grid] [gap:14px]">
          {projectSteps.map((step) => (
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
      </section>

      <section className="grid gap-5 md:grid-cols-2" aria-label="Projektarten">
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
          <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
            <div
              className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiCheckCircle className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Weniger Pflichtfelder
            </span>
          </div>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Kurzzeitprojekt
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Geeignet für kompakte Vorhaben. Projektleitung, Budget, Phase, Rückblick und Ausblick
            können optional ergänzt werden. Verwenden Sie diese Art nicht nur, um fehlende Angaben
            bei einem langfristigen Projekt zu umgehen.
          </p>
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
              Erweiterte Pflichtfelder
            </span>
          </div>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Langzeitprojekt
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Erfordert zusätzlich Projektleitung, Budget, „Bisher“, „In Zukunft“ und geplante
            Umsetzung. Phase, Meilenstein, Team, Links, Badges und weitere Felder erhöhen die
            Aussagekraft, wenn sie aktuell gehalten werden.
          </p>
        </article>
      </section>

      <section aria-labelledby="aktualisieren-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Bestehendes Projekt
            </p>
            <h2
              id="aktualisieren-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Gezielt aktualisieren statt alles neu erfassen
            </h2>
          </div>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Ändern Sie zuerst die Informationen, die Nutzende für Entscheidungen brauchen: Status,
            Zeitraum, Fortschritt, Phase, Meilenstein und Verantwortung.
          </p>
        </div>
        <div className="ds-help-list [display:grid] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-xl)] [background:var(--ds-bg-elevated)] ">
          <div className="ds-help-list-item [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [gap:var(--ds-space-4)] [padding:22px_24px] [color:var(--ds-text-default)] [transition:background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] [&+.ds-help-list-item]:[border-top:1px_solid_var(--ds-border-default)] hover:[background:var(--ds-bg-soft)] hover:[color:var(--ds-text-strong)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:1rem] [&_h3]:[font-weight:600] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--ds-text-muted)] [&_p]:[font-size:0.875rem] [&_p]:[line-height:1.55] max-[760px]:[grid-template-columns:1fr]">
            <div
              className="ds-help-list-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiEdit3 className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <div>
              <h3>Bearbeiten</h3>
              <p>
                Wählen Sie in der Projektliste „Bearbeiten“. Prüfen Sie vor dem Speichern, ob Datum,
                Status und Fortschritt zusammenpassen und Links weiterhin erreichbar sind.
              </p>
            </div>
          </div>
          <div className="ds-help-list-item [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [gap:var(--ds-space-4)] [padding:22px_24px] [color:var(--ds-text-default)] [transition:background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] [&+.ds-help-list-item]:[border-top:1px_solid_var(--ds-border-default)] hover:[background:var(--ds-bg-soft)] hover:[color:var(--ds-text-strong)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:1rem] [&_h3]:[font-weight:600] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--ds-text-muted)] [&_p]:[font-size:0.875rem] [&_p]:[line-height:1.55] max-[760px]:[grid-template-columns:1fr]">
            <div
              className="ds-help-list-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiCheckCircle className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <div>
              <h3>Abschließen</h3>
              <p>
                Setzen Sie regulär beendete Projekte auf „Abgeschlossen“ und den Fortschritt auf 100
                %. Dadurch bleibt der Projektverlauf sichtbar und auffindbar.
              </p>
            </div>
          </div>
          <div className="ds-help-list-item [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [gap:var(--ds-space-4)] [padding:22px_24px] [color:var(--ds-text-default)] [transition:background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] [&+.ds-help-list-item]:[border-top:1px_solid_var(--ds-border-default)] hover:[background:var(--ds-bg-soft)] hover:[color:var(--ds-text-strong)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:1rem] [&_h3]:[font-weight:600] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--ds-text-muted)] [&_p]:[font-size:0.875rem] [&_p]:[line-height:1.55] max-[760px]:[grid-template-columns:1fr]">
            <div
              className="ds-help-list-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiTrash2 className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <div>
              <h3>Löschen</h3>
              <p>
                Verwenden Sie „Löschen“ nur für Dubletten oder irrtümliche Einträge. Nach der
                Sicherheitsabfrage wird das Projekt entfernt; die Oberfläche bietet keine
                Wiederherstellung an.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-support-panel [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-6)] [padding:32px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[align-items:flex-start] max-[1100px]:[flex-direction:column]"
        aria-labelledby="spiegel-heading"
      >
        <div>
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Read-only Spiegelung
          </p>
          <h2
            id="spiegel-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            Gespiegelte Projekte in der Quellinstanz pflegen
          </h2>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Unter „Sichtbarkeit und Badges“ wählen Sie die Roadmaps aus, in denen ein Projekt
            schreibgeschützt erscheinen soll. Sie sehen dabei auch mögliche Ziele, auf die Sie
            selbst keinen direkten Zugriff haben. Bei einem gespiegelten Projekt zeigt die
            Adminliste „Read-only Spiegelung“. Änderungen nehmen Sie immer in der im Projekt-Detail
            genannten Quellinstanz vor. Falls Ihnen dort die Berechtigung fehlt, wenden Sie sich an
            deren zuständige Administration.
          </p>
        </div>
        <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%] ds-help-support-actions [flex:0_0_auto] [margin-top:0]">
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/roadmap"
          >
            Ergebnis prüfen
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/help/projekte-melden"
          >
            Korrektur melden
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default ProjekteVerwalten;
