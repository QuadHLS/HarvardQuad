export function Features() {
  const features = [
    {
      title: 'Smart Assignment Hub',
      description: 'AI-powered syllabus scanning automatically extracts and organizes every assignment, exam, and deadline from all your courses. No more manual entry or missed due dates.',
      replaces: 'Replaces: Canvas, Notion, Todoist',
    },
    {
      title: 'Class Communication',
      description: 'Automatic group chats for every enrolled course. Instantly connect with classmates, share notes, coordinate study sessions, and collaborate on projects.',
      replaces: 'Replaces: WhatsApp, GroupMe, Slack',
    },
    {
      title: 'Campus Communities',
      description: 'Discover and join interest-based groups—from running clubs to study groups to major-specific communities. Reddit-style discussions meets verified student identity.',
      replaces: 'Replaces: Reddit, Facebook Groups, Discord',
    },
    {
      title: 'Unified Calendar',
      description: 'See classes, assignments, study sessions, club meetings, and social events in one comprehensive view. Sync across devices and never double-book again.',
      replaces: 'Replaces: Google Calendar, Outlook, Apple Calendar',
    },
  ];

  return (
    <section id="features" className="pt-12 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-24">
          <h2 className="text-5xl font-sans font-normal text-[#27251f] mb-6 leading-[1.1] tracking-[-0.01em]">
            Everything you need,<br />nothing you don't
          </h2>
          <p className="text-xl text-[#787771] max-w-2xl leading-7 font-normal tracking-[-0.01em]">
            Four core modules that replace the fragmented tools you're currently using.
          </p>
        </div>

        <div className="space-y-10">
          {features.map((feature, index) => (
            <div key={index} className="py-4">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-10 h-10 bg-[#27251f] text-[#f7f8f3] flex items-center justify-center font-sans font-normal text-sm rounded-lg tracking-[-0.01em]">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-sans font-normal text-[#27251f] mb-3 leading-[1.1] tracking-[-0.01em]">
                    {feature.title}
                  </h3>
                  <p className="text-[#787771] leading-7 font-normal tracking-[-0.01em] mb-3">
                    {feature.description}
                  </p>
                  <p className="text-sm text-[#787771] font-normal tracking-[-0.01em]">
                    {feature.replaces}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
