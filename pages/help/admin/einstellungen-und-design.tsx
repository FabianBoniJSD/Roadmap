import Link from 'next/link';

export default function EinstellungenUndDesign() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black">🎨 Einstellungen & Design</h1>
          <p className="text-gray-300">So gestalten Sie die Roadmap klar und einheitlich.</p>
        </header>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Titel & Untertitel</h2>
          <p className="text-gray-300">Passen Sie den Titel an (z. B. Bereich oder Team). Kurz und eindeutig hilft der Orientierung.</p>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Farben & Legende</h2>
          <ul className="list-disc ml-6 text-gray-300 space-y-1">
            <li>Statusfarben sollen verständlich sein (z. B. Grün = läuft, Gelb = in Planung, Grau = abgeschlossen).</li>
            <li>Legende aktuell halten – das schafft Vertrauen.</li>
          </ul>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Startjahr & Ansicht</h2>
          <p className="text-gray-300">Wählen Sie ein sinnvolles Startjahr für die Übersicht. Die Ansicht soll die aktuellen Projekte gut zeigen.</p>
        </section>

        <footer className="text-gray-400 text-sm">
          Zurück zur <Link href="/help/admin" className="text-blue-400 underline">Admin Hilfe</Link>
        </footer>
      </div>
    </main>
  );
}
