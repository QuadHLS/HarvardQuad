import { ArrowUp, MessageSquare, Bookmark, Pin, FileText, Calendar, Plus, UserPlus, UserMinus, MessageCircle, Users as UsersIcon, Search, Image, ChevronDown, ChevronUp, ChevronLeft, MoreVertical, X } from 'lucide-react';
import { useState } from 'react';

interface SquadDetailPageProps {
  squadId: string;
  onBack: () => void;
  onOpenChat: () => void;
}

export function SquadDetailPage({ squadId, onBack, onOpenChat }: SquadDetailPageProps) {
  // Mock data - would normally fetch based on squadId
  const squads: Record<string, any> = {
    '1': {
      name: 'Run Club',
      description: 'Morning runs around campus. All paces welcome! We do 5Ks three times a week.',
      members: 156,
      color: '#7ba05b',
      isJoined: true,
      category: 'Sports & Fitness',
      meetings: 'Monday, Wednesday, Friday • 6:30 AM',
      location: 'Campus Quad',
      admin: 'Sarah Chen',
      founded: 'September 2023'
    },
    '8': {
      name: 'Yoga & Mindfulness',
      description: 'Weekly yoga sessions and meditation practice to reduce stress during law school.',
      members: 94,
      color: '#7ba05b',
      isJoined: true,
      category: 'Sports & Fitness',
      meetings: 'Tuesday • 7:00 AM',
      location: 'Wellness Center',
      admin: 'Michael Torres',
      founded: 'January 2024'
    },
    '16': {
      name: 'HALB (Hispanic Association of Law & Business)',
      description: 'Official student organization promoting diversity and inclusion in legal and business fields.',
      members: 78,
      color: '#5a7ba0',
      isJoined: true,
      category: 'School Organizations',
      meetings: 'Second Thursday of each month • 6:00 PM',
      location: 'Student Center Room 302',
      admin: 'Ana Rodriguez',
      founded: 'August 2021'
    },
    '2': {
      name: 'Gaming League',
      description: 'Competitive and casual gaming. FIFA, Smash Bros, board games every weekend.',
      members: 243,
      color: '#c47ba0',
      isJoined: false,
      category: 'Hobbies',
      meetings: 'Saturday • 7:00 PM',
      location: 'Student Lounge',
      admin: 'Jake Peterson',
      founded: 'October 2023'
    }
  };

  const squad = squads[squadId] || squads['1'];

  // Sample members
  const members = [
    { id: 1, name: 'Sarah Chen', avatar: 'SC', avatarColor: '#6ec9c4', role: 'Admin' },
    { id: 2, name: 'Emma Wilson', avatar: 'EW', avatarColor: '#e87461', role: 'Member' },
    { id: 3, name: 'David Kim', avatar: 'DK', avatarColor: '#ffc857', role: 'Member' },
    { id: 4, name: 'Michael Torres', avatar: 'MT', avatarColor: '#c47ba0', role: 'Member' },
    { id: 5, name: 'Lisa Martinez', avatar: 'LM', avatarColor: '#7ba05b', role: 'Member' },
    { id: 6, name: 'Jake Peterson', avatar: 'JP', avatarColor: '#5a7ba0', role: 'Member' }
  ];

  // Sample feed posts
  const posts = [
    {
      id: 1,
      author: 'Emma Wilson',
      avatar: 'EW',
      avatarColor: '#6ec9c4',
      time: '2h ago',
      upvotes: 18,
      title: 'Great run this morning!',
      content: 'Perfect weather today - managed to hit a new PR! Thanks everyone for the motivation. Same time Friday?',
      comments: 7,
      isPinned: false
    },
    {
      id: 2,
      author: 'David Kim',
      avatar: 'DK',
      avatarColor: '#e87461',
      time: '5h ago',
      upvotes: 24,
      title: 'Route suggestion for next week',
      content: 'What if we try the riverside trail next week? It\'s about 5K and has great views. Let me know what you all think!',
      comments: 12,
      isPinned: false
    },
    {
      id: 3,
      author: 'Sarah Chen',
      avatar: 'SC',
      avatarColor: '#4a5568',
      time: '1d ago',
      upvotes: 42,
      title: 'Important: Schedule change for this week',
      content: 'Due to forecasted rain, we\'re moving Wednesday\'s run to Thursday at the same time. Check the pinned documents for updated schedule.',
      comments: 5,
      isPinned: true
    },
    {
      id: 4,
      author: 'Michael Torres',
      avatar: 'MT',
      avatarColor: '#ffc857',
      time: '2d ago',
      upvotes: 31,
      title: 'New member introductions',
      content: 'Welcome to all our new members this week! Don\'t hesitate to introduce yourself in the comments. We\'re a friendly group!',
      comments: 23,
      isPinned: false
    },
    {
      id: 5,
      author: 'Lisa Martinez',
      avatar: 'LM',
      avatarColor: '#c47ba0',
      time: '3d ago',
      upvotes: 15,
      title: 'Post-run breakfast spots?',
      content: 'Anyone know good breakfast places near campus? Would love to grab food after our Friday runs sometimes.',
      comments: 18,
      isPinned: false
    }
  ];

  // Sample pinned documents
  const documents = [
    {
      id: 1,
      title: 'Weekly Schedule (Updated)',
      date: 'Dec 15, 2025',
      type: 'PDF',
      icon: Calendar
    },
    {
      id: 2,
      title: 'Running Routes Map',
      date: 'Dec 8, 2025',
      type: 'PDF',
      icon: FileText
    },
    {
      id: 3,
      title: 'Safety Guidelines',
      date: 'Nov 20, 2025',
      type: 'PDF',
      icon: FileText
    },
    {
      id: 4,
      title: 'Squad Charter & Rules',
      date: 'Nov 15, 2025',
      type: 'PDF',
      icon: FileText
    },
    {
      id: 5,
      title: 'Upcoming Events',
      date: 'Dec 1, 2025',
      type: 'PDF',
      icon: Calendar
    }
  ];

  const [showMembers, setShowMembers] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[#FBF9F5]" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Mobile View */}
      <div className="md:hidden h-full flex flex-col">
        {/* Mobile Header */}
        <div className="bg-[#F1EFE7] px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center -ml-2"
            >
              <ChevronLeft className="w-6 h-6 text-[#3d3d3a]" />
            </button>
            <h1 
              className="text-2xl flex-1"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              {squad.name}
            </h1>
            <button
              onClick={() => setShowInfoMenu(true)}
              className="w-8 h-8 flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5 text-[#3d3d3a]" />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-4 h-4 text-[#7b7b74]" />
            <p 
              className="text-sm"
              style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
            >
              {squad.members} members
            </p>
          </div>
          <div className="flex gap-2">
            {squad.isJoined ? (
              <>
                <button 
                  onClick={onOpenChat}
                  className="flex-1 py-2.5 bg-[#d47455] text-white rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Open Chat
                </button>
                <button 
                  className="px-4 py-2.5 bg-white border border-[#d9d2c5] text-[#7b7b74] rounded-xl text-sm active:scale-95 transition-transform"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <UserMinus className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                className="flex-1 py-2.5 bg-[#d47455] text-white rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                <UserPlus className="w-4 h-4" />
                Join Squad
              </button>
            )}
          </div>
        </div>

        {/* Info Menu Overlay */}
        {showInfoMenu && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowInfoMenu(false)}
          />
        )}

        {/* Info Menu Slide-out Panel */}
        <div 
          className={`fixed top-0 right-0 h-full w-80 bg-white z-50 transition-transform duration-300 shadow-xl ${
            showInfoMenu ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full overflow-y-auto">
            {/* Menu Header */}
            <div className="bg-[#F1EFE7] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
              <h2 
                className="text-lg"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Squad Info
              </h2>
              <button
                onClick={() => setShowInfoMenu(false)}
                className="w-8 h-8 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#3d3d3a]" />
              </button>
            </div>

            {/* About Section */}
            <div className="px-4 py-4 border-b border-[#e7ded1]">
              <h3 
                className="text-base mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                About
              </h3>
              <p 
                className="text-sm mb-4"
                style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', lineHeight: 1.5 }}
              >
                {squad.description}
              </p>
              <div className="space-y-2.5 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Category:</span>
                  <span className="text-[#3d3d3a]">{squad.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Meetings:</span>
                  <span className="text-[#3d3d3a] text-right">{squad.meetings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Location:</span>
                  <span className="text-[#3d3d3a]">{squad.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Admin:</span>
                  <span className="text-[#3d3d3a]">{squad.admin}</span>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="px-4 py-4 border-b border-[#e7ded1]">
              <h3 
                className="text-base mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Documents ({documents.length})
              </h3>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div 
                    key={doc.id}
                    className="bg-[#FBF9F5] rounded-xl p-3 active:bg-[#f5f3eb] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f0eee6] rounded-lg flex items-center justify-center flex-shrink-0">
                        <doc.icon size={18} className="text-[#7b7b74]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="text-sm mb-0.5 truncate"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                        >
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                            {doc.type}
                          </span>
                          <span className="text-xs text-[#7b7b74]">•</span>
                          <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                            {doc.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Members Section */}
            <div className="px-4 py-4">
              <h3 
                className="text-base mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Members ({squad.members})
              </h3>
              <div className="space-y-2">
                {members.map(member => (
                  <div 
                    key={member.id}
                    className="bg-[#FBF9F5] rounded-xl p-3 active:bg-[#f5f3eb] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                        style={{ backgroundColor: member.avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                      >
                        {member.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div 
                          className="text-sm truncate"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                        >
                          {member.name}
                        </div>
                        {member.role === 'Admin' && (
                          <div className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#d47455' }}>
                            Admin
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Feed */}
        <div className="flex-1 overflow-y-auto bg-[#FBF9F5]">
          <div className="p-4 space-y-3">
            {posts.map(post => (
              <div 
                key={post.id} 
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Post Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ backgroundColor: post.avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                      >
                        {post.avatar}
                      </div>
                      <div>
                        <span 
                          className="text-sm block"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                        >
                          {post.author}
                        </span>
                        <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                          {post.time}
                        </span>
                      </div>
                    </div>
                    {post.isPinned && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: '#fff3e0' }}>
                        <Pin size={12} className="text-[#d97757]" />
                        <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#d97757' }}>
                          Pinned
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <h3 
                    className="text-base mb-2"
                    style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a', lineHeight: 1.3 }}
                  >
                    {post.title}
                  </h3>
                  
                  <p 
                    className="text-sm mb-3"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', lineHeight: 1.5 }}
                  >
                    {post.content}
                  </p>
                </div>

                {/* Post Actions */}
                <div className="border-t border-[#f5f3eb] px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5 py-1 active:scale-95 transition-transform">
                      <ArrowUp size={18} className="text-[#7b7b74]" />
                      <span className="text-sm" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}>
                        {post.upvotes}
                      </span>
                    </button>
                    <button className="flex items-center gap-1.5 py-1 active:scale-95 transition-transform">
                      <MessageSquare size={18} className="text-[#7b7b74]" />
                      <span className="text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                        {post.comments}
                      </span>
                    </button>
                  </div>
                  <button className="p-1 active:scale-95 transition-transform">
                    <Bookmark size={18} className="text-[#7b7b74]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating New Post Button */}
        <button 
          className="fixed bottom-4 right-4 w-14 h-14 bg-[#d47455] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10"
        >
          <Plus size={24} className="text-white" />
        </button>
      </div>

      {/* Desktop View - Keep existing design */}
      <div className="hidden md:block h-full overflow-hidden flex flex-col"  style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Squad Header */}
        <div className="bg-[#fefefc] border-b border-[#e7ded1] px-8 py-6">
          <button 
            onClick={onBack}
            className="text-[13px] text-[#8c867d] hover:text-[#3d3d3a] mb-4 bg-transparent border-0 cursor-pointer"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            ← Back to Squads
          </button>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Squad Image Bubble */}
              <div 
                className="w-20 h-20 rounded-full bg-[#f8f6f0] border-2 border-[#e7ded1] flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-[#d9d2c5] transition-colors"
                style={{ backgroundColor: squad.color + '20' }}
              >
                <Image className="w-8 h-8 text-[#8c867d]" />
              </div>
              
              <div>
                <h1 
                  className="text-[32px] text-[#3d3d3a] mb-2"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600, lineHeight: 1.2 }}
                >
                  {squad.name}
                </h1>
                <p 
                  className="text-[16px] text-[#7b7b74]"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  {squad.members} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {squad.isJoined && (
                <button 
                  onClick={onOpenChat}
                  className="px-4 py-2.5 bg-white border border-[#e7ded1] text-[#3d3d3a] rounded-lg text-[14px] hover:bg-[#fefefc] hover:border-[#d9d2c5] transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Open Chat
                </button>
              )}
              {squad.isJoined ? (
                <button 
                  className="px-4 py-2.5 bg-white border border-[#e7ded1] text-[#d97757] rounded-lg text-[14px] hover:bg-[#fef9f7] hover:border-[#d97757] transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <UserMinus className="w-4 h-4" />
                  Leave Squad
                </button>
              ) : (
                <button 
                  className="px-4 py-2.5 bg-[#d97757] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <UserPlus className="w-4 h-4" />
                  Join Squad
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex bg-[#fefefc]">
          {/* Left Column - Feed */}
          <div className="flex-1 overflow-y-auto px-8 py-6 relative">
            <div className="max-w-3xl">
              {/* Search Bar and Create Post Button */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c867d]" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7ded1] rounded-lg text-[14px] text-[#3d3d3a] placeholder:text-[#8c867d] focus:border-[#d97757] focus:outline-none"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  />
                </div>
                <button 
                  className="px-4 py-2.5 bg-[#d97757] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <Plus size={16} />
                  Create a post
                </button>
              </div>

              {/* Feed Posts */}
              <div className="space-y-4">
                {posts.map(post => (
                  <div 
                    key={post.id} 
                    className="bg-[#fefefc] border border-[#e7ded1] rounded-lg overflow-hidden hover:border-[#d9d2c5] transition-colors"
                  >
                    <div className="flex">
                      {/* Vote Section */}
                      <div className="w-12 bg-[#f8f6f0] flex flex-col items-center py-3 px-2">
                        <button className="text-[#8c867d] hover:text-[#d97757] bg-transparent border-0 cursor-pointer p-1">
                          <ArrowUp size={18} />
                        </button>
                        <span 
                          className="text-[13px] text-[#3d3d3a] my-1"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                        >
                          {post.upvotes}
                        </span>
                        <button className="text-[#8c867d] hover:text-[#d97757] bg-transparent border-0 cursor-pointer p-1 rotate-180">
                          <ArrowUp size={18} />
                        </button>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px]"
                              style={{ backgroundColor: post.avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {post.avatar}
                            </div>
                            <span 
                              className="text-[13px] text-[#3d3d3a]"
                              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {post.author}
                            </span>
                            <span className="text-[12px] text-[#8c867d]" style={{ fontFamily: 'Arial, sans-serif' }}>
                              • {post.time}
                            </span>
                          </div>
                          {post.isPinned && (
                            <div className="flex items-center gap-1 text-[#d97757]">
                              <Pin size={14} />
                              <span className="text-[11px]" style={{ fontFamily: 'Arial, sans-serif' }}>Pinned</span>
                            </div>
                          )}
                        </div>
                        
                        <h3 
                          className="text-[16px] text-[#3d3d3a] mb-2"
                          style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
                        >
                          {post.title}
                        </h3>
                        
                        <p 
                          className="text-[14px] text-[#3d3d3a] mb-3 leading-relaxed"
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          {post.content}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                          <button className="flex items-center gap-1 text-[#8c867d] hover:text-[#d97757] text-[13px] bg-transparent border-0 cursor-pointer">
                            <MessageSquare size={16} />
                            <span style={{ fontFamily: 'Arial, sans-serif' }}>{post.comments} comments</span>
                          </button>
                          <button className="flex items-center gap-1 text-[#8c867d] hover:text-[#d97757] text-[13px] bg-transparent border-0 cursor-pointer">
                            <Bookmark size={16} />
                            <span style={{ fontFamily: 'Arial, sans-serif' }}>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Pinned Documents & Info */}
          <div className="w-80 border-l border-[#e7ded1] overflow-y-auto px-6 py-6 bg-[#fefefc]">
            {/* Squad Info */}
            <div className="mb-6 p-4 bg-white border border-[#e7ded1] rounded-lg">
              <h3 
                className="text-[16px] text-[#3d3d3a] mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
              >
                About
              </h3>
              <p 
                className="text-[14px] text-[#3d3d3a] leading-relaxed mb-4"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {squad.description}
              </p>
              <div className="pt-3 border-t border-[#e7ded1] space-y-2 text-[13px]" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex justify-between">
                  <span className="text-[#8c867d]">Admin:</span>
                  <span className="text-[#3d3d3a]">{squad.admin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c867d]">Founded:</span>
                  <span className="text-[#3d3d3a]">{squad.founded}</span>
                </div>
              </div>
            </div>

            {/* Pinned Documents */}
            <div className="mb-6">
              <button 
                onClick={() => setShowDocuments(!showDocuments)}
                className="w-full flex items-center justify-between mb-3 bg-transparent border-0 cursor-pointer p-0 hover:opacity-70 transition-opacity"
              >
                <h3 
                  className="text-[16px] text-[#3d3d3a]"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
                >
                  Pinned Documents
                </h3>
                <ChevronDown 
                  size={16} 
                  className={`text-[#8c867d] transition-transform ${showDocuments ? '' : '-rotate-90'}`} 
                />
              </button>
              {showDocuments && (
                <div className="space-y-2">
                  {documents.map(doc => {
                    const Icon = doc.icon;
                    return (
                      <button
                        key={doc.id}
                        className="w-full p-3 bg-white border border-[#e7ded1] rounded-lg hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <Icon size={16} className="text-[#8c867d] mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-[13px] text-[#3d3d3a] mb-1 truncate"
                              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {doc.title}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#8c867d]">
                              <span style={{ fontFamily: 'Arial, sans-serif' }}>{doc.type}</span>
                              <span>•</span>
                              <span style={{ fontFamily: 'Arial, sans-serif' }}>{doc.date}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Members Section */}
            <div>
              <button 
                onClick={() => setShowMembers(!showMembers)}
                className="w-full flex items-center justify-between mb-3 bg-transparent border-0 cursor-pointer p-0 hover:opacity-70 transition-opacity"
              >
                <h3 
                  className="text-[16px] text-[#3d3d3a]"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
                >
                  Members
                </h3>
                <ChevronDown 
                  size={16} 
                  className={`text-[#8c867d] transition-transform ${showMembers ? '' : '-rotate-90'}`} 
                />
              </button>
              {showMembers && (
                <div className="space-y-2">
                  {members.map(member => (
                    <button
                      key={member.id}
                      className="w-full p-3 bg-white border border-[#e7ded1] rounded-lg hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] flex-shrink-0"
                          style={{ backgroundColor: member.avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                        >
                          {member.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-[13px] text-[#3d3d3a] truncate"
                            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                          >
                            {member.name}
                          </div>
                          {member.role === 'Admin' && (
                            <div className="text-[11px] text-[#d97757]" style={{ fontFamily: 'Arial, sans-serif' }}>
                              Admin
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  <button 
                    className="w-full p-3 bg-white border border-[#e7ded1] rounded-lg hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all text-center cursor-pointer text-[13px] text-[#8c867d] flex items-center justify-center gap-1" 
                    style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                  >
                    View all {squad.members} members
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}