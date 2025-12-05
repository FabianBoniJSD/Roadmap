import Link from 'next/link';
import HelpLayout from '@/components/HelpLayout';

type Step = {
  title: string;
  description: string;
  details?: string[];
};

const steps: Step[] = [
  {
    title: 'Startseite verstehen',
    description:
      'Die Roadmap zeigt Projekte als Zeitleiste oder Kacheln. Farbige Balken stehen f?r Kategorien und sorgen f?r Orientierung.',
    details: [
      'Kategorie-Farben spiegeln Verantwortungsbereiche wider.',
      'Ein Verlauf weist auf priorisierte Initiativen hin.',
    ],
  },
  {
    title: 'Filtern und suchen',
    description:
      '?ber der Roadmap finden Sie Textsuche, Status-Filter sowie die Auswahl von Kategorien oder Monaten.',
    details: [
      'Nutzen Sie die Suche f?r Projektnamen, Stichworte oder Verantwortliche.',
      'Aktivieren Sie ?Nur laufende Projekte?, um aktuell aktive Initiativen einzublenden.',
    ],
  },
  {
    title: 'Details anzeigen',
    description:
      'Ein Klick auf ein Projekt ?ffnet ein Panel mit Beschreibung, Meilensteinen, Ansprechpersonen und Links.',
    details: [
      'Das Panel l?sst sich mit der Escape-Taste oder dem Schlie?en-Button beenden.',
      'Links f?hren direkt zu SharePoint-Dokumenten oder zus?tzlichen Ressourcen.',
    ],
  },
  {
    title: 'Ansicht wechseln',
    description:
      '?ber die Buttons ?Zeitstrahl? und ?Kacheln? entscheiden Sie, ob die Jahresplanung oder verdichtete Karten angezeigt werden.',
    details: [
      'Zeitstrahl: ideal f?r Langfristplanung und Abh?ngigkeiten.',
      'Kacheln: kompakter ?berblick, perfekt f?r Sitzungen oder mobile Ger?te.',
    ],
  },
];

const ErsteSchritte = () => {
  return (
    <HelpLayout
      title="Erste Schritte mit der Roadmap"
      description={
        <>
          Diese Einf?hrung f?hrt Sie in weniger als f?nf Minuten durch die wichtigsten Funktionen.
          Folgen Sie den vier Schritten und testen Sie die Roadmap parallel in einem zweiten Tab.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'Erste Schritte' }]}
      actions={
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-sky-400"
        >
          Roadmap ?ffnen
        </Link>
      }
    >
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Was Sie lernen</h2>
        <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-5 text-sm text-slate-300 sm:text-base">
          <ul className="space-y-3">
            <li>Die wichtigsten Elemente der Benutzeroberfl?che kennen.</li>
            <li>Projekte gezielt finden, filtern und vergleichen.</li>
            <li>Projekt-Details nutzen, um Abl?ufe und Zust?ndigkeiten zu verstehen.</li>
            <li>Zwischen Ansichten wechseln und eigene Favoriten merken.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Schritt f?r Schritt</h2>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="group rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 transition hover:border-sky-500/50 hover:bg-slate-900"
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-500/50 bg-slate-950/80 text-sm font-semibold text-sky-200">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold text-white transition group-hover:text-sky-100">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-300 sm:text-base">{step.description}</p>
                </div>
              </header>
              {step.details && (
                <ul className="mt-4 space-y-2 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-5 py-4 text-sm text-slate-300">
                  {step.details.map((detail) => (
                    <li key={detail} className="leading-relaxed">
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:grid-cols-2 sm:p-8">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">N?chste Schritte</h2>
          <p className="text-sm text-slate-300 sm:text-base">
            Die Grundlagen sitzen? Dann empfehlen wir, die Filter tiefer kennenzulernen oder eigene
            Projekte zu melden. Alle weiterf?hrenden Artikel finden Sie in der Hilfe-?bersicht.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/help/projekte-ansehen"
            className="rounded-full bg-slate-900/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-900 hover:text-white"
          >
            Projekte filtern und vergleichen
          </Link>
          <Link
            href="/help/projekte-melden"
            className="rounded-full bg-slate-900/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-900 hover:text-white"
          >
            Informationen an das Roadmap-Team schicken
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default ErsteSchritte;
