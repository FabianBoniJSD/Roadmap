import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { hasAdminAccess, hasAdminAccessToCurrentInstance } from '@/utils/auth';
import JSDoITLoader from '@/components/JSDoITLoader';

// Define a generic type parameter for the component props
export default function withAdminAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  // Use the same generic type for the returned component
  return function WithAdminAuth(props: P) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
    const dbg = () =>
      typeof window !== 'undefined' &&
      ((window.localStorage && localStorage.getItem('debugAuth')) ||
        /([?&])debug=auth(?![\w-])/i.test(window.location.search));

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Check service account admin access directly
          const hasAccess = await hasAdminAccess();
          if (dbg()) {
            // eslint-disable-next-line no-console
            console.log('[withAdminAuth] Service account admin check =', hasAccess);
          }

          if (!hasAccess) {
            if (dbg()) {
              // eslint-disable-next-line no-console
              console.log('[withAdminAuth] Service account has no admin access');
            }
            // Show error page instead of redirect (no user login possible)
            setIsLoading(false);
            // Could redirect to an error page or show inline error
            router.push('/admin/login?returnUrl=' + encodeURIComponent(router.asPath));
            return;
          }

          // For JWT sessions, also enforce per-instance allowlists.
          // Skip the check on the instances overview page so users can always reach the picker.
          if (!router.pathname.startsWith('/admin/instances')) {
            const allowedForInstance = await hasAdminAccessToCurrentInstance();
            if (!allowedForInstance) {
              setForbiddenMessage(
                'Kein Zugriff auf diese Instanz. Bitte wähle eine andere Instanz oder wende dich an die Administration.'
              );
              setIsLoading(false);
              return;
            }
          }

          setIsLoading(false);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Auth check error:', error);
          if (dbg()) {
            // eslint-disable-next-line no-console
            console.log('[withAdminAuth] exception during auth check');
          }
          setIsLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <JSDoITLoader sizeRem={2.5} message="Admin-Zugriff wird geprüft …" />
        </div>
      );
    }

    if (forbiddenMessage) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-amber-500/40 bg-amber-500/10 p-8 shadow-xl shadow-slate-950/40">
            <h1 className="text-xl font-semibold text-white">Zugriff eingeschränkt</h1>
            <p className="mt-3 text-sm text-amber-100">{forbiddenMessage}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/admin/instances')}
                className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Zur Instanzen-Übersicht
              </button>
              <button
                onClick={() =>
                  router.push('/admin/login?returnUrl=' + encodeURIComponent(router.asPath))
                }
                className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white"
              >
                Erneut anmelden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
