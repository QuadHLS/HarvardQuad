/**
 * Navigation.tsx
 * Fixed landing page navigation bar.
 * Optimized with memoization.
 *
 * Adapts colors when the Overview section's dark background is active.
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

interface NavigationProps {
  activeSection: string;
  onSignIn: () => void;
}

interface NavItem {
  id: string;
  label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'process', label: 'Process' },
] as const;

const SCROLL_OFFSET = 80;

// ─────────────────────────────────────────────────────────────────────────────
// DARK MODE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the "dark mode intensity" based on scroll position relative to
 * the Overview section. Returns 0-1 where 1 = fully in dark zone.
 *
 * This mirrors the background transition thresholds in Overview.tsx:
 * - 0.08-0.25: fade in
 * - 0.25-0.75: fully dark
 * - 0.75-0.92: fade out
 */
function getDarkModeIntensity(): number {
  const overviewEl = document.getElementById('overview');
  if (!overviewEl) return 0;

  const rect = overviewEl.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const sectionHeight = rect.height;

  // Calculate scroll progress through the section (0 = entering, 1 = exiting)
  // Same calculation as useScroll with offset: ['start end', 'end start']
  const startPoint = rect.top + sectionHeight; // section top at viewport bottom
  const endPoint = rect.top; // section bottom at viewport top
  const totalTravel = viewportHeight + sectionHeight;
  const progress = 1 - (startPoint / totalTravel);

  // Apply same thresholds as Overview background
  if (progress < 0.08) return 0;
  if (progress < 0.25) return (progress - 0.08) / (0.25 - 0.08); // fade in
  if (progress < 0.75) return 1; // fully dark
  if (progress < 0.92) return 1 - (progress - 0.75) / (0.92 - 0.75); // fade out
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Navigation = memo<NavigationProps>(({ activeSection, onSignIn }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkIntensity, setDarkIntensity] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);

      // Update dark mode intensity with RAF for smooth updates
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setDarkIntensity(getDarkModeIntensity());
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    setMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - SCROLL_OFFSET;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Color palette transitions based on dark intensity (0 = light, 1 = dark)
  const colors = {
    // Nav background when scrolled — warm dark to match Overview background
    navBg: darkIntensity > 0.3
      ? `rgba(13, 12, 10, ${0.95 * darkIntensity})`
      : scrolled
        ? 'rgba(250, 246, 241, 0.95)'
        : 'transparent',
    // Active nav item
    textActive: darkIntensity > 0.5 ? '#f5f4f2' : '#27251f',
    // Inactive nav item
    textInactive: darkIntensity > 0.5 ? '#a8a49c' : '#787771',
    // Hover state
    textHover: darkIntensity > 0.5 ? '#ffffff' : '#27251f',
    // Mobile menu icon
    menuIcon: darkIntensity > 0.5 ? '#f5f4f2' : '#27251f',
    // Sign in button
    signInBg: darkIntensity > 0.5 ? '#f5f4f2' : '#27251f',
    signInText: darkIntensity > 0.5 ? '#0f0f11' : '#f7f8f3',
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || darkIntensity > 0.3 ? 'backdrop-blur-sm' : 'bg-transparent'
      }`}
      style={{
        backgroundColor: colors.navBg,
        transition: 'background-color 0.4s ease-out',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="w-full px-6 py-3">
        <div className="flex items-center justify-between relative">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('home')}
            className="flex items-center"
            aria-label="Quad home"
          >
            <img src="/QUAD.svg" alt="Quad" className="h-10 w-auto rounded-none" />
          </button>

          {/* Desktop nav */}
          <div className="hidden min-[650px]:flex items-center gap-10 absolute left-1/2 transform -translate-x-1/2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-normal transition-colors duration-300"
                style={{
                  color: activeSection === item.id ? colors.textActive : colors.textInactive,
                }}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile menu + Sign In */}
          <div className="flex items-center gap-3">
            <div className="relative min-[650px]:hidden">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: colors.menuIcon }}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-40 py-2 px-2 rounded-xl border shadow-sm"
                  style={{
                    backgroundColor: darkIntensity > 0.5 ? 'rgba(22, 20, 16, 0.98)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: darkIntensity > 0.5 ? 'rgba(255, 255, 255, 0.1)' : '#e8e4db',
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    {NAV_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className="text-left text-sm font-normal py-2 px-3 rounded-lg transition-colors"
                        style={{
                          color: activeSection === item.id ? colors.textActive : colors.textInactive,
                          backgroundColor: activeSection === item.id
                            ? (darkIntensity > 0.5 ? 'rgba(255, 255, 255, 0.08)' : '#f5f3eb')
                            : 'transparent',
                        }}
                        aria-current={activeSection === item.id ? 'page' : undefined}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onSignIn}
              className="font-normal text-sm px-4 py-1.5 transition-colors duration-300 rounded-full"
              style={{
                backgroundColor: colors.signInBg,
                color: colors.signInText,
              }}
              aria-label="Sign in"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';
