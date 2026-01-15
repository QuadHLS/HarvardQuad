import { UserPlus, UserMinus, MessageCircle, Users as UsersIcon, ChevronLeft, ChevronDown, MoreVertical, X, Globe, Lock, Users, FileText, Image } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SquadsService, Squad, SquadMember, SquadDocument } from '../services/squadsService';
import { useAuth } from '../contexts/AuthContext';

interface SquadDetailPageProps {
  squadId: string;
  onBack: () => void;
  onOpenChat: (conversationId?: string) => void;
}

export function SquadDetailPage({ squadId, onBack, onOpenChat }: SquadDetailPageProps) {
  const { user } = useAuth();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [documents, setDocuments] = useState<SquadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  // Load squad data
  useEffect(() => {
    loadSquadData();
  }, [squadId]);

  const loadSquadData = async () => {
    try {
      setLoading(true);
      const [squadData, membersData, documentsData] = await Promise.all([
        SquadsService.getSquad(squadId),
        SquadsService.getSquadMembers(squadId),
        SquadsService.getSquadDocuments(squadId)
      ]);
      setSquad(squadData);
      setMembers(membersData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error loading squad data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSquad = async () => {
    try {
      setJoining(true);
      await SquadsService.joinSquad(squadId);
      await loadSquadData(); // Refresh to update join status
    } catch (error) {
      console.error('Error joining squad:', error);
      alert('Error joining squad. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveSquad = async () => {
    if (!confirm('Are you sure you want to leave this squad?')) {
      return;
    }
    try {
      setLeaving(true);
      await SquadsService.leaveSquad(squadId);
      await loadSquadData(); // Refresh to update join status
    } catch (error) {
      console.error('Error leaving squad:', error);
      alert('Error leaving squad. Please try again.');
    } finally {
      setLeaving(false);
    }
  };

  const handleOpenChat = () => {
    if (squad?.conversation_id) {
      onOpenChat(squad.conversation_id);
    } else {
      onOpenChat();
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'sports': '#7ba05b',
      'social': '#d47455',
      'academic': '#7b9fb8'
    };
    return colors[category] || '#7b7b74';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'sports': 'Sports',
      'social': 'Social',
      'academic': 'Academic'
    };
    return labels[category] || category;
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (id: string): string => {
    const colors = ['#6ec9c4', '#e87461', '#ffc857', '#c47ba0', '#7ba05b', '#5a7ba0', '#4a5568'];
    const index = parseInt(id.slice(-1), 16) % colors.length;
    return colors[index];
  };

  if (loading || !squad) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FBF9F5]">
        <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>Loading squad...</p>
      </div>
    );
  }

  const isJoined = squad.is_joined || false;
  const squadColor = getCategoryColor(squad.category);
  const PrivacyIcon = squad.type === 'open' ? Globe : squad.type === 'locked' ? Lock : Users;

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
              {squad.member_count || 0} members
            </p>
          </div>
          <div className="flex gap-2">
            {isJoined ? (
              <>
                <button 
                  onClick={handleOpenChat}
                  disabled={!squad.conversation_id}
                  className="flex-1 py-2.5 bg-[#d47455] text-white rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Open Chat
                </button>
                <button 
                  onClick={handleLeaveSquad}
                  disabled={leaving}
                  className="px-4 py-2.5 bg-white border border-[#d9d2c5] text-[#7b7b74] rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <UserMinus className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleJoinSquad}
                disabled={joining}
                className="flex-1 py-2.5 bg-[#d47455] text-white rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                <UserPlus className="w-4 h-4" />
                {joining ? 'Joining...' : 'Join Squad'}
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
                {squad.info || 'No description available'}
              </p>
              <div className="space-y-2.5 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Category:</span>
                  <span className="text-[#3d3d3a]">{getCategoryLabel(squad.category)}</span>
                </div>
                {squad.meeting_times && (
                  <div className="flex justify-between">
                    <span className="text-[#7b7b74]">Meetings:</span>
                    <span className="text-[#3d3d3a] text-right">{squad.meeting_times}</span>
                  </div>
                )}
                {squad.location && (
                  <div className="flex justify-between">
                    <span className="text-[#7b7b74]">Location:</span>
                    <span className="text-[#3d3d3a]">{squad.location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Privacy:</span>
                  <div className="flex items-center gap-1">
                    <PrivacyIcon className="w-3 h-3 text-[#7b7b74]" />
                    <span className="text-[#3d3d3a] capitalize">{squad.type}</span>
                  </div>
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
                {documents.length === 0 ? (
                  <p className="text-sm text-[#7b7b74]" style={{ fontFamily: 'Arial, sans-serif' }}>
                    No documents yet
                  </p>
                ) : (
                  documents.map(doc => (
                    <a
                      key={doc.id}
                      href={doc.file_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#FBF9F5] rounded-xl p-3 active:bg-[#f5f3eb] transition-colors block"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f0eee6] rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-[#7b7b74]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 
                            className="text-sm mb-0.5 truncate"
                            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                          >
                            {doc.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            {doc.mime_type && (
                              <>
                                <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                                  {doc.mime_type}
                                </span>
                                <span className="text-xs text-[#7b7b74]">•</span>
                              </>
                            )}
                            <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                              {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Members Section */}
            <div className="px-4 py-4">
              <h3 
                className="text-base mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Members ({squad.member_count || 0})
              </h3>
              <div className="space-y-2">
                {members.map(member => {
                  const memberName = member.profile?.full_name || member.profile?.email || 'Unknown';
                  const initials = getInitials(memberName);
                  const avatarColor = getAvatarColor(member.user_id);
                  return (
                    <div 
                      key={member.id}
                      className="bg-[#FBF9F5] rounded-xl p-3 active:bg-[#f5f3eb] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {member.profile?.avatar_url ? (
                          <img 
                            src={member.profile.avatar_url} 
                            alt={memberName}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                            style={{ backgroundColor: avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                          >
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-sm truncate"
                            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                          >
                            {memberName}
                          </div>
                          {member.role === 'admin' && (
                            <div className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#d47455' }}>
                              Admin
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Content - Empty state for now (feed removed) */}
        <div className="flex-1 overflow-y-auto bg-[#FBF9F5]">
          <div className="p-4">
            <div className="bg-white rounded-2xl p-6 text-center">
              <MessageCircle className="w-12 h-12 text-[#7b7b74] mx-auto mb-3" />
              <p 
                className="text-base mb-2"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Squad Feed Coming Soon
              </p>
              <p 
                className="text-sm"
                style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
              >
                Use the chat to communicate with squad members
              </p>
            </div>
          </div>
        </div>
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
                  {squad.member_count || 0} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isJoined && (
                <button 
                  onClick={handleOpenChat}
                  disabled={!squad.conversation_id}
                  className="px-4 py-2.5 bg-white border border-[#e7ded1] text-[#3d3d3a] rounded-lg text-[14px] hover:bg-[#fefefc] hover:border-[#d9d2c5] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Open Chat
                </button>
              )}
              {isJoined ? (
                <button 
                  onClick={handleLeaveSquad}
                  disabled={leaving}
                  className="px-4 py-2.5 bg-white border border-[#e7ded1] text-[#d97757] rounded-lg text-[14px] hover:bg-[#fef9f7] hover:border-[#d97757] transition-colors flex items-center gap-2 disabled:opacity-50"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <UserMinus className="w-4 h-4" />
                  {leaving ? 'Leaving...' : 'Leave Squad'}
                </button>
              ) : (
                <button 
                  onClick={handleJoinSquad}
                  disabled={joining}
                  className="px-4 py-2.5 bg-[#d97757] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-colors flex items-center gap-2 disabled:opacity-50"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <UserPlus className="w-4 h-4" />
                  {joining ? 'Joining...' : 'Join Squad'}
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
              {/* Feed - Empty state for now */}
              <div className="bg-white border border-[#e7ded1] rounded-lg p-8 text-center">
                <MessageCircle className="w-16 h-16 text-[#8c867d] mx-auto mb-4" />
                <h3 
                  className="text-[18px] mb-2"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                >
                  Squad Feed Coming Soon
                </h3>
                <p 
                  className="text-[14px] text-[#8c867d]"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  Use the chat to communicate with squad members
                </p>
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
                {squad.info || 'No description available'}
              </p>
              <div className="pt-3 border-t border-[#e7ded1] space-y-2 text-[13px]" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex justify-between">
                  <span className="text-[#8c867d]">Category:</span>
                  <span className="text-[#3d3d3a]">{getCategoryLabel(squad.category)}</span>
                </div>
                {squad.meeting_times && (
                  <div className="flex justify-between">
                    <span className="text-[#8c867d]">Meetings:</span>
                    <span className="text-[#3d3d3a]">{squad.meeting_times}</span>
                  </div>
                )}
                {squad.location && (
                  <div className="flex justify-between">
                    <span className="text-[#8c867d]">Location:</span>
                    <span className="text-[#3d3d3a]">{squad.location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#8c867d]">Privacy:</span>
                  <div className="flex items-center gap-1">
                    <PrivacyIcon className="w-3 h-3 text-[#8c867d]" />
                    <span className="text-[#3d3d3a] capitalize">{squad.type}</span>
                  </div>
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
                  {documents.length === 0 ? (
                    <p className="text-[13px] text-[#8c867d]" style={{ fontFamily: 'Arial, sans-serif' }}>
                      No documents yet
                    </p>
                  ) : (
                    documents.map(doc => (
                      <a
                        key={doc.id}
                        href={doc.file_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full p-3 bg-white border border-[#e7ded1] rounded-lg hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all text-left cursor-pointer block"
                      >
                        <div className="flex items-start gap-3">
                          <FileText size={16} className="text-[#8c867d] mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-[13px] text-[#3d3d3a] mb-1 truncate"
                              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {doc.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#8c867d]">
                              {doc.mime_type && (
                                <>
                                  <span style={{ fontFamily: 'Arial, sans-serif' }}>{doc.mime_type}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span style={{ fontFamily: 'Arial, sans-serif' }}>
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))
                  )}
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
                  {members.map(member => {
                    const memberName = member.profile?.full_name || member.profile?.email || 'Unknown';
                    const initials = getInitials(memberName);
                    const avatarColor = getAvatarColor(member.user_id);
                    return (
                      <button
                        key={member.id}
                        className="w-full p-3 bg-white border border-[#e7ded1] rounded-lg hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {member.profile?.avatar_url ? (
                            <img 
                              src={member.profile.avatar_url} 
                              alt={memberName}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] flex-shrink-0"
                              style={{ backgroundColor: avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {initials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-[13px] text-[#3d3d3a] truncate"
                              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {memberName}
                            </div>
                            {member.role === 'admin' && (
                              <div className="text-[11px] text-[#d97757]" style={{ fontFamily: 'Arial, sans-serif' }}>
                                Admin
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {members.length < (squad.member_count || 0) && (
                    <button 
                      className="w-full p-3 bg-white border border-[#e7ded1] rounded-lg hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all text-center cursor-pointer text-[13px] text-[#8c867d] flex items-center justify-center gap-1" 
                      style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                    >
                      View all {squad.member_count || 0} members
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}