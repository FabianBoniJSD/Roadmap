import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { buildInstanceAwareUrl, hasValidAdminSession } from '@/utils/auth';
import JSDoITLoader from '@/components/JSDoITLoader';

export default function withSuperAdminAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithSuperAdminAuth(props: P) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

    useEffect(() => {
      const run = async () => {
        try {
          const ok = await hasValidAdminSession();
          if (!ok) {
            router.push('/admin/login?returnUrl=' + encodeURIComponent(router.asPath));
            return;
          }

          try {
            const resp = await fetch(buildInstanceAwareUrl('/api/auth/check-admin-session'), {
              credentials: 'same-origin',
            });
            const data = await resp.json().catch(() => null);
            if (!resp.ok || !data || data.isSuperAdmin !== true) {
              setForbiddenMessage(
                'Kein Zugriff: Instanzen können nur von Benutzern mit der Gruppe superadmin verwaltet werden.'
              );
              return;
            }
          } catch {
            setForbiddenMessage(
              'Kein Zugriff: Instanzen können nur von Benutzern mit der Gruppe superadmin verwaltet werden.'
            );
            return;
          }
        } finally {
          setIsLoading(false);
        }
      };

      run();
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
          <div className="w-full max-w-lg rounded-3xl border border-amber-500/40 bg-amber-500/10 p-8 ">
            <h1 className="text-xl font-semibold text-white">Zugriff eingeschränkt</h1>
            <p className="mt-3 text-sm text-amber-100">{forbiddenMessage}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => router.push(buildInstanceAwareUrl('/admin'))}
                className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Zum Adminbereich
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
