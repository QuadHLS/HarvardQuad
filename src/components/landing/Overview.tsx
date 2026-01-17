export function Overview() {
  return (
    <section id="overview" className="py-32" style={{ backgroundColor: '#f7f7f5' }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl font-serif text-neutral-900 mb-6 leading-tight">
              Your campus hub, simplified
            </h2>
            <p className="text-lg text-neutral-600 leading-relaxed mb-6">
              Stop juggling Canvas for assignments, WhatsApp for class chats, Reddit for campus discussions, 
              Slack for group projects, and multiple calendars for scheduling.
            </p>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Quad consolidates everything into a single, intelligent platform designed specifically 
              for the modern student experience.
            </p>
          </div>

          <div className="space-y-8">
            <div className="border-l-2 border-orange-700 pl-6">
              <h3 className="font-serif text-xl text-neutral-900 mb-2">All Your Tools, Unified</h3>
              <p className="text-neutral-600 leading-relaxed">
                Assignment tracking, class discussions, group chats, interest communities, and calendar 
                management in one cohesive interface.
              </p>
            </div>

            <div className="border-l-2 border-orange-700 pl-6">
              <h3 className="font-serif text-xl text-neutral-900 mb-2">Built for Students Only</h3>
              <p className="text-neutral-600 leading-relaxed">
                100% edu-gated access ensures your community remains exclusive to verified students. 
                No administrators, no corporate noise—just peers.
              </p>
            </div>

            <div className="border-l-2 border-orange-700 pl-6">
              <h3 className="font-serif text-xl text-neutral-900 mb-2">Completely Free</h3>
              <p className="text-neutral-600 leading-relaxed">
                No subscriptions, no premium tiers, no hidden costs. Full platform access for all 
                students, permanently free.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
