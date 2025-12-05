import Link from 'next/link';
import HelpLayout from '@/components/HelpLayout';

type Guide = {
  title: string;
  description: string;
  href: string;
  badge?: string;
};

const spotlightGuides: Guide[] = [
  {
    title: 'Erste Schritte',
    description:
      'In drei Minuten wissen, wo Sie klicken müssen und welche Informationen Sie finden.',
    href: '/help/erste-schritte',
    badge: 'Schnellstart',
  },
  {
    title: 'Roadmap lesen & filtern',
    description: 'So nutzen Sie Suchfeld, Filter und Ansichten, um Projekte gezielt einzugrenzen.',
    href: '/help/projekte-ansehen',
    badge: 'Visualisierung',
  },
  {
    title: 'Projekte melden',
    description: 'Welche Informationen benötigt werden und wie das Formular sicher ankommt.',
    href: '/help/projekte-melden',
    badge: 'Input geben',
  },
  {
    title: 'Admin-Leitfaden',
    description:
      'Instanzen konfigurieren, Kategorien pflegen und Farben passend zum Auftritt wählen.',
    href: '/help/admin',
    badge: 'Für Admins',
  },
];

const knowledgeBase: Guide[] = [
  {
    title: 'FAQ & Problemlösung',
    description: 'Schnelle Antworten auf wiederkehrende Fragen und Tipps bei Störungen.',
    href: '/help/faq',
  },
  {
    title: 'Berechtigungen & Rollen',
    description: 'Wer sieht welche Roadmap? Überblick über SharePoint und Service-Accounts.',
    href: '/help/admin/rechte-und-zugang',
  },
  {
    title: 'Roadmap-Projekte verwalten',
    description: 'Status, Phasen und Meilensteine pflegen – inklusive Best Practices.',
    href: '/help/admin/projekte-verwalten',
  },
  {
    title: 'Design & Einstellungen',
    description: 'Farben, Branding und Texte konfigurieren, damit alles zur Organisation passt.',
    href: '/help/admin/einstellungen-und-design',
  },
];

const HelpHome = () => {
  return (
    <HelpLayout
      eyebrow="Hilfe & Support"
      title="Willkommen im JSDoIT Support Center"
      description={
        <>
          Hier finden Sie Schritt-für-Schritt-Anleitungen, Videos und Antworten auf häufige Fragen.
          Egal ob Sie nur einen schnellen Überblick benötigen oder als Administrator Einstellungen
          anpassen – wir begleiten Sie.
        </>
      }
      actions={
        <>
          <Link
            href="/help/faq"
            className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-200 transition hover:border-sky-400 hover:text-white"
          >
            FAQ öffnen
          </Link>
          <a
            href="mailto:roadmap@jsd.bs.ch"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-sky-400 hover:text-white"
          >
            Support kontaktieren
          </a>
        </>
      }
    >
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Leitfäden im Fokus</h2>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Für alle Rollen</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {spotlightGuides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="group relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 transition hover:border-sky-500/60 hover:bg-slate-900/80"
            >
              <div className="absolute left-4 top-4 h-16 w-16 rounded-full bg-sky-500/15 blur-3xl transition group-hover:bg-sky-400/20" />
              <div className="relative space-y-3">
                {guide.badge && (
                  <span className="inline-flex items-center rounded-full border border-sky-500/50 bg-slate-950/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-sky-200">
                    {guide.badge}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white transition group-hover:text-sky-100">
                  {guide.title}
                </h3>
                <p className="text-sm text-slate-300">{guide.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300 transition group-hover:text-sky-200">
                  Weiterlesen
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Wissensdatenbank</h2>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Vertiefte Informationen
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {knowledgeBase.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 transition hover:border-sky-500/50 hover:bg-slate-900"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white transition group-hover:text-sky-100">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-300">{item.description}</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 transition group-hover:text-sky-200">
                Öffnen
                <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 sm:grid-cols-[1.2fr_1fr] sm:p-8">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            Benötigen Sie persönlichen Support?
          </h2>
          <p className="text-sm text-slate-300 sm:text-base">
            Das Roadmap-Team unterstützt bei Berechtigungen, Anpassungen und Fragen zum Betrieb.
            Melden Sie sich mit einer kurzen Beschreibung Ihres Anliegens – wir melden uns werktags
            innerhalb von 24 Stunden.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:roadmap@jsd.bs.ch"
              className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              E-Mail schreiben
            </a>
            <Link
              href="/docs"
              className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
            >
              Technische Dokumentation
            </Link>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 text-sm text-slate-300">
          <h3 className="text-base font-semibold text-white">Hinweise & Updates</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span
                className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200"
                aria-hidden="true"
              >
                I
              </span>
              <span>
                Systemstatus: <strong className="text-slate-100">betriebsbereit</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200"
                aria-hidden="true"
              >
                N
              </span>
              <span>Neue Werkzeuge f?r die Kategorie-Verwaltung befinden sich im Rollout.</span>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200"
                aria-hidden="true"
              >
                W
              </span>
              <span>
                Workshops finden am letzten Donnerstag im Monat statt ? Anmeldung via{' '}
                <a
                  href="mailto:roadmap@jsd.bs.ch"
                  className="underline decoration-dotted underline-offset-4 transition hover:text-white"
                >
                  roadmap@jsd.bs.ch
                </a>
                .
              </span>
            </li>
          </ul>
        </div>
      </section>
    </HelpLayout>
  );
};

export default HelpHome;
