import Link from 'next/link';

export default function KategorienVerwalten() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black">🗂️ Kategorien verwalten</h1>
          <p className="text-gray-300">Struktur geben, damit Nutzer schnell finden.</p>
        </header>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Neue Kategorie ➕</h2>
          <ol className="list-decimal ml-6 text-gray-300 space-y-1">
            <li>Bereich <span className="text-white font-semibold">Admin</span> öffnen.</li>
            <li><span className="text-white font-semibold">Kategorie hinzufügen</span> wählen.</li>
            <li>Namen, Farbe (optional) und ggf. Oberkategorie wählen.</li>
            <li>Speichern.</li>
          </ol>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Ordnen & umbenennen ✏️</h2>
          <p className="text-gray-300">Kategorien können umbenannt und in eine andere Oberkategorie verschoben werden – die Projekte bleiben erhalten.</p>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Farben 🎨</h2>
          <p className="text-gray-300">Nutzen Sie dezente, wiedererkennbare Farben. Zu viele starke Farben wirken unruhig.</p>
        </section>

        <footer className="text-gray-400 text-sm">
          Zurück zur <Link href="/help/admin" className="text-blue-400 underline">Admin Hilfe</Link>
        </footer>
      </div>
    </main>
  );
}
