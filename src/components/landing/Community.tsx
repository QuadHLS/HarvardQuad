import React, { useRef, useState, useEffect } from 'react';

interface CommunityProps {
  onSignIn: () => void;
}

const COUNT_DURATION_MS = 1800;
const EASE_OUT = (t: number) => 1 - (1 - t) * (1 - t); // ease-out quadratic
const TRY_QUAD_TEXT = 'Try Quad now.';
const TYPING_MS = 55;

export function Community({ onSignIn }: CommunityProps) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  const [appsReplaced, setAppsReplaced] = useState(0);
  const [satisfaction, setSatisfaction] = useState(0);
  const tryQuadBlockRef = useRef<HTMLDivElement>(null);
  const [tryQuadInView, setTryQuadInView] = useState(false);
  const [typingLength, setTypingLength] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const el = tryQuadBlockRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTryQuadInView(true);
        } else {
          setTryQuadInView(false);
          setTypingLength(0);
          setShowCursor(true);
        }
      },
      { threshold: 0.3, rootMargin: '0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
        } else {
          setInView(false);
          setActiveUsers(0);
          setAppsReplaced(0);
          setSatisfaction(0);
        }
      },
      { threshold: 0.4, rootMargin: '0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let rafId: number;
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / COUNT_DURATION_MS);
      const eased = EASE_OUT(t);
      setActiveUsers(Math.round(eased * 1000));
      setAppsReplaced(Math.round(eased * 5));
      setSatisfaction(Math.round(eased * 98));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView]);

  useEffect(() => {
    if (!tryQuadInView) return;
    if (typingLength >= TRY_QUAD_TEXT.length) {
      const t = setTimeout(() => setShowCursor(false), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypingLength((n) => n + 1), TYPING_MS);
    return () => clearTimeout(t);
  }, [tryQuadInView, typingLength]);

  const tryQuadVisibleText = TRY_QUAD_TEXT.slice(0, typingLength);

  return (
    <section className="pt-16 pb-40">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-24">
          <h2 className="text-5xl font-sans font-normal text-[#27251f] mb-6 leading-[1.1] tracking-[-0.01em]">
            Who've made the switch
          </h2>
          <p className="text-xl text-[#787771] leading-7 font-normal tracking-[-0.01em]">
            How Quad replaced multiple platforms for real users.
          </p>
        </div>

        <div className="space-y-14 mb-24">
          <blockquote className="flex gap-5 py-4 items-end">
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              <img src="/textimonials/bigSmile-1769994049042.svg" alt="" className="w-20 h-20 object-contain" aria-hidden />
            </div>
            <div className="flex-1 pl-3">
              <p className="text-lg text-[#27251f] leading-7 font-normal tracking-[-0.01em] mb-3">
                Quad has been invaluable in setting up my schedules at the beginning of each semester! I can't believe I used to write out all my different possible class combinations by hand. I love being able to browse reviews and notes for courses as I'm doing registration, since it helps me quickly filter through classes and pick the ones I'm most interested in!
              </p>
              <cite className="text-sm text-[#27251f] not-italic font-normal tracking-[-0.01em]">— JD-MPP at Harvard</cite>
            </div>
          </blockquote>
          <blockquote className="flex gap-5 py-4 items-end">
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              <img src="/textimonials/bigSmile-1769994073599.svg" alt="" className="w-20 h-20 object-contain" aria-hidden />
            </div>
            <div className="flex-1 pl-3">
              <p className="text-lg text-[#27251f] leading-7 font-normal tracking-[-0.01em] mb-3">
                I love reading the anonymous messages people on campus are sending. It's refreshing to get honest takes from people outside of named group chats or normal channels. Quad has been much more useful than Reddit when it comes to getting other students' takes on professors and employers, since I know everything I read is coming from an actual student on campus.
              </p>
              <cite className="text-sm text-[#27251f] not-italic font-normal tracking-[-0.01em]">— 1L at Harvard</cite>
            </div>
          </blockquote>
          <blockquote className="flex gap-5 py-4 items-end">
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              <img src="/textimonials/micah-1769993798472.svg" alt="" className="w-20 h-20 object-contain" aria-hidden />
            </div>
            <div className="flex-1 pl-3">
              <p className="text-lg text-[#27251f] leading-7 font-normal tracking-[-0.01em] mb-3">
                Quad has been a game changer for setting up my calendar at the beginning of the year. One of my least favorite things about a new semester was having to set up my courses on Google Calendar—Quad automates that and makes it so easy to start the semester strong.
              </p>
              <cite className="text-sm text-[#27251f] not-italic font-normal tracking-[-0.01em]">— 3L at Harvard</cite>
            </div>
          </blockquote>
          <blockquote className="flex gap-5 py-4 items-end">
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
              <img src="/textimonials/croodles-1769994140995.svg" alt="" className="w-20 h-20 object-contain" aria-hidden />
            </div>
            <div className="flex-1 pl-3">
              <p className="text-lg text-[#27251f] leading-7 font-normal tracking-[-0.01em] mb-3">
                I legitimately use Quad every day for chatting with people in my classes. I always hated massive GroupMe and WhatsApp chats that quickly became spam. Quad is way more tailored to each of my specific courses and clubs, which makes it much easier to communicate with people.
              </p>
              <cite className="text-sm text-[#27251f] not-italic font-normal tracking-[-0.01em]">— 1L at Harvard</cite>
            </div>
          </blockquote>
        </div>

        <div ref={statsRef} className="mt-24 pt-24 border-t border-neutral-200">
          <div className="grid grid-cols-3 gap-12 justify-items-center max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-sans font-normal text-[#27251f] mb-2 leading-[1.1] tracking-[-0.01em]">{activeUsers}+</div>
              <div className="text-sm text-[#787771] font-normal tracking-[-0.01em]">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-sans font-normal text-[#27251f] mb-2 leading-[1.1] tracking-[-0.01em]">{appsReplaced}</div>
              <div className="text-sm text-[#787771] font-normal tracking-[-0.01em]">Apps Replaced</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-sans font-normal text-[#27251f] mb-2 leading-[1.1] tracking-[-0.01em]">{satisfaction}%</div>
              <div className="text-sm text-[#787771] font-normal tracking-[-0.01em]">Satisfaction</div>
            </div>
          </div>
        </div>

        <div ref={tryQuadBlockRef} className="mt-24 text-center pt-16 px-16 pb-6">
          <h3 className="font-sans text-[4.5rem] font-normal text-[#27251f] mb-4 leading-[1.1] tracking-[-0.01em]">
            {tryQuadVisibleText}
            {showCursor && (
              <span className="animate-pulse" aria-hidden>|</span>
            )}
          </h3>
          <p className="text-[#787771] leading-7 font-normal tracking-[-0.01em] mb-12 max-w-xl mx-auto">
            Get started in minutes.
          </p>
          <button
            onClick={onSignIn}
            className="font-normal bg-[#27251f] tracking-[-0.01em] text-[#f7f8f3] px-8 py-2.5 hover:bg-[#27251f]/90 transition-colors rounded-full"
          >
            Get started for free
          </button>
        </div>
      </div>
    </section>
  );
}
