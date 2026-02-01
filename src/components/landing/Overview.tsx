export function Overview() {
  return (
    <section id="overview" className="pt-12 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-20">
          <div>
            <h2 className="text-4xl font-sans font-normal text-[#27251f] mb-6 leading-[1.1] tracking-[-0.01em]">
              Your campus hub, simplified
            </h2>
            <p className="text-lg text-[#787771] leading-7 font-normal tracking-[-0.01em] mb-6">
              Stop juggling Canvas for assignments, WhatsApp for class chats, Reddit for campus discussions,
              Slack for group projects, and multiple calendars for scheduling.
            </p>
            <p className="text-lg text-[#787771] leading-7 font-normal tracking-[-0.01em]">
              Quad consolidates everything into a single, intelligent platform designed specifically
              for the modern student experience.
            </p>
          </div>

          <div className="space-y-10">
            <div className="border-l-2 border-neutral-300 pl-6">
              <h3 className="font-sans font-normal text-xl text-[#27251f] mb-2 leading-[1.1] tracking-[-0.01em]">All Your Tools, Unified</h3>
              <p className="text-[#787771] leading-7 font-normal tracking-[-0.01em]">
                Assignment tracking, class discussions, group chats, interest communities, and calendar
                management in one cohesive interface.
              </p>
            </div>

            <div className="border-l-2 border-neutral-300 pl-6">
              <h3 className="font-sans font-normal text-xl text-[#27251f] mb-2 leading-[1.1] tracking-[-0.01em]">Built for Students Only</h3>
              <p className="text-[#787771] leading-7 font-normal tracking-[-0.01em]">
                100% edu-gated access ensures your community remains exclusive to verified students.
                No administrators, no corporate noise—just peers.
              </p>
            </div>

            <div className="border-l-2 border-neutral-300 pl-6">
              <h3 className="font-sans font-normal text-xl text-[#27251f] mb-2 leading-[1.1] tracking-[-0.01em]">Completely Free</h3>
              <p className="text-[#787771] leading-7 font-normal tracking-[-0.01em]">
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
