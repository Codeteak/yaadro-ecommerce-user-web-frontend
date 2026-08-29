'use client';

import { motion, useReducedMotion } from 'framer-motion';

export default function AnimatedSheet({
  children,
  className = '',
  style,
  onDragEnd,
  drag = false,
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      drag={drag ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.12}
      onDragEnd={onDragEnd}
    >
      {children}
    </motion.div>
  );
}
