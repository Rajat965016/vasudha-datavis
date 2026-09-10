import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '@/api/services.js';
import { UNAUTHORIZED_EVENT, getStoredToken, setStoredToken, toApiError } from '@/api/client.js';
import { ROLES } from '@/config/constants.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(Boolean(getStoredToken()));

  const signOut = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  // Restore the session on a hard refresh by validating the stored token.
  useEffect(() => {
    if (!getStoredToken()) {
      setIsRestoring(false);
      return;
    }

    let cancelled = false;
    authApi
      .me()
      .then(({ user: profile }) => {
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        if (!cancelled) signOut();
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signOut]);

  // A 401 anywhere in the app (expired or revoked token) ends the session.
  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const signIn = useCallback(async (credentials) => {
    try {
      const { token, user: profile } = await authApi.login(credentials);
      setStoredToken(token);
      setUser(profile);
      return { ok: true, user: profile };
    } catch (error) {
      return { ok: false, error: toApiError(error) };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      isRestoring,
      signIn,
      signOut,
      refreshProfile: () => authApi.me().then(({ user: profile }) => setUser(profile)),
    }),
    [user, isRestoring, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an <AuthProvider>');
  return context;
};

export default AuthContext;
