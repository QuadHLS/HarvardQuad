/**
 * Overview.tsx — "Your campus hub"
 *
 * Motion: Scroll-linked animations that reverse when scrolling up.
 * Phones fan out as section scrolls into view.
 * Mobile: Carousel that swipes through screens, ending with animated chat.
 */

import React, { memo, useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { usePrefersReducedMotion, carouselSlide } from './animations';
import {
  PhoneFrame,
  ChatScreen,
  AnimatedChatScreen,
  FeedScreen,
  CalendarScreen,
  GroupsScreen,
  ProfileScreen,
} from './PhoneMockup';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MOBILE_SCREENS = [
  { id: 'groups', label: 'Squads', Screen: GroupsScreen },
  { id: 'calendar', label: 'Calendar', Screen: CalendarScreen },
  { id: 'feed', label: 'Feed', Screen: FeedScreen },
  { id: 'profile', label: 'Profile', Screen: ProfileScreen },
  { id: 'chat', label: 'Messages', Screen: null },
] as const;

const CAROUSEL_DELAY = 500;
const CAROUSEL_INTERVAL = 750;

const SCROLL_RANGES = {
  header: { input: [0.3, 0.6], opacity: [0, 1], y: [24, 0] },
  center: { input: [0.4, 0.7], opacity: [0, 1], y: [24, 0] },
  inner: { input: [0.5, 0.8], opacity: [0, 1], y: [35, 0], rotate: { left: [-10, -6], right: [10, 6] } },
  outer: { input: [0.6, 0.9], opacity: [0, 1], y: [50, 0], rotate: { left: [-18, -12], right: [18, 12] } },
};

const CAROUSEL_TRANSITION = {
  duration: 0.3,
  ease: 'easeOut' as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────

const MobileCarousel = memo(() => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasReachedChat, setHasReachedChat] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const isInView = useInView(containerRef, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView || hasStarted.current) return;
    hasStarted.current = true;

    const advanceScreen = (index: number): void => {
      if (index >= MOBILE_SCREENS.length - 1) {
        setCurrentIndex(index);
        setHasReachedChat(true);
        return;
      }

      setCurrentIndex(index);
      setTimeout(() => advanceScreen(index + 1), CAROUSEL_INTERVAL);
    };

    setTimeout(() => advanceScreen(0), CAROUSEL_DELAY);
  }, [isInView]);

  const currentScreen = MOBILE_SCREENS[currentIndex];

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen.id}
            variants={carouselSlide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={CAROUSEL_TRANSITION}
          >
            <PhoneFrame scale={0.85}>
              {currentScreen.id === 'chat' ? (
                <AnimatedChatScreen variant="group" />
              ) : (
                <currentScreen.Screen />
              )}
            </PhoneFrame>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

MobileCarousel.displayName = 'MobileCarousel';

// ─────────────────────────────────────────────────────────────────────────────
// STATIC VERSION (Reduced Motion)
// ─────────────────────────────────────────────────────────────────────────────

const OverviewStatic = memo(() => (
  <section id="overview" className="pt-12 pb-24 md:pt-16 md:pb-32">
    <div className="max-w-6xl mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-5xl md:text-6xl font-normal text-[#27251f] mb-4 leading-[1.05] tracking-[-0.02em]">
          Your campus hub
        </h2>
        <p className="text-xl text-[#787771] max-w-md mx-auto">
          Everything you need. One place.
        </p>
      </div>
      <div className="flex justify-center items-end gap-4">
        <PhoneFrame scale={0.65}>
          <GroupsScreen />
        </PhoneFrame>
        <PhoneFrame scale={0.75}>
          <CalendarScreen />
        </PhoneFrame>
        <PhoneFrame scale={0.85}>
          <ChatScreen variant="group" />
        </PhoneFrame>
        <PhoneFrame scale={0.75}>
          <FeedScreen />
        </PhoneFrame>
        <PhoneFrame scale={0.65}>
          <ProfileScreen />
        </PhoneFrame>
      </div>
    </div>
  </section>
));

OverviewStatic.displayName = 'OverviewStatic';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Overview = memo(() => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'center center'],
  });

  // Header animations
  const headerOpacity = useTransform(scrollYProgress, SCROLL_RANGES.header.input, SCROLL_RANGES.header.opacity);
  const headerY = useTransform(scrollYProgress, SCROLL_RANGES.header.input, SCROLL_RANGES.header.y);

  // Center phone
  const centerOpacity = useTransform(scrollYProgress, SCROLL_RANGES.center.input, SCROLL_RANGES.center.opacity);
  const centerY = useTransform(scrollYProgress, SCROLL_RANGES.center.input, SCROLL_RANGES.center.y);

  // Inner phones
  const innerOpacity = useTransform(scrollYProgress, SCROLL_RANGES.inner.input, SCROLL_RANGES.inner.opacity);
  const innerLeftY = useTransform(scrollYProgress, SCROLL_RANGES.inner.input, SCROLL_RANGES.inner.y);
  const innerLeftRotate = useTransform(scrollYProgress, SCROLL_RANGES.inner.input, SCROLL_RANGES.inner.rotate.left);
  const innerRightY = useTransform(scrollYProgress, SCROLL_RANGES.inner.input, SCROLL_RANGES.inner.y);
  const innerRightRotate = useTransform(scrollYProgress, SCROLL_RANGES.inner.input, SCROLL_RANGES.inner.rotate.right);

  // Outer phones
  const outerOpacity = useTransform(scrollYProgress, SCROLL_RANGES.outer.input, SCROLL_RANGES.outer.opacity);
  const outerLeftY = useTransform(scrollYProgress, SCROLL_RANGES.outer.input, SCROLL_RANGES.outer.y);
  const outerLeftRotate = useTransform(scrollYProgress, SCROLL_RANGES.outer.input, SCROLL_RANGES.outer.rotate.left);
  const outerRightY = useTransform(scrollYProgress, SCROLL_RANGES.outer.input, SCROLL_RANGES.outer.y);
  const outerRightRotate = useTransform(scrollYProgress, SCROLL_RANGES.outer.input, SCROLL_RANGES.outer.rotate.right);

  if (prefersReduced) {
    return <OverviewStatic />;
  }

  return (
    <section
      ref={sectionRef}
      id="overview"
      className="pt-12 pb-24 md:pt-16 md:pb-32 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          style={{ opacity: headerOpacity, y: headerY }}
        >
          <h2 className="text-4xl md:text-6xl font-normal text-[#27251f] mb-3 leading-[1.05] tracking-[-0.02em]">
            Your campus hub
          </h2>
          <p className="text-lg md:text-xl text-[#787771]">
            Everything you need. One place.
          </p>
        </motion.div>

        {/* Mobile: Carousel */}
        <div className="md:hidden">
          <MobileCarousel />
        </div>

        {/* Desktop: Phone fan arrangement */}
        <div className="hidden md:flex relative justify-center items-end gap-3 md:gap-4 min-h-[400px] md:min-h-[500px]">
          {/* Far left — Groups */}
          <motion.div
            className="hidden lg:block"
            style={{
              opacity: outerOpacity,
              y: outerLeftY,
              rotate: outerLeftRotate,
            }}
          >
            <PhoneFrame scale={0.68}>
              <GroupsScreen />
            </PhoneFrame>
          </motion.div>

          {/* Left — Calendar */}
          <motion.div
            style={{
              opacity: innerOpacity,
              y: innerLeftY,
              rotate: innerLeftRotate,
            }}
          >
            <PhoneFrame scale={0.78}>
              <CalendarScreen />
            </PhoneFrame>
          </motion.div>

          {/* Center — Chat conversation */}
          <motion.div
            style={{
              opacity: centerOpacity,
              y: centerY,
            }}
          >
            <PhoneFrame scale={0.88}>
              <AnimatedChatScreen variant="group" />
            </PhoneFrame>
          </motion.div>

          {/* Right — Feed */}
          <motion.div
            style={{
              opacity: innerOpacity,
              y: innerRightY,
              rotate: innerRightRotate,
            }}
          >
            <PhoneFrame scale={0.78}>
              <FeedScreen />
            </PhoneFrame>
          </motion.div>

          {/* Far right — Profile */}
          <motion.div
            className="hidden lg:block"
            style={{
              opacity: outerOpacity,
              y: outerRightY,
              rotate: outerRightRotate,
            }}
          >
            <PhoneFrame scale={0.68}>
              <ProfileScreen />
            </PhoneFrame>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

Overview.displayName = 'Overview';
