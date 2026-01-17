import { useState, useEffect } from 'react';

interface NavigationProps {
  activeSection: string;
  onSignIn: () => void;
}

export function Navigation({ activeSection, onSignIn }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
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
        scrolled ? 'backdrop-blur-sm border-b border-neutral-200' : 'bg-transparent'
      }`}
      style={scrolled ? { backgroundColor: 'rgba(247, 247, 245, 0.95)' } : {}}
    >
      <div className="w-full px-6 py-6">
        <div className="flex items-center justify-between relative">
          <button 
            onClick={() => scrollToSection('home')}
            className="flex items-center"
          >
            <img src="/QUAD.svg" alt="Quad" className="h-12" />
          </button>

          <div className="hidden md:flex items-center gap-10 absolute left-1/2 transform -translate-x-1/2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm transition-colors ${
                  activeSection === item.id
                    ? 'text-neutral-900'
                    : 'text-neutral-900 hover:text-neutral-500'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onSignIn}
              className="bg-neutral-900 text-neutral-50 px-4 py-1.5 text-sm hover:bg-neutral-800 transition-colors rounded-full"
            >
              Sign In
            </button>
            <button 
              className="text-neutral-900 px-4 py-1.5 text-sm hover:text-neutral-500 transition-colors"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}