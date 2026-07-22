/**
 * Hero.tsx
 * Landing page hero with typing animation.
 * Optimized for performance.
 */

import React, { memo, useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

interface HeroProps {
  onSignIn: () => void;
}

const HERO_TEXT = 'One platform.\nEvery tool you need.';
const TYPING_MS = 55;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Hero = memo<HeroProps>(({ onSignIn }) => {
  const [visibleLength, setVisibleLength] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (visibleLength >= HERO_TEXT.length) return;
    const t = setTimeout(() => setVisibleLength((n) => n + 1), TYPING_MS);
    return () => clearTimeout(t);
  }, [visibleLength]);

  const visibleText = HERO_TEXT.slice(0, visibleLength);

  return (
    <section id="home" className="min-h-screen flex items-center justify-center pt-20">
      <div className="max-w-4xl mx-auto px-6 py-36 text-center">
        <div className="space-y-10">
          {/* Animated heading */}
          <h1 className="text-6xl md:text-7xl font-sans font-medium text-[#27251f] leading-[1.1] tracking-[-0.01em]">
            {visibleText.split('\n').map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
            {showCursor && (
              <span className="inline-block animate-cursor-expand text-[#27251f]" aria-hidden="true">|</span>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-[#787771] max-w-2xl mx-auto leading-7 font-medium tracking-[-0.01em]">
            Quad brings feeds, messaging, communities, profiles, and planning concepts into one
            student-focused workspace.
          </p>

          {/* CTA */}
          <div className="flex justify-center pt-8">
            <button
              onClick={onSignIn}
              className="font-normal bg-[#27251f] text-[#f7f8f3] px-8 py-4 hover:bg-[#27251f]/90 transition-colors rounded-full"
              aria-label="Get started for free"
            >
              Get started for free
            </button>
          </div>

          <p className="text-sm text-[#27251f] font-medium">
            Independent project source preview — not a public launch.
          </p>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = 'Hero';
