'use client';

import { motion } from 'framer-motion';
import { 
  typingContainerVariants, 
  prefersReducedMotion 
} from './motion-variants';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  const reducedMotion = prefersReducedMotion();

  // Smooth wave animation for each dot
  const dotVariants = {
    hidden: { 
      opacity: 0.3,
      y: 0
    },
    visible: (i: number) => ({
      opacity: [0.3, 1, 0.3],
      y: [0, -3, 0],
      transition: {
        duration: reducedMotion ? 0 : 1,
        repeat: reducedMotion ? 0 : Infinity,
        delay: i * 0.15,
        ease: 'easeInOut'
      }
    })
  };

  return (
    <motion.div
      variants={typingContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`flex justify-start ${className || ''}`}
    >
      <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              custom={i}
              variants={dotVariants}
              initial="hidden"
              animate="visible"
              className="w-2 h-2 bg-slate-400 rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
