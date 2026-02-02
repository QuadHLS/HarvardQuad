/**
 * Navigation.tsx
 * Fixed landing page navigation bar.
 * Optimized with memoization.
 */

import React, { memo, useState, useEffect } from 'react';
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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Navigation = memo<NavigationProps>(({ activeSection, onSignIn }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur-sm' : 'bg-transparent'
      }`}
      style={scrolled ? { backgroundColor: 'rgba(250, 246, 241, 0.95)' } : {}}
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
                className={`text-sm font-normal transition-colors ${
                  activeSection === item.id
                    ? 'text-[#27251f]'
                    : 'text-[#787771] hover:text-[#27251f]'
                }`}
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
                className="w-10 h-10 flex items-center justify-center rounded-lg text-[#27251f] hover:bg-[#27251f]/10 transition-colors"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 py-2 px-2 rounded-xl border border-[#e8e4db] bg-white/95 shadow-sm">
                  <div className="flex flex-col gap-0.5">
                    {NAV_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`text-left text-sm font-normal py-2 px-3 rounded-lg transition-colors ${
                          activeSection === item.id
                            ? 'text-[#27251f] bg-[#f5f3eb]'
                            : 'text-[#787771] hover:text-[#27251f] hover:bg-[#f5f3eb]'
                        }`}
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
              className="font-normal text-sm bg-[#27251f] text-[#f7f8f3] px-4 py-1.5 hover:bg-[#27251f]/90 transition-colors rounded-full"
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
