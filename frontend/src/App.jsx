import { Navigate, Route, Routes } from 'react-router-dom';

import AdminLayout from '@/components/layout/AdminLayout.jsx';
import ProtectedRoute from '@/components/layout/ProtectedRoute.jsx';
import PublicLayout from '@/components/layout/PublicLayout.jsx';

import AccountPage from '@/pages/admin/AccountPage.jsx';
import ApprovalsPage from '@/pages/admin/ApprovalsPage.jsx';
import DatasetFormPage from '@/pages/admin/DatasetFormPage.jsx';
import DatasetListPage from '@/pages/admin/DatasetListPage.jsx';
import UserManagementPage from '@/pages/admin/UserManagementPage.jsx';

import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage.jsx';
import LoginPage from '@/pages/auth/LoginPage.jsx';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage.jsx';

import DomainPage from '@/pages/public/DomainPage.jsx';
import LandingPage from '@/pages/public/LandingPage.jsx';
import NotFoundPage from '@/pages/public/NotFoundPage.jsx';

/**
 * Route map.
 *
 * Public         `/`, `/climate`, `/energy`, `/power`  — no authentication
 * Authentication `/login`, `/forgot-password`, `/reset-password`
 * Console        `/admin/*`                            — Admin + Super Admin
 * Super Admin    `/admin/approvals`, `/admin/users`    — Super Admin only
 */
const App = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<LandingPage />} />
      <Route path=":domainSlug" element={<DomainPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>

    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />

    <Route element={<ProtectedRoute />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/datasets" replace />} />
        <Route path="datasets" element={<DatasetListPage />} />
        <Route path="datasets/new" element={<DatasetFormPage />} />
        <Route path="datasets/:datasetId/edit" element={<DatasetFormPage />} />
        <Route path="account" element={<AccountPage />} />

        <Route element={<ProtectedRoute requireSuperAdmin />}>
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="users" element={<UserManagementPage />} />
        </Route>
      </Route>
    </Route>
  </Routes>
);

export default App;
