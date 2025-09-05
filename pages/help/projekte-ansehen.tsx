import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function ProjekteAnsehen() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Nav currentPage="doc" />
      <div className="pt-20 max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black">👀 Projekte ansehen</h1>
          <p className="text-gray-300">Alles auf einen Blick – mit Farben, Symbolen und kurzen Texten.</p>
        </header>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Farben & Symbole</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>✅ Abgeschlossen</div>
            <div>🛠️ In Bearbeitung</div>
            <div>🕒 Pausiert</div>
            <div>🧭 Geplant</div>
            <div>⛔ Abgebrochen</div>
          </div>
          <p className="text-gray-300">Tipp: Fahren Sie mit der Maus über ein Projekt für eine Kurzübersicht.</p>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold">Filter clever nutzen</h2>
          <ul className="list-disc ml-6 mt-2 text-gray-300">
            <li>Kategorie: Themenbereich wählen</li>
            <li>Status: Zeigt nur den gewünschten Fortschritt</li>
            <li>Zeitraum: Viertel/Jahr eingrenzen</li>
          </ul>
        </section>

        <footer className="text-gray-400 text-sm">
          Zurück zur <Link href="/help" className="text-blue-400 underline">Hilfe-Übersicht</Link>
        </footer>
      </div>
      <Footer />
    </main>
  );
}
