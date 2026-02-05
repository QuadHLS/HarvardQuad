/**
 * Footer.tsx
 * Landing page footer with links and copyright.
 * Memoized for performance.
 */

import React, { memo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_LINKS = [
  { label: 'Features', sectionId: 'features' },
  { label: 'Support', href: '#' },
] as const;

const COMPANY_LINKS = [
  { label: 'About', href: '#' },
  { label: 'Contact', href: '#' },
] as const;

const LEGAL_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
] as const;

const SCROLL_OFFSET = 80;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Footer = memo(() => {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
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
    <footer className="border-t border-neutral-200 bg-[#faf6f1] pt-16 pb-16" role="contentinfo">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 justify-items-center md:justify-items-start mb-20">
          {/* Logo */}
          <div className="hidden md:block md:col-span-2">
            <img src="/QUAD.svg" alt="Quad" className="h-16 mb-4 rounded-none" />
          </div>

          {/* Platform links */}
          <div>
            <h3 className="font-sans font-normal text-[#27251f] mb-4 leading-[1.1] tracking-[-0.01em]">
              Platform
            </h3>
            <ul className="space-y-3">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  {link.sectionId ? (
                    <button
                      onClick={() => scrollToSection(link.sectionId)}
                      className="text-[#787771] hover:text-[#27251f] transition-colors cursor-pointer font-normal tracking-[-0.01em]"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <a
                      href={link.href}
                      className="text-[#787771] hover:text-[#27251f] transition-colors font-normal tracking-[-0.01em]"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="font-sans font-normal text-[#27251f] mb-4 leading-[1.1] tracking-[-0.01em]">
              Company
            </h3>
            <ul className="space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[#787771] hover:text-[#27251f] transition-colors font-normal tracking-[-0.01em]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#787771] font-normal tracking-[-0.01em]">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p>© {currentYear} Quad. All rights reserved.</p>
            <p className="text-[#9b8f7f]">Edu gated — .edu email required to join.</p>
          </div>
          <div className="flex gap-6">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-[#27251f] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
