import { ReactNode } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function ErsteSchritte() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Nav currentPage="doc" />
      <div className="pt-20 max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black">✨ Erste Schritte</h1>
          <p className="text-gray-300">So finden Sie sich in der Roadmap zurecht – schnell und einfach.</p>
        </header>

        <Step n={1} title="Startseite verstehen" icon="🏠">
          Auf der Startseite sehen Sie Kacheln/Zeilen zu Projekten. Farben zeigen den Status:
          <ul className="list-disc ml-6 mt-2 text-gray-300">
            <li><span className="text-green-400">Grün</span> = abgeschlossen</li>
            <li><span className="text-blue-400">Blau</span> = in Bearbeitung</li>
            <li><span className="text-yellow-400">Gelb</span> = pausiert</li>
            <li><span className="text-gray-300">Grau</span> = geplant</li>
            <li><span className="text-red-400">Rot</span> = abgebrochen</li>
          </ul>
        </Step>

        <Step n={2} title="Projekte filtern" icon="🔎">
          Nutzen Sie die Filter oben: Kategorie, Status, Zeitraum. So sehen Sie nur, was für Sie relevant ist.
        </Step>

        <Step n={3} title="Details anzeigen" icon="👆">
          Klicken oder tippen Sie auf ein Projekt. Es öffnet sich ein Fenster mit Beschreibung, Verantwortlichen, Links und Zeitraum.
        </Step>

        <Step n={4} title="Ansicht wechseln" icon="🗺️">
          Wechseln Sie zwischen Jahres- und Kachel-Ansicht. So erhalten Sie je nach Bedarf Überblick oder Detailtiefe.
        </Step>

        <section className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="font-semibold">Tipps 💡</div>
          <ul className="list-disc ml-6 mt-2 text-gray-300">
            <li>Nutzen Sie die Suchleiste, um Projekte schnell zu finden.</li>
            <li>Bewegen Sie die Maus über ein Projekt für eine kurze Vorschau.</li>
            <li>Farb-Legende unten erklärt alle Symbole.</li>
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

interface StepProps {
  n: number;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

function Step({ n, title, icon, children }: StepProps) {
  return (
    <section className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2">
        <div className="text-xl">{icon}</div>
        <h2 className="text-xl font-bold">{n}. {title}</h2>
      </div>
      <div className="mt-2 text-gray-200 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
