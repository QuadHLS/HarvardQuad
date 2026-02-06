import React from 'react';
import { Hero } from './landing/Hero';

interface LandingPageProps {
  onSignIn: () => void;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 100% 80% at 10% 30%, rgba(249, 222, 202, 0.72), transparent 65%),
          radial-gradient(ellipse 85% 100% at 88% 50%, rgba(247, 212, 188, 0.68), transparent 60%),
          radial-gradient(ellipse 95% 75% at 50% 90%, rgba(248, 218, 195, 0.65), transparent 55%),
          radial-gradient(ellipse 75% 95% at 72% 12%, rgba(250, 228, 208, 0.68), transparent 58%),
          #faf6f1
        `,
      }}
    >
      <Hero onSignIn={onSignIn} />
    </div>
  );
}
