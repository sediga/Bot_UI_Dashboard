// utils/auth.js
export function getToken() {
  return localStorage.getItem("botflows_token");
}

export function parseJwt(token) {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (e) {
    return null;
  }
}

export function getRoles() {
  const t = getToken();
  if (!t) return [];
  const p = parseJwt(t) || {};
  // Common places roles show up
  const claim =
    p.roles ||
    p.role ||
    p["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    [];
  return Array.isArray(claim) ? claim : [claim].filter(Boolean);
}

export function isGuest() {
  return getRoles().includes("Guest");
}

export function isExpired() {
  const t = getToken();
  if (!t) return true;
  const p = parseJwt(t);
  if (!p || !p.exp) return true;
  return Date.now() / 1000 > p.exp;
}

export function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
