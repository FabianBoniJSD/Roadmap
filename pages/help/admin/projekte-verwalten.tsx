import Link from 'next/link';

export default function ProjekteVerwalten() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black">🧩 Projekte verwalten</h1>
          <p className="text-gray-300">So pflegen Sie Projekte schnell und sicher.</p>
        </header>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Neues Projekt anlegen ➕</h2>
          <ol className="list-decimal ml-6 text-gray-300 space-y-1">
            <li>Öffnen Sie den Bereich <span className="text-white font-semibold">Admin</span>.</li>
            <li>Klicken Sie auf <span className="text-white font-semibold">Projekt hinzufügen</span>.</li>
            <li>Füllen Sie Titel, Zeitraum, Status und Kategorie aus.</li>
            <li>Speichern – fertig.</li>
          </ol>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Projekt bearbeiten ✏️</h2>
          <ol className="list-decimal ml-6 text-gray-300 space-y-1">
            <li>Suchen Sie das Projekt in der Liste.</li>
            <li>Klicken Sie auf <span className="text-white font-semibold">Bearbeiten</span>.</li>
            <li>Änderungen vornehmen und speichern.</li>
          </ol>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Projekt archivieren oder löschen 🗑️</h2>
          <ul className="list-disc ml-6 text-gray-300 space-y-1">
            <li><span className="text-white font-semibold">Archivieren</span>: Für abgeschlossene Projekte. Bleiben sichtbar, aber als beendet markiert.</li>
            <li><span className="text-white font-semibold">Löschen</span>: Nur wenn ein Projekt fälschlich erfasst wurde.</li>
          </ul>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Tipps ⚡</h2>
          <ul className="list-disc ml-6 text-gray-300 space-y-1">
            <li>Kurze, klare Titel helfen bei der Suche.</li>
            <li>Zeitraum realistisch setzen – das verbessert die Roadmap-Ansicht.</li>
            <li>Links und Kontaktpersonen ergänzen erhöht den Nutzen für alle.</li>
          </ul>
        </section>

        <footer className="text-gray-400 text-sm">
          Zurück zur <Link href="/help/admin" className="text-blue-400 underline">Admin Hilfe</Link>
        </footer>
      </div>
    </main>
  );
}
