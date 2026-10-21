import Link from 'next/link';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import { FiArrowRight, FiHelpCircle } from 'react-icons/fi';
import HelpLayout from '@/components/HelpLayout';

type Question = {
  question: string;
  answer: string;
  link?: { label: string; href: string };
};

const groups: Array<{ id: string; title: string; questions: Question[] }> = [
  {
    id: 'orientierung-inhalte',
    title: 'Orientierung und Inhalte',
    questions: [
      {
        question: 'Was zeigt die Roadmap?',
        answer:
          'Eine Roadmap-Instanz bündelt die für ihren Bereich gepflegten Projekte. Je nach Datenlage sehen Sie unter anderem Zeitraum, Status, Fortschritt, Phase, Verantwortliche, Meilensteine, Links und Anhänge.',
      },
      {
        question: 'Warum sehe ich andere Projekte als eine Kollegin oder ein Kollege?',
        answer:
          'Prüfen Sie zuerst die ausgewählte Instanz, das Jahr und aktive Filter. Zusätzlich kann die Sichtbarkeit einer Instanz von Ihrer Abteilung oder einer expliziten Freigabe abhängen.',
        link: { label: 'Projekte finden und filtern', href: '/help/projekte-ansehen' },
      },
      {
        question: 'Was bedeutet „Read-only Spiegelung“?',
        answer:
          'Das Projekt stammt aus einer anderen Roadmap-Instanz und wird in der aktuellen Instanz nur angezeigt. Bearbeitet wird es in seiner Quellinstanz; deshalb stehen hier keine Bearbeitungsaktionen zur Verfügung.',
      },
      {
        question: 'Warum fehlen in einem Projekt einzelne Angaben?',
        answer:
          'Nicht jedes Feld ist für jedes Projekt befüllt. Insbesondere Kurzzeitprojekte können bewusst weniger Detailangaben enthalten. Ein leerer Bereich ist daher nicht automatisch ein technischer Fehler.',
      },
    ],
  },
  {
    id: 'suche-darstellung',
    title: 'Suche und Darstellung',
    questions: [
      {
        question: 'Wie finde ich ein bestimmtes Projekt?',
        answer:
          'Beginnen Sie mit einem eindeutigen Stichwort. Die Suche berücksichtigt neben Titel und Beschreibung auch Projektleitung, Meilenstein, Tags und Teammitglieder. Grenzen Sie die Treffer anschließend mit wenigen Filtern ein.',
        link: { label: 'Anleitung zur Roadmap', href: '/help/projekte-ansehen' },
      },
      {
        question: 'Warum zeigt die Suche keine Treffer?',
        answer:
          'Wählen Sie zunächst „Alle Filter zurücksetzen“, kontrollieren Sie Instanz und Jahr und versuchen Sie einen kürzeren Suchbegriff. Prüfen Sie auch, ob „Nur laufende Projekte“ oder ein enger Monatsbereich aktiv ist.',
      },
      {
        question: 'Welche Ansicht sollte ich verwenden?',
        answer:
          'Der Zeitstrahl beantwortet vor allem die Frage „Wann findet etwas statt?“. Die Kacheln erleichtern den kompakten Vergleich von Projekten. Für den vollständigen Kontext öffnen Sie das Projekt-Detail.',
      },
      {
        question: 'Kann ich eine gefilterte Ansicht teilen?',
        answer:
          'Ja. Suche, Filter, Kategorien und die Kachelansicht werden in der URL abgebildet. Kopieren Sie die vollständige Browseradresse, nachdem die gewünschte Ansicht sichtbar ist.',
      },
    ],
  },
  {
    id: 'zugang-support',
    title: 'Zugang, Änderungen und Support',
    questions: [
      {
        question: 'Warum erhalte ich „Kein Zugriff“?',
        answer:
          'Die Sichtbarkeit wird pro Instanz gesteuert. Vergewissern Sie sich, dass Sie die richtige Instanz geöffnet und sich mit dem vorgesehenen Microsoft-Konto angemeldet haben. Bleibt die Meldung bestehen, senden Sie dem Support den Instanznamen und den Wortlaut der Meldung.',
        link: { label: 'Rechte und Zugang', href: '/help/admin/rechte-und-zugang' },
      },
      {
        question: 'Wie erhalte ich Admin-Rechte?',
        answer:
          'Admin-Rechte entstehen über die Admin-Liste der Instanz, eine konfigurierte Admin-Gruppe oder eine Superadmin-Rolle. Eine bestehende Administratorin oder ein bestehender Administrator kann Sie für die betreffende Instanz hinzufügen.',
        link: { label: 'Admin-Zugang verstehen', href: '/help/admin/rechte-und-zugang' },
      },
      {
        question: 'Wie melde ich eine falsche Projektangabe?',
        answer:
          'Schreiben Sie dem Roadmap-Team und nennen Sie Instanz, Projektlink, aktuellen Stand, gewünschte Änderung und die fachlich zuständige Kontaktperson. Für Feature-Wünsche der Anwendung nutzen Sie stattdessen die Feedback-Seite.',
        link: { label: 'Inhalte richtig melden', href: '/help/projekte-melden' },
      },
      {
        question: 'Was hilft bei einer Anmeldeschleife oder abgelaufenen Sitzung?',
        answer:
          'Öffnen Sie die Anmeldung erneut und wählen Sie „Status erneut prüfen“. Falls ein Popup blockiert wird, erlauben Sie Popups für diese Website. Bleibt das Problem bestehen, nennen Sie dem Support Browser, Instanz und genaue Fehlermeldung.',
      },
    ],
  },
];

const FAQ = () => {
  return (
    <HelpLayout
      title="Häufige Fragen und schnelle Lösungen"
      description={
        <>
          Suchen Sie zuerst nach dem Bereich, der zu Ihrer Situation passt. Jede Antwort nennt den
          nächsten sinnvollen Schritt, ohne technisches Vorwissen vorauszusetzen.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'FAQ' }]}
      learningGoals={[
        'Abweichende oder fehlende Projekte systematisch erklären.',
        'Probleme mit Suche und Filtern selbst beheben.',
        'Zugriffs- und Anmeldeprobleme richtig einordnen.',
        'Inhaltskorrektur, Feature-Wunsch und Support unterscheiden.',
      ]}
      actions={
        <>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/help/erste-schritte"
          >
            Mit den Grundlagen starten
            <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/support"
          >
            Support kontaktieren
          </Link>
        </>
      }
    >
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`faq-${group.id}`}>
          <div className="ds-section-header [display:flex] [align-items:end] [justify-content:space-between] [gap:var(--ds-space-6)] [margin-bottom:24px]">
            <div>
              <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                FAQ
              </p>
              <h2
                id={`faq-${group.id}`}
                className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
              >
                {group.title}
              </h2>
            </div>
          </div>
          <div className="space-y-4">
            {group.questions.map((entry) => (
              <details
                key={entry.question}
                className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] group p-6 open:border-sky-500/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white sm:text-lg">
                  <span>{entry.question}</span>
                  <FiHelpCircle
                    className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem] shrink-0 text-sky-300 transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{entry.answer}</p>
                {entry.link && (
                  <Link
                    className="ds-help-link [display:inline-flex] [align-items:center] [gap:var(--ds-space-2)] [margin-top:auto] [padding-top:24px] [color:var(--ds-accent-strong)] [font-size:0.8125rem] [font-weight:600]"
                    href={entry.link.href}
                  >
                    {entry.link.label}
                    <FiArrowRight className="ds-icon-sm [flex:0_0_auto] [width:1rem] [height:1rem]" />
                  </Link>
                )}
              </details>
            ))}
          </div>
        </section>
      ))}

      <section
        className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-help-support-panel [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-6)] [padding:32px] [border-radius:var(--ds-radius-xl)] max-[1100px]:[align-items:flex-start] max-[1100px]:[flex-direction:column]"
        aria-labelledby="support-heading"
      >
        <div>
          <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
            Noch offen?
          </p>
          <h2
            id="support-heading"
            className="ds-section-title [margin:0] [color:var(--ds-text-strong)] [font-size:2rem] [letter-spacing:-0.04em]"
          >
            Eine gute Supportanfrage spart Rückfragen
          </h2>
          <p className="ds-section-copy [max-width:620px] [margin:10px_0_0] [color:var(--ds-text-muted)] [line-height:1.65]">
            Nennen Sie Instanz, Seite oder Projektlink, den gewünschten Ablauf, den tatsächlich
            beobachteten Ablauf und die genaue Fehlermeldung. Senden Sie keine Passwörter oder
            Zugangstokens.
          </p>
        </div>
        <div className="ds-actions [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)] [margin-top:30px] max-[760px]:[&_.ds-button]:[width:100%] ds-help-support-actions [flex:0_0_auto] [margin-top:0]">
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-primary [background:var(--ds-accent)] [color:var(--ds-text-inverse)]"
            href="/support"
          >
            Support-Seite öffnen
          </Link>
          <Link
            className="ds-button [display:inline-flex] [min-height:54px] [align-items:center] [justify-content:center] [gap:10px] [padding-inline:22px] [border:1px_solid_transparent] [border-radius:16px] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_box-shadow_var(--ds-duration-base)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out)] active:[transform:translateY(0)] disabled:[cursor:not-allowed] disabled:[opacity:0.6] disabled:[transform:none] ds-button-secondary [border-color:var(--ds-border-default)] [background:var(--ds-bg-elevated)] [color:var(--ds-text-strong)]"
            href="/docs"
          >
            Technische Dokumentation
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default FAQ;
