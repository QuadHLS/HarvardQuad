/**
 * PhoneMockup.tsx
 * Realistic iPhone-style device frames with app screen mockups.
 * Apple-inspired flat design, minimal, content-focused.
 */

import React from 'react';
import { motion, MotionProps } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// IPHONE FRAME
// ─────────────────────────────────────────────────────────────────────────────

interface PhoneFrameProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

/** iPhone 15-style device frame */
export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  className = '',
  scale = 1,
  ...motionProps
}) => (
  <motion.div
    className={`relative ${className}`}
    style={{
      width: 280 * scale,
      height: 572 * scale,
    }}
    {...motionProps}
  >
    {/* Device shell */}
    <div
      className="absolute inset-0 rounded-[44px] bg-[#1a1a1a] shadow-2xl"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset',
      }}
    />
    {/* Screen area */}
    <div
      className="absolute rounded-[36px] bg-white overflow-hidden"
      style={{
        top: 8 * scale,
        left: 8 * scale,
        right: 8 * scale,
        bottom: 8 * scale,
      }}
    >
      {/* Dynamic Island */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full z-10"
        style={{
          top: 12 * scale,
          width: 100 * scale,
          height: 28 * scale,
        }}
      />
      {/* Screen content */}
      <div className="absolute inset-0 overflow-hidden">
        {children}
      </div>
    </div>
    {/* Home indicator */}
    <div
      className="absolute left-1/2 -translate-x-1/2 bg-black/80 rounded-full"
      style={{
        bottom: 16 * scale,
        width: 120 * scale,
        height: 5 * scale,
      }}
    />
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// APP SCREEN MOCKUPS — Realistic representations of Quad features
// ─────────────────────────────────────────────────────────────────────────────

/** Messaging / Chat screen mockup */
export const ChatScreen: React.FC<{ variant?: 'dm' | 'group' }> = ({ variant = 'group' }) => (
  <div className="h-full bg-[#F1EFE7] flex flex-col">
    {/* Header */}
    <div className="pt-14 px-4 pb-3 bg-[#F1EFE7] border-b border-[#e8e4db]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#27251f] flex items-center justify-center text-white text-xs font-medium">
          {variant === 'dm' ? 'JK' : 'CS'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium text-[#0a0a0a] truncate">
            {variant === 'dm' ? 'Jake Kim' : 'CS50 Study Group'}
          </div>
          <div className="text-[11px] text-[#787771]">
            {variant === 'dm' ? 'Active now' : '24 members'}
          </div>
        </div>
      </div>
    </div>
    
    {/* Messages */}
    <div className="flex-1 px-3 py-4 space-y-3 overflow-hidden">
      <MessageBubble 
        text="Anyone starting Problem Set 3 yet?"
        time="2:34 PM"
        isOwn={false}
        sender="Maya"
      />
      <MessageBubble 
        text="Just finished it! The recursion part was tricky"
        time="2:35 PM"
        isOwn={true}
      />
      <MessageBubble 
        text="Can we do a study session tonight?"
        time="2:36 PM"
        isOwn={false}
        sender="Jake"
      />
      <MessageBubble 
        text="I'm in! Library at 7?"
        time="2:36 PM"
        isOwn={true}
      />
    </div>
    
    {/* Input */}
    <div className="px-3 pb-8 pt-2 bg-[#F1EFE7] border-t border-[#e8e4db]">
      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5">
        <div className="flex-1 text-[13px] text-[#787771]">Message...</div>
        <div className="w-6 h-6 rounded-full bg-[#27251f] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

const MessageBubble: React.FC<{
  text: string;
  time: string;
  isOwn: boolean;
  sender?: string;
}> = ({ text, time, isOwn, sender }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && sender && (
        <div className="text-[10px] text-[#787771] mb-0.5 ml-1">{sender}</div>
      )}
      <div
        className={`rounded-2xl px-3 py-2 ${
          isOwn
            ? 'bg-[#27251f] text-white rounded-br-md'
            : 'bg-white text-[#0a0a0a] rounded-bl-md'
        }`}
      >
        <div className="text-[13px] leading-tight">{text}</div>
      </div>
      <div className={`text-[9px] text-[#787771] mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
        {time}
      </div>
    </div>
  </div>
);

/** Campus Feed screen mockup */
export const FeedScreen: React.FC = () => (
  <div className="h-full bg-[#F1EFE7] flex flex-col">
    {/* Header */}
    <div className="pt-14 px-4 pb-3 flex items-center justify-between">
      <div className="text-[22px] font-semibold text-[#0a0a0a]">Feed</div>
      <div className="w-8 h-8 rounded-full bg-[#27251f]/10 flex items-center justify-center">
        <svg className="w-4 h-4 text-[#27251f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
    </div>
    
    {/* Posts */}
    <div className="flex-1 px-3 space-y-3 overflow-hidden">
      <FeedPost
        author="Anonymous"
        time="2h ago"
        content="Unpopular opinion: the new dining hall hours are actually better"
        hearts={47}
        comments={12}
      />
      <FeedPost
        author="Sarah M."
        time="4h ago"
        content="Looking for a running buddy! Training for the spring marathon 🏃‍♀️"
        hearts={23}
        comments={8}
      />
      <FeedPost
        author="Anonymous"
        time="6h ago"
        content="Best coffee shop to study near campus?"
        hearts={31}
        comments={15}
      />
    </div>
  </div>
);

const FeedPost: React.FC<{
  author: string;
  time: string;
  content: string;
  hearts: number;
  comments: number;
}> = ({ author, time, content, hearts, comments }) => (
  <div className="bg-white rounded-2xl p-3">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-full bg-[#d47455]/20 flex items-center justify-center text-[10px] font-medium text-[#d47455]">
        {author[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-[#0a0a0a]">{author}</div>
        <div className="text-[9px] text-[#787771]">{time}</div>
      </div>
    </div>
    <div className="text-[13px] text-[#0a0a0a] leading-snug mb-2">{content}</div>
    <div className="flex items-center gap-4 text-[11px] text-[#787771]">
      <span className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        {hearts}
      </span>
      <span className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {comments}
      </span>
    </div>
  </div>
);

/** Calendar screen mockup */
export const CalendarScreen: React.FC = () => (
  <div className="h-full bg-[#F1EFE7] flex flex-col">
    {/* Header */}
    <div className="pt-14 px-4 pb-2">
      <div className="text-[22px] font-semibold text-[#0a0a0a]">February 2026</div>
    </div>
    
    {/* Week view */}
    <div className="px-3 pb-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#787771] mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {[26, 27, 28, 29, 30, 31, 1].map((d, i) => (
          <div
            key={i}
            className={`text-[12px] py-1.5 rounded-lg ${
              d === 1
                ? 'bg-[#27251f] text-white font-medium'
                : d > 25
                ? 'text-[#787771]'
                : 'text-[#0a0a0a]'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
    
    {/* Events */}
    <div className="flex-1 px-3 space-y-2 overflow-hidden">
      <div className="text-[11px] font-medium text-[#787771] mb-1">TODAY</div>
      <CalendarEvent
        time="9:00 AM"
        title="CS50 Lecture"
        location="Sanders Theatre"
        color="#d47455"
      />
      <CalendarEvent
        time="2:00 PM"
        title="Study Group"
        location="Lamont Library"
        color="#27251f"
      />
      <CalendarEvent
        time="4:30 PM"
        title="Office Hours"
        location="Maxwell Dworkin"
        color="#787771"
      />
    </div>
  </div>
);

const CalendarEvent: React.FC<{
  time: string;
  title: string;
  location: string;
  color: string;
}> = ({ time, title, location, color }) => (
  <div className="flex gap-2">
    <div className="text-[10px] text-[#787771] w-14 pt-0.5">{time}</div>
    <div
      className="flex-1 rounded-lg px-2.5 py-2"
      style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}
    >
      <div className="text-[12px] font-medium text-[#0a0a0a]">{title}</div>
      <div className="text-[10px] text-[#787771]">{location}</div>
    </div>
  </div>
);

/** Groups / Squads screen mockup */
export const GroupsScreen: React.FC = () => (
  <div className="h-full bg-[#F1EFE7] flex flex-col">
    {/* Header */}
    <div className="pt-14 px-4 pb-3 flex items-center justify-between">
      <div className="text-[22px] font-semibold text-[#0a0a0a]">Squads</div>
      <div className="w-8 h-8 rounded-full bg-[#27251f]/10 flex items-center justify-center">
        <svg className="w-4 h-4 text-[#27251f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
    
    {/* Groups list */}
    <div className="flex-1 px-3 space-y-2 overflow-hidden">
      <GroupItem
        name="Running Club"
        members={156}
        emoji="🏃"
      />
      <GroupItem
        name="Pre-Med Society"
        members={89}
        emoji="⚕️"
      />
      <GroupItem
        name="Photography"
        members={234}
        emoji="📸"
      />
      <GroupItem
        name="Entrepreneurs"
        members={178}
        emoji="💡"
      />
      <GroupItem
        name="Film Club"
        members={67}
        emoji="🎬"
      />
    </div>
  </div>
);

const GroupItem: React.FC<{
  name: string;
  members: number;
  emoji: string;
}> = ({ name, members, emoji }) => (
  <div className="bg-white rounded-2xl p-3 flex items-center gap-3">
    <div className="w-11 h-11 rounded-xl bg-[#F1EFE7] flex items-center justify-center text-lg">
      {emoji}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-medium text-[#0a0a0a]">{name}</div>
      <div className="text-[11px] text-[#787771]">{members} members</div>
    </div>
    <svg className="w-4 h-4 text-[#787771]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </div>
);

/** Onboarding / Migration screen mockup */
export const OnboardingScreen: React.FC<{ step: 1 | 2 | 3 | 4 }> = ({ step }) => {
  const screens = {
    1: <EmailVerifyScreen />,
    2: <CourseImportScreen />,
    3: <ConnectScreen />,
    4: <ReadyScreen />,
  };
  return screens[step];
};

const EmailVerifyScreen: React.FC = () => (
  <div className="h-full bg-[#F1EFE7] flex flex-col items-center justify-center px-6">
    <div className="w-16 h-16 rounded-2xl bg-[#27251f] flex items-center justify-center mb-6">
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
    <div className="text-[18px] font-semibold text-[#0a0a0a] text-center mb-2">
      Verify your .edu email
    </div>
    <div className="text-[13px] text-[#787771] text-center mb-6">
      Student-only access keeps your community authentic
    </div>
    <div className="w-full bg-white rounded-xl px-4 py-3 mb-3">
      <div className="text-[13px] text-[#0a0a0a]">name@college.edu</div>
    </div>
    <div className="w-full bg-[#27251f] rounded-xl py-3 text-center text-white text-[14px] font-medium">
      Send verification
    </div>
  </div>
);

const CourseImportScreen: React.FC = () => (
  <div className="h-full bg-[#F1EFE7] flex flex-col px-4 pt-16">
    <div className="text-[18px] font-semibold text-[#0a0a0a] mb-1">
      Import your courses
    </div>
    <div className="text-[13px] text-[#787771] mb-6">
      We'll set up your calendar and find your classmates
    </div>
    <div className="space-y-2">
      {['CS50: Intro to CS', 'ECON 101: Principles', 'HIST 1400: Modern Europe'].map((course, i) => (
        <div key={i} className="bg-white rounded-xl p-3 flex items-center gap-3">
          <div className="w-5 h-5 rounded-md bg-[#27251f] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-[13px] text-[#0a0a0a]">{course}</div>
        </div>
      ))}
    </div>
    <div className="mt-6 bg-white rounded-xl p-4 border-2 border-dashed border-[#e8e4db] text-center">
      <div className="text-[12px] text-[#787771]">Drop syllabus to extract deadlines</div>
    </div>
  </div>
);

const ConnectScreen: React.FC = () => (
  <div className="h-full bg-[#F1EFE7] flex flex-col px-4 pt-16">
    <div className="text-[18px] font-semibold text-[#0a0a0a] mb-1">
      You're connected
    </div>
    <div className="text-[13px] text-[#787771] mb-6">
      Join your class chats and discover communities
    </div>
    <div className="space-y-2">
      <div className="bg-white rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#d47455]/20 flex items-center justify-center text-[12px] font-medium text-[#d47455]">CS</div>
        <div className="flex-1">
          <div className="text-[13px] font-medium text-[#0a0a0a]">CS50 Class Chat</div>
          <div className="text-[10px] text-[#787771]">156 classmates</div>
        </div>
        <div className="text-[10px] text-[#27251f] font-medium">Joined</div>
      </div>
      <div className="bg-white rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#27251f]/10 flex items-center justify-center text-[12px] font-medium text-[#27251f]">EC</div>
        <div className="flex-1">
          <div className="text-[13px] font-medium text-[#0a0a0a]">ECON 101 Chat</div>
          <div className="text-[10px] text-[#787771]">89 classmates</div>
        </div>
        <div className="text-[10px] text-[#27251f] font-medium">Joined</div>
      </div>
    </div>
    <div className="mt-4 text-[12px] text-[#787771] font-medium">Suggested squads</div>
    <div className="mt-2 flex gap-2">
      <div className="bg-white rounded-xl px-3 py-2 text-[11px] text-[#0a0a0a]">🏃 Running Club</div>
      <div className="bg-white rounded-xl px-3 py-2 text-[11px] text-[#0a0a0a]">📸 Photography</div>
    </div>
  </div>
);

const ReadyScreen: React.FC = () => (
  <div className="h-full bg-[#F1EFE7] flex flex-col items-center justify-center px-6">
    <div className="w-20 h-20 rounded-3xl bg-[#27251f] flex items-center justify-center mb-6">
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div className="text-[20px] font-semibold text-[#0a0a0a] text-center mb-2">
      You're all set
    </div>
    <div className="text-[14px] text-[#787771] text-center mb-6">
      Your campus life, unified
    </div>
    <div className="flex gap-8 text-center">
      <div>
        <div className="text-[24px] font-semibold text-[#0a0a0a]">3</div>
        <div className="text-[11px] text-[#787771]">Courses</div>
      </div>
      <div>
        <div className="text-[24px] font-semibold text-[#0a0a0a]">12</div>
        <div className="text-[11px] text-[#787771]">Deadlines</div>
      </div>
      <div>
        <div className="text-[24px] font-semibold text-[#0a0a0a]">245</div>
        <div className="text-[11px] text-[#787771]">Peers</div>
      </div>
    </div>
  </div>
);

/** Conversation list screen mockup */
export const ConversationsScreen: React.FC = () => (
  <div className="h-full bg-[#F1EFE7] flex flex-col">
    {/* Header */}
    <div className="pt-14 px-4 pb-3 flex items-center justify-between">
      <div className="text-[22px] font-semibold text-[#0a0a0a]">Messages</div>
      <div className="w-8 h-8 rounded-full bg-[#27251f]/10 flex items-center justify-center">
        <svg className="w-4 h-4 text-[#27251f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>
    </div>
    
    {/* Conversations */}
    <div className="flex-1 px-3 space-y-1 overflow-hidden">
      <ConversationItem
        name="CS50 Study Group"
        preview="Jake: Library at 7?"
        time="2:36 PM"
        unread={3}
        isGroup
      />
      <ConversationItem
        name="Maya Chen"
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
);

const ConversationItem: React.FC<{
  name: string;
  preview: string;
  time: string;
  unread: number;
  isGroup?: boolean;
}> = ({ name, preview, time, unread, isGroup }) => (
  <div className="bg-white rounded-2xl p-3 flex items-center gap-3">
    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-medium ${
      isGroup ? 'bg-[#27251f] text-white' : 'bg-[#d47455]/20 text-[#d47455]'
    }`}>
      {name.split(' ').map(w => w[0]).slice(0, 2).join('')}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[14px] font-medium text-[#0a0a0a] truncate">{name}</div>
        <div className="text-[10px] text-[#787771] flex-shrink-0">{time}</div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] text-[#787771] truncate">{preview}</div>
        {unread > 0 && (
          <div className="w-5 h-5 rounded-full bg-[#d47455] text-white text-[10px] font-medium flex items-center justify-center flex-shrink-0">
            {unread}
          </div>
        )}
      </div>
    </div>
  </div>
);
