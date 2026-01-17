export function Process() {
  const steps = [
    {
      title: 'Verify with your .edu email',
      description: 'Sign up using your university email address. Our verification system confirms your student status and grants access to your campus community.',
    },
    {
      title: 'Import your courses and syllabi',
      description: 'Add your enrolled courses and upload syllabi. Our AI automatically extracts every assignment, quiz, and deadline, populating your calendar and task list.',
    },
    {
      title: 'Connect with classmates',
      description: 'Join auto-created class chats and discover interest-based communities. Find study partners, project collaborators, and friends with shared interests.',
    },
    {
      title: 'Replace your old tools',
      description: 'Migrate from Canvas, WhatsApp, Reddit, and multiple calendars. Manage your entire academic and social life from one unified platform.',
    },
  ];

  return (
    <section id="process" className="py-32" style={{ backgroundColor: '#f7f7f5' }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-20">
          <h2 className="text-5xl font-serif text-neutral-900 mb-6 leading-tight">
            From signup to full migration in minutes
          </h2>
          <p className="text-xl text-neutral-600 leading-relaxed">
            Four steps to consolidate your digital student life.
          </p>
        </div>

        <div className="space-y-16">
          {steps.map((step, index) => (
            <div key={index} className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-2">
                <div className="text-6xl font-serif text-orange-700/20">
                  {String(index + 1).padStart(2, '0')}
                </div>
              </div>
              <div className="md:col-span-10">
                <h3 className="text-2xl font-serif text-neutral-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
