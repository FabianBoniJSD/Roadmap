import Link from 'next/link';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { FiArrowRight, FiEdit3, FiEye, FiSettings } from 'react-icons/fi';
import HelpLayout from '@/components/HelpLayout';

const visibleSettings = [
  {
    key: 'siteTitle',
    effect: 'Legt den Titel im Kopf der Roadmap fest.',
    example: 'Digitalisierungs-Roadmap',
  },
  {
    key: 'gradientFrom',
    effect: 'Bestimmt die erste Farbe des Titelverlaufs.',
    example: '#eab308',
  },
  {
    key: 'gradientTo',
    effect: 'Bestimmt die zweite Farbe des Titelverlaufs.',
    example: '#b45309',
  },
];

const EinstellungenUndDesign = () => {
  return (
    <HelpLayout
      eyebrow="Admin-Handbuch"
      title="Einstellungen und sichtbares Design pflegen"
      description={
        <>
          Der Reiter „Einstellungen“ zeigt Schlüssel und Rohwerte der aktiven Instanz. Es gibt dort
          keine Vorschau und keine automatische Prüfung aller Werte. Dokumentieren Sie deshalb den
          bisherigen Wert, ändern Sie gezielt und kontrollieren Sie die Roadmap nach dem Speichern.
        </>
      }
      breadcrumbs={[
        { label: 'Hilfe', href: '/help' },
        { label: 'Admin', href: '/help/admin' },
        { label: 'Einstellungen & Design' },
      ]}
      learningGoals={[
        'Nur die Einstellung der aktiven Instanz bearbeiten.',
        'Sichtbar verwendete Schlüssel und ihr Format erkennen.',
        'Vorhandenen Wert vor einer Änderung sichern.',
        'Titel und Farbverlauf nach dem Speichern neu laden und prüfen.',
      ]}
      actions={
        <>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/admin"
          >
            Einstellungen im Adminbereich öffnen
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
      <section aria-labelledby="ablauf-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Sicher bearbeiten
            </p>
            <h2
              id="ablauf-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Eine Einstellung, eine Kontrolle
            </h2>
          </div>
        </div>
        <div className="ds-steps [display:grid] [gap:14px]">
          {[
            {
              title: 'Aktive Instanz bestätigen',
              copy: 'Prüfen Sie im Admin-Dashboard, welche Roadmap-Instanz aktiv ist. Einstellungen gelten instanzbezogen.',
            },
            {
              title: 'Bisherigen Wert festhalten',
              copy: 'Kopieren Sie Schlüssel und aktuellen Wert in Ihre Änderungsnotiz. Das erleichtert eine manuelle Rückkehr zum vorherigen Stand.',
            },
            {
              title: '„Bearbeiten“, Wert ändern und speichern',
              copy: 'Achten Sie auf exakte Schreibweise. Bei Farben ist ein vollständiger Hex-Wert im Format #RRGGBB die sicherste Eingabe.',
            },
            {
              title: 'Roadmap neu laden und vergleichen',
              copy: 'Öffnen oder aktualisieren Sie dieselbe Instanz. Prüfen Sie Desktop und Mobilansicht sowie die Lesbarkeit des Titels.',
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

      <section aria-labelledby="schluessel-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Sichtbare Wirkung
            </p>
            <h2
              id="schluessel-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Diese Werte nutzt der Roadmap-Kopf
            </h2>
          </div>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Bearbeiten Sie nur Schlüssel, deren Zweck Sie kennen. Weitere Einträge können technische
            Funktionen steuern und gehören nicht zu einer rein visuellen Anpassung.
          </p>
        </div>
        <div className="ds-help-list [display:grid] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-xl)] [background:var(--ds-bg-elevated)] ">
          {visibleSettings.map((setting) => (
            <div
              key={setting.key}
              className="ds-help-list-item [display:grid] [grid-template-columns:auto_minmax(0,_1fr)_auto] [align-items:center] [gap:var(--ds-space-4)] [padding:22px_24px] [color:var(--ds-text-default)] [transition:background_var(--ds-duration-fast)_var(--ds-ease-out),_color_var(--ds-duration-fast)_var(--ds-ease-out)] [&+.ds-help-list-item]:[border-top:1px_solid_var(--ds-border-default)] hover:[background:var(--ds-bg-soft)] hover:[color:var(--ds-text-strong)] [&_h3]:[margin:0] [&_h3]:[color:var(--ds-text-strong)] [&_h3]:[font-size:1rem] [&_h3]:[font-weight:600] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--ds-text-muted)] [&_p]:[font-size:0.875rem] [&_p]:[line-height:1.55] max-[760px]:[grid-template-columns:1fr]"
            >
              <div
                className="ds-help-list-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                aria-hidden="true"
              >
                <FiSettings className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
              </div>
              <div>
                <h3>{setting.key}</h3>
                <p>
                  {setting.effect} Beispiel: <code>{setting.example}</code>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2" aria-label="Designprüfung">
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
          <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
            <div
              className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiEdit3 className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
          </div>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Titel verständlich formulieren
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Nennen Sie Bereich oder Zweck so, dass Personen die Instanz sofort einordnen können.
            Vermeiden Sie lange Slogans, unbekannte Abkürzungen und wechselnde Begriffe für dasselbe
            Portfolio.
          </p>
        </article>
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
          <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
            <div
              className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiEye className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
          </div>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Farbverlauf lesbar halten
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Die Farben werden auf den Titeltext angewendet. Wählen Sie deshalb zwei ausreichend
            helle, unterscheidbare Werte und prüfen Sie den gesamten Titel auf dem dunklen
            Hintergrund – auch bei kleiner Bildschirmbreite.
          </p>
        </article>
      </section>

      <section
        className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-support-panel [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-6)] [padding:32px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[align-items:flex-start] max-[1100px]:[flex-direction:column]"
        aria-labelledby="fehler-heading"
      >
        <div>
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Wenn die Änderung nicht erscheint
          </p>
          <h2
            id="fehler-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            Instanz, Wert und Neuladen prüfen
          </h2>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Kontrollieren Sie zuerst, ob Sie dieselbe Instanz ansehen. Laden Sie die Roadmap neu und
            vergleichen Sie den gespeicherten Wert. Bei einem ungültigen oder unlesbaren Ergebnis
            setzen Sie den zuvor notierten Wert wieder ein und holen technische Unterstützung.
          </p>
        </div>
        <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%] ds-help-support-actions [flex:0_0_auto] [margin-top:0]">
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/roadmap"
          >
            Darstellung prüfen
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/support"
          >
            Support kontaktieren
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default EinstellungenUndDesign;
