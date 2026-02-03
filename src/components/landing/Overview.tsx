/**
 * Overview.tsx — "Your campus hub"
 *
 * SCROLL-DRIVEN ORBITAL CAROUSEL
 * All 5 phones rotate around a central axis with depth simulation.
 * Premium, cinematic motion tied directly to scroll position.
 */

import React, { memo, useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence, useInView } from 'framer-motion';
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
// ORBITAL CAROUSEL CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Phone screens in orbital order (starting from front position).
 * The order determines which phone appears at each orbital position.
 */
const ORBITAL_PHONES = [
  { id: 'chat', Screen: AnimatedChatScreen, props: { variant: 'group' as const } },
  { id: 'profile', Screen: ProfileScreen, props: {} },
  { id: 'feed', Screen: FeedScreen, props: {} },
  { id: 'groups', Screen: GroupsScreen, props: {} },
  { id: 'calendar', Screen: CalendarScreen, props: {} },
] as const;

const PHONE_COUNT = ORBITAL_PHONES.length;
const ANGLE_STEP = (2 * Math.PI) / PHONE_COUNT; // 72° between phones

/**
 * Orbital geometry parameters.
 * Tuned for visual balance and depth perception.
 */
const ORBITAL_CONFIG = {
  // Horizontal spread of the orbit (pixels)
  radiusX: 300,
  // Scale range: back phones are smaller, front phones are larger
  // Range: 0.55 (back) to 0.95 (front) for clear size differentiation
  scaleMin: 0.55,
  scaleMax: 0.95,
  // Opacity: all phones at full opacity (no transparency)
  opacityMin: 1,
  opacityMax: 1,
  // Vertical offset for depth (back phones shift up slightly)
  verticalDepthOffset: 25,
  // Auto-spin animation settings
  // Total rotation before settling (2 full rotations = 4π, ends with chat in front)
  totalRotation: Math.PI * 4,
  // Spring config for slower, smoother spin with gentle deceleration
  springConfig: { stiffness: 25, damping: 18, mass: 1.5 },
} as const;

/**
 * Scroll trigger ranges for header animation.
 */
const SCROLL_RANGES = {
  // Header fades in early
  header: { input: [0, 0.15], opacity: [0, 1], y: [40, 0] },
};

// ─────────────────────────────────────────────────────────────────────────────
// ORBITAL MATH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate transform values for a phone at a given orbital angle.
 * Angle 0 = front center, π = back center.
 */
function getOrbitalTransforms(angle: number) {
  // Normalize angle to 0-2π range
  const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Depth factor: 1 at front (angle 0), -1 at back (angle π)
  const depthFactor = Math.cos(normalizedAngle);
  
  // Horizontal position: sin wave creates left-right movement
  const x = Math.sin(normalizedAngle) * ORBITAL_CONFIG.radiusX;
  
  // Scale: larger in front, smaller in back
  const scaleRange = ORBITAL_CONFIG.scaleMax - ORBITAL_CONFIG.scaleMin;
  const scale = ORBITAL_CONFIG.scaleMin + ((depthFactor + 1) / 2) * scaleRange;
  
  // Opacity: more opaque in front, dimmer in back
  const opacityRange = ORBITAL_CONFIG.opacityMax - ORBITAL_CONFIG.opacityMin;
  const opacity = ORBITAL_CONFIG.opacityMin + ((depthFactor + 1) / 2) * opacityRange;
  
  // Vertical offset: subtle rise for back phones (adds depth)
  const y = -depthFactor * ORBITAL_CONFIG.verticalDepthOffset;
  
  // Z-index: based on depth (front = highest)
  // Map depthFactor from [-1, 1] to z-index [1, 10]
  const zIndex = Math.round(((depthFactor + 1) / 2) * 9) + 1;
  
  return { x, y, scale, opacity, zIndex };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORBITAL PHONE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface OrbitalPhoneProps {
  phone: typeof ORBITAL_PHONES[number];
  baseAngle: number;
  rotationOffset: MotionValue<number>;
}

/**
 * Individual phone in the orbital carousel.
 * Transforms are derived from base angle + scroll-driven rotation offset.
 * 
 * z-index is applied to the outer positioned element for correct stacking.
 */
const OrbitalPhone = memo<OrbitalPhoneProps>(({ phone, baseAngle, rotationOffset }) => {
  // Combine base angle with scroll-driven rotation
  const angle = useTransform(rotationOffset, (rotation) => baseAngle + rotation);
  
  // Derive all transforms from the combined angle
  const x = useTransform(angle, (a) => getOrbitalTransforms(a).x);
  const y = useTransform(angle, (a) => getOrbitalTransforms(a).y);
  const scale = useTransform(angle, (a) => getOrbitalTransforms(a).scale);
  const opacity = useTransform(angle, (a) => getOrbitalTransforms(a).opacity);
  const zIndex = useTransform(angle, (a) => getOrbitalTransforms(a).zIndex);
  
  const { Screen, props, id } = phone;
  
  // Phone dimensions at scale 1
  const phoneWidth = 280;
  const phoneHeight = 572;
  
  return (
    // Motion wrapper with absolute positioning - z-index works on positioned elements
    <motion.div
      className="absolute"
      style={{
        left: '50%',
        top: '50%',
        marginLeft: -phoneWidth / 2,
        marginTop: -phoneHeight / 2,
        x,
        y,
        scale,
        opacity,
        zIndex,
        // Transform origin at center for proper scaling
        transformOrigin: 'center center',
        // Hardware acceleration for 60fps
        willChange: 'transform, opacity, z-index',
      }}
    >
      <PhoneFrame scale={1}>
        {id === 'chat' ? (
          <Screen {...(props as { variant: 'group' })} />
        ) : (
          <Screen />
        )}
      </PhoneFrame>
    </motion.div>
  );
});

OrbitalPhone.displayName = 'OrbitalPhone';

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP ORBITAL CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────

const OrbitalCarousel = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastRotationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  
  // Track if carousel is in view (not once - so we can detect leaving)
  const isInView = useInView(containerRef, { amount: 0.4 });
  
  // Rotation motion value for continuous spinning
  const rotationValue = useMotionValue(0);
  
  // Spring for smooth stopping/starting
  const rotationOffset = useSpring(rotationValue, ORBITAL_CONFIG.springConfig);
  
  // Handle spinning and stopping based on visibility
  useEffect(() => {
    // Speed: radians per second (slower = more elegant)
    const radiansPerSecond = 0.8;
    
    if (isInView) {
      // Stop spinning - settle to nearest position with chat in front
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Get current rotation and calculate nearest position where chat (index 0) is in front
      const currentRotation = rotationValue.get();
      const fullRotations = Math.ceil(currentRotation / (2 * Math.PI));
      const targetRotation = fullRotations * 2 * Math.PI;
      
      // Save this as our last rotation for when we resume
      lastRotationRef.current = targetRotation;
      
      // Animate to the target (spring will handle smooth deceleration)
      rotationValue.set(targetRotation);
    } else {
      // Resume spinning from where we left off
      lastTimeRef.current = Date.now();
      
      const animate = () => {
        const elapsed = (Date.now() - lastTimeRef.current) / 1000;
        const currentRotation = lastRotationRef.current + elapsed * radiansPerSecond;
        rotationValue.set(currentRotation);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // Start continuous animation
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInView, rotationValue]);
  
  return (
    <div
      ref={containerRef}
      className="relative w-full h-[580px] lg:h-[620px]"
    >
      {/* Orbital container - phones are absolutely positioned relative to this */}
      <div className="relative w-full h-full">
        {ORBITAL_PHONES.map((phone, index) => (
          <OrbitalPhone
            key={phone.id}
            phone={phone}
            baseAngle={index * ANGLE_STEP}
            rotationOffset={rotationOffset}
          />
        ))}
      </div>
    </div>
  );
});

OrbitalCarousel.displayName = 'OrbitalCarousel';

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE CAROUSEL (Touch-friendly alternative)
// ─────────────────────────────────────────────────────────────────────────────

// Order: messaging is last so user scrolls to it at the end
const MOBILE_SCREENS = [
  { id: 'feed', label: 'Feed', Screen: FeedScreen, props: {} },
  { id: 'calendar', label: 'Calendar', Screen: CalendarScreen, props: {} },
  { id: 'groups', label: 'Squads', Screen: GroupsScreen, props: {} },
  { id: 'profile', label: 'Profile', Screen: ProfileScreen, props: {} },
  { id: 'chat', label: 'Messages', Screen: AnimatedChatScreen, props: { variant: 'group' as const } },
] as const;

const CAROUSEL_TRANSITION = {
  duration: 0.3,
  ease: 'easeOut' as const,
};

const SWIPE_THRESHOLD = 50;
const AUTO_ADVANCE_DELAY_MS = 1200;
const INITIAL_DELAY_MS = 800;

const MobileCarousel = memo(() => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const hasAutoAdvanced = useRef(false);

  const isInView = useInView(containerRef, { once: true, amount: 0.4 });

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, MOBILE_SCREENS.length - 1)));
  };

  // Auto-swipe to the last slide (messaging) when carousel comes into view
  useEffect(() => {
    if (!isInView || hasAutoAdvanced.current) return;
    hasAutoAdvanced.current = true;

    const lastIndex = MOBILE_SCREENS.length - 1;
    let step = 0;

    const advance = () => {
      step += 1;
      if (step <= lastIndex) {
        setCurrentIndex(step);
        if (step < lastIndex) {
          setTimeout(advance, AUTO_ADVANCE_DELAY_MS);
        }
      }
    };

    const timer = setTimeout(advance, INITIAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isInView]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
  };

  const currentScreen = MOBILE_SCREENS[currentIndex];

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      <div
        className="relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
                <currentScreen.Screen variant="group" />
              ) : (
                <currentScreen.Screen />
              )}
            </PhoneFrame>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators - user can tap to go to a slide */}
      <div className="flex gap-2 mt-6" role="tablist" aria-label="Carousel pages">
        {MOBILE_SCREENS.map((screen, index) => (
          <button
            key={screen.id}
            type="button"
            role="tab"
            aria-label={`Go to ${screen.label}`}
            aria-selected={index === currentIndex}
            onClick={() => goTo(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 touch-manipulation ${
              index === currentIndex
                ? 'bg-[#d47455] scale-110'
                : 'bg-[#d4d0c8] hover:bg-[#c4c0b8]'
            }`}
          />
        ))}
      </div>
    </div>
  );
});

MobileCarousel.displayName = 'MobileCarousel';

// ─────────────────────────────────────────────────────────────────────────────
// STATIC VERSION (Reduced Motion / Accessibility)
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
      
      {/* Static 5-phone layout with depth hierarchy */}
      <div className="flex justify-center items-center gap-[-20px]">
        {/* Back left */}
        <div style={{ zIndex: 1, position: 'relative', marginRight: '-25px', opacity: 0.5 }}>
          <PhoneFrame scale={0.55}>
            <GroupsScreen />
          </PhoneFrame>
        </div>
        {/* Mid left */}
        <div style={{ zIndex: 3, position: 'relative', marginRight: '-20px', opacity: 0.75 }}>
          <PhoneFrame scale={0.7}>
            <CalendarScreen />
          </PhoneFrame>
        </div>
        {/* Front center (hero) */}
        <div style={{ zIndex: 5, position: 'relative', marginRight: '-20px' }}>
          <PhoneFrame scale={0.9}>
            <ChatScreen variant="group" />
          </PhoneFrame>
        </div>
        {/* Mid right */}
        <div style={{ zIndex: 3, position: 'relative', marginRight: '-25px', opacity: 0.75 }}>
          <PhoneFrame scale={0.7}>
            <FeedScreen />
          </PhoneFrame>
        </div>
        {/* Back right */}
        <div style={{ zIndex: 1, position: 'relative', opacity: 0.5 }}>
          <PhoneFrame scale={0.55}>
            <ProfileScreen />
          </PhoneFrame>
        </div>
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

  // Track scroll progress through the section
  // Using a longer scroll range for smoother orbital motion
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Header animations
  const headerOpacity = useTransform(
    scrollYProgress,
    SCROLL_RANGES.header.input,
    SCROLL_RANGES.header.opacity
  );
  const headerY = useTransform(
    scrollYProgress,
    SCROLL_RANGES.header.input,
    SCROLL_RANGES.header.y
  );

  // Return static version for reduced motion preference
  if (prefersReduced) {
    return <OverviewStatic />;
  }

  return (
    <section
      ref={sectionRef}
      id="overview"
      className="relative pt-12 pb-24 md:pt-16 md:pb-48 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-8 md:mb-12"
          style={{ opacity: headerOpacity, y: headerY }}
        >
          <h2 className="text-4xl md:text-6xl font-normal text-[#27251f] mb-3 leading-[1.05] tracking-[-0.02em]">
            Your campus hub
          </h2>
          <p className="text-lg md:text-xl text-[#787771]">
            Everything you need. One place.
          </p>
        </motion.div>

        {/* Mobile: Swipe carousel */}
        <div className="md:hidden">
          <MobileCarousel />
        </div>

        {/* Desktop: Auto-spin orbital carousel */}
        <div className="hidden md:block">
          <OrbitalCarousel />
        </div>
      </div>
    </section>
  );
});

Overview.displayName = 'Overview';
