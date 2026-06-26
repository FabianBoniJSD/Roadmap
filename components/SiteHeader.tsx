import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useEffect, useState } from 'react';
import {
  ADMIN_SESSION_CHANGED_EVENT,
  getAdminSessionToken,
  hasAdminAccessToCurrentInstance,
  hasValidAdminSession,
} from '@/utils/auth';
import ColorModeToggle from '@/components/ColorModeToggle';
import { INSTANCE_QUERY_PARAM, INSTANCE_COOKIE_NAME } from '@/utils/instanceConfig';
import Image from 'next/image';

type RouteKey = 'home' | 'instances' | 'roadmap' | 'help' | 'docs' | 'admin' | 'feedback';

type SiteHeaderProps = {
  activeRoute?: RouteKey;
  brandLabel?: string;
};

const INSTANCE_CONTEXT_CHANGED_EVENT = 'roadmap-instance-changed';

const NAV_ITEMS: Array<{
  key: RouteKey;
  href: string;
  label: string;
}> = [
  { key: 'home', href: '/landing', label: 'Start' },
  { key: 'instances', href: '/instances', label: 'Instanzübersicht' },
  { key: 'roadmap', href: '/roadmap', label: 'Roadmap' },
  { key: 'help', href: '/help', label: 'Hilfe' },
  { key: 'feedback', href: '/feedback', label: 'Feedback' },
];

const deriveRouteKey = (pathname: string): RouteKey => {
  if (pathname === '/' || pathname.startsWith('/landing')) return 'home';
  if (pathname.startsWith('/instances')) return 'instances';
  if (pathname.startsWith('/roadmap')) return 'roadmap';
  if (pathname.startsWith('/help')) return 'help';
  if (pathname.startsWith('/feedback')) return 'feedback';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'home';
};

const SiteHeader: React.FC<SiteHeaderProps> = ({
  activeRoute,
  brandLabel = 'Kantonale Roadmap',
}) => {
  const router = useRouter();
  const pathname = router.pathname || '';
  const currentRoute = activeRoute ?? deriveRouteKey(pathname);
  const querySlug = useMemo(() => {
    const raw = router.query?.[INSTANCE_QUERY_PARAM];
    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  }, [router.query]);

  const [cookieSlug, setCookieSlug] = useState<string>('');
  const [showAdminLink, setShowAdminLink] = useState(false);
  const [showFeedbackLink, setShowFeedbackLink] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const updateCookieSlug = () => {
      try {
        const cookies = document.cookie || '';
        const match = cookies.match(
          new RegExp(`(?:^|;\\s*)${INSTANCE_COOKIE_NAME}=([^;\\s]+)`, 'i')
        );
        setCookieSlug(match?.[1] ? decodeURIComponent(match[1]) : '');
      } catch {
        setCookieSlug('');
      }
    };

    updateCookieSlug();
    window.addEventListener('focus', updateCookieSlug);
    window.addEventListener(ADMIN_SESSION_CHANGED_EVENT, updateCookieSlug);
    window.addEventListener(INSTANCE_CONTEXT_CHANGED_EVENT, updateCookieSlug);

    return () => {
      window.removeEventListener('focus', updateCookieSlug);
      window.removeEventListener(ADMIN_SESSION_CHANGED_EVENT, updateCookieSlug);
      window.removeEventListener(INSTANCE_CONTEXT_CHANGED_EVENT, updateCookieSlug);
    };
  }, [router.asPath]);

  const instanceSlug = querySlug || cookieSlug || '';
  const maybeQuery = instanceSlug ? { [INSTANCE_QUERY_PARAM]: instanceSlug } : undefined;
  const adminLinkSlug = querySlug || cookieSlug;
  const hasAdminHref = Boolean(adminLinkSlug);
  const brandHref = maybeQuery ? { pathname: '/landing', query: maybeQuery } : '/landing';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateFeedbackLink = () => setShowFeedbackLink(Boolean(getAdminSessionToken()));
    updateFeedbackLink();
    window.addEventListener(ADMIN_SESSION_CHANGED_EVENT, updateFeedbackLink);
    return () => window.removeEventListener(ADMIN_SESSION_CHANGED_EVENT, updateFeedbackLink);
  }, [router.asPath]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (currentRoute === 'admin') {
        if (!cancelled) setShowAdminLink(hasAdminHref);
        return;
      }

      if (!hasAdminHref) {
        if (!cancelled) setShowAdminLink(false);
        return;
      }

      try {
        const [hasSession, hasInstanceAdminAccess] = await Promise.all([
          hasValidAdminSession(),
          hasAdminAccessToCurrentInstance(),
        ]);
        if (!cancelled) setShowAdminLink(Boolean(hasSession && hasInstanceAdminAccess));
      } catch {
        if (!cancelled) setShowAdminLink(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [currentRoute, hasAdminHref]);

  return (
    <header className="ds-topbar">
      <Link className="ds-brand" href={brandHref}>
        <Image src="/logo.png" alt="Roadmap Logo" width={32} height={32} />
        <span className="ds-brand-name">{brandLabel}</span>
      </Link>

      <nav className="ds-nav" aria-label="Hauptnavigation">
        {NAV_ITEMS.filter((item) => item.key !== 'roadmap' || currentRoute === 'roadmap')
          .filter((item) => item.key !== 'feedback' || showFeedbackLink)
          .map((item) => {
            const isActive = currentRoute === item.key;
            return (
              <Link
                key={item.href}
                href={maybeQuery ? { pathname: item.href, query: maybeQuery } : item.href}
                className={clsx('ds-nav-link', isActive && 'is-active')}
                data-active={isActive ? 'true' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="ds-topbar-actions">
        <ColorModeToggle className="ds-color-mode-toggle" />
        {hasAdminHref && showAdminLink ? (
          <Link
            href={{ pathname: '/admin', query: { [INSTANCE_QUERY_PARAM]: adminLinkSlug } }}
            className={clsx('ds-nav-link', currentRoute === 'admin' && 'is-active')}
            data-active={currentRoute === 'admin' ? 'true' : undefined}
          >
            Adminbereich
          </Link>
        ) : null}
      </div>
    </header>
  );
};

export default SiteHeader;
