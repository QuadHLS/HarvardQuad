interface HeroProps {
  onSignIn: () => void;
}

export function Hero({ onSignIn }: HeroProps) {
  return (
    <section id="home" className="min-h-screen flex items-center justify-center pt-20" style={{ background: 'linear-gradient(to bottom, rgba(254, 243, 199, 0.4), #f7f7f5)' }}>
      <div className="max-w-4xl mx-auto px-6 py-32 text-center">
        <div className="space-y-8">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif text-neutral-900 leading-[1.1] tracking-tight">
            One platform.<br />Every tool you need.
          </h1>

          <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Quad replaces Canvas, Reddit, Slack, WhatsApp, and your calendar with a unified student 
            operating system. Everything you need for academic and social success in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <button 
              onClick={onSignIn}
              className="bg-neutral-900 text-neutral-50 px-8 py-4 hover:bg-neutral-800 transition-colors"
            >
              Get Started Free
            </button>
            <button 
              onClick={() => {
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
              }}
              className="border border-neutral-300 text-neutral-900 px-8 py-4 hover:border-neutral-900 transition-colors"
            >
              See How It Works
            </button>
          </div>

          <div className="pt-12 flex flex-wrap justify-center gap-4 text-sm text-neutral-400">
            <span className="line-through">Canvas</span>
            <span className="line-through">Reddit</span>
            <span className="line-through">Slack</span>
            <span className="line-through">WhatsApp</span>
            <span className="line-through">Google Calendar</span>
            <span className="text-neutral-900 font-medium">→ Quad</span>
          </div>
        </div>
      </div>
    </section>
  );
}
