import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { ROLES } from '@/config/constants.js';
import { useAuth } from '@/context/AuthContext.jsx';

const ICONS = {
  datasets: 'M4 6h16M4 12h16M4 18h10',
  add: 'M12 5v14M5 12h14',
  approvals: 'M5 13l4 4L19 7',
  users: 'M17 20h5v-2a3 3 0 00-3-3M9 20H4v-2a3 3 0 013-3h4a3 3 0 013 3v2M12 7a3 3 0 11-6 0 3 3 0 016 0z',
  account: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 1116 0',
};

const NAV_ITEMS = [
  { to: '/admin/datasets', label: 'My datasets', icon: 'datasets', end: false },
  { to: '/admin/datasets/new', label: 'Add dataset', icon: 'add', end: true },
  { to: '/admin/approvals', label: 'Approvals', icon: 'approvals', superAdminOnly: true },
  { to: '/admin/users', label: 'Admin accounts', icon: 'users', superAdminOnly: true },
  { to: '/admin/account', label: 'My account', icon: 'account' },
];

const Icon = ({ path }) => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
  </svg>
);

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

/** Chrome for every authenticated screen, with role-aware navigation. */
const AdminLayout = () => {
  const { user, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const navigation = (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={navLinkClass}
          onClick={() => setIsSidebarOpen(false)}
        >
          <Icon path={ICONS[item.icon]} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-[900] border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-expanded={isSidebarOpen}
              aria-label="Toggle sidebar"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <Link to="/admin" className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white"
                aria-hidden="true"
              >
                V
              </span>
              <span className="text-sm font-bold text-slate-900">Vasudha Console</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline"
            >
              View public site
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">{user?.name}</p>
              <p className="text-xs leading-tight text-slate-500">
                {user?.role === ROLES.SUPER_ADMIN ? 'Super Admin' : 'Admin'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20">{navigation}</div>
        </aside>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-[950] lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="relative h-full w-64 max-w-[80%] bg-white p-4 shadow-xl">{navigation}</div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
