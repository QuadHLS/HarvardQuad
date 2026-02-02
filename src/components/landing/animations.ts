/**
 * Shared animation utilities for landing page scroll-driven animations.
 * Uses Framer Motion + IntersectionObserver for performant, scroll-responsive motion.
 */

import { useEffect, useState, useRef, RefObject } from 'react';
import { Variants, useScroll, useTransform, MotionValue } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a 0→1 progress value as element scrolls through viewport.
 * Starts at 0 when element enters, reaches 1 when fully scrolled through.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement>,
  offset: ['start end' | 'center center' | 'end start', 'start end' | 'center center' | 'end start'] = ['start end', 'end start']
): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });
  return scrollYProgress;
}

/**
 * Returns true when element is in view (for simple fade-in triggers).
 */
export function useInView(ref: RefObject<HTMLElement>, threshold = 0.2): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // Once triggered, disconnect — we only animate in once
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}

/**
 * Check if user prefers reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTS — reusable animation presets
// ─────────────────────────────────────────────────────────────────────────────

/** Fade up with slight Y translation */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/** Fade in from left */
export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -48 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/** Fade in from right */
export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 48 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/** Scale up from slightly smaller */
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/** Stagger container — apply to parent, children use staggered delay */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

/** Stagger item — use as child of staggerContainer */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORM HELPERS — for scroll-linked animations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map scroll progress [0,1] to any output range.
 * Example: mapProgress(progress, [0, 0.5], [0, 1]) maps first half to 0→1
 */
export { useTransform };
