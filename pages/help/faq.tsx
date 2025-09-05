import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function FAQ() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Nav currentPage="doc" />
      <div className="pt-20 max-w-3xl mx-auto p-6 space-y-8">
        <header>
          <h1 className="text-3xl font-black">❓ Häufige Fragen (FAQ)</h1>
          <p className="text-gray-300">Schnelle Antworten in einfacher Sprache.</p>
        </header>

        <section className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="font-bold">Was ist die Roadmap?</h2>
            <p className="text-gray-300">Die Roadmap zeigt wichtige Projekte in Planung und Umsetzung – übersichtlich und aktuell.</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="font-bold">Wie finde ich Projekte?</h2>
            <p className="text-gray-300">Nutzen Sie oben die Suche oder die Filter (Kategorie, Status, Jahr). Klicken Sie ein Projekt an, um Details zu sehen.</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="font-bold">Wer pflegt die Inhalte?</h2>
            <p className="text-gray-300">Die Inhalte werden durch das Team IT + Digital betreut. Melden Sie Hinweise über den Kontakt.</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="font-bold">Kann ich Feedback geben?</h2>
            <p className="text-gray-300">Ja, sehr gern. Nutzen Sie den Link „Kontakt“ oder schreiben Sie an <a className="text-blue-400 underline" href="mailto:roadmap@jsd.bs.ch">roadmap@jsd.bs.ch</a>.</p>
          </div>
        </section>

        <footer className="text-gray-400 text-sm">
          Zurück zur <Link href="/help" className="text-blue-400 underline">Hilfe-Übersicht</Link>
        </footer>
      </div>
      <Footer />
    </main>
  );
}
