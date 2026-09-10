import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ROLES } from '@/config/constants.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { LoadingState } from '@/components/ui/States.jsx';

/**
 * Gate for authenticated routes. `requireSuperAdmin` additionally restricts a
 * branch of the console to the Super Admin — the API enforces the same rule, so
 * this is a UX affordance rather than the security boundary.
 */
const ProtectedRoute = ({ requireSuperAdmin = false }) => {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const location = useLocation();

  if (isRestoring) return <LoadingState label="Checking your session…" />;

  if (!isAuthenticated) {
    // Remember where the user was headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireSuperAdmin && user?.role !== ROLES.SUPER_ADMIN) {
    return <Navigate to="/admin/datasets" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
