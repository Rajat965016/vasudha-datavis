import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { DOMAIN_LIST, DOMAIN_META } from '@/config/constants.js';
import { useAuth } from '@/context/AuthContext.jsx';

const NAV_LINKS = [
  { to: '/', label: 'All visualisations', end: true },
  ...DOMAIN_LIST.map((domain) => ({
    to: `/${DOMAIN_META[domain].slug}`,
    label: DOMAIN_META[domain].label,
  })),
];

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

/** Chrome for the public portal — no authentication required anywhere here. */
const PublicLayout = () => {
  const { isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-[900] border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white"
              aria-hidden="true"
            >
              V
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-slate-900">Vasudha Foundation</span>
              <span className="block text-xs text-slate-500">Climate · Energy · Power data</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to={isAuthenticated ? '/admin' : '/login'}
              className="hidden rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800 sm:inline-block"
            >
              {isAuthenticated ? 'Dashboard' : 'Admin sign in'}
            </Link>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeWidth="2"
                  d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <nav className="border-t border-slate-200 px-4 py-2 md:hidden" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={linkClass}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              <NavLink
                to={isAuthenticated ? '/admin' : '/login'}
                className={linkClass}
                onClick={() => setIsMenuOpen(false)}
              >
                {isAuthenticated ? 'Dashboard' : 'Admin sign in'}
              </NavLink>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Vasudha Foundation — open Climate, Energy and Power data for India.</p>
          <p className="text-xs">
            Only datasets approved by the Super Admin are published here.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
