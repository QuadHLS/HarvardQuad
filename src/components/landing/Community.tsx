interface CommunityProps {
  onSignIn: () => void;
}

export function Community({ onSignIn }: CommunityProps) {
  return (
    <section className="py-32" style={{ background: 'linear-gradient(to bottom, rgba(254, 243, 199, 0.4), #f7f7f5)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-20">
          <h2 className="text-5xl font-serif text-neutral-900 mb-6 leading-tight">
            Who've made the switch
          </h2>
          <p className="text-xl text-neutral-600 leading-relaxed">
            How Quad replaced multiple platforms for real users.
          </p>
        </div>

        <div className="space-y-12 mb-20">
          <div className="border-l-4 border-orange-700 pl-8 py-4"></div>
          <div className="border-l-4 border-orange-700 pl-8 py-4"></div>
          <div className="border-l-4 border-orange-700 pl-8 py-4"></div>
        </div>

        <div className="mt-20 pt-20 border-t border-neutral-200">
          <div className="grid grid-cols-3 gap-12 justify-items-center max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-serif text-neutral-900 mb-2">1000+</div>
              <div className="text-sm text-neutral-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-serif text-neutral-900 mb-2">5</div>
              <div className="text-sm text-neutral-600">Apps Replaced</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-serif text-neutral-900 mb-2">98%</div>
              <div className="text-sm text-neutral-600">Satisfaction</div>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center bg-neutral-900 text-neutral-50 p-16">
          <h3 className="text-3xl font-serif mb-4">Ready to simplify your student life?</h3>
          <p className="text-neutral-300 mb-8 max-w-xl mx-auto">
            Join 1000+ users who've replaced Canvas, WhatsApp, Reddit, and more with one unified platform.
          </p>
          <button 
            onClick={onSignIn}
            className="bg-white text-neutral-900 px-8 py-4 hover:bg-neutral-100 transition-colors"
          >
            Get Started Free
          </button>
          <p className="text-sm text-neutral-400 mt-4">
            Free forever • No credit card required • 2 minute setup
          </p>
        </div>
      </div>
    </section>
  );
}
