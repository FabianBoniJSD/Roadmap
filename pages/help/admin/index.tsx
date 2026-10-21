import Link from 'next/link';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { FiArrowRight, FiFolder, FiSettings, FiShield, FiSliders } from 'react-icons/fi';
import HelpLayout from '@/components/HelpLayout';

const adminTopics = [
  {
    title: 'Projekte verwalten',
    description:
      'Projekte anlegen, Pflichtfelder verstehen, bestehende Inhalte aktualisieren und Änderungen kontrollieren.',
    href: '/help/admin/projekte-verwalten',
    icon: FiSliders,
  },
  {
    title: 'Kategorien verwalten',
    description:
      'Namen, Farben und Icons so pflegen, dass Nutzerinnen und Nutzer Bereiche schnell unterscheiden.',
    href: '/help/admin/kategorien-verwalten',
    icon: FiFolder,
  },
  {
    title: 'Einstellungen & Design',
    description:
      'Vorhandene Instanz-Einstellungen sicher bearbeiten und sichtbare Änderungen in der Roadmap prüfen.',
    href: '/help/admin/einstellungen-und-design',
    icon: FiSettings,
  },
  {
    title: 'Rechte & Zugang',
    description:
      'Microsoft SSO, Leserechte und instanzbezogene Admin-Rechte unterscheiden und gezielt vergeben.',
    href: '/help/admin/rechte-und-zugang',
    icon: FiShield,
  },
];

const AdminHelp = () => {
  return (
    <HelpLayout
      eyebrow="Admin-Handbuch"
      title="Eine Roadmap-Instanz sicher pflegen"
      description={
        <>
          Der Adminbereich wirkt unmittelbar auf die ausgewählte Roadmap. Prüfen Sie deshalb vor
          jeder Änderung die aktive Instanz, bearbeiten Sie jeweils eine Sache und kontrollieren Sie
          das Ergebnis anschließend in der öffentlichen Ansicht.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'Admin' }]}
      learningGoals={[
        'Vor jeder Änderung die aktive Instanz kontrollieren.',
        'Die passende Anleitung für Projekt, Kategorie, Einstellung oder Recht wählen.',
        'Änderungen nach dem Speichern in der Roadmap verifizieren.',
        'Löschen nur für nachweislich falsche Einträge verwenden.',
      ]}
      actions={
        <>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/admin"
          >
            Admin-Dashboard öffnen
            <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/roadmap"
          >
            Roadmap zur Kontrolle öffnen
          </Link>
        </>
      }
    >
      <section aria-labelledby="sicherer-ablauf-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Sicherer Standardablauf
            </p>
            <h2
              id="sicherer-ablauf-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Drei Kontrollen für jede Änderung
            </h2>
          </div>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Ein gleichbleibender Ablauf reduziert versehentliche Änderungen an der falschen Instanz
            und macht Fehler leichter rückgängig.
          </p>
        </div>
        <div className="ds-steps [display:grid] [gap:14px]">
          {[
            {
              title: 'Vorher: Kontext prüfen',
              copy: 'Kontrollieren Sie Instanz, Datensatz und fachliche Quelle. Bei Projekten mit „Read-only Spiegelung“ wechseln Sie zur Quellinstanz.',
            },
            {
              title: 'Währenddessen: gezielt ändern',
              copy: 'Ändern Sie nur die bestätigten Angaben. Prüfen Sie Pflichtfelder, Datum, Status und Schreibweise vor dem Speichern.',
            },
            {
              title: 'Nachher: Ergebnis ansehen',
              copy: 'Öffnen oder aktualisieren Sie die Roadmap, wählen Sie dieselbe Instanz und kontrollieren Sie Darstellung, Filter und Projekt-Detail.',
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

      <section aria-labelledby="themen-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Aufgabe auswählen
            </p>
            <h2
              id="themen-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Direkt zur passenden Anleitung
            </h2>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {adminTopics.map((topic) => (
            <Link
              key={topic.href}
              href={topic.href}
              className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] "
            >
              <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
                <div
                  className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                  aria-hidden="true"
                >
                  <topic.icon className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                </div>
              </div>
              <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
                {topic.title}
              </h3>
              <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
                {topic.description}
              </p>
              <span className="ds-help-link [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [margin-top:auto] [padding-top:24px] [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600]">
                Anleitung öffnen
                <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2" aria-label="Sicherheitsregeln">
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] p-6 sm:p-8">
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Vor dem Löschen
          </p>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Erst Alternativen prüfen
          </h2>
          <div className="ds-info-list [display:grid] [gap:var(--ds-space-3)] mt-5">
            <p className="ds-info-item [margin:0] [padding:16px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_72%,_transparent)] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.6]">
              Projektstatus aktualisieren, wenn das Vorhaben beendet ist.
            </p>
            <p className="ds-info-item [margin:0] [padding:16px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_72%,_transparent)] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.6]">
              Zuordnung korrigieren, bevor eine Kategorie entfernt wird.
            </p>
            <p className="ds-info-item [margin:0] [padding:16px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:color-mix(in_srgb,_var(--ds-bg-elevated-strong)_72%,_transparent)] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.6]">
              Löschen nur bei Dubletten oder irrtümlich angelegten Daten.
            </p>
          </div>
        </article>
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] p-6 sm:p-8">
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Bei Unsicherheit
          </p>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Änderung kurz unterbrechen
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Wenn Quelle, Zuständigkeit oder richtige Instanz unklar sind, speichern oder löschen Sie
            noch nicht. Klären Sie die fachliche Freigabe mit der verantwortlichen Person oder dem
            Roadmap-Team.
          </p>
          <Link
            className="ds-help-link [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [margin-top:auto] [padding-top:24px] [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600]"
            href="/support"
          >
            Support kontaktieren
            <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
          </Link>
        </article>
      </section>
    </HelpLayout>
  );
};

export default AdminHelp;
