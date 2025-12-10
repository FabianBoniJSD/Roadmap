import Head from 'next/head';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

const FeedbackPage = () => {
  return (
    <>
      <Head>
        <title>Feedback | JSDoIT Roadmap Center</title>
      </Head>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <SiteHeader />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-8 lg:py-16">
            <header className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300/80">
                Feedback
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Ihre Rückmeldung</h1>
              <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                Teilen Sie uns mit, wie wir das Roadmap Center weiter verbessern können. Das
                Formular öffnet in einem eingebetteten Microsoft Forms Fenster. Ihre Eingabe wird
                direkt an das Roadmap-Team übermittelt.
              </p>
            </header>

            <section className="mt-8 space-y-4">
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/40 sm:p-6">
                <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900/70">
                  <iframe
                    title="Feedbackformular"
                    src="https://forms.office.com/Pages/ResponsePage.aspx?id=lS8XEZqje0-SJMahHR5cJNwo2HJojXNPjRfBAiK7kcBUNlEzQlZSQVdTMFlNWFBMTE85Q045UVRWTCQlQCN0PWcu&embed=true"
                    width="640"
                    height="480"
                    className="h-[480px] w-full"
                    frameBorder="0"
                    marginWidth={0}
                    marginHeight={0}
                    allowFullScreen
                    style={{ border: 'none', maxWidth: '100%', maxHeight: '100vh' }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Hinweis: Falls das Formular nicht angezeigt wird, öffnen Sie es{' '}
                  <a
                    href="https://forms.office.com/Pages/ResponsePage.aspx?id=lS8XEZqje0-SJMahHR5cJNwo2HJojXNPjRfBAiK7kcBUNlEzQlZSQVdTMFlNWFBMTE85Q045UVRWTCQlQCN0PWcu"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-300 underline decoration-dotted underline-offset-4 transition hover:text-white"
                  >
                    direkt in Microsoft Forms
                  </a>
                  .
                </p>
              </div>
            </section>
          </div>
        </main>
        <SiteFooter />
      </div>
    </>
  );
};

export default FeedbackPage;
