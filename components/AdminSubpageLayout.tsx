import Link from 'next/link';
import { type FC, type ReactNode } from 'react';
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

const resolveWidthModifier = (maxWidthClassName: string) => {
  if (maxWidthClassName.includes('max-w-3xl')) return 'is-narrow';
  if (maxWidthClassName.includes('max-w-6xl')) return 'is-wide';
  return '';
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
  const widthModifier = resolveWidthModifier(maxWidthClassName);

  return (
    <div className="theme-page-shell contents">
      <div className="ds-page-shell before:[position:absolute] before:[inset:0] before:[z-index:0] before:[pointer-events:none] before:[background-size:56px_56px] after:[position:absolute] after:[right:-10%] after:[bottom:-25%] after:[left:-10%] after:[z-index:0] after:[height:38vh] after:[pointer-events:none] [position:relative] [isolation:isolate] [display:flex] [min-height:100vh] [flex-direction:column] [overflow:hidden] [background:var(--ds-bg-page)] [color:var(--ds-text-default)] [font-family:var(--ds-font-sans)] [&>*]:[position:relative] [&>*]:[z-index:1]">
        <SiteHeader activeRoute="admin" />

        <main className="ds-page-main [flex:1] ds-admin-subpage-main [flex:1] [padding-block:clamp(34px,_5vw,_64px)_72px]">
          <div
            className={`ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-admin-subpage-inner [display:grid] [width:min(100%,_960px)] [gap:var(--ds-space-6)] [&.is-narrow]:[width:min(100%,_768px)] [&.is-wide]:[width:min(100%,_1180px)]${widthModifier ? ` ${widthModifier}` : ''}`}
          >
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="ds-admin-breadcrumbs [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-2)] [color:var(--ds-text-muted)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]"
              >
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  if (isLast || !crumb.href) {
                    return (
                      <span
                        key={`${crumb.label}-${index}`}
                        className="ds-admin-breadcrumb-current [color:var(--ds-text-strong)]"
                      >
                        {crumb.label}
                      </span>
                    );
                  }

                  return (
                    <span key={`${crumb.label}-${index}`} className="ds-admin-breadcrumb-group">
                      <Link
                        href={crumb.href}
                        className="ds-admin-breadcrumb-link [color:var(--ds-text-muted)] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                      >
                        {crumb.label}
                      </Link>
                      <span
                        aria-hidden="true"
                        className="ds-admin-breadcrumb-separator [opacity:0.55]"
                      >
                        /
                      </span>
                    </span>
                  );
                })}
              </nav>
            )}

            <header className="ds-card [position:relative] [overflow:hidden] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-elevated-strong)] before:[position:absolute] before:[inset:0] before:[pointer-events:none] [&>*]:[position:relative] ds-admin-subpage-hero [display:grid] [gap:var(--ds-space-5)] [padding:clamp(24px,_4vw,_36px)] [border-radius:var(--ds-radius-xl)]">
              <div>
                <p className="ds-panel-label [margin:0_0_12px] [color:var(--ds-accent-strong)] [font-size:0.75rem] [font-weight:600] [letter-spacing:normal] [text-transform:none]">
                  {eyebrow}
                </p>
                <h1 className="ds-admin-subpage-title [margin:0] [color:var(--ds-text-strong)] [font-size:clamp(2rem,_4vw,_3.2rem)] [font-weight:600] [line-height:1.05]">
                  {title}
                </h1>
                {description && (
                  <div className="ds-admin-subpage-description [max-width:760px] [color:var(--ds-text-default)] [font-size:1rem] [line-height:1.7]">
                    {description}
                  </div>
                )}
              </div>
              {actions && (
                <div className="ds-admin-subpage-actions [display:flex] [flex-wrap:wrap] [gap:var(--ds-space-3)]">
                  {actions}
                </div>
              )}
            </header>

            <div className="ds-admin-subpage-content [display:grid] [gap:var(--ds-space-6)]">
              {children}
            </div>
          </div>
        </main>

        <footer className="ds-footer [border-top:1px_solid_var(--ds-border-subtle)] [background:color-mix(in_srgb,_var(--ds-bg-page)_82%,_transparent)] ">
          <div className="ds-container [width:min(1280px,_calc(100%_-_48px))] [margin-inline:auto] max-[760px]:[width:min(100%_-_32px,_1280px)] ds-footer-inner [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-4)] [padding-block:24px] [color:var(--ds-text-muted)] [font-size:0.875rem] max-[760px]:[align-items:flex-start] max-[760px]:[flex-direction:column]">
            <span>JSDoIT Roadmap Center</span>
            <div className="ds-footer-links [display:flex] [flex-wrap:wrap] [align-items:center] [gap:var(--ds-space-4)]">
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/admin"
              >
                Admin
              </Link>
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/help/admin"
              >
                Admin-Handbuch
              </Link>
              <Link
                className="ds-footer-link [color:var(--ds-text-muted)] [font-weight:600] [transition:color_var(--ds-duration-fast)_var(--ds-ease-out)] hover:[color:var(--ds-text-strong)]"
                href="/instances"
              >
                Instanzen
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminSubpageLayout;
