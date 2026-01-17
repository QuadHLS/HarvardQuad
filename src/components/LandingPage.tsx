import React, { useState, useEffect } from 'react';
import { Navigation } from './landing/Navigation';
import { Hero } from './landing/Hero';
import { Overview } from './landing/Overview';
import { Features } from './landing/Features';
import { Process } from './landing/Process';
import { Community } from './landing/Community';
import { Footer } from './landing/Footer';

interface LandingPageProps {
  onSignIn: () => void;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'overview', 'features', 'process'];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ backgroundColor: '#f7f7f5' }}>
      <Navigation activeSection={activeSection} onSignIn={onSignIn} />
      <Hero onSignIn={onSignIn} />
      <Overview />
      <Features />
      <Process />
      <Community onSignIn={onSignIn} />
      <Footer />
    </div>
  );
}
