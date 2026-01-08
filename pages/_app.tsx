import { JSX, useEffect } from 'react';
import { useRouter } from 'next/router';
import { clientDataService } from '@/utils/clientDataService';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import type { AppProps } from 'next/app';
import type { Category, Project } from '@/types';
import './globals.css';
import { INSTANCE_COOKIE_NAME, INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';

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

function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  const router = useRouter();

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

      // Optional debug exposure (development / analysis only)
      if (process.env.NEXT_PUBLIC_DEBUG_EXPOSE === '1') {
        customWindow.clientDataService = clientDataService;
        customWindow.fetchCategoriesAndProjects = async () => {
          const [cats, projs] = await Promise.all([
            clientDataService.getAllCategories(),
            clientDataService.getAllProjects(),
          ]);
          customWindow.__categories = cats;
          customWindow.__projects = projs;
          const catIds = new Set(cats.map((c) => c.id));
          const unmapped = projs.filter((p) => !catIds.has(String(p.category || '')));
          console.log('[debug] categories:', cats);
          console.log('[debug] projects (first 5):', projs.slice(0, 5));
          console.log(
            '[debug] unmapped project categories count:',
            unmapped.length,
            unmapped.slice(0, 10).map((p) => ({ id: p.id, cat: p.category, title: p.title }))
          );
          return { cats, projs, unmapped };
        };
      }
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
