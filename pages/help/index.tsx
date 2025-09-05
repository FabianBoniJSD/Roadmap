import Link from 'next/link';

export default function HelpHome() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-black">🚀 Roadmap Hilfe</h1>
          <p className="text-gray-300">Kurze, bildhafte Anleitungen für alle – ohne Techniksprech.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card title="Erste Schritte" emoji="✨" href="/help/erste-schritte" desc="In 3 Minuten startklar: Überblick, Navigation, Suche." />
          <Card title="Projekte ansehen" emoji="👀" href="/help/projekte-ansehen" desc="Filter, Kategorien, Legende & Details verstehen." />
          <Card title="Projekte melden" emoji="📝" href="/help/projekte-melden" desc="So reichen Sie neue Infos oder Wünsche ein." />
          <Card title="FAQ" emoji="❓" href="/help/faq" desc="Die häufigsten Fragen – kurz & bündig." />
        </section>

        <footer className="text-gray-400 text-sm">
          Brauchen Sie Hilfe? Schreiben Sie uns: <a className="text-blue-400 underline" href="mailto:roadmap@jsd.bs.ch">roadmap@jsd.bs.ch</a>
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
