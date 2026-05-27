/**
 * Verbose checkout logging for debugging storefront checkout / location failures.
 */

function safeClone(value) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

/** Normalize a thrown apiFetch / apiFetchRoot error for console inspection. */
export function serializeCheckoutApiError(err) {
  if (!err) return null;
  const data = err?.data;
  return {
    name: err?.name,
    message: err?.message,
    status: err?.status,
    code: err?.code,
    apiStatus: data?.status,
    apiMessage: data?.message,
    apiError: safeClone(data?.error),
    data: safeClone(data),
    stack:
      typeof err?.stack === 'string'
        ? err.stack.split('\n').slice(0, 10).join('\n')
        : undefined,
  };
}

/**
 * @param {string} label
 * @param {Record<string, unknown>} [payload]
 */
export function logCheckoutDebug(label, payload = {}) {
  const { error, ...rest } = payload;
  const entry = {
    label,
    at: new Date().toISOString(),
    ...rest,
  };

  // eslint-disable-next-line no-console
  console.groupCollapsed(`[Checkout] ${label}`);
  // eslint-disable-next-line no-console
  console.log('context', entry);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('api error (serialized)', serializeCheckoutApiError(error));
    if (error?.data) {
      // eslint-disable-next-line no-console
      console.error('api error.data (live object)', error.data);
    }
  }
  // eslint-disable-next-line no-console
  console.groupEnd();
}

/**
 * @param {string} phase
 * @param {object} ctx
 * @param {Error} err
 */
export function logCheckoutFailure(phase, ctx, err) {
  logCheckoutDebug(`FAILED: ${phase}`, {
    phase,
    ...ctx,
    error: err,
  });
}
