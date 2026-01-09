import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { INSTANCE_QUERY_PARAM } from '@/utils/instanceConfig';

type RouteKey = 'home' | 'roadmap' | 'help' | 'docs' | 'admin';

type SiteHeaderProps = {
  activeRoute?: RouteKey;
  brandLabel?: string;
};

const NAV_ITEMS: Array<{ key: RouteKey; href: string; label: string }> = [
  { key: 'home', href: '/', label: 'Start' },
  { key: 'roadmap', href: '/roadmap', label: 'Roadmap' },
  { key: 'help', href: '/help', label: 'Hilfe' },
  { key: 'docs', href: '/docs', label: 'Dokumentation' },
];

const deriveRouteKey = (pathname: string): RouteKey => {
  if (pathname.startsWith('/roadmap')) return 'roadmap';
  if (pathname.startsWith('/help')) return 'help';
  if (pathname.startsWith('/docs')) return 'docs';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'home';
};

const SiteHeader: React.FC<SiteHeaderProps> = ({
  activeRoute,
  brandLabel = 'JSDoIT Roadmap Center',
}) => {
  const router = useRouter();
  const pathname = router.pathname || '';
  const currentRoute = activeRoute ?? deriveRouteKey(pathname);
  const querySlug = useMemo(() => {
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  }, [router.query]);

  const [cookieSlug, setCookieSlug] = useState<string>('');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    try {
      const cookies = document.cookie || '';
      const match = cookies.match(new RegExp(`(?:^|;\\s*)${INSTANCE_COOKIE_NAME}=([^;\\s]+)`, 'i'));
      if (match && match[1]) setCookieSlug(decodeURIComponent(match[1]));
    } catch {
      /* ignore */
    }
  }, []);

  const instanceSlug = querySlug || cookieSlug || '';
  const maybeQuery = instanceSlug ? { [INSTANCE_QUERY_PARAM]: instanceSlug } : undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5 sm:px-8">
        <Link
          href={maybeQuery ? { pathname: '/', query: maybeQuery } : '/'}
          className="flex items-center gap-2 text-lg font-semibold text-slate-100"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 via-sky-300 to-amber-200 text-base font-bold text-slate-900 shadow-lg shadow-sky-900/30">
            JS
          </span>
          <span className="tracking-wide text-slate-100">{brandLabel}</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-300 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.key;
            return (
              <Link
                key={item.href}
                href={maybeQuery ? { pathname: item.href, query: maybeQuery } : item.href}
                className={clsx(
                  'rounded-full px-4 py-2 transition',
                  isActive
                    ? 'bg-slate-800 text-white shadow-inner shadow-sky-900/40'
                    : 'hover:text-white hover:shadow hover:shadow-slate-900/40'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={maybeQuery ? { pathname: '/admin/login', query: maybeQuery } : '/admin/login'}
            className={clsx(
              'rounded-full border px-4 py-2 text-sm font-semibold transition',
              currentRoute === 'admin'
                ? 'border-sky-400 text-white shadow-inner shadow-sky-900/40'
                : 'border-sky-500/60 text-sky-200 hover:border-sky-400 hover:text-white'
            )}
          >
            Adminbereich
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
