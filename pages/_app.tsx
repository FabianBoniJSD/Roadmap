import { JSX, useEffect } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import type { AppProps } from 'next/app';
import './globals.css';

// Define a type for the window with our custom property
interface CustomWindow extends Window {
  __fluentUIIconsInitialized?: boolean;
}

function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  useEffect(() => {
    // Only initialize icons once on the client side
    if (typeof window !== 'undefined') {
      const customWindow = window as CustomWindow;
      if (!customWindow.__fluentUIIconsInitialized) {
        initializeIcons();
        customWindow.__fluentUIIconsInitialized = true;
      }

      // Temporary fetch monkey patch to reroute any lingering absolute SharePoint REST calls via proxy (CORS bypass)
      const SP_HOST = 'https://spi-u.intranet.bs.ch';
      if (!(window as any).__spFetchPatched) {
        const originalFetch = window.fetch.bind(window);
        (window as any).__spFetchPatched = true;
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
          } catch (e) {
            // swallow and fall through
          }
          return originalFetch(input as any, init);
        };
      }
    }
  }, []);
  
  return <Component {...pageProps} />;
}

export default MyApp;