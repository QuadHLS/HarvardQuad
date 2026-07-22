/**
 * PhoneMockup.tsx
 * Realistic iPhone-style device frames with app screen mockups.
 * Optimized for 60fps scroll performance.
 */

import React, { memo, useState, useEffect, useRef, KeyboardEvent } from 'react';
import { motion, useInView } from 'framer-motion';
import type { MotionProps } from 'framer-motion';
import { messageBubble, typingDot, carouselSlide, quickTransition } from './animations';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — Extracted to prevent recreation on each render
// ─────────────────────────────────────────────────────────────────────────────

const AVATARS = {
  jake: '/textimonials/croodles-1770003842839.svg',
  sarah: '/textimonials/notionists-1770003533958.svg',
  maya: '/textimonials/bigSmile-1769994049042.svg',
  profile: '/textimonials/bigSmile-1769994073599.svg',
} as const;

/**
 * Format a Date to 12-hour time string (e.g., "2:45")
 */
function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr}`;
}

/**
 * Generate timestamps for messages, ending with current time.
 * Each message is 1-3 minutes apart going backwards.
 */
function generateMessageTimes(count: number): string[] {
  const now = new Date();
  const times: string[] = [];
  let currentTime = new Date(now);
  
  // Generate times from last to first (last message = now)
  for (let i = count - 1; i >= 0; i--) {
    times[i] = formatTime(currentTime);
    // Go back 1-2 minutes for variety
    const minutesBack = i % 3 === 0 ? 2 : 1;
    currentTime = new Date(currentTime.getTime() - minutesBack * 60 * 1000);
  }
  
  return times;
}

// Base message data without times (times generated dynamically)
const CHAT_MESSAGE_DATA = [
  { text: "Hey everyone! When's PS3 due again?", isOwn: false, sender: "Sarah", avatar: AVATARS.sarah },
  { text: "Friday 11:59pm", isOwn: true },
  { text: "Thanks! Anyone else stuck on the recursion part?", isOwn: false, sender: "Sarah", avatar: AVATARS.sarah },
  { text: "The base case was confusing me at first", isOwn: false, sender: "Maya", avatar: AVATARS.maya },
  { text: "Same here. I kept getting stack overflow errors 😅", isOwn: true },
  { text: "Oh that happened to me too! Make sure you're decrementing n", isOwn: false, sender: "Jake", avatar: AVATARS.jake },
  { text: "That fixed it! Thanks Jake", isOwn: true },
  { text: "np! Want to do a study session before the deadline?", isOwn: false, sender: "Jake", avatar: AVATARS.jake },
  { text: "I'm down! Library at 7?", isOwn: false, sender: "Maya", avatar: AVATARS.maya },
  { text: "Works for me 👍", isOwn: true },
  { text: "Perfect, see you all there!", isOwn: false, sender: "Sarah", avatar: AVATARS.sarah },
] as const;

const FRIENDS_MESSAGE_DATA = [
  { text: "Guys!! Spring break plans??", isOwn: false, sender: "Emma", avatar: AVATARS.sarah },
  { text: "Miami is calling my name 🌴", isOwn: false, sender: "Liam", avatar: AVATARS.jake },
  { text: "Ooh I'm down for Miami!", isOwn: true },
  { text: "Same! Let's book an airbnb", isOwn: false, sender: "Olivia", avatar: AVATARS.maya },
  { text: "I found one near South Beach for $180/night", isOwn: false, sender: "Emma", avatar: AVATARS.sarah },
  { text: "That's so cheap split 4 ways", isOwn: true },
  { text: "I'm in!! Send the link", isOwn: false, sender: "Liam", avatar: AVATARS.jake },
  { text: "This is gonna be so fun 🎉", isOwn: false, sender: "Olivia", avatar: AVATARS.maya },
  { text: "Best spring break ever incoming", isOwn: true },
] as const;

// Generate dynamic timestamps on load
const CHAT_TIMES = generateMessageTimes(CHAT_MESSAGE_DATA.length);
const FRIENDS_TIMES = generateMessageTimes(FRIENDS_MESSAGE_DATA.length);

// Combine message data with dynamic times
const CHAT_MESSAGES = CHAT_MESSAGE_DATA.map((msg, i) => ({ ...msg, time: CHAT_TIMES[i] }));
const FRIENDS_MESSAGES = FRIENDS_MESSAGE_DATA.map((msg, i) => ({ ...msg, time: FRIENDS_TIMES[i] }));

const PHONE_SHADOW = `
  0 2px 4px rgba(0,0,0,0.04),
  0 8px 16px rgba(0,0,0,0.08),
  0 24px 48px rgba(0,0,0,0.12),
  0 0 0 1px rgba(255,255,255,0.04) inset
`;

const TYPING_DELAY = { min: 30, max: 50 };
const MESSAGE_DELAY = { min: 400, max: 700 };
const TYPING_INDICATOR_DELAY = { min: 600, max: 1000 };

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PhoneFrameProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  /** 0-1 intensity for ambient glow effect (for dark mode) */
  glowIntensity?: number;
}

interface Message {
  text: string;
  time: string;
  isOwn: boolean;
  sender?: string;
  avatar?: string;
}

interface ChatVariant {
  icon: React.ReactElement;
  name: string;
  subtitle: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// IPHONE FRAME
// ─────────────────────────────────────────────────────────────────────────────

export const PhoneFrame = memo<PhoneFrameProps>(({
  children,
  className = '',
  scale = 1,
  glowIntensity = 0,
  ...motionProps
}) => {
  // Base dimensions at scale 1
  const baseWidth = 280;
  const baseHeight = 572;
  
  // Build box-shadow: base shadow + tight glow (stays close to device)
  const glowShadow = glowIntensity > 0
    ? `, 0 0 ${16 * glowIntensity}px ${4 * glowIntensity}px rgba(255, 252, 245, ${0.2 * glowIntensity}), 0 0 ${28 * glowIntensity}px ${8 * glowIntensity}px rgba(255, 250, 240, ${0.08 * glowIntensity})`
    : '';
  
  return (
    <motion.div
      className={`relative ${className}`}
      style={{
        width: baseWidth * scale,
        height: baseHeight * scale,
      }}
      {...motionProps}
    >
      {/* Device shell */}
      <div
        className="absolute inset-0 rounded-[44px] bg-[#1a1a1a]"
        style={{ 
          boxShadow: PHONE_SHADOW + glowShadow,
          borderRadius: 44 * scale,
          transition: 'box-shadow 0.3s ease-out',
        }}
        aria-hidden="true"
      />
      {/* Screen area - thinner bezel (2px) */}
      <div
        className="absolute bg-white overflow-hidden"
        style={{
          top: 2 * scale,
          left: 2 * scale,
          right: 2 * scale,
          bottom: 2 * scale,
          borderRadius: 42 * scale,
        }}
      >
        {/* Screen content - scaled from base size */}
        <div 
          className="absolute overflow-hidden"
          style={{
            width: baseWidth - 4,
            height: baseHeight - 4,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
});

PhoneFrame.displayName = 'PhoneFrame';

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const TypingIndicator = memo<{ avatar?: string; sender?: string }>(({ avatar, sender }) => (
  <div className="flex justify-start gap-1">
    {avatar && (
      <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-3" aria-hidden="true" />
    )}
    <div>
      {sender && (
        <div className="text-[8px] text-[#787771] mb-0.5 ml-0.5 font-medium">{sender}</div>
      )}
      <div className="bg-white text-[#27251f] rounded-xl rounded-bl-sm border border-[#f5f3eb] px-3 py-2" role="status" aria-label={`${sender || 'Someone'} is typing`}>
        <div className="flex gap-1">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-[#787771] rounded-full"
              variants={typingDot}
              animate="pulse"
              custom={delay}
              transition={{ delay, duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
));

TypingIndicator.displayName = 'TypingIndicator';

const MessageBubble = memo<Message>(({ text, time, isOwn, sender, avatar }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-1`}>
    {!isOwn && avatar && (
      <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-3" aria-hidden="true" />
    )}
    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && sender && (
        <div className="text-[8px] text-[#787771] mb-0.5 ml-0.5 font-medium">{sender}</div>
      )}
      <div
        className={`rounded-xl px-2 py-1.5 ${
          isOwn
            ? 'bg-[#d47455] text-white rounded-br-sm'
            : 'bg-white text-[#27251f] rounded-bl-sm border border-[#f5f3eb]'
        }`}
      >
        <div className="text-[10px] leading-tight">{text}</div>
      </div>
      <div className={`text-[7px] text-[#787771] mt-0.5 ${isOwn ? 'text-right mr-0.5' : 'ml-0.5'}`}>
        {time}
      </div>
    </div>
  </div>
));

MessageBubble.displayName = 'MessageBubble';

// ─────────────────────────────────────────────────────────────────────────────
// CHAT SCREENS
// ─────────────────────────────────────────────────────────────────────────────

const getChatHeader = (variant: 'dm' | 'group' | 'friends'): ChatVariant => {
  switch (variant) {
    case 'dm':
      return {
        icon: <img src={AVATARS.jake} alt="" className="w-6 h-6 rounded-full object-cover" />,
        name: 'Jake Kim',
        subtitle: 'Active now'
      };
    case 'friends':
      return {
        icon: <div className="w-6 h-6 rounded-full bg-[#d47455] flex items-center justify-center text-white text-[8px] font-semibold" aria-hidden="true">🎉</div>,
        name: 'Spring Break Squad',
        subtitle: '4 friends'
      };
    default:
      return {
        icon: <div className="w-6 h-6 rounded-full bg-[#27251f] flex items-center justify-center text-white text-[8px] font-semibold" aria-hidden="true">CS</div>,
        name: 'CS50 Study Group',
        subtitle: '24 members'
      };
  }
};

export const ChatScreen = memo<{ variant?: 'dm' | 'group' | 'friends' }>(({ variant = 'group' }) => {
  const messages = variant === 'friends' ? FRIENDS_MESSAGES : CHAT_MESSAGES;
  const header = getChatHeader(variant as 'dm' | 'group' | 'friends');

  return (
    <div className="h-full bg-[#FBF9F5] flex flex-col">
      {/* Header */}
      <div className="pt-9 px-2.5 pb-1.5 bg-[#F1EFE7] border-b border-[#e7ded1]">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[#787771]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {header.icon}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[#27251f] truncate">
              {header.name}
            </div>
            <div className="text-[8px] text-[#787771]">
              {header.subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-2 py-2 space-y-1.5 overflow-hidden">
        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}
      </div>

      {/* Input */}
      <div className="px-2 pb-6 pt-1.5 bg-[#FBF9F5] border-t border-[#e7ded1]">
        <div className="flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1.5 border border-[#e7ded1]">
          <div className="flex-1 text-[10px] text-[#787771]">Message...</div>
          <div className="w-5 h-5 rounded-full bg-[#d47455] flex items-center justify-center" aria-hidden="true">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});

ChatScreen.displayName = 'ChatScreen';

export const AnimatedChatScreen = memo<{
  variant?: 'dm' | 'group';
  onConversationComplete?: () => void;
}>(({ variant = 'group', onConversationComplete }) => {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [typingInfo, setTypingInfo] = useState<{ avatar?: string; sender?: string }>({});
  const [inputText, setInputText] = useState('');
  const [isTypingOwn, setIsTypingOwn] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [userMessages, setUserMessages] = useState<{ text: string; showPromo: boolean }[]>([]);
  const [isDesktop, setIsDesktop] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentIndexRef = useRef(0);
  const hasStarted = useRef(false);
  
  const isInView = useInView(containerRef, { once: true, amount: 0.5 });

  // Animation orchestration
  useEffect(() => {
    if (!isInView || hasStarted.current) return;
    hasStarted.current = true;

    const showNextMessage = (): void => {
      if (currentIndexRef.current >= CHAT_MESSAGES.length) {
        setAnimationComplete(true);
        onConversationComplete?.();
        return;
      }

      const nextMsg = CHAT_MESSAGES[currentIndexRef.current];

      if (!nextMsg.isOwn) {
        // Show typing indicator
        setTypingInfo({ avatar: nextMsg.avatar, sender: nextMsg.sender });
        setShowTyping(true);

        setTimeout(() => {
          setShowTyping(false);
          setVisibleMessages(currentIndexRef.current + 1);
          currentIndexRef.current++;
          setTimeout(showNextMessage, MESSAGE_DELAY.min + Math.random() * (MESSAGE_DELAY.max - MESSAGE_DELAY.min));
        }, TYPING_INDICATOR_DELAY.min + Math.random() * (TYPING_INDICATOR_DELAY.max - TYPING_INDICATOR_DELAY.min));
      } else {
        // Type own message
        setIsTypingOwn(true);
        const fullText = nextMsg.text;
        let charIndex = 0;

        const typeChar = (): void => {
          if (charIndex < fullText.length) {
            setInputText(fullText.slice(0, charIndex + 1));
            charIndex++;
            setTimeout(typeChar, TYPING_DELAY.min + Math.random() * (TYPING_DELAY.max - TYPING_DELAY.min));
          } else {
            setTimeout(() => {
              setInputText('');
              setIsTypingOwn(false);
              setVisibleMessages(currentIndexRef.current + 1);
              currentIndexRef.current++;
              setTimeout(showNextMessage, MESSAGE_DELAY.min + Math.random() * (MESSAGE_DELAY.max - MESSAGE_DELAY.min));
            }, 150);
          }
        };

        typeChar();
      }
    };

    setTimeout(showNextMessage, 500);
  }, [isInView]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [visibleMessages, showTyping, userMessages]);

  // Desktop detection
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.matchMedia('(min-width: 768px)').matches);
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (animationComplete && inputRef.current && isDesktop) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [animationComplete, isDesktop]);

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    setUserMessages(prev => [...prev, { text: userInput.trim(), showPromo: false }]);
    setUserInput('');

    setTimeout(() => {
      setUserMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].showPromo = true;
        }
        return updated;
      });
    }, 300);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const header = getChatHeader(variant as 'dm' | 'group' | 'friends');

  return (
    <div ref={containerRef} className="h-full bg-[#FBF9F5] flex flex-col">
      {/* Header */}
      <div className="pt-9 px-2.5 pb-1.5 bg-[#F1EFE7] border-b border-[#e7ded1]">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[#787771]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {header.icon}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[#27251f] truncate">
              {header.name}
            </div>
            <div className="text-[8px] text-[#787771]">
              {header.subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 px-2 py-2 space-y-1.5 overflow-y-auto">
        {CHAT_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
          <motion.div key={i} variants={messageBubble} initial="hidden" animate="visible">
            <MessageBubble {...msg} />
          </motion.div>
        ))}
        {showTyping && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <TypingIndicator avatar={typingInfo.avatar} sender={typingInfo.sender} />
          </motion.div>
        )}
        {userMessages.map((msg, i) => (
          <motion.div key={`user-${i}`} variants={messageBubble} initial="hidden" animate="visible">
            <div className="flex justify-end gap-1">
              <div className="flex flex-col items-end">
                <div className="rounded-xl px-2 py-1.5 bg-[#d47455] text-white rounded-br-sm">
                  <div className="text-[10px] leading-tight whitespace-pre-wrap">{msg.text}</div>
                </div>
                {msg.showPromo && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] mt-2 mb-1 text-right font-medium"
                  >
                    <span className="text-[#27251f]">To message your friends, </span>
                    <a href="/login" className="text-[#d47455] cursor-pointer">
                      join Quad.
                    </a>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="px-2 pb-6 pt-1.5 bg-[#FBF9F5] border-t border-[#e7ded1]">
        <motion.div
          className="flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1.5 border"
          animate={animationComplete && isDesktop ? {
            borderColor: ['#e7ded1', '#d47455', '#e7ded1'],
            boxShadow: [
              '0 0 0 0 rgba(212, 116, 85, 0)',
              '0 0 8px 2px rgba(212, 116, 85, 0.4)',
              '0 0 4px 1px rgba(212, 116, 85, 0.2)',
            ],
          } : {
            borderColor: '#e7ded1',
            boxShadow: '0 0 0 0 rgba(212, 116, 85, 0)',
          }}
          transition={animationComplete && isDesktop ? {
            duration: 1.5,
            repeat: Infinity,
            repeatType: 'reverse' as const,
            ease: 'easeInOut',
          } : { duration: 0.3 }}
        >
          {animationComplete ? (
            <>
              {isDesktop ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  className="flex-1 text-[10px] text-[#27251f] placeholder-[#787771] bg-transparent outline-none caret-[#d47455]"
                  aria-label="Type a message"
                />
              ) : (
                <div className="flex-1 text-[10px] text-[#787771]">Message...</div>
              )}
              <button
                onClick={isDesktop ? handleSendMessage : undefined}
                className="w-5 h-5 rounded-full bg-[#d47455] flex items-center justify-center hover:bg-[#c46345] transition-colors"
                aria-label="Send message"
              >
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <div className={`flex-1 text-[10px] ${inputText ? 'text-[#27251f]' : 'text-[#787771]'} truncate`}>
                {inputText || 'Message...'}
                {isTypingOwn && <span className="animate-pulse">|</span>}
              </div>
              <motion.div
                className="w-5 h-5 rounded-full bg-[#d47455] flex items-center justify-center"
                animate={isTypingOwn && inputText ? { scale: [1, 1.1, 1] } : {}}
                transition={quickTransition}
                aria-hidden="true"
              >
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
});

AnimatedChatScreen.displayName = 'AnimatedChatScreen';

// ─────────────────────────────────────────────────────────────────────────────
// FEED SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const FeedPost = memo<{
  author: string;
  avatar: string;
  time: string;
  content: string;
  hearts: number;
  comments: number;
}>(({ author, avatar, time, content, hearts, comments }) => (
  <div className="bg-white rounded-xl p-2 shadow-sm">
    <div className="flex items-center gap-1.5 mb-1.5">
      <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-semibold text-[#27251f]">{author}</span>
          <span className="text-[7px] text-[#787771]">• {time}</span>
        </div>
        <div className="text-[7px] px-1 py-0.5 rounded-full inline-block bg-[#d47455]/15 text-[#d47455] font-semibold">
          Student
        </div>
      </div>
    </div>
    <div className="text-[9px] text-[#27251f] leading-snug mb-1.5 line-clamp-2">{content}</div>
    <div className="flex items-center gap-3 text-[8px] text-[#787771] pt-1 border-t border-[#f5f3eb]">
      <span className="flex items-center gap-0.5">
        <svg className="w-3 h-3 text-[#d47455]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        {hearts}
      </span>
      <span className="flex items-center gap-0.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {comments}
      </span>
    </div>
  </div>
));

FeedPost.displayName = 'FeedPost';

export const FeedScreen = memo(() => (
  <div className="h-full bg-[#FBF9F5] flex flex-col">
    {/* Header */}
    <div className="pt-9 px-2.5 pb-2 border-b border-[#e7ded1] flex items-center justify-between">
      <div className="text-[14px] font-medium text-[#27251f]">Good morning</div>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#d47455]"
        aria-label="Create new post"
      >
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-[8px] text-white font-semibold">New post</span>
      </button>
    </div>

    {/* Posts */}
    <div className="flex-1 px-2 py-2 space-y-2 overflow-hidden">
      <FeedPost
        author="Jake K."
        avatar={AVATARS.jake}
        time="2h"
        content="The new dining hall hours are actually better tbh"
        hearts={47}
        comments={12}
      />
      <FeedPost
        author="Sarah M."
        avatar={AVATARS.sarah}
        time="4h"
        content="Looking for a running buddy! Training for spring marathon"
        hearts={23}
        comments={8}
      />
      <FeedPost
        author="Maya C."
        avatar={AVATARS.maya}
        time="6h"
        content="Best coffee shop to study near campus?"
        hearts={31}
        comments={15}
      />
    </div>
  </div>
));

FeedScreen.displayName = 'FeedScreen';

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const CalendarDay = memo<{
  day: number;
  isOtherMonth?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
}>(({ day, isOtherMonth, isSelected, isToday }) => (
  <div className="flex items-center justify-center h-5">
    <div
      className={`w-4 h-4 flex items-center justify-center rounded-full text-[8px] ${
        isSelected
          ? 'bg-[#d47455] text-white font-semibold'
          : isToday
          ? 'border border-[#d47455] text-[#d47455] font-semibold'
          : isOtherMonth
          ? 'text-[#c7bcaa]'
          : 'text-[#27251f]'
      }`}
    >
      {day}
    </div>
  </div>
));

CalendarDay.displayName = 'CalendarDay';

export const CalendarScreen = memo(() => (
  <div className="h-full bg-[#FBF9F5] flex flex-col">
    {/* Header */}
    <div className="pt-9 px-3 pb-2 border-b border-[#f5f3eb]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="text-[14px] font-semibold text-[#27251f]">February</div>
          <svg className="w-3 h-3 text-[#787771]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center justify-center p-1 rounded-lg bg-white border border-[#e8e4db] shadow-sm hover:bg-[#f5f3eb] transition-colors"
            aria-label="Calendar"
          >
            <span className="text-[9px] font-semibold text-[#5f574f]" aria-hidden="true">CAL</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center p-1 rounded-lg bg-white border border-[#e8e4db] shadow-sm hover:bg-[#f5f3eb] transition-colors"
            aria-label="Course system"
          >
            <span className="text-[9px] font-semibold text-[#5f574f]" aria-hidden="true">LMS</span>
          </button>
          <button className="w-5 h-5 flex items-center justify-center rounded-md" aria-label="Previous month">
            <svg className="w-3 h-3 text-[#787771]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="w-5 h-5 flex items-center justify-center rounded-md" aria-label="Next month">
            <svg className="w-3 h-3 text-[#787771]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    {/* Calendar Grid */}
    <div className="px-3 py-2 border-b border-[#f5f3eb]">
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[7px] text-[#787771] font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {[26, 27, 28, 29, 30, 31, 1].map((d, i) => (
          <CalendarDay key={`r1-${i}`} day={d} isOtherMonth={d > 20} isSelected={d === 1} />
        ))}
        {[2, 3, 4, 5, 6, 7, 8].map((d, i) => (
          <CalendarDay key={`r2-${i}`} day={d} />
        ))}
        {[9, 10, 11, 12, 13, 14, 15].map((d, i) => (
          <CalendarDay key={`r3-${i}`} day={d} />
        ))}
        {[16, 17, 18, 19, 20, 21, 22].map((d, i) => (
          <CalendarDay key={`r4-${i}`} day={d} />
        ))}
        {[23, 24, 25, 26, 27, 28, 1].map((d, i) => (
          <CalendarDay key={`r5-${i}`} day={d} isOtherMonth={d === 1} />
        ))}
      </div>
    </div>

    {/* Timeline View */}
    <div className="flex-1 overflow-hidden relative">
      <div className="px-3 pt-2">
        {[8, 9, 10, 11, 12, 1, 2, 3, 4, 5].map((hour, i) => (
          <div key={i} className="flex items-start h-[28px] border-t border-[#f5f3eb]">
            <div className="text-[7px] text-[#c7bcaa] w-7 -mt-1.5 flex-shrink-0">
              {hour}{hour >= 8 && hour <= 11 ? 'AM' : 'PM'}
            </div>
          </div>
        ))}
      </div>

      {/* Events */}
      <div className="absolute top-2 left-10 right-3">
        <div
          className="absolute left-0 right-0 rounded-lg px-2 py-1"
          style={{
            top: '28px',
            height: '50px',
            backgroundColor: '#d4745520',
            borderLeft: '3px solid #d47455'
          }}
        >
          <div className="text-[9px] font-semibold text-[#27251f]">CS50 Lecture</div>
          <div className="text-[7px] text-[#787771] flex items-center gap-0.5">
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            9:00 - 10:30 AM
          </div>
          <div className="text-[7px] text-[#787771] flex items-center gap-0.5">
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Sanders Theatre
          </div>
        </div>

        <div
          className="absolute left-0 right-0 rounded-lg px-2 py-1"
          style={{
            top: '168px',
            height: '50px',
            backgroundColor: '#8c9e8c20',
            borderLeft: '3px solid #8c9e8c'
          }}
        >
          <div className="text-[9px] font-semibold text-[#27251f]">Study Group</div>
          <div className="text-[7px] text-[#787771] flex items-center gap-0.5">
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            2:00 - 3:30 PM
          </div>
          <div className="text-[7px] text-[#787771] flex items-center gap-0.5">
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Lamont Library
          </div>
        </div>
      </div>
    </div>
  </div>
));

CalendarScreen.displayName = 'CalendarScreen';

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const GroupItem = memo<{
  name: string;
  members: number;
  color: string;
}>(({ name, members, color }) => (
  <div className="bg-white rounded-xl p-2 flex items-center gap-2 shadow-sm">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: `${color}20` }}
    >
      <svg className="w-4 h-4" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-semibold text-[#27251f]">{name}</div>
      <div className="text-[8px] text-[#787771]">{members} members</div>
    </div>
    <svg className="w-3 h-3 text-[#c7bcaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </div>
));

GroupItem.displayName = 'GroupItem';

export const GroupsScreen = memo(() => (
  <div className="h-full bg-[#FBF9F5] flex flex-col">
    {/* Header */}
    <div className="pt-9 px-2.5 pb-2 flex items-center justify-between">
      <div className="text-[16px] font-semibold text-[#27251f]">Squads</div>
      <button
        className="w-7 h-7 rounded-full bg-[#d47455] flex items-center justify-center shadow-sm"
        aria-label="Create new squad"
      >
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    {/* Search */}
    <div className="px-2.5 pb-2">
      <div className="flex items-center gap-1.5 bg-white rounded-xl px-2 py-1.5 shadow-sm">
        <svg className="w-3 h-3 text-[#787771]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-[9px] text-[#787771]">Search squads...</span>
      </div>
    </div>

    {/* Tabs */}
    <div className="px-2.5 pb-2 flex gap-1.5">
      <button className="flex-1 py-1.5 px-2 rounded-lg bg-[#d47455] text-white text-[8px] font-semibold text-center shadow-sm">
        All Squads
      </button>
      <button className="flex-1 py-1.5 px-2 rounded-lg bg-white text-[#787771] text-[8px] font-semibold text-center">
        My Squads
      </button>
    </div>

    {/* Groups list */}
    <div className="flex-1 px-2.5 space-y-1.5 overflow-hidden">
      <GroupItem name="Running Club" members={156} color="#7ba05b" />
      <GroupItem name="Pre-Med Society" members={89} color="#7b9fb8" />
      <GroupItem name="Photography" members={234} color="#c89b6e" />
      <GroupItem name="Entrepreneurs" members={178} color="#d47455" />
    </div>
  </div>
));

GroupsScreen.displayName = 'GroupsScreen';

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING SCREENS
// ─────────────────────────────────────────────────────────────────────────────

const OnboardingStep1 = memo(() => (
  <div className="h-full bg-[#FBF9F5] flex flex-col pt-10 px-3">
    {/* Progress bar */}
    <div className="flex gap-1 mb-1">
      <div className="h-1 flex-1 rounded-full bg-[#d47455]" />
      <div className="h-1 flex-1 rounded-full bg-[#e8e4db]" />
    </div>
    <div className="text-[7px] text-[#787771] mb-4">Step 1 of 2</div>

    {/* Content */}
    <div className="text-center mb-4">
      <div className="text-[13px] font-semibold text-[#27251f] mb-1">
        Sign in with your .edu
      </div>
      <div className="text-[8px] text-[#787771]">
        Student-only access keeps your community authentic
      </div>
    </div>

    <div className="mb-3">
      <label htmlFor="email-input" className="text-[8px] text-[#27251f] font-medium mb-1 block">Email</label>
      <div className="bg-white rounded-xl px-3 py-2.5 border border-[#e8e4db]">
        <div className="text-[9px] text-[#787771]">name@college.edu</div>
      </div>
    </div>

    <div className="mb-4">
      <label htmlFor="password-input" className="text-[8px] text-[#27251f] font-medium mb-1 block">Password</label>
      <div className="bg-white rounded-xl px-3 py-2.5 border border-[#e8e4db]">
        <div className="text-[9px] text-[#787771]">••••••••</div>
      </div>
    </div>

    <button className="bg-[#d47455] rounded-xl py-2.5 text-center text-white text-[10px] font-semibold w-full">
      Continue
    </button>

    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px bg-[#e8e4db]" />
      <div className="text-[7px] text-[#787771]">Or continue with</div>
      <div className="flex-1 h-px bg-[#e8e4db]" />
    </div>

    <button className="bg-white rounded-xl py-2.5 border border-[#e8e4db] flex items-center justify-center gap-2 w-full">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <div className="text-[9px] text-[#27251f] font-medium">Google</div>
    </button>
  </div>
));

OnboardingStep1.displayName = 'OnboardingStep1';

const OnboardingStep2 = memo(() => (
  <div className="h-full bg-[#FBF9F5] flex flex-col pt-10 px-3">
    <div className="flex gap-1 mb-1">
      <div className="h-1 flex-1 rounded-full bg-[#d47455]" />
      <div className="h-1 flex-1 rounded-full bg-[#d47455]" />
    </div>
    <div className="text-[7px] text-[#787771] mb-4">Step 2 of 2</div>

    <div className="text-center mb-4">
      <div className="text-[13px] font-semibold text-[#27251f] mb-1">
        Let's get you set up
      </div>
      <div className="text-[8px] text-[#787771]">
        A few details to personalize your experience
      </div>
    </div>

    <div className="mb-2.5">
      <label className="text-[8px] text-[#27251f] font-medium mb-1 block">Full name</label>
      <div className="bg-white rounded-xl px-3 py-2 border border-[#e8e4db]">
        <div className="text-[9px] text-[#27251f]">Sarah Mitchell</div>
      </div>
    </div>

    <div className="mb-2.5">
      <label className="text-[8px] text-[#27251f] font-medium mb-0.5 block">Public name</label>
      <div className="text-[7px] text-[#787771] mb-1">Shown to other students</div>
      <div className="bg-white rounded-xl px-3 py-2 border border-[#e8e4db]">
        <div className="text-[9px] text-[#27251f]">Sarah</div>
      </div>
    </div>

    <div className="mb-4">
      <div className="text-[8px] text-[#27251f] font-medium mb-1.5">Class year</div>
      <div className="grid grid-cols-3 gap-1.5">
        {['Freshman', 'Sophomore', 'Junior'].map((year, i) => (
          <div
            key={year}
            className={`py-1.5 rounded-lg text-[8px] text-center ${
              i === 2
                ? 'bg-[#d47455] text-white font-semibold'
                : 'bg-white border border-[#e8e4db] text-[#27251f]'
            }`}
          >
            {year}
          </div>
        ))}
        {['Senior', 'Graduate'].map((year) => (
          <div key={year} className="py-1.5 rounded-lg text-[8px] text-center bg-white border border-[#e8e4db] text-[#27251f]">
            {year}
          </div>
        ))}
      </div>
    </div>

    <button className="bg-[#d47455] rounded-xl py-2.5 text-center text-white text-[10px] font-semibold flex items-center justify-center gap-1 w-full">
      Continue
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
));

OnboardingStep2.displayName = 'OnboardingStep2';

const OnboardingStep3 = memo(() => (
  <div className="h-full bg-[#FBF9F5] flex flex-col pt-10 px-3">
    <div className="text-center mb-3">
      <div className="text-[13px] font-semibold text-[#27251f] mb-1">
        Pick your classes
      </div>
      <div className="text-[8px] text-[#787771]">
        We'll use them for your calendar and feed
      </div>
    </div>

    <div className="bg-white rounded-xl px-3 py-2 border border-[#e8e4db] flex items-center gap-2 mb-3">
      <svg className="w-3 h-3 text-[#787771]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <div className="text-[8px] text-[#787771]">Search by course title...</div>
    </div>

    <div className="flex-1 bg-white rounded-xl border border-[#e8e4db] p-1.5 space-y-1 overflow-hidden">
      {[
        { title: 'CS50: Intro to Computer Science', prof: 'David Malan', time: 'Mon/Wed · 10:00 AM', selected: true },
        { title: 'ECON 101: Principles of Economics', prof: 'Greg Mankiw', time: 'Tue/Thu · 2:00 PM', selected: true },
        { title: 'HIST 1400: Modern Europe', prof: 'Emma Rothschild', time: 'Mon/Wed · 3:00 PM', selected: false },
      ].map((course, i) => (
        <div key={i} className={`rounded-lg p-2 border ${course.selected ? 'border-[#d47455] bg-[#fef9f5]' : 'border-[#e8e4db]'}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[8px] font-medium text-[#27251f] truncate">{course.title}</div>
              <div className="text-[7px] text-[#787771]">{course.prof}</div>
              <div className="text-[7px] text-[#787771]">{course.time}</div>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              course.selected ? 'border-[#d47455] bg-[#d47455]' : 'border-[#e8e4db]'
            }`}>
              {course.selected && (
                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="pt-3 pb-6">
      <button className="bg-[#d47455] rounded-xl py-2.5 text-center text-white text-[10px] font-semibold w-full">
        Get Started
      </button>
    </div>
  </div>
));

OnboardingStep3.displayName = 'OnboardingStep3';

const OnboardingStep4 = memo(() => (
  <div className="h-full bg-[#FBF9F5] flex flex-col items-center justify-center px-4 pt-8">
    {/* Success icon */}
    <motion.div
      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
      initial={{ backgroundColor: 'rgba(212, 116, 85, 0.1)' }}
      whileInView={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
      viewport={{ amount: 0.8 }}
      transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
    >
      <motion.div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        initial={{ backgroundColor: '#d47455' }}
        whileInView={{ backgroundColor: '#22c55e' }}
        viewport={{ amount: 0.8 }}
        transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
      >
        <motion.svg
          className="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          initial={{ scale: 1 }}
          whileInView={{ scale: [1, 1.2, 1] }}
          viewport={{ amount: 0.8 }}
          transition={{ delay: 0.3, duration: 0.3, ease: 'easeOut' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </motion.svg>
      </motion.div>
    </motion.div>

    <div className="text-[16px] font-semibold text-[#27251f] text-center mb-1">
      You're all set!
    </div>
    <div className="text-[10px] text-[#787771] text-center mb-6">
      Welcome to your campus hub
    </div>

    {/* Stats */}
    <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#f5f3eb]">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-[20px] font-semibold text-[#d47455]">5</div>
          <div className="text-[8px] text-[#787771]">Classes</div>
        </div>
        <div>
          <div className="text-[20px] font-semibold text-[#d47455]">14</div>
          <div className="text-[8px] text-[#787771]">Credits</div>
        </div>
        <div>
          <div className="text-[20px] font-semibold text-[#d47455]">914</div>
          <div className="text-[8px] text-[#787771]">Classmates</div>
        </div>
      </div>
    </div>

    {/* CTA Button */}
    <div className="w-full mt-6">
      <motion.button
        className="rounded-xl py-3 text-center text-white text-[11px] font-semibold relative overflow-hidden w-full"
        style={{
          boxShadow: '0 4px 0 #1a1918, 0 6px 12px rgba(0,0,0,0.15)',
          transformStyle: 'preserve-3d'
        }}
        initial={{
          backgroundColor: '#27251f',
          y: 0,
          boxShadow: '0 4px 0 #1a1918, 0 6px 12px rgba(0,0,0,0.15)'
        }}
        whileInView={{
          backgroundColor: ['#27251f', '#27251f', '#27251f', '#22c55e'],
          y: [0, 0, 3, 0],
          boxShadow: [
            '0 4px 0 #1a1918, 0 6px 12px rgba(0,0,0,0.15)',
            '0 4px 0 #1a1918, 0 6px 12px rgba(0,0,0,0.15)',
            '0 1px 0 #1a1918, 0 2px 4px rgba(0,0,0,0.1)',
            '0 4px 0 #166534, 0 6px 12px rgba(0,0,0,0.15)'
          ]
        }}
        viewport={{ amount: 0.8 }}
        transition={{
          delay: 0.1,
          duration: 0.5,
          times: [0, 0.3, 0.5, 1],
          ease: 'easeOut'
        }}
      >
        Start Exploring
      </motion.button>
    </div>
  </div>
));

OnboardingStep4.displayName = 'OnboardingStep4';

export const OnboardingScreen = memo<{ step: 1 | 2 | 3 | 4 }>(({ step }) => {
  const screens = {
    1: <OnboardingStep1 />,
    2: <OnboardingStep2 />,
    3: <OnboardingStep3 />,
    4: <OnboardingStep4 />,
  };
  return screens[step];
});

OnboardingScreen.displayName = 'OnboardingScreen';

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const ConversationItem = memo<{
  name: string;
  preview: string;
  time: string;
  unread: number;
  isGroup?: boolean;
  avatar?: string;
}>(({ name, preview, time, unread, isGroup, avatar }) => (
  <div className="bg-white rounded-xl p-2 flex items-center gap-2 shadow-sm">
    {avatar ? (
      <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover" aria-hidden="true" />
    ) : (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[8px] font-semibold ${
        isGroup ? 'bg-[#27251f] text-white' : 'bg-[#d47455]/20 text-[#d47455]'
      }`} aria-hidden="true">
        {name.split(' ').map(w => w[0]).slice(0, 2).join('')}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <div className="text-[10px] font-semibold text-[#27251f] truncate">{name}</div>
        <div className="text-[7px] text-[#787771] flex-shrink-0">{time}</div>
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="text-[8px] text-[#787771] truncate">{preview}</div>
        {unread > 0 && (
          <div className="w-4 h-4 rounded-full bg-[#d47455] text-white text-[7px] font-semibold flex items-center justify-center flex-shrink-0" role="status" aria-label={`${unread} unread messages`}>
            {unread}
          </div>
        )}
      </div>
    </div>
  </div>
));

ConversationItem.displayName = 'ConversationItem';

export const ConversationsScreen = memo(() => (
  <div className="h-full bg-[#FBF9F5] flex flex-col">
    <div className="pt-9 px-2.5 pb-2 flex items-center justify-between">
      <div className="text-[16px] font-semibold text-[#27251f]">Messages</div>
      <button className="w-6 h-6 rounded-full bg-[#27251f]/10 flex items-center justify-center" aria-label="Compose new message">
        <svg className="w-3 h-3 text-[#27251f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>

    <div className="flex-1 px-2.5 space-y-1 overflow-hidden">
      <ConversationItem
        name="CS50 Study Group"
        preview="Jake: Library at 7?"
        time="2:36 PM"
        unread={3}
        isGroup
      />
      <ConversationItem
        name="Maya Chen"
        avatar={AVATARS.maya}
        preview="Thanks for the notes!"
        time="1:20 PM"
        unread={0}
      />
      <ConversationItem
        name="ECON 101"
        preview="Anyone have the slides?"
        time="11:45 AM"
        unread={12}
        isGroup
      />
      <ConversationItem
        name="Running Club"
        preview="Meet at 6am tomorrow?"
        time="Yesterday"
        unread={0}
        isGroup
      />
    </div>
  </div>
));

ConversationsScreen.displayName = 'ConversationsScreen';

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const ProfileRow = memo<{ icon: string; label: string; value: string; border?: boolean }>(({ icon, label, value, border }) => (
  <div className={`flex items-center gap-2 px-2.5 py-2 ${border ? 'border-t border-[#f5f3eb]' : ''}`}>
    <div className="w-6 h-6 rounded-lg bg-[#fef3ef] flex items-center justify-center">
      {icon === 'mail' && (
        <svg className="w-3 h-3 text-[#d47455]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
      {icon === 'phone' && (
        <svg className="w-3 h-3 text-[#7b9fb8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )}
      {icon === 'location' && (
        <svg className="w-3 h-3 text-[#8c9e8c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[7px] text-[#787771]">{label}</div>
      <div className="text-[9px] text-[#27251f] truncate">{value}</div>
    </div>
  </div>
));

ProfileRow.displayName = 'ProfileRow';

// Match new ProfilePage: warm gradient background + glass surfaces
const PROFILE_MOCKUP_BG = {
  background: `
    radial-gradient(ellipse 100% 80% at 10% 30%, rgba(255, 218, 190, 0.9), transparent 65%),
    radial-gradient(ellipse 85% 100% at 88% 50%, rgba(252, 198, 168, 0.88), transparent 60%),
    #fbf2eb
  `,
};

export const ProfileScreen = memo(() => (
  <div
    className="h-full flex flex-col overflow-hidden"
    style={PROFILE_MOCKUP_BG}
  >
    {/* Header: Profile | Edit (matches new design) */}
    <div className="flex items-center justify-between px-3 h-9 pt-9">
      <span className="text-[10px] font-medium text-[#9b8f7f] tracking-wide uppercase">Profile</span>
      <button className="text-[11px] font-medium text-[#d47455] min-h-[32px] -my-1" aria-label="Edit profile">
        Edit
      </button>
    </div>

    {/* Hero card - glass surface, avatar + name + stats inline */}
    <div className="mx-2.5 mt-4 mb-3">
      <div
        className="rounded-[14px] px-3 py-3"
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={AVATARS.profile}
            alt=""
            className="w-11 h-11 rounded-full object-cover flex-shrink-0"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-semibold text-[#27251f] truncate">Sarah Mitchell</span>
              <span className="text-[9px] text-[#9b8f7f]" aria-hidden="true">@</span>
              <span className="text-[9px] text-[#9b8f7f]" aria-hidden="true">↗</span>
            </div>
            <p className="text-[9px] text-[#9b8f7f] mt-0.5">Class of 2027</p>
            <p className="text-[8px] text-[#787771] truncate">Computer Science</p>
          </div>
        </div>
        {/* Stats inline with dot separators */}
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-[#27251f]/[0.06]">
          <span className="text-[10px] font-semibold text-[#27251f]">4</span>
          <span className="text-[8px] text-[#9b8f7f]">Classes</span>
          <span className="w-1 h-1 rounded-full bg-[#d4cfc4]" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-[#27251f]">5</span>
          <span className="text-[8px] text-[#9b8f7f]">Squads</span>
          <span className="w-1 h-1 rounded-full bg-[#d4cfc4]" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-[#27251f]">16</span>
          <span className="text-[8px] text-[#9b8f7f]">Credits</span>
        </div>
      </div>
    </div>

    {/* Contact section */}
    <div className="px-3 space-y-3">
      <h2 className="text-[8px] font-semibold text-[#9b8f7f] uppercase tracking-wider mb-1 px-0.5">
        Contact
      </h2>
      <div
        className="rounded-xl divide-y divide-[#27251f]/[0.06]"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <ProfileRow icon="mail" label="Email" value="sarah@college.edu" />
        <ProfileRow icon="phone" label="Phone" value="(555) 123-4567" border />
        <ProfileRow icon="location" label="Location" value="Cambridge, MA" border />
      </div>
    </div>

    {/* Academic section (compact) */}
    <div className="px-3 mt-3">
      <h2 className="text-[8px] font-semibold text-[#9b8f7f] uppercase tracking-wider mb-1 px-0.5">
        Academic
      </h2>
      <div
        className="rounded-xl divide-y divide-[#27251f]/[0.06]"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="w-4 h-4 rounded flex items-center justify-center bg-[#f5f3eb] flex-shrink-0">
            <svg className="w-2.5 h-2.5 text-[#b8b2a7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[7px] text-[#787771]">Major</div>
            <div className="text-[9px] text-[#27251f] truncate">Computer Science</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="w-4 h-4 rounded flex items-center justify-center bg-[#f5f3eb] flex-shrink-0">
            <svg className="w-2.5 h-2.5 text-[#b8b2a7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[7px] text-[#787771]">Graduation</div>
            <div className="text-[9px] text-[#27251f]">2027</div>
          </div>
        </div>
      </div>
    </div>

    {/* Sign out - minimal destructive (matches new design) */}
    <div className="px-3 mt-auto pb-6 pt-4">
      <button
        type="button"
        className="w-full py-2.5 rounded-xl text-[10px] font-medium text-[#c94a3a] min-h-[36px]"
        style={{ background: 'rgba(201, 74, 58, 0.08)' }}
        aria-label="Sign out"
      >
        Sign Out
      </button>
    </div>
  </div>
));

ProfileScreen.displayName = 'ProfileScreen';
