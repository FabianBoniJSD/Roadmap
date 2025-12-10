import Head from 'next/head';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

const SupportPage = () => {
  return (
    <>
      <Head>
        <title>Support | JSDoIT Roadmap Center</title>
      </Head>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <SiteHeader />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-8 lg:py-16">
            <header className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300/80">
                Support
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Kontakt zum Roadmap-Team
              </h1>
              <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
                Wir helfen bei Fragen zur Roadmap, fehlenden Berechtigungen oder technischen
                Problemen. Wählen Sie den passenden Kontaktweg oder senden Sie uns direkt Feedback
                über das eingebettete Formular.
              </p>
            </header>

            <section className="mt-10 grid gap-6 sm:grid-cols-2">
              <article className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40 sm:p-8">
                <h2 className="text-lg font-semibold text-white sm:text-xl">
                  E-Mail an das Roadmap-Team
                </h2>
                <p className="mt-3 text-sm text-slate-300 sm:text-base">
                  Beschreiben Sie Ihr Anliegen so konkret wie möglich. Wir melden uns werktags
                  innerhalb von 24 Stunden zurück.
                </p>
                <div className="mt-5">
                  <a
                    href="mailto:fabian.boni@jsd.bs.ch"
                    className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                  >
                    E-Mail schreiben
                  </a>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40 sm:p-8">
                <h2 className="text-lg font-semibold text-white sm:text-xl">Feedback teilen</h2>
                <p className="mt-3 text-sm text-slate-300 sm:text-base">
                  Nutzen Sie unser Formular, um Ideen, Probleme oder Wünsche zu übermitteln. Ihre
                  Rückmeldung geht direkt an das Roadmap-Team.
                </p>
                <div className="mt-5 flex gap-3">
                  <Link
                    href="/feedback"
                    className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 px-5 py-2.5 text-sm font-semibold text-sky-200 transition hover:border-sky-400 hover:text-white"
                  >
                    Feedback-Seite öffnen
                  </Link>
                </div>
              </article>
            </section>

            <section className="mt-10 space-y-5 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40 sm:p-8">
              <h2 className="text-lg font-semibold text-white sm:text-xl">Weitere Anlaufstellen</h2>
              <ul className="space-y-3 text-sm text-slate-300 sm:text-base">
                <li>
                  <span className="font-semibold text-slate-100">Technische Dokumentation:</span>{' '}
                  <Link
                    href="/docs"
                    className="underline decoration-dotted underline-offset-4 transition hover:text-white"
                  >
                    /docs
                  </Link>
                </li>
                <li>
                  <span className="font-semibold text-slate-100">Hilfe & Support:</span>{' '}
                  <Link
                    href="/help"
                    className="underline decoration-dotted underline-offset-4 transition hover:text-white"
                  >
                    /help
                  </Link>
                </li>
                <li>
                  <span className="font-semibold text-slate-100">Admin-Kontakte:</span>{' '}
                  fabian.boni@jsd.bs.ch (Service-Accounts & Berechtigungen)
                </li>
              </ul>
            </section>
          </div>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default SupportPage;
