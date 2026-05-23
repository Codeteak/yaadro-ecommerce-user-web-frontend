/** True for 401 / invalid or expired token responses from the API client. */
export function isUnauthorizedError(error) {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;
  const msg = String(error.message || '').toLowerCase();
  return /invalid|expired|unauthorized|forbidden/.test(msg);
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
