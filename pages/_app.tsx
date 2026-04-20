import { JSX, useEffect } from 'react';
import { useRouter } from 'next/router';
import { clientDataService } from '@/utils/clientDataService';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import type { AppProps } from 'next/app';
import type { Category, Project } from '@/types';
import './css/globals.css';
import 'react-quill/dist/quill.snow.css';
import { INSTANCE_COOKIE_NAME, INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import Head from 'next/head';
import { prefixBasePath } from '@/utils/nextBasePath';

// Define a type for the window with our custom property
interface CustomWindow extends Window {
  __fluentUIIconsInitialized?: boolean;
  __spFetchPatched?: boolean;
  clientDataService?: typeof clientDataService;
  fetchCategoriesAndProjects?: () => Promise<{
    cats: Category[];
    projs: Project[];
    unmapped: Project[];
  }>;
  __categories?: Category[];
  __projects?: Project[];
}

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

  useEffect(() => {
    // Only initialize icons once on the client side
    if (typeof window !== 'undefined') {
      const customWindow = window as CustomWindow;
      if (!customWindow.__fluentUIIconsInitialized) {
        initializeIcons();
        customWindow.__fluentUIIconsInitialized = true;
      }

      // Temporary fetch monkey patch to reroute any lingering absolute SharePoint REST calls via proxy (CORS bypass)
      const SP_HOST = 'https://spi.intranet.bs.ch';
      if (!customWindow.__spFetchPatched) {
        const originalFetch = window.fetch.bind(window);
        customWindow.__spFetchPatched = true;
        window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
          try {
            if (typeof input === 'string' && input.startsWith(SP_HOST)) {
              const idx = input.indexOf('/_api/');
              if (idx > -1) {
                const apiSuffix = input.substring(idx); // _api/...
                // Build proxy path
                const proxyUrl = '/api/sharepoint/' + apiSuffix.replace(/^_api\//, '_api/');
                return originalFetch(proxyUrl, init);
              }
            }
          } catch {
            // swallow and fall through
          }
          return originalFetch(input, init);
        };
      }
    }
  }, []);

  if (maintenanceModeEnabled) {
    return (
      <>
        <Head>
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
        </main>
      </>
    );
  }

  return <Component {...pageProps} />;
}

export default RoadmapApp;
