/**
 * Features.tsx — "Everything you need"
 *
 * Motion: Scroll-linked animations that reverse when scrolling up.
 * Each feature animates based on its scroll position.
 */

import { memo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from './animations';
import {
  PhoneFrame,
  ChatScreen,
  FeedScreen,
  CalendarScreen,
  GroupsScreen,
} from './PhoneMockup';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

interface Feature {
  id: string;
  label: string;
  sublabel: string;
  Screen: React.ComponentType;
  align: 'left' | 'right';
}

const FEATURES: readonly Feature[] = [
  {
    id: 'messaging',
    label: 'Group chats',
    sublabel: 'Stay connected with friends and classmates.',
    Screen: () => <ChatScreen variant="friends" />,
    align: 'left',
  },
  {
    id: 'feed',
    label: 'Campus feed',
    sublabel: 'Anonymous or public. Your choice.',
    Screen: FeedScreen,
    align: 'right',
  },
  {
    id: 'calendar',
    label: 'Smart calendar',
    sublabel: 'Classes, deadlines, events — unified.',
    Screen: CalendarScreen,
    align: 'left',
  },
  {
    id: 'groups',
    label: 'Communities',
    sublabel: 'Find your people.',
    Screen: GroupsScreen,
    align: 'right',
  },
] as const;

const SCROLL_RANGES = {
  header: { input: [0.4, 0.8], opacity: [0, 1], y: [24, 0], subtitleY: [16, 0] },
  phone: { input: [0.4, 0.8], opacity: [0, 1] },
  label: { input: [0.5, 0.9], opacity: [0, 1], y: [24, 0] },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader = memo(() => {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });

  const opacity = useTransform(scrollYProgress, SCROLL_RANGES.header.input, SCROLL_RANGES.header.opacity);
  const y = useTransform(scrollYProgress, SCROLL_RANGES.header.input, SCROLL_RANGES.header.y);
  const subtitleY = useTransform(scrollYProgress, SCROLL_RANGES.header.input, SCROLL_RANGES.header.subtitleY);

  return (
    <div ref={ref} className="text-center mb-20 md:mb-28 px-6">
      <motion.h2
        className="text-4xl md:text-6xl font-normal text-[#27251f] mb-4 leading-[1.05] tracking-[-0.02em]"
        style={{ opacity, y }}
      >
        Everything you need
      </motion.h2>
      <motion.p
        className="text-xl md:text-2xl text-[#787771]"
        style={{ opacity, y: subtitleY }}
      >
        Nothing you don't
      </motion.p>
    </div>
  );
});

SectionHeader.displayName = 'SectionHeader';

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE ROW
// ─────────────────────────────────────────────────────────────────────────────

const FeatureRow = memo<{ feature: Feature; index: number }>(({ feature, index }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isLeft = feature.align === 'left';

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });

  const phoneOpacity = useTransform(scrollYProgress, SCROLL_RANGES.phone.input, SCROLL_RANGES.phone.opacity);
  const phoneX = useTransform(scrollYProgress, SCROLL_RANGES.phone.input, [isLeft ? -40 : 40, 0]);

  const labelOpacity = useTransform(scrollYProgress, SCROLL_RANGES.label.input, SCROLL_RANGES.label.opacity);
  const labelY = useTransform(scrollYProgress, SCROLL_RANGES.label.input, SCROLL_RANGES.label.y);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-10 md:gap-16 ${
        isLeft ? 'flex-col md:flex-row' : 'flex-col md:flex-row-reverse'
      }`}
    >
      {/* Phone */}
      <motion.div
        className="flex-shrink-0"
        style={{ opacity: phoneOpacity, x: phoneX }}
      >
        <PhoneFrame scale={0.88}>
          <feature.Screen />
        </PhoneFrame>
      </motion.div>

      {/* Label */}
      <motion.div
        className={`text-center md:text-left ${isLeft ? '' : 'md:text-right'}`}
        style={{ opacity: labelOpacity, y: labelY }}
      >
        <div className="text-sm text-[#a0a0a0] mb-2 font-mono tracking-wider" aria-label={`Feature ${index + 1}`}>
          0{index + 1}
        </div>
        <h3 className="text-3xl md:text-5xl font-normal text-[#27251f] mb-3 leading-[1.1] tracking-[-0.02em]">
          {feature.label}
        </h3>
        <p className="text-lg md:text-xl text-[#787771] max-w-xs mx-auto md:mx-0">
          {feature.sublabel}
        </p>
      </motion.div>
    </div>
  );
});

FeatureRow.displayName = 'FeatureRow';

// ─────────────────────────────────────────────────────────────────────────────
// STATIC VERSION (Reduced Motion)
// ─────────────────────────────────────────────────────────────────────────────

const FeaturesStatic = memo(() => (
  <section id="features" className="py-24">
    <div className="max-w-5xl mx-auto px-6">
      <div className="text-center mb-20">
        <h2 className="text-5xl font-normal text-[#27251f] mb-4 leading-[1.05] tracking-[-0.02em]">
          Everything you need
        </h2>
        <p className="text-xl text-[#787771]">Nothing you don't</p>
      </div>

      <div className="grid md:grid-cols-2 gap-16">
        {FEATURES.map((feature, index) => (
          <div key={feature.id} className="flex flex-col items-center">
            <PhoneFrame scale={0.8}>
              <feature.Screen />
            </PhoneFrame>
            <div className="mt-6 text-center">
              <div className="text-sm text-[#a0a0a0] mb-1 font-mono">0{index + 1}</div>
              <h3 className="text-2xl font-normal text-[#27251f] mb-2">
                {feature.label}
              </h3>
              <p className="text-[#787771]">{feature.sublabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
));

FeaturesStatic.displayName = 'FeaturesStatic';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Features = memo(() => {
  const prefersReduced = usePrefersReducedMotion();

  if (prefersReduced) {
    return <FeaturesStatic />;
  }

  return (
    <section id="features" className="py-24 md:py-32">
      <SectionHeader />

      <div className="max-w-5xl mx-auto px-6 space-y-24 md:space-y-32">
        {FEATURES.map((feature, index) => (
          <FeatureRow key={feature.id} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
});

Features.displayName = 'Features';
