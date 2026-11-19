/**
 * Phase D #33 — remember where to return after Help (or other) deep-links.
 * Singly-linked list of hrefs in sessionStorage (newest at the head).
 */

export const NAV_RETURN_STACK_KEY = "yaadro-nav-return-stack-v1";

type NavReturnNode = {
  href: string;
  next: NavReturnNode | null;
};

function readHead(): NavReturnNode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(NAV_RETURN_STACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NavReturnNode;
  } catch {
    return null;
  }
}

function writeHead(node: NavReturnNode | null) {
  if (typeof window === "undefined") return;
  try {
    if (!node) {
      window.sessionStorage.removeItem(NAV_RETURN_STACK_KEY);
      return;
    }
    window.sessionStorage.setItem(NAV_RETURN_STACK_KEY, JSON.stringify(node));
  } catch {
    // best-effort
  }
}

/** Push a return href onto the stack (becomes the new head). */
export function pushNavReturn(href: string): void {
  const trimmed = href.trim();
  if (!trimmed) return;
  const next = readHead();
  writeHead({ href: trimmed, next });
}

/** Pop the head return href, or null if empty. */
export function popNavReturn(): string | null {
  const head = readHead();
  if (!head) return null;
  writeHead(head.next);
  return head.href;
}

/** Peek without removing. */
export function peekNavReturn(): string | null {
  return readHead()?.href ?? null;
}

/** Clear the stack (tests / playground reset). */
export function clearNavReturnStack(): void {
  writeHead(null);
}
