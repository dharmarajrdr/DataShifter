export const TOKEN_KEY = 'ds_access_token';
export const REFRESH_KEY = 'ds_refresh_token';
export const USER_KEY = 'ds_user';

export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const saveAuthStorage = (tokenResponse) => {
  localStorage.setItem(TOKEN_KEY, tokenResponse.accessToken);
  localStorage.setItem(REFRESH_KEY, tokenResponse.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(tokenResponse.user));
};

export const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};

export const updateStoredUser = (updatedUser, prevUser) => {
  const merged = { ...prevUser, ...updatedUser };
  localStorage.setItem(USER_KEY, JSON.stringify(merged));
  return merged;
};
