/** True when the session is invalid and the user should sign in again (auth refresh / profile). */
export function isUnauthorizedError(error) {
  if (!error) return false;
  if (error.status === 401) return true;
  if (error.status === 403) {
    const code = String(error?.code || error?.data?.error?.code || '').toUpperCase();
    if (code.startsWith('AUTH_') || code.startsWith('TOKEN_') || code.startsWith('SESSION_')) {
      return true;
    }
  }
  const msg = String(error.message || '').toLowerCase();
  return /invalid.*token|expired.*token|token.*expir|jwt.*expir|session.*expir|not authenticated|login required|unauthenticated/.test(
    msg
  );
}

/** Network / offline failures — do not treat as "user must log in again". */
export function isTransientAuthError(error) {
  if (!error || isUnauthorizedError(error)) return false;
  if (error.name === 'AbortError') return true;
  const msg = String(error.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('load failed') ||
    error.name === 'TypeError'
  );
}
