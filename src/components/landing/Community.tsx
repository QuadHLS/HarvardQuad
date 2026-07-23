import React, { memo } from 'react';

interface CommunityProps {
  onSignIn: () => void;
}

const CAPABILITIES = [
  {
    title: 'Connected communities',
    description: 'Squads combine membership workflows, feeds, chat, and shared documents.',
  },
  {
    title: 'Realtime communication',
    description: 'Direct and group messaging support media, read state, and live updates.',
  },
  {
    title: 'iOS adaptation',
    description: 'Capacitor packaging adds OAuth return, lifecycle, safe-area, and navigation behavior to the shared React client.',
  },
] as const;

export const Community = memo<CommunityProps>(({ onSignIn }) => (
  <section className="pt-16 pb-40">
    <div className="max-w-5xl mx-auto px-6">
      <div className="mb-16">
        <h2 className="text-5xl font-sans font-normal text-[#27251f] mb-6 leading-[1.1] tracking-[-0.01em]">
          Built around campus workflows
        </h2>
        <p className="text-xl text-[#787771] leading-7 font-normal tracking-[-0.01em] max-w-3xl">
          Quad explores how social, academic, and community tools can share one coherent product architecture.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {CAPABILITIES.map((capability) => (
          <article key={capability.title} className="rounded-3xl border border-neutral-200 bg-white p-7">
            <h3 className="text-xl font-medium text-[#27251f] mb-3">{capability.title}</h3>
            <p className="text-[#787771] leading-7">{capability.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-24 text-center pt-16 px-4 md:px-16 pb-6 border-t border-neutral-200">
        <h3 className="font-sans text-4xl sm:text-6xl font-normal text-[#27251f] mb-4 leading-[1.1] tracking-[-0.01em]">
          Explore the project source.
        </h3>
        <p className="text-[#787771] leading-7 font-normal tracking-[-0.01em] mb-10 max-w-xl mx-auto">
          This branch preserves an older iOS packaging implementation; it is not a currently supported public service.
        </p>
        <button
          onClick={onSignIn}
          className="font-normal bg-[#27251f] tracking-[-0.01em] text-[#f7f8f3] px-8 py-2.5 hover:bg-[#27251f]/90 transition-colors rounded-full"
          aria-label="Continue to sign in"
        >
          Continue to sign in
        </button>
      </div>
    </div>
  </section>
));

Community.displayName = 'Community';
