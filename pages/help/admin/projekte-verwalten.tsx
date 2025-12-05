import HelpLayout from '@/components/HelpLayout';

const Schritte = [
  {
    title: 'Projekt anlegen',
    points: [
      'Öffnen Sie den Reiter „Projekte“ im Admin-Dashboard.',
      'Klicken Sie auf „Neues Projekt“ und füllen Sie Titel, Zeitraum sowie verantwortliche Personen aus.',
      'Optional: Beschreibung, Budget, Links und Tags ergänzen.',
      'Speichern – das Projekt erscheint sofort in der Roadmap.',
    ],
  },
  {
    title: 'Projekt aktualisieren',
    points: [
      'Suchen Sie das Projekt über die Liste oder die Roadmap-Suche.',
      'Ändern Sie Status, Phase oder Meilensteine. Nutzen Sie die Vorlagen für Fortschrittsmeldungen.',
      'Aktualisieren Sie in der Detailansicht auch Links oder Ansprechpartner, damit Stakeholder direkt informiert sind.',
    ],
  },
  {
    title: 'Projekt abschließen oder entfernen',
    points: [
      'Auf „Bearbeiten“ klicken und den Status auf „abgeschlossen“ setzen – das Projekt bleibt sichtbar, aber als erledigt markiert.',
      'Nur löschen, wenn ein Projekt fälschlicherweise angelegt wurde. Gelöschte Projekte lassen sich nicht wiederherstellen.',
    ],
  },
];

const ProjekteVerwalten = () => {
  return (
    <HelpLayout
      title="Projekte verwalten"
      description={
        <>
          Im Admin-Dashboard pflegen Sie Projekte zentral. Nutzen Sie die folgenden Schritte als
          Checkliste für die tägliche Arbeit und achten Sie darauf, Änderungen zeitnah einzutragen.
        </>
      }
      breadcrumbs={[
        { label: 'Hilfe', href: '/help' },
        { label: 'Admin', href: '/help/admin' },
        { label: 'Projekte verwalten' },
      ]}
    >
      <section className="space-y-5">
        {Schritte.map((schritt, index) => (
          <article
            key={schritt.title}
            className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8"
          >
            <header className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-500/50 bg-slate-900/80 text-sm font-semibold text-sky-200">
                {index + 1}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-white sm:text-xl">{schritt.title}</h2>
              </div>
            </header>
            <ul className="mt-4 space-y-2 text-sm text-slate-300 sm:text-base">
              {schritt.points.map((point) => (
                <li key={point} className="leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Best Practices</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300 sm:text-base">
          <li>
            Vergeben Sie eindeutige Titel und aktualisieren Sie Projektphasen mindestens monatlich.
          </li>
          <li>Nutzen Sie Tags, um strategische Programme oder Portfolio-Slices zu kennzeichnen.</li>
          <li>
            Dokumentieren Sie Budgetänderungen oder Meilensteine mit Datum im Beschreibungsfeld.
          </li>
        </ul>
      </section>
    </HelpLayout>
  );
};

export default ProjekteVerwalten;
