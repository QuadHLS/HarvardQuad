/**
 * Process.tsx — "Minutes to migrate"
 *
 * Motion: Single phone with swipe onboarding screens.
 * Clean, focused, premium — content changes, device stays grounded.
 */

import { memo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from './animations';
import { PhoneFrame, OnboardingScreen } from './PhoneMockup';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

interface Step {
  id: number;
  label: string;
  description: string;
  hideNumber?: boolean;
}

const STEPS: readonly Step[] = [
  { id: 1, label: 'Sign in', description: 'Use your .edu email' },
  { id: 2, label: 'Set up', description: 'Add your details' },
  { id: 3, label: 'Pick classes', description: 'Select your courses' },
  { id: 4, label: 'Ready', description: 'Start exploring', hideNumber: true },
] as const;

const STEP_DURATION = 0.16;
const ANIMATION_CONFIG = {
  header: { opacity: [0.02, 0.12], y: [0.02, 0.12] },
  phone: { opacity: [0.08, 0.18, 0.85, 0.95], y: [0.08, 0.18] },
  stepTransition: { enter: { first: [0.08, 0.16], default: [-0.02, 0.04] }, exit: [-0.02, 0.04] },
  lastStepHold: 0.88,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// STEP SCREEN — Swipe animation for phone content
// ─────────────────────────────────────────────────────────────────────────────

const StepScreen = memo<{
  step: 1 | 2 | 3 | 4;
  index: number;
  scrollProgress: MotionValue<number>;
}>(({ step, index, scrollProgress }) => {
  const stepStart = 0.15 + index * STEP_DURATION;
  const stepEnd = stepStart + STEP_DURATION;
  const isLast = index === STEPS.length - 1;
  const isFirst = index === 0;

  const enterStart = isFirst ? ANIMATION_CONFIG.stepTransition.enter.first[0] : stepStart + ANIMATION_CONFIG.stepTransition.enter.default[0];
  const enterEnd = isFirst ? ANIMATION_CONFIG.stepTransition.enter.first[1] : stepStart + ANIMATION_CONFIG.stepTransition.enter.default[1];
  const exitStart = stepEnd + ANIMATION_CONFIG.stepTransition.exit[0];
  const exitEnd = stepEnd + ANIMATION_CONFIG.stepTransition.exit[1];

  const x = useTransform(
    scrollProgress,
    isLast
      ? [enterStart, enterEnd, ANIMATION_CONFIG.lastStepHold]
      : [enterStart, enterEnd, exitStart, exitEnd],
    isLast
      ? ['100%', '0%', '0%']
      : ['100%', '0%', '0%', '-100%']
  );

  const opacity = useTransform(
    scrollProgress,
    isLast
      ? [enterStart, enterStart + 0.02, enterEnd, ANIMATION_CONFIG.lastStepHold]
      : [enterStart, enterStart + 0.02, enterEnd, exitStart, exitEnd - 0.02, exitEnd],
    isLast
      ? [0, 1, 1, 1]
      : [0, 1, 1, 1, 1, 0]
  );

  const zIndex = useTransform(scrollProgress, (p) => {
    const entering = p >= enterStart && p <= enterEnd;
    const active = p > enterEnd && (isLast || p < exitStart);
    const exiting = !isLast && p >= exitStart && p <= exitEnd;
    return (entering || active || exiting) ? 5 : 1;
  });

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ x, opacity, zIndex }}
    >
      <OnboardingScreen step={step} />
    </motion.div>
  );
});

StepScreen.displayName = 'StepScreen';

// ─────────────────────────────────────────────────────────────────────────────
// STEP LABEL — Side labels that highlight as active
// ─────────────────────────────────────────────────────────────────────────────

const StepLabel = memo<{
  step: Step;
  index: number;
  scrollProgress: MotionValue<number>;
}>(({ step, index, scrollProgress }) => {
  const stepStart = 0.15 + index * STEP_DURATION;
  const stepEnd = stepStart + STEP_DURATION;
  const isLast = index === STEPS.length - 1;
  const isFirst = index === 0;

  const activeStart = isFirst ? 0.08 : stepStart - 0.04;
  const activeEnd = isLast ? ANIMATION_CONFIG.lastStepHold : stepEnd + 0.03;

  const isActiveCheck = (p: number) => {
    if (isLast) return p >= activeStart;
    return p >= activeStart && p < activeEnd;
  };

  const numberColor = useTransform(scrollProgress, (p) =>
    isActiveCheck(p) ? '#27251f' : '#c8c5bc'
  );

  const numberBg = useTransform(scrollProgress, (p) =>
    isActiveCheck(p) ? '#27251f' : 'transparent'
  );

  const numberTextColor = useTransform(scrollProgress, (p) =>
    isActiveCheck(p) ? '#ffffff' : '#a0a0a0'
  );

  const labelColor = useTransform(scrollProgress, (p) =>
    isActiveCheck(p) ? '#27251f' : '#a0a0a0'
  );

  const descOpacity = useTransform(
    scrollProgress,
    isLast
      ? [activeStart - 0.02, activeStart + 0.02, ANIMATION_CONFIG.lastStepHold]
      : [activeStart - 0.02, activeStart + 0.02, activeEnd - 0.02, activeEnd],
    isLast
      ? [0, 1, 1]
      : [0, 1, 1, 0]
  );

  const y = useTransform(
    scrollProgress,
    isLast
      ? [activeStart - 0.02, activeStart + 0.02, ANIMATION_CONFIG.lastStepHold]
      : [activeStart - 0.02, activeStart + 0.02, activeEnd - 0.02, activeEnd],
    isLast
      ? [4, 0, 0]
      : [4, 0, 0, 4]
  );

  return (
    <motion.div className="flex items-start gap-2 md:gap-4" style={{ y }}>
      {!step.hideNumber ? (
        <motion.div
          className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-medium flex-shrink-0 border-2"
          style={{
            backgroundColor: numberBg,
            borderColor: numberColor,
            color: numberTextColor,
          }}
          aria-label={`Step ${index + 1}: ${step.label}`}
        >
          {index + 1}
        </motion.div>
      ) : (
        <div className="w-6 md:w-8 flex-shrink-0" aria-hidden="true" />
      )}

      <div className="pt-0.5 md:pt-1">
        <motion.div
          className="text-sm md:text-xl font-medium leading-tight"
          style={{ color: labelColor }}
        >
          {step.label}
        </motion.div>
        <motion.div
          className="text-xs md:text-sm text-[#787771] mt-0.5 hidden md:block"
          style={{ opacity: descOpacity }}
        >
          {step.description}
        </motion.div>
      </div>
    </motion.div>
  );
});

StepLabel.displayName = 'StepLabel';

// ─────────────────────────────────────────────────────────────────────────────
// STATIC VERSION (Reduced Motion)
// ─────────────────────────────────────────────────────────────────────────────

const ProcessStatic = memo(() => (
  <section id="process" className="py-16 md:py-24">
    <div className="max-w-5xl mx-auto px-4 md:px-6">
      <div className="text-center mb-10 md:mb-16">
        <h2 className="text-3xl md:text-5xl font-normal text-[#27251f] mb-2 md:mb-4 leading-[1.05] tracking-[-0.02em]">
          Minutes to migrate
        </h2>
        <p className="text-base md:text-xl text-[#787771]">3 steps. That's it.</p>
      </div>

      <div className="flex flex-row items-center justify-center gap-4 md:gap-12">
        <div className="hidden md:block">
          <PhoneFrame scale={0.8}>
            <OnboardingScreen step={4} />
          </PhoneFrame>
        </div>
        <div className="block md:hidden">
          <PhoneFrame scale={0.55}>
            <OnboardingScreen step={4} />
          </PhoneFrame>
        </div>

        <div className="flex flex-col gap-3 md:gap-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-start gap-2 md:gap-4">
              {!step.hideNumber ? (
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#27251f] flex items-center justify-center text-xs md:text-sm font-medium text-white flex-shrink-0">
                  {index + 1}
                </div>
              ) : (
                <div className="w-6 md:w-8 flex-shrink-0" />
              )}
              <div className="pt-0.5 md:pt-1">
                <div className="text-sm md:text-lg font-medium text-[#27251f]">{step.label}</div>
                <div className="text-xs md:text-sm text-[#787771] hidden md:block">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
));

ProcessStatic.displayName = 'ProcessStatic';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Process = memo(() => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const headerOpacity = useTransform(scrollYProgress, ANIMATION_CONFIG.header.opacity, [0, 1]);
  const headerY = useTransform(scrollYProgress, ANIMATION_CONFIG.header.y, [20, 0]);

  const phoneOpacity = useTransform(scrollYProgress, ANIMATION_CONFIG.phone.opacity, [0, 1, 1, 0]);
  const phoneY = useTransform(scrollYProgress, ANIMATION_CONFIG.phone.y, [30, 0]);

  if (prefersReduced) {
    return <ProcessStatic />;
  }

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative"
      style={{ height: '300vh' }}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-4 md:px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-6 md:mb-10"
          style={{ opacity: headerOpacity, y: headerY }}
        >
          <h2 className="text-3xl md:text-6xl font-normal text-[#27251f] mb-2 md:mb-3 leading-[1.05] tracking-[-0.02em]">
            Minutes to migrate
          </h2>
          <p className="text-base md:text-xl text-[#787771]">
            3 steps. That's it.
          </p>
        </motion.div>

        {/* Main content */}
        <motion.div
          className="flex flex-row items-center gap-4 md:gap-16 max-w-4xl w-full justify-center"
          style={{ opacity: phoneOpacity, y: phoneY }}
        >
          {/* Phone */}
          <div className="relative flex-shrink-0">
            <div className="hidden md:block">
              <PhoneFrame scale={0.88}>
                <div className="relative w-full h-full">
                  {STEPS.map((step, index) => (
                    <StepScreen
                      key={step.id}
                      step={step.id as 1 | 2 | 3 | 4}
                      index={index}
                      scrollProgress={scrollYProgress}
                    />
                  ))}
                </div>
              </PhoneFrame>
            </div>
            <div className="block md:hidden">
              <PhoneFrame scale={0.55}>
                <div className="relative w-full h-full">
                  {STEPS.map((step, index) => (
                    <StepScreen
                      key={step.id}
                      step={step.id as 1 | 2 | 3 | 4}
                      index={index}
                      scrollProgress={scrollYProgress}
                    />
                  ))}
                </div>
              </PhoneFrame>
            </div>
          </div>

          {/* Step labels */}
          <div className="flex flex-col gap-3 md:gap-8">
            {STEPS.map((step, index) => (
              <StepLabel
                key={step.id}
                step={step}
                index={index}
                scrollProgress={scrollYProgress}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
});

Process.displayName = 'Process';
