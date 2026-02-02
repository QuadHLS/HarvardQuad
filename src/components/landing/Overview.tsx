/**
 * Overview.tsx — "Your campus hub, simplified"
 * 
 * Scroll-driven animation: Multiple iPhone screens converge and assemble
 * into a unified system, visually demonstrating "everything in one place."
 * 
 * Motion story:
 * - Screens start scattered/fanned out
 * - As user scrolls, they slide inward and stack neatly
 * - Final state: cohesive arrangement showing the unified platform
 */

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from './animations';
import {
  PhoneFrame,
  ChatScreen,
  FeedScreen,
  CalendarScreen,
  GroupsScreen,
  ConversationsScreen,
} from './PhoneMockup';

export function Overview() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  // Track scroll progress through this section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Map scroll progress to animation values
  // Phase 1 (0-0.3): Screens enter from edges
  // Phase 2 (0.3-0.6): Screens converge to center
  // Phase 3 (0.6-1): Screens settle into final arrangement

  // Center phone (Conversations) — stays relatively centered
  const centerY = useTransform(scrollYProgress, [0, 0.4, 0.7], [80, 0, 0]);
  const centerOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
  const centerScale = useTransform(scrollYProgress, [0, 0.4], [0.9, 1]);

  // Left phone (Calendar) — slides in from left
  const leftX = useTransform(scrollYProgress, [0, 0.35, 0.65], [-200, -160, -140]);
  const leftY = useTransform(scrollYProgress, [0, 0.35, 0.65], [120, 40, 20]);
  const leftRotate = useTransform(scrollYProgress, [0, 0.35, 0.65], [-15, -8, -6]);
  const leftOpacity = useTransform(scrollYProgress, [0.05, 0.25], [0, 1]);
  const leftScale = useTransform(scrollYProgress, [0, 0.4], [0.85, 0.88]);

  // Right phone (Feed) — slides in from right
  const rightX = useTransform(scrollYProgress, [0, 0.35, 0.65], [200, 160, 140]);
  const rightY = useTransform(scrollYProgress, [0, 0.35, 0.65], [120, 40, 20]);
  const rightRotate = useTransform(scrollYProgress, [0, 0.35, 0.65], [15, 8, 6]);
  const rightOpacity = useTransform(scrollYProgress, [0.05, 0.25], [0, 1]);
  const rightScale = useTransform(scrollYProgress, [0, 0.4], [0.85, 0.88]);

  // Far left phone (Groups) — slides in last
  const farLeftX = useTransform(scrollYProgress, [0.1, 0.45, 0.7], [-340, -290, -260]);
  const farLeftY = useTransform(scrollYProgress, [0.1, 0.45, 0.7], [180, 80, 50]);
  const farLeftRotate = useTransform(scrollYProgress, [0.1, 0.45, 0.7], [-20, -12, -10]);
  const farLeftOpacity = useTransform(scrollYProgress, [0.15, 0.35], [0, 1]);
  const farLeftScale = useTransform(scrollYProgress, [0.1, 0.5], [0.8, 0.78]);

  // Far right phone (Chat) — slides in last
  const farRightX = useTransform(scrollYProgress, [0.1, 0.45, 0.7], [340, 290, 260]);
  const farRightY = useTransform(scrollYProgress, [0.1, 0.45, 0.7], [180, 80, 50]);
  const farRightRotate = useTransform(scrollYProgress, [0.1, 0.45, 0.7], [20, 12, 10]);
  const farRightOpacity = useTransform(scrollYProgress, [0.15, 0.35], [0, 1]);
  const farRightScale = useTransform(scrollYProgress, [0.1, 0.5], [0.8, 0.78]);

  // Header text animation
  const headerOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);
  const headerY = useTransform(scrollYProgress, [0, 0.15], [40, 0]);

  // If reduced motion, show static final state
  if (prefersReduced) {
    return (
      <section id="overview" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-normal text-[#0a0a0a] mb-4 leading-[1.05] tracking-[-0.02em]">
              Your campus hub
            </h2>
            <p className="text-xl text-[#787771] max-w-md mx-auto">
              Everything you need. One place.
            </p>
          </div>
          <div className="flex justify-center items-end gap-4">
            <PhoneFrame scale={0.65}><GroupsScreen /></PhoneFrame>
            <PhoneFrame scale={0.75}><CalendarScreen /></PhoneFrame>
            <PhoneFrame scale={0.85}><ConversationsScreen /></PhoneFrame>
            <PhoneFrame scale={0.75}><FeedScreen /></PhoneFrame>
            <PhoneFrame scale={0.65}><ChatScreen /></PhoneFrame>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="overview"
      className="relative py-12 md:py-0"
      style={{ minHeight: '200vh' }} // Extended height for scroll animation
    >
      {/* Sticky container keeps phones visible during scroll */}
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Header */}
        <motion.div
          className="text-center mb-8 md:mb-12 px-6"
          style={{ opacity: headerOpacity, y: headerY }}
        >
          <h2 className="text-4xl md:text-6xl font-normal text-[#0a0a0a] mb-3 leading-[1.05] tracking-[-0.02em]">
            Your campus hub
          </h2>
          <p className="text-lg md:text-xl text-[#787771]">
            Everything you need. One place.
          </p>
        </motion.div>

        {/* Phone arrangement */}
        <div className="relative w-full max-w-5xl h-[500px] md:h-[600px]">
          {/* Far left — Groups */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block"
            style={{
              x: farLeftX,
              y: farLeftY,
              rotate: farLeftRotate,
              opacity: farLeftOpacity,
              scale: farLeftScale,
              zIndex: 1,
            }}
          >
            <PhoneFrame scale={0.72}>
              <GroupsScreen />
            </PhoneFrame>
          </motion.div>

          {/* Left — Calendar */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block"
            style={{
              x: leftX,
              y: leftY,
              rotate: leftRotate,
              opacity: leftOpacity,
              scale: leftScale,
              zIndex: 2,
            }}
          >
            <PhoneFrame scale={0.8}>
              <CalendarScreen />
            </PhoneFrame>
          </motion.div>

          {/* Center — Conversations (hero) */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              y: centerY,
              opacity: centerOpacity,
              scale: centerScale,
              zIndex: 5,
            }}
          >
            <PhoneFrame scale={0.9}>
              <ConversationsScreen />
            </PhoneFrame>
          </motion.div>

          {/* Right — Feed */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block"
            style={{
              x: rightX,
              y: rightY,
              rotate: rightRotate,
              opacity: rightOpacity,
              scale: rightScale,
              zIndex: 2,
            }}
          >
            <PhoneFrame scale={0.8}>
              <FeedScreen />
            </PhoneFrame>
          </motion.div>

          {/* Far right — Chat */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block"
            style={{
              x: farRightX,
              y: farRightY,
              rotate: farRightRotate,
              opacity: farRightOpacity,
              scale: farRightScale,
              zIndex: 1,
            }}
          >
            <PhoneFrame scale={0.72}>
              <ChatScreen variant="group" />
            </PhoneFrame>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
