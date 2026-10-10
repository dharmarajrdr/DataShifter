import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ds_access_token';
const REFRESH_KEY = 'ds_refresh_token';
const USER_KEY = 'ds_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);

  const saveAuth = useCallback((tokenResponse) => {
    localStorage.setItem(TOKEN_KEY, tokenResponse.accessToken);
    localStorage.setItem(REFRESH_KEY, tokenResponse.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(tokenResponse.user));
    setToken(tokenResponse.accessToken);
    setUser(tokenResponse.user);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setOrganizations([]);
  }, []);

  /** Fetch org list from API — always fresh */
  const refreshOrganizations = useCallback(() => {
    authApi.myOrganizations()
      .then(res => setOrganizations(res.data || []))
      .catch(() => setOrganizations([]));
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      saveAuth(res.data);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, [saveAuth]);

  const signup = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await authApi.signup(payload);
      saveAuth(res.data);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, [saveAuth]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) { clearAuth(); return; }
    try {
      const res = await authApi.refresh({ refreshToken: refresh });
      saveAuth(res.data);
    } catch {
      clearAuth();
    }
  }, [saveAuth, clearAuth]);

  const hasPermission = useCallback((permission) => {
    if (!user || !user.effectivePermissions) return false;
    return user.effectivePermissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((...perms) => {
    return perms.some(p => hasPermission(p));
  }, [hasPermission]);

  /** Switch to a different org — gets new tokens scoped to that org */
  const switchOrg = useCallback(async (orgId) => {
    setLoading(true);
    try {
      const res = await authApi.switchOrg(orgId);
      saveAuth(res.data);
      return res.data;
    } finally {
      setLoading(false);
    }
  }, [saveAuth]);

  /** Update the cached user after profile edit — syncs state + localStorage */
  const updateUser = useCallback((updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem(USER_KEY, JSON.stringify(merged));
    setUser(merged);
  }, [user]);

  // Refresh the cached user on startup so role permission changes are reflected.
  useEffect(() => {
    if (token) {
      // Account-only tokens have no AppUser id until an invite is accepted or an org is created.
      if (!user?.id) {
        refreshOrganizations();
        return;
      }
      authApi.me().then(res => {
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
        setUser(res.data);
      }).catch(() => clearAuth());
      refreshOrganizations();
    }
  }, [token, user?.id, clearAuth, refreshOrganizations]);

  useEffect(() => {
    const handleAuthUpdated = () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem(USER_KEY));
        setToken(localStorage.getItem(TOKEN_KEY));
        setUser(storedUser);
      } catch {
        clearAuth();
      }
    };
    window.addEventListener('ds-auth-updated', handleAuthUpdated);
    return () => window.removeEventListener('ds-auth-updated', handleAuthUpdated);
  }, [clearAuth]);

  const value = {
    user,
    token,
    loading,
    organizations,
    isAuthenticated: !!token && !!user,
    hasOrg: !!user?.orgId,
    login,
    signup,
    logout,
    refreshToken,
    switchOrg,
    updateUser,
    refreshOrganizations,
    hasPermission,
    hasAnyPermission,
    permissions: user?.effectivePermissions || [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};