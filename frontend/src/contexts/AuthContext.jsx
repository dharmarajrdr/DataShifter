import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';
import {
  clearAuthStorage, getStoredToken, getStoredUser,
  REFRESH_KEY, saveAuthStorage, TOKEN_KEY, updateStoredUser, USER_KEY,
} from './authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);

  const saveAuth = useCallback((res) => { saveAuthStorage(res); setToken(res.accessToken); setUser(res.user); }, []);
  const clearAuth = useCallback(() => { clearAuthStorage(); setToken(null); setUser(null); setOrganizations([]); }, []);
  const refreshOrganizations = useCallback(() => { authApi.myOrganizations().then((r) => setOrganizations(r.data || [])).catch(() => setOrganizations([])); }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try { const res = await authApi.login({ email, password }); saveAuth(res.data); return res.data; } finally { setLoading(false); }
  }, [saveAuth]);

  const signup = useCallback(async (payload) => {
    setLoading(true);
    try { const res = await authApi.signup(payload); saveAuth(res.data); return res.data; } finally { setLoading(false); }
  }, [saveAuth]);

  const logout = useCallback(() => clearAuth(), [clearAuth]);

  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return clearAuth();
    try { const res = await authApi.refresh({ refreshToken: refresh }); saveAuth(res.data); } catch { clearAuth(); }
  }, [saveAuth, clearAuth]);

  const hasPermission = useCallback((permission) => {
    if (!user?.effectivePermissions) return false;
    const p = user.effectivePermissions;
    if (permission === 'settings:edit' || permission === 'pipeline:settings') return p.includes('pipeline:settings') || p.includes('settings:edit');
    return p.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((...perms) => perms.some((p) => hasPermission(p)), [hasPermission]);

  const switchOrg = useCallback(async (orgId) => {
    setLoading(true);
    try { const res = await authApi.switchOrg(orgId); saveAuth(res.data); return res.data; } finally { setLoading(false); }
  }, [saveAuth]);

  const updateUser = useCallback((u) => setUser(updateStoredUser(u, user)), [user]);

  useEffect(() => {
    if (token) {
      if (!user?.id) return refreshOrganizations();
      authApi.me().then((r) => { localStorage.setItem(USER_KEY, JSON.stringify(r.data)); setUser(r.data); }).catch(() => clearAuth());
      refreshOrganizations();
    }
  }, [token, user?.id, clearAuth, refreshOrganizations]);

  useEffect(() => {
    const onAuth = () => {
      try { setToken(localStorage.getItem(TOKEN_KEY)); setUser(JSON.parse(localStorage.getItem(USER_KEY))); } catch { clearAuth(); }
    };
    window.addEventListener('ds-auth-updated', onAuth);
    return () => window.removeEventListener('ds-auth-updated', onAuth);
  }, [clearAuth]);

  const value = {
    user, token, loading, organizations, isAuthenticated: !!token && !!user,
    hasOrg: !!user?.orgId, login, signup, logout, refreshToken, switchOrg,
    updateUser, refreshOrganizations, hasPermission, hasAnyPermission,
    permissions: user?.effectivePermissions || [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};