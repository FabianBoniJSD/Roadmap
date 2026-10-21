import Link from 'next/link';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { FiArrowRight, FiEye, FiFilter, FiSearch } from 'react-icons/fi';
import HelpLayout from '@/components/HelpLayout';

const findSteps = [
  {
    title: 'Passende Instanz öffnen',
    description:
      'Wählen Sie zuerst die Roadmap-Instanz Ihres Bereichs. So beziehen sich Suche und Filter auf den richtigen Datenbestand.',
  },
  {
    title: 'Suche oder Filter einsetzen',
    description:
      'Suchen Sie nach einem Begriff oder grenzen Sie die Treffer nach Kategorien, Status, Projektart, Zeitraum und weiteren Merkmalen ein.',
  },
  {
    title: 'Ansicht passend zur Frage wählen',
    description:
      'Nutzen Sie den Zeitstrahl für die zeitliche Einordnung und Kacheln für einen kompakten Projektvergleich.',
  },
  {
    title: 'Projekt öffnen',
    description:
      'Klicken oder tippen Sie auf ein Projekt, um Beschreibung, Verantwortliche, Phase, Meilenstein, Links und Anhänge zu sehen.',
  },
];

const ProjekteAnsehen = () => {
  return (
    <HelpLayout
      title="Projekte gezielt finden und verstehen"
      description={
        <>
          Starten Sie mit Ihrer konkreten Frage: Suchen Sie ein bekanntes Projekt, laufende Vorhaben
          oder einen Überblick über ein Jahr? Die folgenden Schritte führen ohne Umwege zur
          passenden Ansicht.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'Projekte ansehen' }]}
      learningGoals={[
        'Die richtige Instanz und das gewünschte Jahr auswählen.',
        'Suche und Filter gezielt kombinieren und wieder zurücksetzen.',
        'Zeitstrahl, Kacheln und Projekt-Details passend einsetzen.',
        'Eine gefilterte Ansicht per URL weitergeben.',
      ]}
      actions={
        <>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/roadmap"
          >
            Roadmap öffnen
            <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/help/erste-schritte"
          >
            Grundlagen ansehen
          </Link>
        </>
      }
    >
      <section aria-labelledby="finden-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Schritt für Schritt
            </p>
            <h2
              id="finden-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Vom Anliegen zum passenden Projekt
            </h2>
          </div>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Arbeiten Sie von grob nach fein. Das reduziert unnötige Filterkombinationen und macht
            fehlende Treffer leichter nachvollziehbar.
          </p>
        </div>
        <div className="ds-steps [display:grid] [gap:14px]">
          {findSteps.map((step) => (
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

      <section className="grid gap-5 md:grid-cols-2" aria-label="Suche und Filter">
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
          <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
            <div
              className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiSearch className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Bekanntes Projekt
            </span>
          </div>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Mit einem Begriff suchen
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Die Suche prüft Titel, Beschreibung, Projektleitung, nächsten Meilenstein, Tags und
            Teammitglieder. Beginnen Sie mit einem markanten Wort; ergänzen Sie erst danach Filter.
          </p>
          <div className="ds-note [display:grid] [grid-template-columns:48px_1fr] [align-items:center] [gap:var(--ds-space-4)] [margin-top:18px] [padding:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)]">
            <span
              className="ds-note-icon [display:grid] [width:40px] [height:40px] [place-items:center] [border:1px_solid_var(--ds-border-strong)] [border-radius:50%] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)] [font-weight:600]"
              aria-hidden="true"
            >
              i
            </span>
            <p className="ds-step-copy [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
              Weniger ist oft mehr: „Portal“ liefert eher einen Treffer als ein vollständiger
              Projekttitel mit abweichender Schreibweise.
            </p>
          </div>
        </article>

        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
          <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
            <div
              className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiFilter className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <span className="ds-help-card-badge [display:inline-flex] [align-items:center] [min-height:30px] [padding-inline:10px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-pill)] [background:var(--ds-bg-soft)] [color:var(--ds-text-muted)] [font-size:0.6875rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Überblick
            </span>
          </div>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Mit Filtern eingrenzen
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Öffnen Sie „Erweiterte Filter“. Verfügbar sind unter anderem Projektart, Fortschritt,
            Status, Phase, Leitung, Tags, Badges, Monate und „Nur laufende Projekte“. Aktive Filter
            erscheinen als Chips und lassen sich einzeln entfernen.
          </p>
          <div className="ds-note [display:grid] [grid-template-columns:48px_1fr] [align-items:center] [gap:var(--ds-space-4)] [margin-top:18px] [padding:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)]">
            <span
              className="ds-note-icon [display:grid] [width:40px] [height:40px] [place-items:center] [border:1px_solid_var(--ds-border-strong)] [border-radius:50%] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)] [font-weight:600]"
              aria-hidden="true"
            >
              ↺
            </span>
            <p className="ds-step-copy [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
              Bei unerwartet wenigen Treffern zuerst „Alle Filter zurücksetzen“ wählen und dann
              jeweils nur einen Filter ergänzen.
            </p>
          </div>
        </article>
      </section>

      <section aria-labelledby="ansichten-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Ansichten richtig lesen
            </p>
            <h2
              id="ansichten-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Dieselben Projekte, ein anderer Fokus
            </h2>
          </div>
        </div>
        <div className="ds-help-list [display:grid] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-xl)] [background:var(--ds-bg-elevated)] ">
          <div className="ds-help-list-item [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [gap:var(--ds-space-4)] [padding:22px_24px] [color:var(--ds-text-default)] [transition:background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] [&+.ds-help-list-item]:[border-top:1px_solid_var(--ds-border-default)] hover:[background:var(--ds-bg-soft)] hover:[color:var(--ds-text-strong)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:1rem] [&_h3]:[font-weight:600] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--ds-text-muted)] [&_p]:[font-size:0.875rem] [&_p]:[line-height:1.55] max-[760px]:[grid-template-columns:1fr]">
            <div
              className="ds-help-list-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiEye className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <div>
              <h3>Zeitstrahl</h3>
              <p>
                Zeigt Projekte nach Kategorie und zeitlicher Lage. Wechseln Sie je nach benötigter
                Genauigkeit zwischen Quartalen, Monaten, Wochen und Jahren.
              </p>
            </div>
          </div>
          <div className="ds-help-list-item [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [gap:var(--ds-space-4)] [padding:22px_24px] [color:var(--ds-text-default)] [transition:background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] [&+.ds-help-list-item]:[border-top:1px_solid_var(--ds-border-default)] hover:[background:var(--ds-bg-soft)] hover:[color:var(--ds-text-strong)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:1rem] [&_h3]:[font-weight:600] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--ds-text-muted)] [&_p]:[font-size:0.875rem] [&_p]:[line-height:1.55] max-[760px]:[grid-template-columns:1fr]">
            <div
              className="ds-help-list-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiEye className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <div>
              <h3>Kachelansicht</h3>
              <p>
                Zeigt kompakte Angaben wie Zeitraum, Badges, Fortschritt sowie die Anzahl von Links
                und Teammitgliedern. Sie eignet sich zum schnellen Vergleich.
              </p>
            </div>
          </div>
          <div className="ds-help-list-item [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [gap:var(--ds-space-4)] [padding:22px_24px] [color:var(--ds-text-default)] [transition:background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] [&+.ds-help-list-item]:[border-top:1px_solid_var(--ds-border-default)] hover:[background:var(--ds-bg-soft)] hover:[color:var(--ds-text-strong)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:1rem] [&_h3]:[font-weight:600] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--ds-text-muted)] [&_p]:[font-size:0.875rem] [&_p]:[line-height:1.55] max-[760px]:[grid-template-columns:1fr]">
            <div
              className="ds-help-list-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiEye className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
            <div>
              <h3>Projekt-Detail</h3>
              <p>
                Enthält den vollständigen Kontext. Leere Bereiche bedeuten, dass für dieses Projekt
                noch keine entsprechende Angabe hinterlegt wurde.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-support-panel [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-6)] [padding:32px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[align-items:flex-start] max-[1100px]:[flex-direction:column]"
        aria-labelledby="teilen-heading"
      >
        <div>
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Teilen & Fehler lösen
          </p>
          <h2
            id="teilen-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            Ansicht weitergeben oder fehlende Daten melden
          </h2>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Suche, Filter, Kategorien und Kachelansicht werden in der URL gespeichert. Kopieren Sie
            deshalb nach dem Filtern die vollständige Browseradresse. Fehlt ein Projekt trotz
            zurückgesetzter Filter, melden Sie die Instanz und den erwarteten Projektnamen.
          </p>
        </div>
        <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%] ds-help-support-actions [flex:0_0_auto] [margin-top:0]">
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/help/projekte-melden"
          >
            Inhalt melden
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/docs/funktionen/roadmap"
          >
            Technische Details
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default ProjekteAnsehen;
