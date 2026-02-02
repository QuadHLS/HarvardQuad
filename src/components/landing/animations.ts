/**
 * Centralized animation utilities for landing page.
 * Premium easing, consistent motion, optimal performance.
 */

import { useEffect, useState } from 'react';
import { Variants } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// EASING CURVES
// ─────────────────────────────────────────────────────────────────────────────

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInOutCubic = [0.65, 0, 0.35, 1] as const;
export const easeOutQuart = [0.25, 1, 0.5, 1] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if user prefers reduced motion.
 * Memoized to prevent unnecessary re-renders.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTION VARIANTS — Centralized for consistency
// ─────────────────────────────────────────────────────────────────────────────

/** Fade up — subtle vertical travel */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeOutQuart },
  },
};

/** Fade in — no movement */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: easeOutQuart },
  },
};

/** Scale up — very subtle */
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: easeOutQuart },
  },
};

/** Slide from left */
export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: easeOutQuart },
  },
};

/** Slide from right */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: easeOutQuart },
  },
};

/** Stagger container — for list animations */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

/** Stagger item */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutQuart },
  },
};

/** Message bubble entrance */
export const messageBubble: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOutQuart },
  },
};

/** Typing indicator pulse */
export const typingDot: Variants = {
  pulse: {
    opacity: [0.4, 1, 0.4],
    transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
  },
};

/** Mobile carousel swipe */
export const carouselSlide: Variants = {
  enter: { opacity: 0, x: 50 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export const quickTransition = { duration: 0.2, ease: easeOutQuart };
export const mediumTransition = { duration: 0.4, ease: easeOutQuart };
export const slowTransition = { duration: 0.8, ease: easeOutQuart };

// ─────────────────────────────────────────────────────────────────────────────
// VIEWPORT CONFIG — Consistent animation triggers
// ─────────────────────────────────────────────────────────────────────────────

export const defaultViewport = {
  once: true,
  amount: 0.3 as const,
  margin: '0px 0px -100px 0px',
};

export const highThresholdViewport = {
  once: true,
  amount: 0.5 as const,
};

export const lowThresholdViewport = {
  once: true,
  amount: 0.1 as const,
};
