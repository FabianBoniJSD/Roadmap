import Link from 'next/link';
import HelpLayout from '@/components/HelpLayout';

const meldungHinweise = [
  'Kurze Zusammenfassung (2–3 Sätze) hilft dem Team bei der Einordnung.',
  'Optional: gewünschtes Go-live, betroffene Abteilungen oder KPIs.',
  'Bitte keine vertraulichen Personendaten senden – dafür interne Kanäle nutzen.',
];

const ProjekteMelden = () => {
  return (
    <HelpLayout
      title="Projekte und Änderungen melden"
      description={
        <>
          Egal ob neue Initiative, aktualisierte Meilensteine oder Ansprechpartner – über das
          integrierte Formular landet Ihre Nachricht direkt beim Roadmap-Team. So bleibt die Roadmap
          immer aktuell.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'Projekte melden' }]}
    >
      <section className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
        <article className="space-y-4">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Was kann gemeldet werden?</h2>
          <ul className="space-y-2 text-sm text-slate-300 sm:text-base">
            <li>Neue Projektideen oder Vorhaben, die in die Roadmap aufgenommen werden sollen.</li>
            <li>Aktualisierte Infos zu laufenden Projekten (Status, Budget, Meilensteine).</li>
            <li>Links, Dokumente oder Ansprechpersonen, die ergänzt werden sollen.</li>
          </ul>
        </article>
        <article className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
          <h3 className="text-base font-semibold text-white">Direkter Draht</h3>
          <p>
            Meldungen landen im Backlog des Roadmap-Teams. Wir bestätigen den Eingang und
            informieren, sobald die Änderung veröffentlicht wurde.
          </p>
          <a
            href="mailto:roadmap@jsd.bs.ch"
            className="inline-flex rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-sky-400 hover:text-white"
          >
            Alternativ: E-Mail senden
          </a>
        </article>
      </section>

      <section className="space-y-5 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          So funktioniert das Formular
        </h2>
        <ol className="space-y-4 text-sm text-slate-300 sm:text-base">
          <li>
            Öffnen Sie das Projekt (oder die Startseite) und klicken Sie auf „Rückmeldung geben“.
          </li>
          <li>
            Beschreiben Sie Ihr Anliegen: Was soll ergänzt oder geändert werden? Wer profitiert
            davon?
          </li>
          <li>
            Fügen Sie optional Links oder Dokumente hinzu. Je präziser die Angaben, desto schneller
            die Umsetzung.
          </li>
        </ol>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
          <h3 className="text-base font-semibold text-white">Hinweise für die Meldung</h3>
          <ul className="mt-3 space-y-2">
            {meldungHinweise.map((hinweis) => (
              <li key={hinweis}>{hinweis}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Nächste Schritte</h2>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Nach Eingang prüfen wir die Meldung, stimmen uns bei Bedarf mit den verantwortlichen Teams
          ab und veröffentlichen die aktualisierten Informationen innerhalb weniger Arbeitstage.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/help/projekte-ansehen"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
          >
            Projekte gezielt finden
          </Link>
          <Link
            href="/help/faq"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
          >
            Häufige Fragen
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default ProjekteMelden;
