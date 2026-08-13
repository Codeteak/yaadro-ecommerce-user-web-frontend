'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Observe when an element enters the viewport (for lazy section queries).
 * @param {IntersectionObserverInit} [options]
 * @returns {[React.RefObject<HTMLElement|null>, boolean]}
 */
export function useInView(options = {}) {
  const {
    root = null,
    rootMargin = '200px 0px',
    threshold = 0,
    once = true,
  } = options;

  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView && once) return undefined;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      // SSR / unsupported: enable immediately so content can still load.
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (once) {
          if (!hit) return;
          setInView(true);
          observer.disconnect();
          return;
        }
        setInView(hit);
      },
      { root, rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, once, root, rootMargin, threshold]);

  return [ref, inView];
}
