'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useInView } from '../../hooks/useInView';

export default function FadeInWhenVisible({
  children,
  className = '',
  delay = 0,
  y = 12,
}) {
  const reduceMotion = useReducedMotion();
  const [ref, inView] = useInView({ rootMargin: '0px 0px -8% 0px', once: true });
  const [shown, setShown] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion || inView) setShown(true);
  }, [inView, reduceMotion]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
