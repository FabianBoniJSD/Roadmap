import Link from 'next/link';
import HelpLayout from '@/components/HelpLayout';

const adminTopics = [
  {
    title: 'Projekte verwalten',
    description: 'Anlegen, bearbeiten, archivieren und Verantwortliche zuordnen.',
    href: '/help/admin/projekte-verwalten',
  },
  {
    title: 'Kategorien & Tags',
    description: 'Struktur und Farbcodes festlegen, Reihenfolge definieren.',
    href: '/help/admin/kategorien-verwalten',
  },
  {
    title: 'Design & Einstellungen',
    description: 'Titel, Farbverläufe und Startjahr konfigurieren.',
    href: '/help/admin/einstellungen-und-design',
  },
  {
    title: 'Rechte & Zugang',
    description: 'Service-Accounts, Benutzerrechte und Freigaben verwalten.',
    href: '/help/admin/rechte-und-zugang',
  },
];

const AdminHelp = () => {
  return (
    <HelpLayout
      title="Admin-Handbuch"
      description={
        <>
          Dieser Bereich richtet sich an Administratorinnen und Administratoren einer
          Roadmap-Instanz. Er zeigt, wie Sie Projekte pflegen, Kategorien strukturieren und das
          Design an Ihr Departement anpassen.
        </>
      }
      breadcrumbs={[{ label: 'Hilfe', href: '/help' }, { label: 'Admin' }]}
      actions={
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-sky-400"
        >
          Admin-Dashboard öffnen
        </Link>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2">
        {adminTopics.map((topic) => (
          <Link
            key={topic.href}
            href={topic.href}
            className="group rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 transition hover:border-sky-500/50 hover:bg-slate-900"
          >
            <h2 className="text-lg font-semibold text-white transition group-hover:text-sky-100">
              {topic.title}
            </h2>
            <p className="mt-3 text-sm text-slate-300">{topic.description}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 transition group-hover:text-sky-200">
              Weiterlesen
              <span aria-hidden="true">↗</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Wer erhält Admin-Zugriff?</h2>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Admin-Rechte erhalten ausgewählte Personen im Bereich IT + Digital oder in den
          Fachbereichen. Wenn Sie Zugriff benötigen, melden Sie sich unter{' '}
          <a
            href="mailto:roadmap@jsd.bs.ch"
            className="underline decoration-dotted underline-offset-4 transition hover:text-white"
          >
            roadmap@jsd.bs.ch
          </a>
          . Wir stimmen die Freigabe mit dem zuständigen Service-Owner ab.
        </p>
      </section>
    </HelpLayout>
  );
};

export default AdminHelp;
