/**
 * Features.tsx — "Everything you need, nothing you don't"
 * 
 * Scroll-driven animation: Screens appear one-by-one as user scrolls,
 * each representing a core feature. Minimal text — let the UI speak.
 * 
 * Motion story:
 * - Each feature gets a dedicated scroll "chapter"
 * - Phone slides in from the side, brief label fades in
 * - Next scroll reveals next feature
 * - Creates a visual rhythm of discovery
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
} from './PhoneMockup';

interface Feature {
  id: string;
  label: string;      // One or two words max
  sublabel: string;   // Brief supporting text
  Screen: React.FC;
  align: 'left' | 'right';
}

const features: Feature[] = [
  {
    id: 'messaging',
    label: 'Class chats',
    sublabel: 'Auto-created for every course',
    Screen: () => <ChatScreen variant="group" />,
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
    sublabel: 'Classes, deadlines, events — unified',
    Screen: CalendarScreen,
    align: 'left',
  },
  {
    id: 'groups',
    label: 'Communities',
    sublabel: 'Find your people',
    Screen: GroupsScreen,
    align: 'right',
  },
];

export function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  if (prefersReduced) {
    return <FeaturesStatic />;
  }

  return (
    <section ref={sectionRef} id="features" className="relative">
      {/* Section header — appears at start */}
      <SectionHeader />

      {/* Feature chapters */}
      {features.map((feature, index) => (
        <FeatureChapter key={feature.id} feature={feature} index={index} />
      ))}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.6], [0, 1, 1]);
  const y = useTransform(scrollYProgress, [0, 0.3], [60, 0]);

  return (
    <div ref={ref} className="h-[60vh] flex items-center justify-center">
      <motion.div className="text-center px-6" style={{ opacity, y }}>
        <h2 className="text-4xl md:text-6xl font-normal text-[#0a0a0a] mb-4 leading-[1.05] tracking-[-0.02em]">
          Everything you need
        </h2>
        <p className="text-xl md:text-2xl text-[#787771]">
          Nothing you don't
        </p>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE CHAPTER — Each feature gets a scroll-pinned reveal
// ─────────────────────────────────────────────────────────────────────────────

function FeatureChapter({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const isLeft = feature.align === 'left';

  // Phone animation
  const phoneX = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [isLeft ? -120 : 120, 0, 0, isLeft ? -60 : 60]
  );
  const phoneOpacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);
  const phoneScale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.9, 1, 1, 0.95]);

  // Text animation — slightly delayed
  const textOpacity = useTransform(scrollYProgress, [0.1, 0.35, 0.7, 0.9], [0, 1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0.1, 0.35], [30, 0]);

  return (
    <div
      ref={ref}
      className="relative"
      style={{ height: '150vh' }} // Scroll height for this chapter
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-5xl mx-auto px-6">
          <div
            className={`flex items-center gap-12 md:gap-20 ${
              isLeft ? 'flex-col md:flex-row' : 'flex-col md:flex-row-reverse'
            }`}
          >
            {/* Phone mockup */}
            <motion.div
              className="flex-shrink-0"
              style={{
                x: phoneX,
                opacity: phoneOpacity,
                scale: phoneScale,
              }}
            >
              <PhoneFrame scale={0.95}>
                <feature.Screen />
              </PhoneFrame>
            </motion.div>

            {/* Feature label */}
            <motion.div
              className={`text-center md:text-left ${isLeft ? '' : 'md:text-right'}`}
              style={{ opacity: textOpacity, y: textY }}
            >
              {/* Feature number — subtle */}
              <div className="text-sm text-[#787771] mb-2 font-mono tracking-wide">
                0{index + 1}
              </div>
              <h3 className="text-3xl md:text-5xl font-normal text-[#0a0a0a] mb-3 leading-[1.1] tracking-[-0.02em]">
                {feature.label}
              </h3>
              <p className="text-lg md:text-xl text-[#787771] max-w-xs">
                {feature.sublabel}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC VERSION — for reduced motion preference
// ─────────────────────────────────────────────────────────────────────────────

function FeaturesStatic() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-normal text-[#0a0a0a] mb-4 leading-[1.05] tracking-[-0.02em]">
            Everything you need
          </h2>
          <p className="text-xl text-[#787771]">Nothing you don't</p>
        </div>

        <div className="grid md:grid-cols-2 gap-16">
          {features.map((feature, index) => (
            <div key={feature.id} className="flex flex-col items-center">
              <PhoneFrame scale={0.8}>
                <feature.Screen />
              </PhoneFrame>
              <div className="mt-6 text-center">
                <div className="text-sm text-[#787771] mb-1 font-mono">0{index + 1}</div>
                <h3 className="text-2xl font-normal text-[#0a0a0a] mb-2">
                  {feature.label}
                </h3>
                <p className="text-[#787771]">{feature.sublabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
