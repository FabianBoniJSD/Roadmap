import HelpLayout from '@/components/HelpLayout';

const KategorienVerwalten = () => {
  return (
    <HelpLayout
      title="Kategorien strukturieren"
      description={
        <>
          Kategorien helfen Nutzerinnen und Nutzern, verwandte Projekte schnell zu finden. Legen Sie
          sie nach Organisationsbereichen oder strategischen Programmen an und halten Sie die Farben
          konsistent.
        </>
      }
      breadcrumbs={[
        { label: 'Hilfe', href: '/help' },
        { label: 'Admin', href: '/help/admin' },
        { label: 'Kategorien' },
      ]}
    >
      <section className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Neue Kategorie anlegen</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300 sm:text-base">
            <li>Im Admin-Dashboard auf den Reiter „Kategorien“ wechseln.</li>
            <li>„Neue Kategorie“ wählen und Name, Kurzbeschreibung sowie Farbe festlegen.</li>
            <li>
              Optional: Eine übergeordnete Kategorie bestimmen, um Themenbereiche zu gruppieren.
            </li>
            <li>Speichern – die Kategorie steht sofort in Filtern und Projekten zur Verfügung.</li>
          </ol>
        </article>
        <aside className="space-y-3 rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
          <h3 className="text-base font-semibold text-white">Tipps für Farbwahl</h3>
          <ul className="space-y-2">
            <li>Maximal fünf Primärfarben verwenden, um den Überblick zu behalten.</li>
            <li>Kontraste testen: Text auf dunklen Hintergründen muss gut lesbar bleiben.</li>
            <li>Nutzen Sie ähnliche Farbfamilien für verwandte Kategorien.</li>
          </ul>
        </aside>
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Kategorien anpassen</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300 sm:text-base">
          <li>
            <strong className="text-slate-100">Umbenennen:</strong> Bestehende Projekte behalten
            ihre Zuordnung, nur die Anzeige ändert sich.
          </li>
          <li>
            <strong className="text-slate-100">Zusammenführen:</strong> Verschieben Sie Projekte
            zunächst in die neue Kategorie und löschen Sie danach den alten Eintrag.
          </li>
          <li>
            <strong className="text-slate-100">Archivieren:</strong> Selten genutzte Themen können
            Sie mit dem Präfix „(inaktiv)“ kennzeichnen, bevor Sie sie endgültig entfernen.
          </li>
        </ul>
      </section>
    </HelpLayout>
  );
};

export default KategorienVerwalten;
