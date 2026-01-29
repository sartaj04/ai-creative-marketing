'use client';

import { motion } from 'framer-motion';
import { 
  checkmarkCircleVariants, 
  checkmarkPathVariants,
  prefersReducedMotion 
} from './motion-variants';

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
  color?: 'green' | 'cyan';
}

export function AnimatedCheckmark({ 
  size = 48, 
  className,
  color = 'green'
}: AnimatedCheckmarkProps) {
  const reducedMotion = prefersReducedMotion();
  
  const colors = {
    green: {
      bg: 'bg-green-100',
      stroke: '#16a34a' // green-600
    },
    cyan: {
      bg: 'bg-cyan-100',
      stroke: '#0891b2' // cyan-600
    }
  };

  const { bg, stroke } = colors[color];

  return (
    <motion.div
      variants={checkmarkCircleVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      className={`${bg} rounded-full flex items-center justify-center ${className || ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d="M5 13l4 4L19 7"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={checkmarkPathVariants}
          initial={reducedMotion ? 'visible' : 'hidden'}
          animate="visible"
        />
      </svg>
    </motion.div>
  );
}
