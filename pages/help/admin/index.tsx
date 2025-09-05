import Link from 'next/link';

export default function AdminHelp() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-black">🛡️ Admin Hilfe</h1>
          <p className="text-gray-300">Kurze Anleitungen für Personen mit Admin-Rechten. Einfach, klar, ohne Techniksprech.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card title="Projekte verwalten" emoji="🧩" href="/help/admin/projekte-verwalten" desc="Anlegen, bearbeiten, archivieren, löschen." />
          <Card title="Kategorien verwalten" emoji="🗂️" href="/help/admin/kategorien-verwalten" desc="Struktur anpassen, Reihenfolge, Farben." />
          <Card title="Einstellungen & Design" emoji="🎨" href="/help/admin/einstellungen-und-design" desc="Titel, Farben, Legende, Startjahr." />
          <Card title="Rechte & Zugang" emoji="🔑" href="/help/admin/rechte-und-zugang" desc="Wer hat Zugriff? Wie erhalte ich Rechte?" />
        </section>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold">Wer ist Admin?</h2>
          <p className="text-gray-300">Admin-Rechte erhalten ausgewählte Personen im Bereich IT + Digital. Wenn Sie Zugriff benötigen, melden Sie sich bei <a className="text-blue-400 underline" href="mailto:roadmap@jsd.bs.ch">roadmap@jsd.bs.ch</a>.</p>
        </section>

        <footer className="text-gray-400 text-sm">
          Zurück zur <Link href="/help" className="text-blue-400 underline">Hilfe-Übersicht</Link>
        </footer>
      </div>
    </main>
  );
}

function Card({ title, emoji, desc, href }: { title: string; emoji: string; desc: string; href: string }) {
  return (
    <Link href={href} className="block rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 p-4 transition">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-gray-400 text-sm mt-1">{desc}</div>
    </Link>
  );
}
