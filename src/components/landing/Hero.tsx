/**
 * Hero.tsx
 * Landing page hero with typing animation.
 * Optimized for performance.
 */

import { memo, useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

interface HeroProps {
  onSignIn: () => void;
}

const HERO_TEXT = 'One platform.\nEvery tool you need.';
const TYPING_MS = 55;

const REPLACED_TOOLS = ['Canvas', 'Reddit', 'Slack', 'WhatsApp', 'Google Calendar'] as const;

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

  const scrollToProcess = () => {
    const element = document.getElementById('process');
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

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
            Quad replaces Canvas, Reddit, Slack, WhatsApp, and your calendar with a unified student
            operating system. Everything you need for academic and social success in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button
              onClick={onSignIn}
              className="font-normal bg-[#27251f] text-[#f7f8f3] px-8 py-4 hover:bg-[#27251f]/90 transition-colors rounded-lg"
              aria-label="Get started for free"
            >
              Get started for free
            </button>
            <button
              onClick={scrollToProcess}
              className="font-normal border border-neutral-300 text-[#27251f] px-8 py-4 hover:border-neutral-700 hover:bg-neutral-50 transition-colors rounded-lg"
              aria-label="See how it works"
            >
              See How It Works
            </button>
          </div>

          {/* Replaced tools */}
          <div className="pt-14 flex flex-wrap justify-center gap-4 text-sm text-[#787771] font-medium tracking-[-0.01em]">
            {REPLACED_TOOLS.map((tool) => (
              <span key={tool} className="line-through">
                {tool}
              </span>
            ))}
            <span className="text-[#27251f] font-normal">→ Quad</span>
          </div>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = 'Hero';
