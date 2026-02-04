/**
 * Overview.tsx — "Your campus hub"
 *
 * SCROLL-DRIVEN ORBITAL CAROUSEL
 * All 5 phones rotate around a central axis with depth simulation.
 * Premium, cinematic motion tied directly to scroll position.
 *
 * BACKGROUND TRANSITION
 * As this section scrolls into view, the page background transitions
 * from warm orange to deep charcoal — a cinematic "mood shift" moment.
 * The transition is smooth, uses no opacity flashes, and respects
 * prefers-reduced-motion.
 */

import React, { memo, useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, animate, AnimatePresence, useInView, MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from './animations';
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
// BACKGROUND TRANSITION CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dark palette — warm undertones matching the text black (#27251f).
 * These colors create a focused, immersive environment that feels
 * cohesive with the brand's warm aesthetic.
 *
 * Base: #0d0c0a — deepest warm black (darkest)
 * Mid:  #161410 — warm dark brown (center glow)
 * Edge: #1e1c17 — warm charcoal, slightly lighter (vignette edges)
 *
 * All derived from the text black (#27251f) warm brown undertone.
 */
const DARK_COLORS = {
  base: '#0d0c0a',
  mid: '#161410',
  edge: '#1e1c17',
  // Warm accent for radial variation — same family as text black
  warmAccent: 'rgba(39, 37, 31, 0.5)',
} as const;

/**
 * The full dark background gradient — organic, not flat.
 * Radial gradients create a subtle vignette effect that feels natural.
 */
const DARK_BACKGROUND = `
  radial-gradient(ellipse 120% 80% at 50% 40%, ${DARK_COLORS.mid}, transparent 70%),
  radial-gradient(ellipse 100% 100% at 20% 80%, ${DARK_COLORS.warmAccent}, transparent 50%),
  radial-gradient(ellipse 100% 100% at 80% 80%, ${DARK_COLORS.warmAccent}, transparent 50%),
  ${DARK_COLORS.base}
`;

/**
 * Scroll thresholds for background transition.
 *
 * input:  [0.08, 0.25, 0.75, 0.92]
 *         0.08 = section just entering viewport (bottom edge visible)
 *         0.25 = section ~25% scrolled in — transition complete
 *         0.75 = section ~75% scrolled through — still dark
 *         0.92 = section almost exiting — begin fade out
 *
 * output: [0, 1, 1, 0]
 *         0 = fully transparent (warm orange shows through)
 *         1 = fully visible dark background
 *
 * This creates a smooth fade-in as you enter, hold while viewing,
 * and smooth fade-out as you leave.
 */
const BG_SCROLL_THRESHOLDS = {
  input: [0.08, 0.25, 0.75, 0.92],
  output: [0, 1, 1, 0],
} as const;

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
  glowIntensity: number;
}

/**
 * Individual phone in the orbital carousel.
 * Transforms are derived from base angle + scroll-driven rotation offset.
 * 
 * z-index is applied to the outer positioned element for correct stacking.
 */
const OrbitalPhone = memo<OrbitalPhoneProps>(({ phone, baseAngle, rotationOffset, glowIntensity }) => {
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
      <PhoneFrame scale={1} glowIntensity={glowIntensity}>
        {id === 'chat' ? (
          <Screen {...(props as { variant: 'group'; onConversationComplete?: () => void })} />
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

const DRAG_SENSITIVITY = (2 * Math.PI) / 750; // ~750px horizontal drag = one full rotation
const SNAP_DURATION = 0.4;
const TWO_PI = 2 * Math.PI;
// Roulette-style coast: friction per frame (~60fps), min velocity to stop, gentle snap duration
const INERTIA_FRICTION = 0.985;
const INERTIA_VELOCITY_THRESHOLD = 0.08;
const INERTIA_SNAP_DURATION = 0.5;

/** Return rotation that puts the phone closest to current rotation at center (angle 0). */
function getSnapTarget(currentRotation: number): number {
  let bestTarget = currentRotation;
  let bestDist = Infinity;
  for (let i = 0; i < PHONE_COUNT; i++) {
    const baseAngle = i * ANGLE_STEP;
    const k = Math.round((currentRotation + baseAngle) / TWO_PI);
    const target = -baseAngle + k * TWO_PI;
    const d = ((currentRotation - target) % TWO_PI + TWO_PI) % TWO_PI;
    const dist = d > Math.PI ? TWO_PI - d : d;
    if (dist < bestDist) {
      bestDist = dist;
      bestTarget = target;
    }
  }
  return bestTarget;
}

interface OrbitalCarouselProps {
  scrollProgress: MotionValue<number>;
}

const OrbitalCarousel = memo<OrbitalCarouselProps>(({ scrollProgress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastRotationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const shouldSpinRef = useRef<boolean>(true); // true = spin, false = paused (in view / settling)
  const [chatComplete, setChatComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartValue = useRef<number>(0);
  const isDraggingRef = useRef(false);
  
  // Calculate glow intensity from scroll progress (matches background transition)
  const glowIntensity = useTransform(
    scrollProgress,
    BG_SCROLL_THRESHOLDS.input,
    BG_SCROLL_THRESHOLDS.output
  );
  const [currentGlow, setCurrentGlow] = useState(0);
  
  useEffect(() => {
    const unsubscribe = glowIntensity.on('change', setCurrentGlow);
    return () => unsubscribe();
  }, [glowIntensity]);
  const lastMoveX = useRef<number>(0);
  const lastMoveTime = useRef<number>(0);
  const moveHistoryRef = useRef<{ x: number; t: number }[]>([]);
  const inertiaRef = useRef<number | null>(null);
  const resumeSpinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if carousel is in view; use 0.25 so we're solidly "in view" when on the page (avoids flicker)
  const isInView = useInView(containerRef, { amount: 0.25 });

  // Rotation motion value for continuous spinning and settle
  const rotationValue = useMotionValue(0);
  // Spring for smooth stopping/starting (only used before conversation ends)
  const rotationOffset = useSpring(rotationValue, ORBITAL_CONFIG.springConfig);
  // Drag offset (added to rotation when user drags after conversation ends)
  const dragValue = useMotionValue(0);
  // When chat complete: use rotationValue + drag so release has no snap; otherwise use spring
  const totalFromSpring = useTransform(
    [rotationOffset, dragValue],
    ([r, d]: number[]) => r + d
  );
  const totalFromDirect = useTransform(
    [rotationValue, dragValue],
    ([r, d]: number[]) => r + d
  );
  const totalRotation = chatComplete ? totalFromDirect : totalFromSpring;

  const fastRadiansPerSecond = 2.4;
  const settleDuration = 1.1;

  // Spin loop: starts on mount so carousel is already spinning before user scrolls to section
  useEffect(() => {
    const spin = () => {
      if (shouldSpinRef.current) {
        const elapsed = (Date.now() - lastTimeRef.current) / 1000;
        lastTimeRef.current = Date.now();
        lastRotationRef.current += elapsed * fastRadiansPerSecond;
        rotationValue.set(lastRotationRef.current);
      }
      animationRef.current = requestAnimationFrame(spin);
    };
    lastTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(spin);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [rotationValue]);

  // When section comes into view: pause spin, ease to message page; when leaving: resume spin after delay (avoids flicker)
  const RESUME_SPIN_DELAY_MS = 200;
  // Track if we've already settled (prevents re-settling on isInView flicker)
  const hasSettledRef = useRef(false);
  
  useEffect(() => {
    // Always clear pending resume when in view
    if (isInView) {
      if (resumeSpinTimeoutRef.current) {
        clearTimeout(resumeSpinTimeoutRef.current);
        resumeSpinTimeoutRef.current = null;
      }
      // Always stop spin when in view
      shouldSpinRef.current = false;
      
      // Only animate settle once (before chat completes)
      if (!chatComplete && !hasSettledRef.current) {
        hasSettledRef.current = true;
        const currentRotation = rotationValue.get();
        const fullRotations = Math.ceil(currentRotation / TWO_PI);
        const targetRotation = fullRotations * TWO_PI;
        lastRotationRef.current = targetRotation;

        animate(rotationValue, targetRotation, {
          type: 'tween',
          duration: settleDuration,
          ease: [0.22, 0.61, 0.36, 1],
        });
      }
    } else if (!isInView && !chatComplete) {
      // Only resume spin if chat hasn't completed yet
      resumeSpinTimeoutRef.current = setTimeout(() => {
        resumeSpinTimeoutRef.current = null;
        hasSettledRef.current = false; // Allow re-settling if user scrolls back
        shouldSpinRef.current = true;
        lastRotationRef.current = rotationValue.get();
        lastTimeRef.current = Date.now();
      }, RESUME_SPIN_DELAY_MS);
    }
    // If !isInView && chatComplete: do nothing, keep carousel stopped
    
    return () => {
      if (resumeSpinTimeoutRef.current) {
        clearTimeout(resumeSpinTimeoutRef.current);
        resumeSpinTimeoutRef.current = null;
      }
    };
  }, [isInView, chatComplete, rotationValue]);

  // Cursor drag to spin (only after conversation ends and carousel in view)
  const canDrag = chatComplete && isInView;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canDrag || e.button !== 0) return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartValue.current = dragValue.get();
    lastMoveX.current = e.clientX;
    lastMoveTime.current = Date.now();
    moveHistoryRef.current = [{ x: e.clientX, t: Date.now() }];
  };

  useEffect(() => {
    if (!canDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const t = Date.now();
      const history = moveHistoryRef.current;
      history.push({ x: e.clientX, t });
      if (history.length > 12) history.shift();
      const delta = (e.clientX - dragStartX.current) * DRAG_SENSITIVITY;
      dragValue.set(dragStartValue.current + delta);
      lastMoveX.current = e.clientX;
      lastMoveTime.current = t;
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      const committed = rotationValue.get() + dragValue.get();
      rotationValue.set(committed);
      dragValue.set(0);

      const history = moveHistoryRef.current;
      let velocity = 0;
      if (history.length >= 2) {
        const a = history[history.length - 2];
        const b = history[history.length - 1];
        const dt = (b.t - a.t) / 1000;
        if (dt > 0) velocity = ((b.x - a.x) * DRAG_SENSITIVITY) / dt;
      }

      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);

      let v = velocity;
      let lastTime = performance.now();
      const tick = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const r = rotationValue.get();
        rotationValue.set(r + v * dt);
        v *= INERTIA_FRICTION;
        if (Math.abs(v) < INERTIA_VELOCITY_THRESHOLD) {
          const snapTarget = getSnapTarget(rotationValue.get());
          lastRotationRef.current = snapTarget;
          animate(rotationValue, snapTarget, {
            type: 'tween',
            duration: INERTIA_SNAP_DURATION,
            ease: [0.25, 0.1, 0.25, 1],
          });
          inertiaRef.current = null;
          return;
        }
        inertiaRef.current = requestAnimationFrame(tick);
      };
      inertiaRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
    };
  }, [canDrag, rotationOffset, rotationValue, dragValue]);

  const chatPhoneWithCallback = {
    ...ORBITAL_PHONES[0],
    props: {
      ...ORBITAL_PHONES[0].props,
      onConversationComplete: () => setChatComplete(true),
    },
  };

  const phonesWithCallback = [chatPhoneWithCallback, ...ORBITAL_PHONES.slice(1)];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[580px] lg:h-[620px] select-none"
      style={{
        cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : undefined,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-full">
        {phonesWithCallback.map((phone, index) => (
          <OrbitalPhone
            key={phone.id}
            phone={phone}
            baseAngle={index * ANGLE_STEP}
            rotationOffset={totalRotation}
            glowIntensity={currentGlow}
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

interface MobileCarouselProps {
  scrollProgress: MotionValue<number>;
}

const MobileCarousel = memo<MobileCarouselProps>(({ scrollProgress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Track swipe direction: 1 = forward (swipe left), -1 = backward (swipe right)
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const hasAutoAdvanced = useRef(false);

  const isInView = useInView(containerRef, { once: true, amount: 0.4 });
  
  // Calculate glow intensity from scroll progress (matches background transition)
  const glowIntensity = useTransform(
    scrollProgress,
    BG_SCROLL_THRESHOLDS.input,
    BG_SCROLL_THRESHOLDS.output
  );
  const [currentGlow, setCurrentGlow] = useState(0);
  
  useEffect(() => {
    const unsubscribe = glowIntensity.on('change', setCurrentGlow);
    return () => unsubscribe();
  }, [glowIntensity]);

  const goTo = (index: number, dir?: number) => {
    const clampedIndex = Math.max(0, Math.min(index, MOBILE_SCREENS.length - 1));
    if (clampedIndex !== currentIndex) {
      // If direction not specified, infer from index change
      setDirection(dir ?? (clampedIndex > currentIndex ? 1 : -1));
      setCurrentIndex(clampedIndex);
    }
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
        setDirection(1); // Auto-advance always goes forward
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
      if (diff > 0) goTo(currentIndex + 1, 1);   // Swipe left = go forward
      else goTo(currentIndex - 1, -1);           // Swipe right = go backward
    }
  };

  // Dynamic variants based on swipe direction
  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 50 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -50 }),
  };

  const currentScreen = MOBILE_SCREENS[currentIndex];

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      <div
        className="relative touch-pan-y overflow-hidden"
        style={{ 
          // Add padding to allow for animation movement without clipping the phone,
          // but clip any artifacts that appear outside
          padding: '20px 60px',
          margin: '-20px -60px',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentScreen.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={CAROUSEL_TRANSITION}
            style={{
              // Force GPU acceleration to fix Safari rendering artifacts
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              willChange: 'transform, opacity',
            }}
          >
            <PhoneFrame scale={0.85} glowIntensity={currentGlow}>
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
  <section id="overview" className="pt-12 pb-16 md:pt-16 md:pb-20">
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
// IMMERSIVE BACKGROUND LAYER
// ─────────────────────────────────────────────────────────────────────────────

interface ImmersiveBackgroundProps {
  /** Scroll progress through the section (0 = entering, 1 = exiting) */
  scrollProgress: MotionValue<number>;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
}

/**
 * Full-viewport background layer that transitions from transparent to deep charcoal.
 * Uses fixed positioning so it covers the entire viewport regardless of section height.
 * The opacity is driven by scroll position for smooth, cinematic transitions.
 *
 * Key details:
 * - pointer-events: none so it doesn't block interactions
 * - z-index: 0 so content sits above it
 * - willChange: opacity for GPU acceleration
 * - No layout impact (position: fixed, inset: 0)
 */
const ImmersiveBackground = memo<ImmersiveBackgroundProps>(({
  scrollProgress,
  prefersReducedMotion,
}) => {
  // Transform scroll progress to background opacity
  // Smooth interpolation: fade in as section enters, hold, fade out as section exits
  const backgroundOpacity = useTransform(
    scrollProgress,
    BG_SCROLL_THRESHOLDS.input,
    BG_SCROLL_THRESHOLDS.output
  );

  // For reduced motion: use a stepped transition instead of continuous interpolation
  // This provides the same visual result without motion
  const reducedMotionOpacity = useTransform(
    scrollProgress,
    [0.15, 0.85],
    [1, 1] // Instant on when in range, handled by conditional below
  );

  // Determine which opacity to use
  const opacity = prefersReducedMotion ? reducedMotionOpacity : backgroundOpacity;

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none"
      style={{
        background: DARK_BACKGROUND,
        opacity,
        zIndex: 0,
        willChange: 'opacity',
      }}
      aria-hidden="true"
    />
  );
});

ImmersiveBackground.displayName = 'ImmersiveBackground';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Overview = memo(() => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  // Track scroll progress through the section
  // offset: ['start end', 'end start'] means:
  //   0 = section top reaches viewport bottom (entering)
  //   1 = section bottom reaches viewport top (exiting)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Header animations — text fades in early as section enters
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

  // Opacity crossfade: black ↔ white (no grey intermediate)
  // Black text visible at start and end, white in the middle (dark section)
  // Perfectly symmetrical: IN mirrors OUT around center
  const blackOpacity = useTransform(
    scrollYProgress,
    [0.08, 0.14, 0.86, 0.92],
    [1, 0, 0, 1]
  );
  const whiteOpacity = useTransform(
    scrollYProgress,
    [0.12, 0.18, 0.82, 0.88],
    [0, 1, 1, 0]
  );

  // Return static version for reduced motion preference
  if (prefersReduced) {
    return <OverviewStatic />;
  }

  return (
    <>
      {/* Immersive dark background layer — fixed, full viewport */}
      <ImmersiveBackground
        scrollProgress={scrollYProgress}
        prefersReducedMotion={prefersReduced}
      />

      {/* Section content — positioned above background */}
      <section
        ref={sectionRef}
        id="overview"
        className="relative pt-12 pb-16 md:pt-16 md:pb-20 overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          {/* Header with crossfade text colors (no grey intermediate) */}
          <motion.div
            className="text-center mb-8 md:mb-12"
            style={{ opacity: headerOpacity, y: headerY }}
          >
            {/* Heading with crossfade */}
            <div className="relative mb-3">
              <motion.h2
                className="text-4xl md:text-6xl font-normal leading-[1.05] tracking-[-0.02em] text-[#1a1a1a]"
                style={{ opacity: blackOpacity }}
              >
                Your campus hub
              </motion.h2>
              <motion.h2
                className="absolute inset-0 text-4xl md:text-6xl font-normal leading-[1.05] tracking-[-0.02em] text-white"
                style={{ opacity: whiteOpacity }}
                aria-hidden="true"
              >
                Your campus hub
              </motion.h2>
            </div>
            
            {/* Subtitle with crossfade */}
            <div className="relative">
              <motion.p
                className="text-lg md:text-xl text-[#5a5a5a]"
                style={{ opacity: blackOpacity }}
              >
                Everything you need. One place.
              </motion.p>
              <motion.p
                className="absolute inset-0 text-lg md:text-xl text-[#d0d0d0]"
                style={{ opacity: whiteOpacity }}
                aria-hidden="true"
              >
                Everything you need. One place.
              </motion.p>
            </div>
          </motion.div>

          {/* Mobile: Swipe carousel */}
          <div className="md:hidden">
            <MobileCarousel scrollProgress={scrollYProgress} />
          </div>

          {/* Desktop: Auto-spin orbital carousel */}
          <div className="hidden md:block">
            <OrbitalCarousel scrollProgress={scrollYProgress} />
          </div>
        </div>
      </section>
    </>
  );
});

Overview.displayName = 'Overview';
