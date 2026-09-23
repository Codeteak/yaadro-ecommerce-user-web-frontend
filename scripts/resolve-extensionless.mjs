/**
 * Node ESM resolve hook: allow extensionless relative imports in node --test
 * (Next.js resolves these; bare `node --test` does not).
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.[cm]?[jt]sx?$/.test(specifier) &&
    !specifier.endsWith('.json') &&
    !specifier.endsWith('.mjs') &&
    !specifier.endsWith('.cjs')
  ) {
    try {
      return await nextResolve(`${specifier}.js`, context);
    } catch {
      // fall through
    }
  }
  return nextResolve(specifier, context);
}
