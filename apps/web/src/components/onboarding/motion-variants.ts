/**
 * Premium motion variants for onboarding chat experience
 * Style: Calm, subtle, high-end SaaS - no bouncy/cartoon effects
 */

import { Variants, Transition } from 'framer-motion';

// Premium easing curve - smooth deceleration
const premiumEase = [0.22, 1, 0.36, 1] as const;

// Check for reduced motion preference
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Helper to get transition respecting reduced motion
export const getTransition = (normal: Transition): Transition => {
  return prefersReducedMotion() ? { duration: 0 } : normal;
};

// ============================================
// Container Animations
// ============================================

export const containerVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6, 
      ease: premiumEase 
    }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

// ============================================
// Message Animations
// ============================================

export const messageVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 12, 
    scale: 0.98 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.4, 
      ease: premiumEase 
    }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// For staggering multiple messages
export const messageStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// ============================================
// Typing Indicator
// ============================================

export const typingDotVariants: Variants = {
  hidden: { 
    opacity: 0.3,
    y: 0
  },
  visible: { 
    opacity: 1,
    y: -2,
    transition: { 
      duration: 0.4,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut'
    }
  }
};

export const typingContainerVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 8,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.3, 
      ease: premiumEase 
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

// ============================================
// Card Animations
// ============================================

export const cardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: premiumEase 
    }
  },
  exit: { 
    opacity: 0,
    y: -10,
    transition: { duration: 0.3 }
  }
};

// Stagger children in cards
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.08,
      delayChildren: 0.2
    }
  }
};

export const staggerItem: Variants = {
  hidden: { 
    opacity: 0, 
    x: -10 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.3, 
      ease: premiumEase 
    }
  }
};

// ============================================
// Upload & Progress Animations
// ============================================

export const uploadZoneVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    height: 0
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    height: 'auto',
    transition: { 
      duration: 0.4, 
      ease: premiumEase 
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    height: 0,
    transition: { duration: 0.3 }
  }
};

export const uploadDragVariants: Variants = {
  idle: { 
    borderColor: 'rgba(148, 163, 184, 0.3)',
    backgroundColor: 'rgba(248, 250, 252, 1)'
  },
  dragging: { 
    borderColor: 'rgba(6, 182, 212, 0.6)',
    backgroundColor: 'rgba(236, 254, 255, 1)',
    scale: 1.01,
    transition: { duration: 0.2 }
  }
};

export const progressBarVariants: Variants = {
  hidden: { 
    scaleX: 0,
    originX: 0
  },
  visible: (progress: number) => ({ 
    scaleX: progress / 100,
    transition: { 
      duration: 0.3, 
      ease: 'easeOut' 
    }
  })
};

// ============================================
// Checkmark Animation
// ============================================

export const checkmarkCircleVariants: Variants = {
  hidden: { 
    scale: 0,
    opacity: 0
  },
  visible: { 
    scale: 1,
    opacity: 1,
    transition: { 
      duration: 0.4, 
      ease: premiumEase 
    }
  }
};

export const checkmarkPathVariants: Variants = {
  hidden: { 
    pathLength: 0,
    opacity: 0
  },
  visible: { 
    pathLength: 1,
    opacity: 1,
    transition: { 
      duration: 0.4,
      delay: 0.2,
      ease: 'easeOut'
    }
  }
};

// ============================================
// Helper Block Animations
// ============================================

export const helperBlockVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10,
    height: 0,
    marginTop: 0
  },
  visible: { 
    opacity: 1, 
    y: 0,
    height: 'auto',
    marginTop: 12,
    transition: { 
      duration: 0.4, 
      ease: premiumEase,
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    y: -5,
    height: 0,
    marginTop: 0,
    transition: { duration: 0.3 }
  }
};

export const helperStepVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -8 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.25, 
      ease: premiumEase 
    }
  }
};

// ============================================
// Confirmation Card Animations
// ============================================

export const confirmationCardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: premiumEase,
      staggerChildren: 0.05,
      delayChildren: 0.2
    }
  }
};

export const confirmationFieldVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 8 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3, 
      ease: premiumEase 
    }
  }
};

export const editFieldVariants: Variants = {
  view: { 
    opacity: 1,
    x: 0
  },
  edit: { 
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 }
  }
};

// ============================================
// Button Animations
// ============================================

export const buttonHoverVariants = {
  rest: { 
    scale: 1 
  },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2, ease: premiumEase }
  },
  tap: { 
    scale: 0.98 
  }
};

export const ctaGlowVariants: Variants = {
  rest: {
    boxShadow: '0 0 0 0 rgba(6, 182, 212, 0)'
  },
  hover: {
    boxShadow: '0 0 20px 2px rgba(6, 182, 212, 0.3)',
    transition: { duration: 0.3 }
  }
};

// ============================================
// Scroll Animation
// ============================================

export const smoothScrollConfig = {
  behavior: 'smooth' as const,
  block: 'end' as const
};

// ============================================
// Parsing/Loading Animations
// ============================================

export const pulseVariants: Variants = {
  hidden: { 
    opacity: 0.5,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 1,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut'
    }
  }
};

export const spinnerVariants: Variants = {
  hidden: { 
    rotate: 0 
  },
  visible: { 
    rotate: 360,
    transition: { 
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

export const ellipsisVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: [0, 1, 0],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      delay: i * 0.2,
      ease: 'easeInOut'
    }
  })
};
