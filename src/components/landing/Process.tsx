/**
 * Process.tsx — "From signup to full migration in minutes"
 * 
 * Scroll-driven animation: A clear step-by-step visual flow.
 * Screens transition horizontally as user scrolls, communicating
 * speed and simplicity through smooth, confident motion pacing.
 * 
 * Motion story:
 * - Horizontal carousel of onboarding screens
 * - Each step slides into view, previous slides out
 * - Progress indicator shows journey
 * - Final state: "You're all set" completion screen
 */

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from './animations';
import { PhoneFrame, OnboardingScreen } from './PhoneMockup';

interface Step {
  id: number;
  label: string;
}

const steps: Step[] = [
  { id: 1, label: 'Verify' },
  { id: 2, label: 'Import' },
  { id: 3, label: 'Connect' },
  { id: 4, label: 'Ready' },
];

export function Process() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Header animation
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [0, 1]);
  const headerY = useTransform(scrollYProgress, [0, 0.1], [40, 0]);

  if (prefersReduced) {
    return <ProcessStatic />;
  }

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative"
      style={{ height: '400vh' }} // Extended for scroll animation
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Header */}
        <motion.div
          className="text-center mb-8 md:mb-12 px-6"
          style={{ opacity: headerOpacity, y: headerY }}
        >
          <h2 className="text-4xl md:text-6xl font-normal text-[#0a0a0a] mb-3 leading-[1.05] tracking-[-0.02em]">
            Minutes to migrate
          </h2>
          <p className="text-lg md:text-xl text-[#787771]">
            Four steps. That's it.
          </p>
        </motion.div>

        {/* Progress indicator */}
        <ProgressIndicator scrollProgress={scrollYProgress} />

        {/* Phone carousel */}
        <div className="relative w-full max-w-lg h-[520px] md:h-[600px]">
          {steps.map((step, index) => (
            <StepPhone
              key={step.id}
              step={step.id as 1 | 2 | 3 | 4}
              index={index}
              scrollProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS INDICATOR — Shows current step
// ─────────────────────────────────────────────────────────────────────────────

function ProgressIndicator({
  scrollProgress,
}: {
  scrollProgress: MotionValue<number>;
}) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {steps.map((step, index) => (
        <ProgressDot
          key={step.id}
          index={index}
          label={step.label}
          scrollProgress={scrollProgress}
        />
      ))}
    </div>
  );
}

function ProgressDot({
  index,
  label,
  scrollProgress,
}: {
  index: number;
  label: string;
  scrollProgress: MotionValue<number>;
}) {
  // Each step occupies ~20% of scroll (leaving room for intro/outro)
  const stepStart = 0.1 + index * 0.2;
  const stepEnd = stepStart + 0.2;

  const isActive = useTransform(scrollProgress, (p) => p >= stepStart && p < stepEnd + 0.05);
  const isPast = useTransform(scrollProgress, (p) => p >= stepEnd);

  // Dot scale
  const scale = useTransform(scrollProgress, (p) => {
    if (p >= stepStart && p < stepEnd + 0.05) return 1.2;
    return 1;
  });

  // Background color
  const backgroundColor = useTransform(scrollProgress, (p) => {
    if (p >= stepStart) return '#0a0a0a';
    return '#e8e4db';
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className="w-3 h-3 rounded-full"
        style={{ scale, backgroundColor }}
        transition={{ duration: 0.2 }}
      />
      <motion.span
        className="text-xs font-medium"
        style={{
          color: useTransform(scrollProgress, (p) =>
            p >= stepStart ? '#0a0a0a' : '#787771'
          ),
        }}
      >
        {label}
      </motion.span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP PHONE — Individual phone in the carousel
// ─────────────────────────────────────────────────────────────────────────────

function StepPhone({
  step,
  index,
  scrollProgress,
}: {
  step: 1 | 2 | 3 | 4;
  index: number;
  scrollProgress: MotionValue<number>;
}) {
  // Each step's scroll range
  const stepStart = 0.1 + index * 0.2;
  const stepPeak = stepStart + 0.1;
  const stepEnd = stepStart + 0.2;

  // Horizontal slide: enter from right, exit to left
  const x = useTransform(scrollProgress, [stepStart - 0.1, stepStart, stepPeak, stepEnd], [300, 0, 0, -300]);

  // Opacity: fade in, hold, fade out
  const opacity = useTransform(
    scrollProgress,
    [stepStart - 0.05, stepStart, stepPeak, stepEnd - 0.02, stepEnd],
    [0, 1, 1, 1, 0]
  );

  // Scale: subtle emphasis at peak
  const scale = useTransform(
    scrollProgress,
    [stepStart, stepPeak, stepEnd],
    [0.95, 1, 0.95]
  );

  // Z-index based on whether this step is active
  const zIndex = useTransform(scrollProgress, (p) => {
    if (p >= stepStart - 0.05 && p < stepEnd + 0.05) return 10;
    return 1;
  });

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        x,
        y: '-50%',
        marginLeft: -140, // Half of phone width at scale 1
        opacity,
        scale,
        zIndex,
      }}
    >
      <PhoneFrame scale={0.95}>
        <OnboardingScreen step={step} />
      </PhoneFrame>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC VERSION — for reduced motion preference
// ─────────────────────────────────────────────────────────────────────────────

function ProcessStatic() {
  return (
    <section id="process" className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-normal text-[#0a0a0a] mb-4 leading-[1.05] tracking-[-0.02em]">
            Minutes to migrate
          </h2>
          <p className="text-xl text-[#787771]">Four steps. That's it.</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-6 mb-12">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0a0a0a]" />
                <span className="text-xs font-medium text-[#0a0a0a]">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-12 h-px bg-[#e8e4db]" />
              )}
            </div>
          ))}
        </div>

        {/* Static phone grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center">
              <PhoneFrame scale={0.65}>
                <OnboardingScreen step={step.id as 1 | 2 | 3 | 4} />
              </PhoneFrame>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
