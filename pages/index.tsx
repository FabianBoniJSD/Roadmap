import Head from 'next/head';
import Link from 'next/link';
import {
  FiArrowUpRight,
  FiCheckCircle,
  FiCompass,
  FiGrid,
  FiLayers,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

const valueProps = [
  {
    title: 'Zentrale Transparenz',
    icon: FiLayers,
    description:
      'Roadmaps, Statusstände und Verantwortlichkeiten werden an einem Ort gebündelt und bleiben für Stakeholder nachvollziehbar.',
  },
  {
    title: 'SharePoint als Quelle',
    icon: FiShield,
    description:
      'Die Applikation nutzt die bestehende SharePoint-Struktur weiter, inklusive Rollen, Listen und vorhandenen Betriebsprozessen.',
  },
  {
    title: 'Schneller Zugang pro Instanz',
    icon: FiCompass,
    description:
      'Benutzer öffnen genau die Instanz, für die sie freigeschaltet sind, ohne manuell zwischen verschiedenen Umgebungen wechseln zu müssen.',
  },
];

const workflowSteps = [
  {
    title: 'Zugang prüfen',
    description: 'Benutzer melden sich an und sehen nur die Instanzen, für die Freigaben bestehen.',
  },
  {
    title: 'Instanz öffnen',
    description: 'Die passende Roadmap wird gezielt im separaten Übersichtsfenster ausgewählt.',
  },
  {
    title: 'Vorhaben steuern',
    description:
      'Status, Kategorien, Zuständigkeiten und Prioritäten bleiben für alle Rollen sichtbar.',
  },
];

const spotlightStats = [
  { label: 'Mehrinstanzfähig', value: 'Polizei, Feuerwehr, Rettungsdienste' },
  { label: 'Datenhaltung', value: 'SharePoint' },
  { label: 'Zugriffsmodell', value: 'Rollenbasiert' },
];

const audienceCards = [
  {
    title: 'Fachbereiche',
    description:
      'Verfolgen Prioritäten, Abhängigkeiten und geplante Deliverables in ihrer Instanz.',
  },
  {
    title: 'Portfoliosteuerung',
    description: 'Erhält einen belastbaren Überblick über Status, Reifegrad und Steuerungsbedarf.',
  },
  {
    title: 'Instanz-Admins',
    description: 'Pflegen Projekte, Kategorien und Inhalte innerhalb ihres abgegrenzten Bereichs.',
  },
  {
    title: 'Superadmins',
    description: 'Steuern Instanzen, technische Konfiguration und zentrale Zugriffslogik.',
  },
];

const LandingPage = () => {
  return (
    <>
      <Head>
        <title>JSDoIT Roadmap</title>
      </Head>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <SiteHeader activeRoute="home" />
        <main className="flex-1">
          <section className="relative isolate overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_32%),radial-gradient(circle_at_85%_15%,_rgba(251,191,36,0.15),_transparent_24%),linear-gradient(180deg,_#08111f_0%,_#0f172a_55%,_#09111d_100%)]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/40 to-transparent" />
              <div className="absolute left-[-8%] top-8 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="absolute right-[6%] top-[-12%] h-[26rem] w-[26rem] rounded-full bg-sky-500/20 blur-3xl" />
              <div className="absolute bottom-[-20%] left-1/3 h-[22rem] w-[22rem] rounded-full bg-amber-300/10 blur-3xl" />
              <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:72px_72px]" />
            </div>

            <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
              <div className="max-w-3xl space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200 backdrop-blur">
                  <FiGrid className="h-4 w-4" />
                  JSDoIT Roadmap Center
                </div>

                <div className="space-y-6">
                  <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                    Roadmaps, Prioritäten und Instanzen in einer klaren visuellen Einstiegsebene
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                    Die Anwendung verbindet SharePoint-basierte Roadmap-Daten mit einer zentralen,
                    verständlichen Oberfläche. Fachbereiche, Steuerung und Administration starten
                    von hier aus in die richtige Instanz und behalten gleichzeitig den Gesamtzweck
                    der Plattform im Blick.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/instances"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-200 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.22)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_60px_rgba(34,211,238,0.28)]"
                  >
                    Instanzübersicht in neuem Fenster öffnen
                    <FiArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/help"
                    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/10"
                  >
                    Mehr zur Nutzung
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {spotlightStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 backdrop-blur"
                    >
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 p-7 shadow-[0_24px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl">
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200/80">
                        Plattformlogik
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-white">
                        Ein sauberer Einstieg statt verstreuter Links
                      </h2>
                    </div>
                    <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 sm:flex">
                      <FiTrendingUp className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {workflowSteps.map((step, index) => (
                      <div
                        key={step.title}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/30 to-sky-500/20 text-sm font-semibold text-cyan-100">
                            0{index + 1}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[1.5rem] border border-amber-300/15 bg-gradient-to-br from-amber-300/10 via-transparent to-cyan-300/5 p-5 text-sm leading-6 text-slate-200">
                    Die Instanzübersicht öffnet sich bewusst separat. Dadurch bleibt diese Seite der
                    allgemeine Einstieg für Information, Orientierung und Navigation.
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="border-b border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.96)_0%,_rgba(8,15,28,1)_100%)]">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
              <div className="grid gap-8 lg:grid-cols-[0.68fr_1.32fr] lg:items-end">
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                    Nutzen der Anwendung
                  </p>
                  <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                    Was diese Plattform im Alltag besser macht
                  </h2>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  Das Roadmap Center dient als gemeinsamer Zugangspunkt für verteilte Roadmap-
                  Instanzen. Inhalte können zentral präsentiert werden, während die Datenhaltung und
                  Berechtigungen an die vorhandene SharePoint-Landschaft angebunden bleiben.
                </p>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {valueProps.map((item) => (
                  <article
                    key={item.title}
                    className="group rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-6 shadow-[0_18px_50px_rgba(2,6,23,0.35)] transition hover:border-cyan-300/30 hover:translate-y-[-2px]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/15 to-amber-200/10 text-cyan-100 ring-1 ring-white/10">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                      <FiCheckCircle className="h-4 w-4" />
                      Für den produktiven Einsatz
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
            <div className="grid gap-10 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.8)_0%,_rgba(3,7,18,0.92)_100%)] p-8 shadow-[0_30px_100px_rgba(2,6,23,0.45)] lg:grid-cols-[0.88fr_1.12fr] lg:p-10">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300">
                  <FiUsers className="h-4 w-4" />
                  Für wen die Plattform gedacht ist
                </div>
                <h2 className="text-2xl font-semibold text-white sm:text-4xl">
                  Geeignet für Fachbereiche, Portfoliosteuerung und Administration
                </h2>
                <p className="text-sm leading-7 text-slate-300 sm:text-base">
                  Die Anwendung unterstützt reine Leserollen ebenso wie operative Pflege und
                  übergreifende Governance. Das Design trennt Information, Navigation und Zugriff
                  klar, damit die Oberfläche auch bei mehreren Instanzen verständlich bleibt.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {audienceCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5 transition hover:border-amber-200/20 hover:bg-slate-950/80"
                  >
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default LandingPage;
