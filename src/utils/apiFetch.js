const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const TOKEN_KEY = "julee_token";

export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

let _onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => { _onUnauthorized = handler; };

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401 && _onUnauthorized) {
    _onUnauthorized();
  }
  return response;
}
