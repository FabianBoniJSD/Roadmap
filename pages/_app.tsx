import { JSX, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import './css/design-system.css';
import './css/globals.css';
import './css/workspace.css';
import './css/control-room.css';
import { INSTANCE_COOKIE_NAME, INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import Head from 'next/head';
import { prefixBasePath } from '@/utils/nextBasePath';
import OrbitLauncher from '@/components/OrbitLauncher';
import AiEndpointHealthBanner from '@/components/AiEndpointHealthBanner';
import ActivityIndicator from '@/components/ActivityIndicator';

function RoadmapApp({ Component, pageProps }: AppProps): JSX.Element {
  const router = useRouter();
  const maintenanceModeEnabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  const maintenanceMessage =
    process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE ||
    'Undefined maintenance message. Please set NEXT_PUBLIC_MAINTENANCE_MESSAGE in your environment variables.';
  const maintenanceTime = process.env.NEXT_PUBLIC_MAINTENANCE_TIME || 'Undetermined time';

  // Keep instance cookie in sync with query parameter on any route
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    const slug = Array.isArray(raw) ? raw[0] : raw;
    if (!slug) return;

    try {
      const cookies = document.cookie || '';
      const match = cookies.match(new RegExp(`(?:^|;\s*)${INSTANCE_COOKIE_NAME}=([^;\s]+)`, 'i'));
      const current = match && match[1] ? decodeURIComponent(match[1]) : '';
      if (current !== slug) {
        document.cookie = `${INSTANCE_COOKIE_NAME}=${encodeURIComponent(slug)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
      }
    } catch {
      /* ignore cookie access issues */
    }
  }, [router.query]);

  if (maintenanceModeEnabled) {
    return (
      <>
        <AiEndpointHealthBanner />
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="stylesheet" href={prefixBasePath('/maintenance.css')} />
        </Head>
        <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-gray-900 text-white">
          {/* Backgrounds */}
          <div className="grid-bg" />
          <div className="radial-glow" />
          <div className="corner-glow-tl" />
          <div className="corner-glow-br" />
          <div className="deco-line-left" />
          <div className="deco-line-right" />

          <div className="fixed top-0 w-full">
            <SiteHeader />
          </div>

          {/* Main content */}
          <div className="container">
            <div className="card">
              <div className="eyebrow">
                <div className="eyebrow-line" />
                <span className="eyebrow-text">Systemwartung</span>
              </div>

              <h1 className="title">
                Gleich wieder
                <br />
                <span>zurück.</span>
              </h1>

              <p className="subtitle">{maintenanceMessage}</p>

              {/* Info chips */}
              <div className="chips">
                <div className="chip">
                  <span className="chip-icon">⏱</span>
                  Geschätzte Zeit: {maintenanceTime}.
                </div>
              </div>

              <div className="divider" />

              <div className="status-row">
                <div className="status-text">
                  <div className="spinner" />
                  System wird konfiguriert.
                </div>
                <a href="mailto:fabian.boni@jsd.bs.ch" className="contact-link">
                  SUPPORT KONTAKTIEREN ↗
                </a>
              </div>
            </div>
          </div>
          <div className="fixed bottom-0 w-full">
            <SiteFooter />
          </div>
          <ActivityIndicator />
        </main>
      </>
    );
  }

  return (
    <>
      <AiEndpointHealthBanner />
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href={prefixBasePath('/favicon.ico')}
          type="image/x-icon"
          sizes="16x16 32x32 48x48"
        />
        <link rel="icon" href={prefixBasePath('/logo.svg')} type="image/svg+xml" sizes="any" />
      </Head>
      <Component {...pageProps} />
      <ActivityIndicator />
      <OrbitLauncher />
    </>
  );
}

export default RoadmapApp;
