/**
 * Customer login and registration.
 * POST /api/auth/otp/request sends the code.
 * POST /api/auth/otp/verify checks it. A new phone is registered on success.
 */

const ACCESS_TOKEN_KEY = "yaadro.customer.accessToken";
const REFRESH_TOKEN_KEY = "yaadro.customer.refreshToken";

export type CustomerSession = {
  accessToken: string;
  refreshToken: string;
};

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
  if (!raw) throw new AuthApiError("The shop API is not configured.");
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}

function shopId(): string {
  const id = process.env.NEXT_PUBLIC_SHOP_ID?.trim() ?? "";
  if (!id) throw new AuthApiError("This shop is not configured.");
  return id;
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    message?: string;
  } | null;
  return (
    body?.error?.message ||
    body?.message ||
    "Something went wrong. Try again."
  );
}

async function postAuth(path: string, body: Record<string, string>): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-shop-id": shopId(),
      },
      body: JSON.stringify({ ...body, shopId: shopId() }),
    });
  } catch {
    throw new AuthApiError("Could not reach the shop. Check your connection.");
  }

  if (!response.ok) throw new AuthApiError(await readError(response));
  return response.json().catch(() => ({}));
}

export async function requestCustomerOtp(phone: string): Promise<void> {
  await postAuth("/api/auth/otp/request", { phone });
}

export async function verifyCustomerOtp(
  phone: string,
  code: string,
): Promise<CustomerSession> {
  const body = (await postAuth("/api/auth/otp/verify", { phone, code })) as {
    accessToken?: string;
    refreshToken?: string;
  };
  if (!body.accessToken || !body.refreshToken) {
    throw new AuthApiError("Login did not return a session. Try again.");
  }
  return { accessToken: body.accessToken, refreshToken: body.refreshToken };
}

export function saveCustomerSession(session: CustomerSession) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  window.dispatchEvent(new Event("yaadro-customer-session"));
}

export function hasCustomerSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}

export function subscribeCustomerSession(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === ACCESS_TOKEN_KEY ||
      event.key === REFRESH_TOKEN_KEY ||
      event.key === null
    ) {
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("yaadro-customer-session", onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("yaadro-customer-session", onChange);
  };
}
