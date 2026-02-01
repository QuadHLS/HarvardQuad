import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface NavigationProps {
  activeSection: string;
  onSignIn: () => void;
}

export function Navigation({ activeSection, onSignIn }: NavigationProps) {
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
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'Features' },
    { id: 'process', label: 'Process' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur-sm' : 'bg-transparent'
      }`}
      style={scrolled ? { backgroundColor: 'rgba(250, 246, 241, 0.95)' } : {}}
    >
      <div className="w-full px-6 py-3">
        <div className="flex items-center justify-between relative">
          <button
            onClick={() => scrollToSection('home')}
            className="flex items-center"
          >
            <img src="/QUAD.svg" alt="Quad" className="h-10 w-auto rounded-none" />
          </button>

          {/* Desktop: center nav (hidden below 650px so hamburger shows) */}
          <div className="hidden min-[650px]:flex items-center gap-10 absolute left-1/2 transform -translate-x-1/2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-normal transition-colors ${
                  activeSection === item.id
                    ? 'text-[#27251f]'
                    : 'text-[#787771] hover:text-[#27251f]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile: menu button + Sign In */}
          <div className="flex items-center gap-3">
            <div className="relative min-[650px]:hidden">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-[#27251f] hover:bg-[#27251f]/10 transition-colors"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 py-2 px-2 rounded-xl border border-[#e8e4db] bg-white/95 shadow-sm">
                  <div className="flex flex-col gap-0.5">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`text-left text-sm font-normal py-2 px-3 rounded-lg transition-colors ${
                          activeSection === item.id
                            ? 'text-[#27251f] bg-[#f5f3eb]'
                            : 'text-[#787771] hover:text-[#27251f] hover:bg-[#f5f3eb]'
                        }`}
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
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}