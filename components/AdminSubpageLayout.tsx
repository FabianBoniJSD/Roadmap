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
    <div className="ds-page-shell">
      <SiteHeader activeRoute="admin" />

      <main className="ds-page-main ds-admin-subpage-main">
        <div
          className={`ds-container ds-admin-subpage-inner${widthModifier ? ` ${widthModifier}` : ''}`}
        >
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="ds-admin-breadcrumbs">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                if (isLast || !crumb.href) {
                  return (
                    <span key={`${crumb.label}-${index}`} className="ds-admin-breadcrumb-current">
                      {crumb.label}
                    </span>
                  );
                }

                return (
                  <span key={`${crumb.label}-${index}`} className="ds-admin-breadcrumb-group">
                    <Link href={crumb.href} className="ds-admin-breadcrumb-link">
                      {crumb.label}
                    </Link>
                    <span aria-hidden="true" className="ds-admin-breadcrumb-separator">
                      /
                    </span>
                  </span>
                );
              })}
            </nav>
          )}

          <header className="ds-card ds-admin-subpage-hero">
            <div>
              <p className="ds-panel-label">{eyebrow}</p>
              <h1 className="ds-admin-subpage-title">{title}</h1>
              {description && <div className="ds-admin-subpage-description">{description}</div>}
            </div>
            {actions && <div className="ds-admin-subpage-actions">{actions}</div>}
          </header>

          <div className="ds-admin-subpage-content">{children}</div>
        </div>
      </main>

      <footer className="ds-footer">
        <div className="ds-container ds-footer-inner">
          <span>JSDoIT Roadmap Center</span>
          <div className="ds-footer-links">
            <Link className="ds-footer-link" href="/admin">
              Admin
            </Link>
            <Link className="ds-footer-link" href="/help/admin">
              Admin-Handbuch
            </Link>
            <Link className="ds-footer-link" href="/instances">
              Instanzen
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminSubpageLayout;
