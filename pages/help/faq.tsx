import Link from 'next/link';
import HelpLayout from '@/components/HelpLayout';

const questions = [
  {
    question: 'Was ist die Roadmap?',
    answer:
      'Die Roadmap bündelt alle zentralen Projekte des Justiz- und Sicherheitsdepartements. Sie zeigt Status, Verantwortliche und Zeiträume in einer einheitlichen Darstellung.',
  },
  {
    question: 'Wie finde ich bestimmte Projekte?',
    answer:
      'Nutzen Sie die Suche für Stichworte oder filtern Sie nach Kategorien, Status und Monaten. Die aktuelle Auswahl bleibt in der URL gespeichert – so können Sie Ansichten einfach teilen.',
    link: { label: 'Projekte finden', href: '/help/projekte-ansehen' },
  },
  {
    question: 'Wer pflegt die Inhalte?',
    answer:
      'Das Roadmap-Team im Bereich IT + Digital sammelt Meldungen aus den Fachbereichen, stimmt Aktualisierungen ab und veröffentlicht geprüfte Informationen.',
  },
  {
    question: 'Wie gebe ich Feedback oder Ergänzungen weiter?',
    answer:
      'Über den Button „Rückmeldung geben“ direkt in der Roadmap oder per E-Mail an roadmap@jsd.bs.ch. Bitte beschreiben Sie Ihr Anliegen möglichst konkret.',
    link: { label: 'Projekte melden', href: '/help/projekte-melden' },
  },
  {
    question: 'Benötige ich spezielle Berechtigungen?',
    answer:
      'Die meisten Roadmap-Instanzen sind für das interne Netzwerk freigeschaltet. Für administrative Aufgaben benötigen Sie einen Service-Account oder persönliche Freigaben.',
    link: { label: 'Berechtigungen verstehen', href: '/help/admin/rechte-und-zugang' },
  },
];

const FAQ = () => {
  return (
    <HelpLayout
      title="Häufige Fragen"
      description={
        <>
          Die wichtigsten Antworten auf einen Blick. Nicht fündig geworden? Schreiben Sie uns oder
          besuchen Sie die ausführliche Dokumentation.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'FAQ' }]}
    >
      <section className="space-y-4">
        {questions.map((entry) => (
          <article
            key={entry.question}
            className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 transition hover:border-sky-500/40 hover:bg-slate-900 sm:p-7"
          >
            <h2 className="text-lg font-semibold text-white sm:text-xl">{entry.question}</h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">{entry.answer}</p>
            {entry.link && (
              <Link
                href={entry.link.href}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-sky-400 hover:text-white"
              >
                {entry.link.label}
              </Link>
            )}
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Weitere Unterstützung</h2>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Für alle Anliegen, die hier nicht beantwortet wurden, erreichen Sie uns via{' '}
          <a
            href="mailto:roadmap@jsd.bs.ch"
            className="underline decoration-dotted underline-offset-4 transition hover:text-white"
          >
            roadmap@jsd.bs.ch
          </a>
          . Technische Details und API-Infos finden Sie in der{' '}
          <Link
            href="/docs"
            className="underline decoration-dotted underline-offset-4 transition hover:text-white"
          >
            Dokumentation
          </Link>
          .
        </p>
      </section>
    </HelpLayout>
  );
};

export default FAQ;
