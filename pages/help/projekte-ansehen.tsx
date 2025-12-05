import Link from 'next/link';
import HelpLayout from '@/components/HelpLayout';

const ProjekteAnsehen = () => {
  return (
    <HelpLayout
      title="Projekte finden und vergleichen"
      description={
        <>
          Filtern Sie Projekte nach Kategorie, Status, Tags oder Zeitraum und wechseln Sie zwischen
          Zeitstrahl und Kachelansicht. Mit diesen Tipps gewinnen Sie schnell Orientierung.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'Projekte ansehen' }]}
    >
      <section className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Visuelle Orientierung</h2>
          <p className="text-sm text-slate-300 sm:text-base">
            Die Roadmap nutzt die dunkle Grundgestaltung der Anwendung und hebt Fachbereiche durch
            farbige Balken hervor. Bewegen Sie den Mauszeiger über ein Projekt oder tippen Sie auf
            mobilen Geräten, um Details zu Phase, Budget, Team und Zeitplan anzuzeigen.
          </p>
        </div>
        <ul className="grid gap-3">
          <li className="flex items-start gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
            <span
              className="mt-1 inline-flex h-2 w-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
              aria-hidden="true"
            />
            <span>
              <strong className="text-slate-100">Kategorie-Farben:</strong> Jede Rubrik besitzt eine
              eigene Farbe und erleichtert so das Erkennen von Zuständigkeiten.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
            <span
              className="mt-1 inline-flex h-2 w-5 rounded-full bg-slate-700"
              aria-hidden="true"
            />
            <span>
              <strong className="text-slate-100">Hover-Details:</strong> Tooltips liefern kompakte
              Kontextinformationen ohne die Ansicht zu verlassen.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
            <span
              className="mt-1 inline-flex h-2 w-5 rounded-full bg-slate-600"
              aria-hidden="true"
            />
            <span>
              <strong className="text-slate-100">Tiles & Timeline:</strong> Wechseln Sie je nach
              Fragestellung zwischen überblicksorientiertem Zeitstrahl und detailreicher
              Kachelansicht.
            </span>
          </li>
        </ul>
      </section>

      <section className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:grid-cols-2 sm:p-8">
        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Filter und Suche</h2>
          <p className="text-sm text-slate-300 sm:text-base">
            Nutzen Sie die Kombination aus Textsuche und Filtern, um Projekte in Sekunden
            einzugrenzen. Alle Einstellungen werden automatisch in der URL gespeichert – ideal zum
            Teilen mit Kolleginnen und Kollegen.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <strong className="text-slate-100">Textsuche:</strong> Durchsucht Titel und
              Beschreibung.
            </li>
            <li>
              <strong className="text-slate-100">Kategorien & Tags:</strong> Fokus auf einen
              Fachbereich oder Stakeholder-Kreis.
            </li>
            <li>
              <strong className="text-slate-100">Zeitraum:</strong> Grenzen Sie Monate oder Quartale
              ein, um aktuelle Vorhaben zu sehen.
            </li>
          </ul>
        </article>
        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Ansichten wechseln</h2>
          <p className="text-sm text-slate-300 sm:text-base">
            Der Zeitstrahl eignet sich für die Jahresplanung und zeigt Abhängigkeiten. Die
            Kachelansicht fokussiert auf Zusammenfassungen, KPIs und Teammitglieder.
          </p>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Tipp: Aktivieren Sie „Nur laufende Projekte“, um schnell auf aktuelle Initiativen zu
            fokussieren.
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Weitere Ressourcen</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            href="/help/projekte-melden"
            className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-sm text-slate-200 transition hover:border-sky-500/50 hover:text-white"
          >
            Informationen an das Roadmap-Team melden
          </Link>
          <Link
            href="/docs/funktionen/roadmap"
            className="rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-sm text-slate-200 transition hover:border-sky-500/50 hover:text-white"
          >
            Technische Dokumentation zur Roadmap-Ansicht
          </Link>
        </div>
      </section>
    </HelpLayout>
  );
};

export default ProjekteAnsehen;
