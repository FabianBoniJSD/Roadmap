import Link from 'next/link';

export default function RechteUndZugang() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black">🔑 Rechte & Zugang</h1>
          <p className="text-gray-300">So kommen Sie in den Admin-Bereich.</p>
        </header>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Wer hat Admin-Rechte?</h2>
          <p className="text-gray-300">Admin-Rechte erhalten ausgewählte Personen im Bereich IT + Digital. Aus Sicherheitsgründen sind die Rechte beschränkt.</p>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Zugang anfragen</h2>
          <ol className="list-decimal ml-6 text-gray-300 space-y-1">
            <li>Klären Sie die Notwendigkeit im Team.</li>
            <li>Schreiben Sie an <a className="text-blue-400 underline" href="mailto:roadmap@jsd.bs.ch">roadmap@jsd.bs.ch</a>.</li>
            <li>Geben Sie Nutzung und gewünschten Zeitraum an.</li>
          </ol>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
          <h2 className="text-xl font-bold">Hinweis</h2>
          <p className="text-gray-300">Admin-Hilfe ist öffentlich lesbar. Inhalte im Admin-Bereich sind jedoch nur mit Rechten sichtbar.</p>
        </section>

        <footer className="text-gray-400 text-sm">
          Zurück zur <Link href="/help/admin" className="text-blue-400 underline">Admin Hilfe</Link>
        </footer>
      </div>
    </main>
  );
}
