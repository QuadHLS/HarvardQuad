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
    <section id="features" className="py-32" style={{ background: 'linear-gradient(to bottom, #f7f7f5, rgba(254, 243, 199, 0.4))' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-20">
          <h2 className="text-5xl font-serif text-neutral-900 mb-6 leading-tight">
            Everything you need,<br />nothing you don't
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl leading-relaxed">
            Four core modules that replace the fragmented tools you're currently using.
          </p>
        </div>

        <div className="space-y-16">
          {features.map((feature, index) => (
            <div key={index} className="p-10">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-700 text-white flex items-center justify-center font-serif">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-serif text-neutral-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed mb-3">
                    {feature.description}
                  </p>
                  <p className="text-sm text-neutral-400 italic">
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
