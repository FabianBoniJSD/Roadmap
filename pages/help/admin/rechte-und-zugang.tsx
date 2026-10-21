import Link from 'next/link';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { FiArrowRight, FiEye, FiLock, FiShield, FiUserCheck } from 'react-icons/fi';
import HelpLayout from '@/components/HelpLayout';

const accessLevels = [
  {
    title: 'Lesender Zugriff',
    description:
      'Die Sichtbarkeit einer Roadmap kann anhand der für die Instanz freigegebenen Abteilungen gesteuert werden. Leserechte erlauben keine Pflege im Adminbereich.',
    icon: FiEye,
  },
  {
    title: 'Instanz-Admin',
    description:
      'Darf die betreffende Instanz administrieren. Die Berechtigung kann über die Admin-Liste der Instanz oder eine konfigurierte Admin-Gruppe entstehen.',
    icon: FiUserCheck,
  },
  {
    title: 'Superadmin',
    description:
      'Besitzt weitergehende Rechte über Instanzen hinweg. Diese Rolle ist nicht für die gewöhnliche Projektpflege vorgesehen.',
    icon: FiShield,
  },
];

const RechteUndZugang = () => {
  return (
    <HelpLayout
      eyebrow="Admin-Handbuch"
      title="Rechte und Zugang nachvollziehbar verwalten"
      description={
        <>
          Die Anmeldung erfolgt über Microsoft SSO. Danach prüft die Anwendung, welche Instanzen
          eine Person sehen oder administrieren darf. Vergeben Sie nur die kleinste benötigte
          Berechtigung und prüfen Sie regelmäßig, ob sie weiterhin erforderlich ist.
        </>
      }
      breadcrumbs={[
        { label: 'Hilfe', href: '/help' },
        { label: 'Admin', href: '/help/admin' },
        { label: 'Rechte & Zugang' },
      ]}
      learningGoals={[
        'Microsoft-Anmeldung und eigentliche Berechtigung unterscheiden.',
        'Leserecht, Instanz-Admin und Superadmin korrekt einordnen.',
        'Eine Person gezielt als Admin der aktiven Instanz hinzufügen.',
        'Fehlenden Zugriff mit aussagekräftigen Angaben melden.',
      ]}
      actions={
        <>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/admin/login"
          >
            Microsoft-Anmeldung öffnen
            <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/support"
          >
            Zugriffsproblem melden
          </Link>
        </>
      }
    >
      <section aria-labelledby="modell-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Berechtigungsmodell
            </p>
            <h2
              id="modell-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Anmeldung allein gibt noch keine Admin-Rechte
            </h2>
          </div>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Microsoft SSO bestätigt die Identität. Erst die anschließende Rollen- und Instanzprüfung
            entscheidet über den tatsächlichen Zugriff.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {accessLevels.map((level) => (
            <article
              key={level.title}
              className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] "
            >
              <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
                <div
                  className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
                  aria-hidden="true"
                >
                  <level.icon className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                </div>
              </div>
              <h3 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
                {level.title}
              </h3>
              <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
                {level.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="vergeben-heading">
        <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
          <div>
            <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
              Instanz-Admin hinzufügen
            </p>
            <h2
              id="vergeben-heading"
              className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
            >
              Zugriff gezielt für eine Instanz vergeben
            </h2>
          </div>
        </div>
        <div className="ds-steps [display:grid] [gap:14px]">
          {[
            {
              title: 'Bedarf und Instanz klären',
              copy: 'Bestätigen Sie, dass die Person Inhalte wirklich pflegen muss und für welche konkrete Instanz die Berechtigung benötigt wird.',
            },
            {
              title: 'Admin-Dashboard der Zielinstanz öffnen',
              copy: 'Kontrollieren Sie die Anzeige „Aktive Instanz“. Eine Berechtigung in der falschen Instanz löst das Zugriffsproblem nicht.',
            },
            {
              title: 'Person im Benutzerfeld auswählen',
              copy: 'Suchen Sie unter „Instanz-Admins“ nach der Person und wählen Sie den passenden SharePoint-Benutzereintrag aus.',
            },
            {
              title: 'Zugriff gemeinsam prüfen',
              copy: 'Die Person meldet sich mit Microsoft SSO an und öffnet die Zielinstanz. Prüfen Sie, ob Admin-Dashboard und Bearbeitungsaktionen verfügbar sind.',
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
        <div className="ds-note [display:grid] [grid-template-columns:48px_1fr] [align-items:center] [gap:var(--ds-space-4)] [margin-top:18px] [padding:18px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)]">
          <span
            className="ds-note-icon [display:grid] [width:40px] [height:40px] [place-items:center] [border:1px_solid_var(--ds-border-strong)] [border-radius:50%] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)] [font-weight:600]"
            aria-hidden="true"
          >
            i
          </span>
          <p className="ds-step-copy [margin:0] [color:var(--ds-text-default)] [font-size:0.875rem] [line-height:1.55]">
            Entfernen Sie nicht mehr benötigte Instanz-Admins über „Entfernen“. Die Anwendung fragt
            vor dem Entfernen nochmals nach einer Bestätigung.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2" aria-label="Anmeldung und Fehlerhilfe">
        <article className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-card [display:flex] [min-height:278px] [flex-direction:column] [padding:24px] [border-radius:var(--ds-radius-xl)] [transition:transform_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] ">
          <div className="ds-help-card-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)] [margin-bottom:24px]">
            <div
              className="ds-help-card-icon [display:grid] [width:44px] [height:44px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:15px] [background:var(--ds-accent-soft)] [color:var(--ds-accent-strong)]"
              aria-hidden="true"
            >
              <FiLock className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
            </div>
          </div>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Sicher anmelden
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Nutzen Sie Ihr persönliches Microsoft-Konto. Teilen Sie keine Sitzung, kein Passwort und
            keinen Zugangstoken. Wird das Anmelde-Popup blockiert, erlauben Sie Popups für diese
            Website und versuchen Sie es erneut.
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
          </div>
          <h2 className="ds-help-card-title [margin:0] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [letter-spacing:-0.02em]">
            Zugriffsfehler eingrenzen
          </h2>
          <p className="ds-help-card-copy [margin:14px_0_0] [color:var(--ds-text-default)] [font-size:0.9rem] [line-height:1.65]">
            Nennen Sie dem Support Ihre geschäftliche Benutzerkennung, die betroffene Instanz, den
            aufgerufenen Link und den exakten Meldungstext. Senden Sie niemals Kennwörter oder
            Tokens mit.
          </p>
        </article>
      </section>

      <section
        className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-support-panel [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-6)] [padding:32px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[align-items:flex-start] max-[1100px]:[flex-direction:column]"
        aria-labelledby="prinzip-heading"
      >
        <div>
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Minimalprinzip
          </p>
          <h2
            id="prinzip-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            So viel Zugriff wie nötig, so wenig wie möglich
          </h2>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Lesender Zugriff reicht, wenn eine Person Roadmaps nur ansehen muss. Admin-Rechte sind
            für aktive Pflegeaufgaben gedacht und sollten bei Rollenwechsel oder Aufgabenende
            zeitnah entfernt werden.
          </p>
        </div>
        <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%] ds-help-support-actions [flex:0_0_auto] [margin-top:0]">
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/admin"
          >
            Admin-Liste prüfen
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/help/faq"
          >
            Zugriffs-FAQ
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default RechteUndZugang;
