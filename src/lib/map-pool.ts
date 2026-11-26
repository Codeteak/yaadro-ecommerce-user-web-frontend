/**
 * Run async work over a list with a fixed concurrency cap.
 * Preserves input order in the result array.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const total = items.length;
  if (total === 0) return [];

  const limit = Math.max(1, Math.min(Math.floor(concurrency), total));
  const results: R[] = new Array(total);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next;
      next += 1;
      if (index >= total) return;
      results[index] = await mapper(items[index] as T, index);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
