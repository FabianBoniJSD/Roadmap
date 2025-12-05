import HelpLayout from '@/components/HelpLayout';

const steps = [
  'Klärung im Team oder mit der Projektleitung: Benötigen Sie Zugriff auf Instanz-Ebene oder nur Leserechte?',
  'Anfrage an roadmap@jsd.bs.ch mit kurzer Begründung, gewünschter Dauer und Kontaktangaben senden.',
  'Das Roadmap-Team prüft den Bedarf, legt den Zugang an und informiert Sie über nächste Schritte.',
];

const RechteUndZugang = () => {
  return (
    <HelpLayout
      title="Rechte & Zugang"
      description={
        <>
          Der Admin-Bereich ist bewusst geschützt. Hier erfahren Sie, wer Zugriff erhält, wie
          Anfragen ablaufen und worauf Sie beim Umgang mit Service-Accounts achten sollten.
        </>
      }
      breadcrumbs={[
        { label: 'Hilfe', href: '/help' },
        { label: 'Admin', href: '/help/admin' },
        { label: 'Rechte & Zugang' },
      ]}
    >
      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Wer erhält Admin-Rechte?</h2>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Berechtigt sind Personen, die Projekte oder Kategorien aktiv pflegen. Typischerweise sind
          dies Mitglieder des Bereichs IT + Digital oder definierte Fachvertreterinnen und
          -vertreter.
        </p>
      </section>

      <section className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">So beantragen Sie Zugriff</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300 sm:text-base">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
        <aside className="space-y-3 rounded-2xl border border-slate-800/60 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
          <h3 className="text-base font-semibold text-white">Service-Account nutzen</h3>
          <ul className="space-y-2">
            <li>Passwörter nicht weitergeben – stattdessen zentral verwalten.</li>
            <li>Nur im gesicherten Netzwerk einsetzen.</li>
            <li>Regelmäßig überprüfen, welche Personen Zugriff benötigen.</li>
          </ul>
        </aside>
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Transparenz & Datenschutz</h2>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Alle Admin-Aktionen werden protokolliert. Bitte hinterlegen Sie keine sensiblen
          Personendaten. Nutzen Sie stattdessen die vorgesehenen Systeme für vertrauliche
          Informationen.
        </p>
      </section>
    </HelpLayout>
  );
};

export default RechteUndZugang;
