'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export default function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}