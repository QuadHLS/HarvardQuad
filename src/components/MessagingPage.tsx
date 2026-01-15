import { Search, Send, ChevronLeft, Plus, Hash, MessageCircle, Users, User, Paperclip, Download, File, Trash2, Settings } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessagingService, Conversation as SupabaseConversation, Message, Participant } from '../services/messagingService';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface MessagingPageProps {
  onCourseClick?: (courseId: string) => void;
}

interface DisplayConversation {
  id: string;
  name: string;
  type: 'dm' | 'group';
  avatar?: string;
  avatarUrl?: string | null;
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

// Conversation Item Component
function ConversationItem({ conv, onClick }: { conv: DisplayConversation; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-4 active:bg-[#f5f3eb] transition-colors"
    >
      <div className="flex items-start gap-3">
        {conv.avatarUrl ? (
          <img
            src={conv.avatarUrl}
            alt={conv.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-base"
          style={{ 
            fontFamily: 'Arial, sans-serif',
            fontWeight: 600,
            backgroundColor: conv.avatarColor || '#7b7b74',
            display: conv.avatarUrl ? 'none' : 'flex'
          }}
        >
          {conv.type === 'group' ? (
            <span className="text-xl">{conv.avatar}</span>
          ) : (
            conv.avatar
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
  );
}

export function MessagingPage({ onCourseClick }: MessagingPageProps) {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<DisplayConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dms, setDms] = useState<DisplayConversation[]>([]);
  const [groups, setGroups] = useState<DisplayConversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmails, setNewGroupEmails] = useState(''); // legacy text entry (kept to avoid breaking; not used for new flow)
  const [newGroupSearchQuery, setNewGroupSearchQuery] = useState('');
  const [newGroupSearchResults, setNewGroupSearchResults] = useState<Array<{ id: string; email: string; full_name: string | null }>>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Array<{ id: string; email: string; full_name: string | null }>>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: string; email: string; full_name: string | null }>>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ file: File; type: 'image' | 'file'; url: string; name: string; size: number }>
  >([]);
  const [showEditMembers, setShowEditMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentParticipants, setCurrentParticipants] = useState<Participant[]>([]);
  const [editMembersSearchQuery, setEditMembersSearchQuery] = useState('');
  const [editMembersSearchResults, setEditMembersSearchResults] = useState<Array<{ id: string; email: string; full_name: string | null }>>([]);
  
  const closeGroupModal = () => {
    setShowNewGroup(false);
    setNewGroupName('');
    setNewGroupEmails('');
    setNewGroupSearchQuery('');
    setNewGroupSearchResults([]);
    setSelectedGroupMembers([]);
  };

  // Fetch conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load conversations from Supabase
  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await MessagingService.getConversations();
      
      const displayConvs: DisplayConversation[] = await Promise.all(
        convs.map(async (conv) => {
          // For DMs, get the other participant's info
          let displayName = conv.name || 'Unnamed';
          let avatar = '?';
          let avatarColor = '#7b7b74';

          // Format last message
          let lastMessage = 'No messages yet';
          let lastMessageTime = '';
          if (conv.last_message) {
            if (conv.last_message.message_type === 'text') {
              lastMessage = conv.last_message.content || '[Message]';
            } else if (conv.last_message.message_type === 'image') {
              lastMessage = '📷 Image';
            } else {
              lastMessage = '📎 File';
            }
            lastMessageTime = formatTime(conv.last_message.created_at);
          }

          let avatarUrl: string | null = null;

          if (conv.type === 'dm') {
            const participants = await MessagingService.getParticipants(conv.id);
            const otherParticipant = participants.find(p => p.user_id !== user?.id);
            if (otherParticipant?.profile) {
              displayName = otherParticipant.profile.full_name || otherParticipant.profile.email?.split('@')[0] || 'Unknown';
              avatar = (otherParticipant.profile.full_name || otherParticipant.profile.email || '?')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              // Generate color from name (fallback)
              const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
              avatarColor = colors[displayName.charCodeAt(0) % colors.length];
              // Use actual avatar URL if available
              avatarUrl = otherParticipant.profile.avatar_url && otherParticipant.profile.avatar_url.trim() !== '' 
                ? otherParticipant.profile.avatar_url 
                : null;
            }
          } else {
            // Group chat
            avatar = '👥';
            avatarColor = '#d47455';
          }

          return {
            id: conv.id,
            name: displayName,
            type: conv.type,
            avatar,
            avatarUrl,
            avatarColor,
            lastMessage,
            lastMessageTime,
            unread: conv.unread_count || 0,
            messages: [] // Will load when selected
          };
        })
      );

      setConversations(displayConvs);
      setDms(displayConvs.filter(c => c.type === 'dm'));
      setGroups(displayConvs.filter(c => c.type === 'group'));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // Mark messages as read immediately when opening the conversation
      const markReadAndRefresh = async () => {
        try {
          await MessagingService.markAsRead(selectedConversation);
          // Small delay to ensure database update propagates
          await new Promise(resolve => setTimeout(resolve, 100));
          // Refresh conversations to update unread count after marking as read
          await loadConversations();
        } catch (err) {
          console.error('Error marking messages as read:', err);
        }
      };
      
      markReadAndRefresh();
      loadMessages(selectedConversation);
      checkAdminStatus(selectedConversation);
      loadParticipants(selectedConversation);
    } else {
      // Reset state when no conversation is selected
      setIsAdmin(false);
      setCurrentParticipants([]);
      setShowEditMembers(false);
      setShowDeleteConfirm(false);
    }
  }, [selectedConversation]);

  // Periodically mark messages as read while viewing the conversation
  useEffect(() => {
    if (!selectedConversation) return;

    // Set up interval to mark as read every 10 seconds while viewing
    // This ensures new messages that arrive while viewing are marked as read
    const interval = setInterval(() => {
      MessagingService.markAsRead(selectedConversation).then(() => {
        // Update unread count in the current conversation object
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversation 
            ? { ...conv, unread: 0 }
            : conv
        ));
        setDms(prev => prev.map(conv => 
          conv.id === selectedConversation 
            ? { ...conv, unread: 0 }
            : conv
        ));
        setGroups(prev => prev.map(conv => 
          conv.id === selectedConversation 
            ? { ...conv, unread: 0 }
            : conv
        ));
      }).catch(err => {
        console.error('Error marking messages as read:', err);
      });
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [selectedConversation]);

  const checkAdminStatus = async (conversationId: string) => {
    try {
      const admin = await MessagingService.isAdmin(conversationId);
      setIsAdmin(admin);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const loadParticipants = async (conversationId: string) => {
    try {
      const participants = await MessagingService.getParticipants(conversationId);
      setCurrentParticipants(participants);
    } catch (error) {
      console.error('Error loading participants:', error);
      setCurrentParticipants([]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await MessagingService.getMessages(conversationId);
      setMessages(msgs);
      // Mark messages as read after loading (in case it wasn't already marked)
      MessagingService.markAsRead(conversationId).then(() => {
        // Update unread count locally for immediate UI feedback
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread: 0 }
            : conv
        ));
        setDms(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread: 0 }
            : conv
        ));
        setGroups(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread: 0 }
            : conv
        ));
        // Also refresh conversations to ensure consistency
        loadConversations();
      }).catch(err => {
        console.error('Error marking messages as read:', err);
      });
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const revokePendingUrls = () => {
    pendingAttachments.forEach(att => URL.revokeObjectURL(att.url));
  };

  useEffect(() => {
    return () => {
      revokePendingUrls();
      setPendingAttachments([]);
    };
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!selectedConversation || !user) return;
    const hasText = messageInput.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    try {
      for (const att of pendingAttachments) {
        if (att.type === 'image') {
          await MessagingService.sendImageMessage(selectedConversation, att.file);
        } else {
          await MessagingService.sendFileMessage(selectedConversation, att.file);
        }
      }

      if (hasText) {
        await MessagingService.sendTextMessage(selectedConversation, messageInput.trim());
        setMessageInput('');
      }

      revokePendingUrls();
      setPendingAttachments([]);
      await loadMessages(selectedConversation);
      await loadConversations(); // Refresh to update last message
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const url = URL.createObjectURL(file);
    setPendingAttachments((prev) => [
      ...prev,
      {
        file,
        type: isImage ? 'image' : 'file',
        url,
        name: file.name,
        size: file.size,
      },
    ]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  };

  const handleGroupDialogChange = (open: boolean) => {
    if (open) {
      setShowNewGroup(true);
    } else {
      closeGroupModal();
    }
  };

  // Search users for group members (debounced)
  useEffect(() => {
    if (!newGroupSearchQuery.trim()) {
      setNewGroupSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await MessagingService.searchUsers(newGroupSearchQuery.trim());
        setNewGroupSearchResults(data || []);
      } catch (error) {
        console.error('Error searching users for group:', error);
        setNewGroupSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newGroupSearchQuery]);

  const handleAddGroupMember = (user: { id: string; email: string; full_name: string | null }) => {
    setSelectedGroupMembers((prev) => {
      if (prev.some((m) => m.id === user.id)) return prev;
      return [...prev, user];
    });
    setNewGroupSearchQuery('');
    setNewGroupSearchResults([]);
  };

  const handleRemoveGroupMember = (id: string) => {
    setSelectedGroupMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleDownload = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download file');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  // Search for users
  useEffect(() => {
    if (userSearchQuery.trim().length > 0) {
      const searchUsers = async () => {
        try {
          const { data } = await MessagingService.searchUsers(userSearchQuery);
          if (data) {
            setUserSearchResults(data.filter(u => u.id !== user?.id)); // Exclude current user
            setShowUserDropdown(true);
          }
        } catch (error) {
          console.error('Error searching users:', error);
          setUserSearchResults([]);
        }
      };
      
      const debounceTimer = setTimeout(searchUsers, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setUserSearchResults([]);
      setShowUserDropdown(false);
    }
  }, [userSearchQuery, user]);

  const handleCreateDM = async (userId: string) => {
    if (!user) return;

    try {
      await MessagingService.createDM(userId);
      setUserSearchQuery('');
      setShowUserDropdown(false);
      setUserSearchResults([]);
      await loadConversations();
    } catch (error) {
      console.error('Error creating DM:', error);
      alert('Error creating DM. Please try again.');
    }
  };

  const handleCreateGroup = async () => {
    // Require at least 3 people total (creator + 2 selected)
    if (!newGroupName.trim() || selectedGroupMembers.length < 2 || !user) {
      alert('Add a group name and at least 2 members (3 people including you).');
      return;
    }

    try {
      const userIds = selectedGroupMembers.map((m) => m.id);
      await MessagingService.createGroupChat(newGroupName.trim(), userIds);
      closeGroupModal();
      await loadConversations();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Error creating group. Please try again.');
    }
  };

  const handleOpenEditMembers = async () => {
    if (!selectedConversation) return;
    setShowEditMembers(true);
    setEditMembersSearchQuery('');
    setEditMembersSearchResults([]);
  };

  const handleCloseEditMembers = () => {
    setShowEditMembers(false);
    setEditMembersSearchQuery('');
    setEditMembersSearchResults([]);
  };

  const handleAddMemberToGroup = async (userId: string) => {
    if (!selectedConversation) return;
    try {
      await MessagingService.addParticipant(selectedConversation, userId);
      await loadParticipants(selectedConversation);
      setEditMembersSearchQuery('');
      setEditMembersSearchResults([]);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Error adding member. Please try again.');
    }
  };

  const handleRemoveMemberFromGroup = async (userId: string) => {
    if (!selectedConversation || !user) return;
    try {
      await MessagingService.removeParticipant(selectedConversation, userId);
      await loadParticipants(selectedConversation);
      // If user removed themselves, go back to conversations list
      if (userId === user.id) {
        setSelectedConversation(null);
        await loadConversations();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Error removing member. Please try again.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedConversation) return;
    try {
      await MessagingService.deleteConversation(selectedConversation);
      setShowDeleteConfirm(false);
      setSelectedConversation(null);
      await loadConversations();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Error deleting group. Please try again.');
    }
  };

  // Search users for edit members (debounced)
  useEffect(() => {
    if (!editMembersSearchQuery.trim()) {
      setEditMembersSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await MessagingService.searchUsers(editMembersSearchQuery.trim());
        if (data) {
          // Filter out current participants and current user
          const participantIds = currentParticipants.map(p => p.user_id);
          setEditMembersSearchResults(
            data.filter(u => u.id !== user?.id && !participantIds.includes(u.id))
          );
        }
      } catch (error) {
        console.error('Error searching users for edit members:', error);
        setEditMembersSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [editMembersSearchQuery, currentParticipants, user]);

  return (
    <div className="h-full bg-[#fbf8f7]">
      {/* Mobile View */}
      <div
        className="md:hidden h-full min-h-screen flex flex-col overflow-hidden"
        style={{ paddingBottom: '76px' }}
      >
        {!selectedConversation ? (
          /* Conversations List */
          <>
            <div className="px-4 pt-6 pb-4 flex-shrink-0">
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
                  placeholder="Search for users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  onFocus={() => userSearchResults.length > 0 && setShowUserDropdown(true)}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                  className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-0 text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                />
                {showUserDropdown && userSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-[#e7ded1] z-50 max-h-60 overflow-auto">
                    {userSearchResults.map((userResult) => {
                      const avatar = (userResult.full_name || userResult.email?.split('@')[0] || '?')
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
                      const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
                      const avatarColor = colors[(userResult.full_name || userResult.email || '?').charCodeAt(0) % colors.length];
                      
                      return (
                        <div
                          key={userResult.id}
                          onClick={() => handleCreateDM(userResult.id)}
                          className="px-4 py-3 flex items-center gap-3 hover:bg-[#f5f3eb] cursor-pointer transition-colors"
                        >
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm"
                            style={{ 
                              fontFamily: 'Arial, sans-serif',
                              fontWeight: 600,
                              backgroundColor: avatarColor
                            }}
                          >
                            {avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p 
                              className="text-sm truncate"
                              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500, color: '#3d3d3a' }}
                            >
                              {userResult.full_name || userResult.email?.split('@')[0] || 'Unknown'}
                            </p>
                            {userResult.full_name && (
                              <p 
                                className="text-xs truncate"
                                style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                              >
                                {userResult.email}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              <div className="px-4 pb-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>Loading...</p>
                  </div>
                ) : (
                  <>
                    {/* DMs Section */}
                    <div className="mb-4">
                      <div className="mb-2">
                        <h2 
                          className="text-sm font-semibold"
                          style={{ fontFamily: 'Lora, serif', color: '#3d3d3a' }}
                        >
                          DMs
                        </h2>
                      </div>
                      <div className="space-y-2">
                        {dms.length === 0 ? (
                          <p className="text-sm text-center py-4" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                            No direct messages
                          </p>
                        ) : (
                          dms.map((conv) => (
                            <ConversationItem
                              key={conv.id}
                              conv={conv}
                              onClick={() => setSelectedConversation(conv.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Groups Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h2 
                          className="text-sm font-semibold"
                          style={{ fontFamily: 'Lora, serif', color: '#3d3d3a' }}
                        >
                          Groups
                        </h2>
                        <button
                          type="button"
                          className="w-6 h-6 rounded-full bg-[#d47455] flex items-center justify-center"
                          onClick={() => setShowNewGroup(true)}
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {groups.length === 0 ? (
                          <p className="text-sm text-center py-4" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                            No group chats
                          </p>
                        ) : (
                          groups.map((conv) => (
                            <ConversationItem
                              key={conv.id}
                              conv={conv}
                              onClick={() => setSelectedConversation(conv.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Chat View */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-white border-b border-[#e7ded1] px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="w-8 h-8 flex items-center justify-center -ml-2"
                >
                  <ChevronLeft className="w-6 h-6 text-[#3d3d3a]" />
                </button>
                {selectedConv?.avatarUrl ? (
                  <img
                    src={selectedConv.avatarUrl}
                    alt={selectedConv.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 600,
                    backgroundColor: selectedConv?.type === 'course' ? '#d47455' : selectedConv?.avatarColor || '#7b7b74',
                    display: selectedConv?.avatarUrl ? 'none' : 'flex'
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
                {selectedConv?.type === 'group' && isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenEditMembers}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f3eb] transition-colors"
                      aria-label="Edit members"
                    >
                      <Settings className="w-5 h-5 text-[#3d3d3a]" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f3eb] transition-colors"
                      aria-label="Delete group"
                    >
                      <Trash2 className="w-5 h-5 text-[#d47455]" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-4 space-y-1">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>No messages yet</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwnMessage = msg.sender_id === user?.id;
                  const senderName = msg.sender?.full_name || msg.sender?.email?.split('@')[0] || 'Unknown';
                  const senderAvatar = (senderName || '?')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
                  const avatarColor = colors[senderName.charCodeAt(0) % colors.length];
                  const senderAvatarUrl = msg.sender?.avatar_url && msg.sender.avatar_url.trim() !== '' 
                    ? msg.sender.avatar_url 
                    : null;
                  
                  // Check if previous message is from same sender and within 2 minutes
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                  
                  const isFirstInGroup = !isOwnMessage && (
                    !prevMsg || 
                    prevMsg.sender_id !== msg.sender_id || 
                    new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 120000
                  );
                  
                  const isLastInGroup = !isOwnMessage && (
                    !nextMsg || 
                    nextMsg.sender_id !== msg.sender_id || 
                    new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 120000
                  );
                  
                  const showAvatarOnLeft = !isOwnMessage && isLastInGroup && !isFirstInGroup;
                  const showAvatarOnTop = !isOwnMessage && isFirstInGroup && isLastInGroup; // Only show on top if it's also the last (single message)
                  const showOwnTimestamp = isOwnMessage && (
                    !nextMsg ||
                    nextMsg.sender_id !== user?.id ||
                    new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 120000
                  );
                  const showNameAndTime = (!isOwnMessage && isFirstInGroup) || showOwnTimestamp;
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex items-end gap-2 w-full ${isOwnMessage ? 'justify-end' : ''}`}
                    >
                      {showAvatarOnTop && (
                        <>
                          {senderAvatarUrl ? (
                            <img
                              src={senderAvatarUrl}
                              alt={senderName}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-1"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs mb-1"
                            style={{ 
                              fontFamily: 'Arial, sans-serif',
                              fontWeight: 600,
                              backgroundColor: avatarColor,
                              display: senderAvatarUrl ? 'none' : 'flex'
                            }}
                          >
                            {senderAvatar}
                          </div>
                        </>
                      )}
                      {showAvatarOnLeft && (
                        <>
                          {senderAvatarUrl ? (
                            <img
                              src={senderAvatarUrl}
                              alt={senderName}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-1"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs mb-1"
                            style={{ 
                              fontFamily: 'Arial, sans-serif',
                              fontWeight: 600,
                              backgroundColor: avatarColor,
                              display: senderAvatarUrl ? 'none' : 'flex'
                            }}
                          >
                            {senderAvatar}
                          </div>
                        </>
                      )}
                      {!showAvatarOnTop && !showAvatarOnLeft && !isOwnMessage && (
                        <div className="w-8 h-8 flex-shrink-0" />
                      )}
                      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} ${isOwnMessage ? 'max-w-[65%]' : 'max-w-[65%]'}`}>
                        {showNameAndTime && (
                          <div className={`flex w-full items-baseline gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                            {!isOwnMessage && (
                              <span 
                                className="text-xs"
                                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500, color: '#7b7b74' }}
                              >
                                {senderName}
                              </span>
                            )}
                            <span 
                              className="text-xs"
                              style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                            >
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        )}
                        {msg.message_type === 'image' && msg.attachments && msg.attachments.length > 0 ? (
                          <div className="flex flex-col">
                            <img 
                              src={msg.attachments[0].url} 
                              alt="Shared image"
                              className="max-w-full rounded-lg"
                              style={{ maxHeight: '400px', objectFit: 'contain' }}
                            />
                            <button
                              type="button"
                              aria-label="Download"
                              onClick={() => handleDownload(msg.attachments[0].url, msg.attachments[0].file_name)}
                              className="mt-2 flex items-center text-xs text-[#7b7b74] hover:text-[#3d3d3a] transition-colors"
                              style={{ fontFamily: 'Arial, sans-serif' }}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ) : msg.message_type === 'file' && msg.attachments && msg.attachments.length > 0 ? (
                          <div
                            className={`inline-block rounded-xl px-4 py-3 ${
                              isOwnMessage 
                                ? 'bg-[#d47455] text-white' 
                                : 'bg-white border border-[#e7ded1]'
                            }`}
                            style={{ fontFamily: 'Arial, sans-serif', minWidth: '200px' }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 ${isOwnMessage ? 'text-white' : 'text-[#7b7b74]'}`}>
                                <File className="w-7 h-7" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p 
                                  className="text-sm font-medium truncate mb-1"
                                  style={{ color: isOwnMessage ? '#ffffff' : '#3d3d3a' }}
                                >
                                  {msg.attachments[0].file_name}
                                </p>
                                {msg.attachments[0].file_size && (
                                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                                    <span
                                      style={{ color: isOwnMessage ? 'rgba(255,255,255,0.8)' : '#7b7b74' }}
                                    >
                                      {(msg.attachments[0].file_size / 1024).toFixed(1)} KB
                                    </span>
                                    <button
                                      type="button"
                                      aria-label="Download"
                                      onClick={() => handleDownload(msg.attachments[0].url, msg.attachments[0].file_name)}
                                      className={`inline-flex items-center px-2.5 py-1 rounded-lg transition-colors ${
                                        isOwnMessage 
                                          ? 'bg-white/20 hover:bg-white/30 text-white' 
                                          : 'bg-[#f5f3eb] hover:bg-[#e8e5dc] text-[#3d3d3a]'
                                      }`}
                                      style={{ fontFamily: 'Arial, sans-serif' }}
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`inline-block rounded-xl px-3 py-1.5 ${
                              isOwnMessage 
                                ? 'bg-[#d47455] text-white' 
                                : 'bg-white border border-[#e7ded1]'
                            }`}
                            style={{ fontFamily: 'Arial, sans-serif' }}
                          >
                            <p 
                              className="text-sm"
                              style={{ 
                                color: isOwnMessage ? '#ffffff' : '#3d3d3a', 
                                lineHeight: 1.5 
                              }}
                            >
                              {msg.content}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {pendingAttachments.length > 0 && (
              <div className="bg-white border-t border-[#e7ded1] px-4 py-3 flex-shrink-0">
                <div className="flex flex-wrap gap-3">
                  {pendingAttachments.map((att, idx) => (
                    <div
                      key={`${att.url}-${idx}`}
                      className="relative rounded-lg border border-[#e7ded1] bg-[#f9f7f2] p-2"
                      style={{ width: '140px' }}
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#d47455] text-white text-xs flex items-center justify-center shadow"
                        aria-label="Remove attachment"
                      >
                        ×
                      </button>
                      {att.type === 'image' ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-full h-24 object-cover rounded-md"
                        />
                      ) : (
                        <div className="flex items-start gap-2">
                          <File className="w-5 h-5 text-[#7b7b74] flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: '#3d3d3a' }}>
                              {att.name}
                            </p>
                            <p className="text-[11px]" style={{ color: '#7b7b74' }}>
                              {(att.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border-t border-[#e7ded1] p-4 flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="*/*"
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFileSelect}
                  className="w-10 h-10 rounded-full bg-[#f5f3eb] flex items-center justify-center hover:bg-[#e8e5dc] transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-[#3d3d3a]" />
                </button>
                <input
                  type="text"
                  placeholder="Message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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
          </div>
        )}
      </div>

      {/* Group Modal */}
      {showNewGroup && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeGroupModal}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg bg-white rounded-lg border border-[#e7ded1] p-6 shadow-lg z-[75]">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ fontFamily: 'Lora, serif', color: '#3d3d3a' }}
              >
                New Group Chat
              </h2>
              <button
                type="button"
                onClick={closeGroupModal}
                className="w-8 h-8 rounded-full bg-[#f5f3eb] flex items-center justify-center text-[#3d3d3a] hover:bg-[#e8e5dc]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <div className="space-y-2">
                <Input
                  placeholder="Search users by name or email"
                  value={newGroupSearchQuery}
                  onChange={(e) => setNewGroupSearchQuery(e.target.value)}
                />
                {newGroupSearchResults.length > 0 && (
                  <div className="max-h-48 overflow-auto border border-[#e7ded1] rounded-lg bg-white shadow-sm">
                    {newGroupSearchResults.map((u) => {
                    const avatar = (u.full_name || u.email?.split('@')[0] || '?')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
                    const avatarColor = colors[(u.full_name || u.email || '?').charCodeAt(0) % colors.length];
                      return (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => handleAddGroupMember(u)}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#f5f3eb] text-left"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                            style={{ backgroundColor: avatarColor, fontWeight: 600 }}
                          >
                            {avatar}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#3d3d3a] truncate">{u.full_name || u.email?.split('@')[0] || 'Unknown'}</p>
                            <p className="text-xs text-[#7b7b74] truncate">{u.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {selectedGroupMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedGroupMembers.map((m) => {
                    const avatar = (m.full_name || m.email?.split('@')[0] || '?')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
                    const avatarColor = colors[(m.full_name || m.email || '?').charCodeAt(0) % colors.length];
                    return (
                      <div key={m.id} className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f3eb] border border-[#e7ded1]">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px]"
                          style={{ backgroundColor: avatarColor, fontWeight: 600 }}
                        >
                          {avatar}
                        </div>
                        <span className="text-sm text-[#3d3d3a]">{m.full_name || m.email?.split('@')[0] || 'Unknown'}</span>
                        <button
                          type="button"
                          className="text-[#d47455] text-xs"
                          onClick={() => handleRemoveGroupMember(m.id)}
                          aria-label={`Remove ${m.full_name || m.email}`}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 justify-end items-center">
                <span
                  className={`text-xs ${!newGroupName.trim() || selectedGroupMembers.length < 2 ? 'text-[#d47455]' : 'text-transparent'}`}
                  style={{ minHeight: '16px' }}
                >
                  {!newGroupName.trim() || selectedGroupMembers.length < 2 ? 'Needs a name and 2+ members (3 incl. you)' : ''}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeGroupModal}
                  className="min-w-[96px] justify-center bg-[#f5f3eb] hover:bg-[#e8e5dc]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedGroupMembers.length < 2}
                  className="min-w-[120px] justify-center bg-[#d47455] hover:bg-[#c06545] text-white disabled:opacity-60 disabled:hover:bg-[#d47455]"
                  title={!newGroupName.trim() || selectedGroupMembers.length < 2 ? 'Add a name and at least 2 members (3 incl. you)' : undefined}
                >
                  Create Group
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Members Modal */}
      {showEditMembers && selectedConv && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseEditMembers}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg bg-white rounded-lg border border-[#e7ded1] p-6 shadow-lg z-[75] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ fontFamily: 'Lora, serif', color: '#3d3d3a' }}
              >
                Edit Group Members
              </h2>
              <button
                type="button"
                onClick={handleCloseEditMembers}
                className="w-8 h-8 rounded-full bg-[#f5f3eb] flex items-center justify-center text-[#3d3d3a] hover:bg-[#e8e5dc]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              {/* Current Members */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Lora, serif', color: '#3d3d3a' }}>
                  Current Members ({currentParticipants.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentParticipants.map((p) => {
                    const profile = p.profile;
                    const name = profile?.full_name || profile?.email?.split('@')[0] || 'Unknown';
                    const avatar = (name || '?')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
                    const avatarColor = colors[(name || '?').charCodeAt(0) % colors.length];
                    const isCurrentUser = p.user_id === user?.id;
                    const canRemove = isAdmin && (p.role === 'member' || (p.role === 'admin' && isCurrentUser));

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 bg-[#f5f3eb] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm"
                            style={{ backgroundColor: avatarColor, fontWeight: 600 }}
                          >
                            {avatar}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#3d3d3a' }}>
                              {name}
                              {p.role === 'admin' && (
                                <span className="ml-2 text-xs text-[#d47455]">(Admin)</span>
                              )}
                            </p>
                            {profile?.email && (
                              <p className="text-xs" style={{ color: '#7b7b74' }}>
                                {profile.email}
                              </p>
                            )}
                          </div>
                        </div>
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberFromGroup(p.user_id)}
                            className="text-[#d47455] hover:text-[#c06545] text-sm"
                            aria-label={`Remove ${name}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Members */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Lora, serif', color: '#3d3d3a' }}>
                  Add Members
                </h3>
                <Input
                  placeholder="Search users by name or email"
                  value={editMembersSearchQuery}
                  onChange={(e) => setEditMembersSearchQuery(e.target.value)}
                />
                {editMembersSearchResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-auto border border-[#e7ded1] rounded-lg bg-white shadow-sm">
                    {editMembersSearchResults.map((u) => {
                      const avatar = (u.full_name || u.email?.split('@')[0] || '?')
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
                      const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
                      const avatarColor = colors[(u.full_name || u.email || '?').charCodeAt(0) % colors.length];
                      return (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => handleAddMemberToGroup(u.id)}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#f5f3eb] text-left"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                            style={{ backgroundColor: avatarColor, fontWeight: 600 }}
                          >
                            {avatar}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#3d3d3a] truncate">
                              {u.full_name || u.email?.split('@')[0] || 'Unknown'}
                            </p>
                            <p className="text-xs text-[#7b7b74] truncate">{u.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md bg-white rounded-lg border border-[#e7ded1] p-6 shadow-lg z-[75]">
            <h2
              className="text-lg font-semibold mb-4"
              style={{ fontFamily: 'Lora, serif', color: '#3d3d3a' }}
            >
              Delete Group
            </h2>
            <p className="text-sm mb-6" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
              Are you sure you want to delete this group? This action cannot be undone. All messages and members will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="min-w-[96px] justify-center bg-[#f5f3eb] hover:bg-[#e8e5dc]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteGroup}
                className="min-w-[120px] justify-center bg-[#d47455] hover:bg-[#c06545] text-white"
              >
                Delete Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop View - Keep existing design */}
      <div className="hidden md:flex h-full">
        <div className="w-80 bg-white border-r border-[#e7ded1] flex flex-col">
          <div className="p-6 border-b border-[#e7ded1]">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-2xl"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Messages
              </h2>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-[#d47455] flex items-center justify-center"
                onClick={() => setShowNewGroup(true)}
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
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
                  {conv.avatarUrl ? (
                    <img
                      src={conv.avatarUrl}
                      alt={conv.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                    style={{ 
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 600,
                      backgroundColor: conv.type === 'course' ? '#d47455' : conv.avatarColor || '#7b7b74',
                      display: conv.avatarUrl ? 'none' : 'flex'
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

        <div className="flex-1 flex flex-col min-h-0">
          {selectedConv ? (
            <>
              <div className="bg-white border-b border-[#e7ded1] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
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
                  {selectedConv.type === 'group' && isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenEditMembers}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f5f3eb] transition-colors"
                        aria-label="Edit members"
                      >
                        <Settings className="w-5 h-5 text-[#3d3d3a]" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f5f3eb] transition-colors"
                        aria-label="Delete group"
                      >
                        <Trash2 className="w-5 h-5 text-[#d47455]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-6 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    const senderName = msg.sender?.full_name || msg.sender?.email?.split('@')[0] || 'Unknown';
                    const senderAvatar = (senderName || '?')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
                    const avatarColor = colors[senderName.charCodeAt(0) % colors.length];
                    const senderAvatarUrl = msg.sender?.avatar_url && msg.sender.avatar_url.trim() !== '' 
                      ? msg.sender.avatar_url 
                      : null;
                    
                    // Check if previous message is from same sender and within 2 minutes
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                    
                    const isFirstInGroup = !isOwnMessage && (
                      !prevMsg || 
                      prevMsg.sender_id !== msg.sender_id || 
                      new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 120000
                    );
                    
                    const isLastInGroup = !isOwnMessage && (
                      !nextMsg || 
                      nextMsg.sender_id !== msg.sender_id || 
                      new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 120000
                    );
                    
                    const showAvatarOnLeft = !isOwnMessage && isLastInGroup && !isFirstInGroup;
                    const showAvatarOnTop = !isOwnMessage && isFirstInGroup && isLastInGroup; // Only show on top if it's also the last (single message)
                    const showOwnTimestamp = isOwnMessage && (
                      !nextMsg ||
                      nextMsg.sender_id !== user?.id ||
                      new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 120000
                    );
                    const showNameAndTime = (!isOwnMessage && isFirstInGroup) || showOwnTimestamp; // show time for own msg if not grouped with next within 2 min
                    
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex items-end gap-2 w-full ${isOwnMessage ? 'justify-end' : ''}`}
                      >
                        {showAvatarOnTop && (
                          <>
                            {senderAvatarUrl ? (
                              <img
                                src={senderAvatarUrl}
                                alt={senderName}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 mb-1"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white mb-1"
                              style={{ 
                                fontFamily: 'Arial, sans-serif',
                                fontWeight: 600,
                                backgroundColor: avatarColor,
                                display: senderAvatarUrl ? 'none' : 'flex'
                              }}
                            >
                              {senderAvatar}
                            </div>
                          </>
                        )}
                        {showAvatarOnLeft && (
                          <>
                            {senderAvatarUrl ? (
                              <img
                                src={senderAvatarUrl}
                                alt={senderName}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 mb-1"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white mb-1"
                              style={{ 
                                fontFamily: 'Arial, sans-serif',
                                fontWeight: 600,
                                backgroundColor: avatarColor,
                                display: senderAvatarUrl ? 'none' : 'flex'
                              }}
                            >
                              {senderAvatar}
                            </div>
                          </>
                        )}
                        {!showAvatarOnTop && !showAvatarOnLeft && !isOwnMessage && (
                          <div className="w-10 h-10 flex-shrink-0" />
                        )}
                        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} ${isOwnMessage ? 'max-w-[65%]' : 'max-w-[65%]'}`}>
                          {showNameAndTime && (
                            <div className={`flex w-full items-baseline gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                              {!isOwnMessage && (
                                <span 
                                  className="text-xs"
                                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500, color: '#7b7b74' }}
                                >
                                  {senderName}
                                </span>
                              )}
                              <span 
                                className="text-xs"
                                style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                              >
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                          )}
                          {msg.message_type === 'image' && msg.attachments && msg.attachments.length > 0 ? (
                            <div className="flex flex-col">
                              <img 
                                src={msg.attachments[0].url} 
                                alt="Shared image"
                                className="max-w-full rounded-lg"
                                style={{ maxHeight: '400px', objectFit: 'contain' }}
                              />
                              <button
                                type="button"
                                aria-label="Download"
                                onClick={() => handleDownload(msg.attachments[0].url, msg.attachments[0].file_name)}
                                className="mt-2 flex items-center text-xs text-[#7b7b74] hover:text-[#3d3d3a] transition-colors"
                                style={{ fontFamily: 'Arial, sans-serif' }}
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ) : msg.message_type === 'file' && msg.attachments && msg.attachments.length > 0 ? (
                            <div
                              className={`inline-block rounded-xl px-4 py-3 ${
                                isOwnMessage 
                                  ? 'bg-[#d47455] text-white' 
                                  : 'bg-white border border-[#e7ded1]'
                              }`}
                              style={{ fontFamily: 'Arial, sans-serif', minWidth: '200px' }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 ${isOwnMessage ? 'text-white' : 'text-[#7b7b74]'}`}>
                                  <File className="w-7 h-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p 
                                    className="text-sm font-medium truncate mb-1"
                                    style={{ color: isOwnMessage ? '#ffffff' : '#3d3d3a' }}
                                  >
                                    {msg.attachments[0].file_name}
                                  </p>
                                  {msg.attachments[0].file_size && (
                                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                                      <span 
                                        style={{ color: isOwnMessage ? 'rgba(255,255,255,0.8)' : '#7b7b74' }}
                                      >
                                        {(msg.attachments[0].file_size / 1024).toFixed(1)} KB
                                      </span>
                                  <button
                                    type="button"
                                    aria-label="Download"
                                    onClick={() => handleDownload(msg.attachments[0].url, msg.attachments[0].file_name)}
                                    className={`inline-flex items-center px-2.5 py-1 rounded-lg transition-colors ${
                                      isOwnMessage 
                                        ? 'bg-white/20 hover:bg-white/30 text-white' 
                                        : 'bg-[#f5f3eb] hover:bg-[#e8e5dc] text-[#3d3d3a]'
                                    }`}
                                    style={{ fontFamily: 'Arial, sans-serif' }}
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`inline-block rounded-xl px-3 py-1.5 ${
                                isOwnMessage 
                                  ? 'bg-[#d47455] text-white' 
                                  : 'bg-white border border-[#e7ded1]'
                              }`}
                              style={{ fontFamily: 'Arial, sans-serif' }}
                            >
                              <p 
                                className="text-sm"
                                style={{ 
                                  color: isOwnMessage ? '#ffffff' : '#3d3d3a', 
                                  lineHeight: 1.5 
                                }}
                              >
                                {msg.content}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {pendingAttachments.length > 0 && (
                <div className="bg-white border-t border-[#e7ded1] px-6 py-4">
                  <div className="flex flex-wrap gap-3">
                    {pendingAttachments.map((att, idx) => (
                      <div
                        key={`${att.url}-${idx}`}
                        className="relative rounded-lg border border-[#e7ded1] bg-[#f9f7f2] p-2"
                        style={{ width: '160px' }}
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#d47455] text-white text-xs flex items-center justify-center shadow"
                          aria-label="Remove attachment"
                        >
                          ×
                        </button>
                        {att.type === 'image' ? (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-28 object-cover rounded-md"
                          />
                        ) : (
                          <div className="flex items-start gap-2">
                            <File className="w-5 h-5 text-[#7b7b74] flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: '#3d3d3a' }}>
                                {att.name}
                              </p>
                              <p className="text-[11px]" style={{ color: '#7b7b74' }}>
                                {(att.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border-t border-[#e7ded1] p-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="*/*"
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleFileSelect}
                    className="w-10 h-10 rounded-full bg-[#f5f3eb] flex items-center justify-center hover:bg-[#e8e5dc] transition-colors"
                  >
                    <Paperclip className="w-5 h-5 text-[#3d3d3a]" />
                  </button>
                  <input
                    type="text"
                    placeholder="Message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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
