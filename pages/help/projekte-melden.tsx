import Link from 'next/link';

export default function ProjekteMelden() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black">📝 Projekte melden</h1>
          <p className="text-gray-300">So geben Sie neue Informationen oder Wünsche an uns weiter.</p>
        </header>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Was kann gemeldet werden?</h2>
          <ul className="list-disc ml-6 mt-2 text-gray-300">
            <li>Neue Projektideen</li>
            <li>Änderungen zu bestehenden Projekten</li>
            <li>Links, Dokumente, Kontaktpersonen</li>
          </ul>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">So geht’s</h2>
          <ol className="list-decimal ml-6 text-gray-300 space-y-1">
            <li>Öffnen Sie ein Projekt oder die Startseite.</li>
            <li>Klicken Sie auf „Kontakt“ oder „Melden“.</li>
            <li>Beschreiben Sie Ihr Anliegen kurz und klar.</li>
          </ol>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold">Hinweis zum Datenschutz 🔐</h2>
          <p className="text-gray-300">Bitte keine sensiblen Personendaten eintragen. Für vertrauliche Inhalte nutzen Sie interne Kanäle.</p>
        </section>

        <footer className="text-gray-400 text-sm">
          Zurück zur <Link href="/help" className="text-blue-400 underline">Hilfe-Übersicht</Link>
        </footer>
      </div>
    </main>
  );
}
