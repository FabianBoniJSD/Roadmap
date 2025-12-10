import Link from 'next/link';

const SiteFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2 text-xs text-slate-400 sm:w-1/2">
          <p className="font-medium text-slate-200">JSDoIT Roadmap</p>
          <p>Transparente Projektplanung und Statusberichte für Teams und Stakeholder.</p>
          <p>&copy; {currentYear} Justiz- und Sicherheitsdepartement Basel-Stadt.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-300">
          <Link href="/help" className="transition hover:text-white">
            Hilfe & FAQ
          </Link>
          <Link href="/docs" className="transition hover:text-white">
            Dokumentation
          </Link>
          <Link href="/support" className="transition hover:text-white">
            Support kontaktieren
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
