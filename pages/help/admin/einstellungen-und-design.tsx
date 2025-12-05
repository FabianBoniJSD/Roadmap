import HelpLayout from '@/components/HelpLayout';

const EinstellungenUndDesign = () => {
  return (
    <HelpLayout
      title="Einstellungen & Design"
      description={
        <>
          Stimmen Sie Texte, Farben und visuelle Elemente auf Ihr Departement ab. Ein konsistentes
          Erscheinungsbild sorgt für Vertrauen und Wiedererkennung bei allen Stakeholdern.
        </>
      }
      breadcrumbs={[
        { label: 'Hilfe', href: '/help' },
        { label: 'Admin', href: '/help/admin' },
        { label: 'Einstellungen & Design' },
      ]}
    >
      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Grundlegende Einstellungen</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300 sm:text-base">
          <li>
            <strong className="text-slate-100">Titel & Untertitel:</strong> Nutzen Sie klare
            Begriffe für Bereich oder Organisation. Halten Sie den Untertitel auf maximal zwei kurze
            Sätze.
          </li>
          <li>
            <strong className="text-slate-100">Standardjahr:</strong> Wählen Sie das aktuelle Jahr –
            ältere Projekte bleiben über die Filter erreichbar.
          </li>
          <li>
            <strong className="text-slate-100">Sprache:</strong> Verwenden Sie im gesamten Auftritt
            die gleiche Terminologie (z. B. „Initiative“ statt „Projekt“, falls gewünscht).
          </li>
        </ul>
      </section>

      <section className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Farben & Akzente</h2>
          <p className="text-sm text-slate-300 sm:text-base">
            Legen Sie zwei Primärfarben für den Header-Verlauf fest. Nutzen Sie zusätzlich eine
            Akzentfarbe für Buttons und Hervorhebungen.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Primärfarben sollten sich im Corporate Design wiederfinden.</li>
            <li>Kontrast prüfen: Text und Icons müssen auf allen Hintergründen lesbar bleiben.</li>
            <li>
              Kategorien behalten ihre eigenen Farben und sorgen so für Orientierung im Zeitstrahl.
            </li>
          </ul>
        </article>
        <article className="space-y-3 rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
          <h3 className="text-base font-semibold text-white">Design-Checkliste</h3>
          <ul className="space-y-2">
            <li>Logo oder Markenbezug prüfen.</li>
            <li>Responsives Verhalten testen (Desktop, Tablet, Mobile).</li>
            <li>Lesbarkeit der Schriftgrößen sicherstellen.</li>
          </ul>
        </article>
      </section>
    </HelpLayout>
  );
};

export default EinstellungenUndDesign;
