import Link from 'next/link';
import { type FC, type ReactNode } from 'react';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

type Breadcrumb = {
  label: string;
  href?: string;
};

type AdminSubpageLayoutProps = {
  title: string;
  description?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  maxWidthClassName?: string;
};

const AdminSubpageLayout: FC<AdminSubpageLayoutProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  eyebrow = 'Adminbereich',
  maxWidthClassName = 'max-w-5xl',
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SiteHeader activeRoute="admin" />

      <main className="relative flex-1">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[6%] top-[-12%] h-60 w-60 rounded-full bg-sky-500/30 blur-3xl" />
          <div className="absolute right-[12%] top-1/3 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full px-6 py-12 sm:px-8 lg:py-16">
          <div className={`mx-auto w-full ${maxWidthClassName} space-y-10`}>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500"
              >
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  if (isLast || !crumb.href) {
                    return (
                      <span
                        key={`${crumb.label}-${index}`}
                        className={isLast ? 'text-slate-200' : undefined}
                      >
                        {crumb.label}
                      </span>
                    );
                  }

                  return (
                    <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                      <Link
                        href={crumb.href}
                        className="font-medium text-slate-300 transition hover:text-white"
                      >
                        {crumb.label}
                      </Link>
                      <span aria-hidden="true" className="opacity-60">
                        /
                      </span>
                    </span>
                  );
                })}
              </nav>
            )}

            <header className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-8 shadow-xl shadow-slate-950/40 sm:px-9">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300/80">
                  {eyebrow}
                </p>
                <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  {title}
                </h1>
                {description && (
                  <div className="text-sm text-slate-300 sm:text-base leading-relaxed">
                    {description}
                  </div>
                )}
              </div>
              {actions && (
                <div className="flex flex-wrap gap-3 text-sm text-slate-300">{actions}</div>
              )}
            </header>

            <div className="space-y-10">{children}</div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AdminSubpageLayout;
