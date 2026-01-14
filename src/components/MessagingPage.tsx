import { Search, Send, ChevronLeft, Plus, Hash, MessageCircle } from 'lucide-react';
import { useState } from 'react';

interface MessagingPageProps {
  onCourseClick?: (courseId: string) => void;
}

type ConversationType = 'course' | 'campus' | 'dm';

interface Conversation {
  id: string;
  name: string;
  type: ConversationType;
  subtitle?: string;
  avatar?: string;
  avatarColor?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
  messages: Array<{
    author: string;
    avatar: string;
    avatarColor: string;
    time: string;
    content: string;
  }>;
}

export function MessagingPage({ onCourseClick }: MessagingPageProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const conversations: Conversation[] = [
    {
      id: 'contracts-101',
      name: 'contracts-101',
      type: 'course',
      subtitle: 'Kingsfield • Mon/Wed 8:15 AM',
      lastMessage: 'I think it\'s expectation damages in this case...',
      lastMessageTime: '4:35 PM',
      unread: 3,
      messages: [
        {
          author: 'Alex Rivera',
          avatar: 'AR',
          avatarColor: '#e87461',
          time: '4:20 PM',
          content: 'Has anyone started on the brief for Hawkins v. McGee?'
        },
        {
          author: 'Sarah Chen',
          avatar: 'SC',
          avatarColor: '#6ec9c4',
          time: '4:35 PM',
          content: 'I think it\'s expectation damages in this case. The court was trying to restore the plaintiff.'
        },
        {
          author: 'Mike Johnson',
          avatar: 'MJ',
          avatarColor: '#7ba05b',
          time: '4:42 PM',
          content: 'Sarah is right - check page 127 of the casebook'
        }
      ]
    },
    {
      id: 'property-law',
      name: 'property-law',
      type: 'course',
      subtitle: 'Reed • Tues/Thurs 1:00 PM',
      lastMessage: 'Don\'t forget the reading for Thursday',
      lastMessageTime: '2:15 PM',
      unread: 0,
      messages: [
        {
          author: 'Emma Davis',
          avatar: 'ED',
          avatarColor: '#c89b6e',
          time: '2:15 PM',
          content: 'Don\'t forget the reading for Thursday - it\'s a heavy one!'
        }
      ]
    },
    {
      id: 'dm-sarah',
      name: 'Sarah Chen',
      type: 'dm',
      avatar: 'SC',
      avatarColor: '#6ec9c4',
      lastMessage: 'Want to grab coffee before class?',
      lastMessageTime: 'Yesterday',
      unread: 1,
      messages: [
        {
          author: 'Sarah Chen',
          avatar: 'SC',
          avatarColor: '#6ec9c4',
          time: 'Yesterday',
          content: 'Want to grab coffee before class tomorrow?'
        }
      ]
    },
    {
      id: 'study-group',
      name: 'Study Group',
      type: 'campus',
      avatar: '📚',
      lastMessage: 'Meeting at the library at 6pm',
      lastMessageTime: '11:30 AM',
      unread: 0,
      messages: [
        {
          author: 'Alex Rivera',
          avatar: 'AR',
          avatarColor: '#e87461',
          time: '11:30 AM',
          content: 'Meeting at the library at 6pm tonight?'
        }
      ]
    }
  ];

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput('');
    }
  };

  return (
    <div className="h-full bg-[#FBF9F5]">
      {/* Mobile View */}
      <div className="md:hidden h-full flex flex-col">
        {!selectedConversation ? (
          /* Conversations List */
          <>
            <div className="px-4 pt-6 pb-4">
              <h1 
                className="text-3xl mb-4"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Messages
              </h1>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7b7b74]" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-0 text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="px-4 pb-4 space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className="bg-white rounded-2xl p-4 active:bg-[#f5f3eb] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-base"
                        style={{ 
                          fontFamily: 'Arial, sans-serif',
                          fontWeight: 600,
                          backgroundColor: conv.type === 'course' ? '#d47455' : conv.avatarColor || '#7b7b74'
                        }}
                      >
                        {conv.type === 'course' ? (
                          <Hash className="w-6 h-6" />
                        ) : conv.type === 'dm' ? (
                          conv.avatar
                        ) : (
                          <span className="text-xl">{conv.avatar}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 
                            className="text-base truncate"
                            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                          >
                            {conv.name}
                          </h3>
                          <span 
                            className="text-xs flex-shrink-0"
                            style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                          >
                            {conv.lastMessageTime}
                          </span>
                        </div>
                        {conv.subtitle && (
                          <p 
                            className="text-xs mb-1"
                            style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                          >
                            {conv.subtitle}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <p 
                            className="text-sm truncate"
                            style={{ 
                              fontFamily: 'Arial, sans-serif', 
                              color: conv.unread ? '#3d3d3a' : '#7b7b74',
                              fontWeight: conv.unread ? 500 : 400
                            }}
                          >
                            {conv.lastMessage}
                          </p>
                          {conv.unread && conv.unread > 0 && (
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: '#d47455' }}
                            >
                              <span 
                                className="text-xs text-white"
                                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                              >
                                {conv.unread}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4">
              <button 
                className="w-full py-3 bg-[#d47455] text-white rounded-2xl flex items-center justify-center gap-2"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                <Plus className="w-5 h-5" />
                New Message
              </button>
            </div>
          </>
        ) : (
          /* Chat View */
          <>
            <div className="bg-white border-b border-[#e7ded1] px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="w-8 h-8 flex items-center justify-center -ml-2"
                >
                  <ChevronLeft className="w-6 h-6 text-[#3d3d3a]" />
                </button>
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 600,
                    backgroundColor: selectedConv?.type === 'course' ? '#d47455' : selectedConv?.avatarColor || '#7b7b74'
                  }}
                >
                  {selectedConv?.type === 'course' ? (
                    <Hash className="w-5 h-5" />
                  ) : selectedConv?.type === 'dm' ? (
                    selectedConv.avatar
                  ) : (
                    <span className="text-lg">{selectedConv?.avatar}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 
                    className="text-base truncate"
                    style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                  >
                    {selectedConv?.name}
                  </h2>
                  {selectedConv?.subtitle && (
                    <p 
                      className="text-xs truncate"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                    >
                      {selectedConv.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {selectedConv?.messages.map((msg, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs"
                    style={{ 
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 600,
                      backgroundColor: msg.avatarColor
                    }}
                  >
                    {msg.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span 
                        className="text-sm"
                        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                      >
                        {msg.author}
                      </span>
                      <span 
                        className="text-xs"
                        style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                      >
                        {msg.time}
                      </span>
                    </div>
                    <p 
                      className="text-sm"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', lineHeight: 1.5 }}
                    >
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border-t border-[#e7ded1] p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-3 bg-[#f5f3eb] rounded-2xl border-0 text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                />
                <button
                  onClick={handleSendMessage}
                  className="w-10 h-10 rounded-full bg-[#d47455] flex items-center justify-center"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop View - Keep existing design */}
      <div className="hidden md:flex h-full">
        <div className="w-80 bg-white border-r border-[#e7ded1] flex flex-col">
          <div className="p-6 border-b border-[#e7ded1]">
            <h2 
              className="text-2xl mb-4"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              Messages
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7b7b74]" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-[#f5f3eb] rounded-lg border-0 text-sm"
                style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`px-6 py-4 cursor-pointer border-b border-[#f5f3eb] hover:bg-[#faf9f7] transition-colors ${
                  selectedConversation === conv.id ? 'bg-[#faf9f7]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                    style={{ 
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 600,
                      backgroundColor: conv.type === 'course' ? '#d47455' : conv.avatarColor || '#7b7b74'
                    }}
                  >
                    {conv.type === 'course' ? <Hash className="w-5 h-5" /> : conv.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-sm mb-1 truncate"
                      style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                    >
                      {conv.name}
                    </h3>
                    <p 
                      className="text-xs truncate"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                    >
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              <div className="bg-white border-b border-[#e7ded1] px-6 py-4">
                <h2 
                  className="text-xl"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                >
                  {selectedConv.name}
                </h2>
                {selectedConv.subtitle && (
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    {selectedConv.subtitle}
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-4">
                {selectedConv.messages.map((msg, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        fontWeight: 600,
                        backgroundColor: msg.avatarColor
                      }}
                    >
                      {msg.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span 
                          className="text-sm"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                        >
                          {msg.author}
                        </span>
                        <span 
                          className="text-xs"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                        >
                          {msg.time}
                        </span>
                      </div>
                      <p 
                        className="text-sm"
                        style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                      >
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border-t border-[#e7ded1] p-6">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-4 py-3 bg-[#f5f3eb] rounded-xl border-0"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-6 py-3 bg-[#d47455] text-white rounded-xl hover:bg-[#c06545] transition-colors"
                    style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-[#c7bcaa]" />
                <p 
                  className="text-lg"
                  style={{ fontFamily: 'Lora, serif', color: '#7b7b74' }}
                >
                  Select a conversation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
