import { UserPlus, MessageCircle, Users as UsersIcon, ChevronLeft, ChevronDown, MoreVertical, X, Globe, Lock, Users, FileText, Image, Trash2, Search, Check, Plus, Pencil, Upload, MinusCircle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SquadsService, Squad, SquadMember, SquadDocument } from '../services/squadsService';
import { MessagingService } from '../services/messagingService';
import { useAuth } from '../contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from './ui/sheet';
import { toast } from 'sonner';
import { HomeFeed } from './HomeFeed';
import { SwipeBackContainer } from './ui/SwipeBackContainer';
import { useIsMobile } from './ui/use-mobile';

type InviteSearchResult = { id: string; email: string; full_name: string | null };

/** Footer (bottom nav) color – squad header matches this when viewing a squad */
const SQUAD_HEADER_FOOTER_COLOR = '#fbf8f7';

interface SquadDetailPageProps {
  squadId: string;
  onBack: () => void;
  onOpenChat: (conversationId?: string) => void;
  /** Restore this post in the squad feed when returning to the page. */
  initialFeedPostId?: string | null;
  /** Called when user opens or closes a post in the squad feed. */
  onFeedPostChange?: (postId: string | null) => void;
  /** Current user's avatar URL (for reply form in squad feed). */
  userAvatarUrl?: string | null;
  /** Current user's display name (for reply form in squad feed). */
  publicName?: string;
}

export function SquadDetailPage({ squadId, onBack, onOpenChat, initialFeedPostId, onFeedPostChange, userAvatarUrl: propsUserAvatarUrl, publicName: propsPublicName }: SquadDetailPageProps) {
  const { user } = useAuth();
  const headerColor = SQUAD_HEADER_FOOTER_COLOR;
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [documents, setDocuments] = useState<SquadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveSheet, setShowLeaveSheet] = useState(false);
  const [docToDelete, setDocToDelete] = useState<SquadDocument | null>(null);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteSelectedIds, setInviteSelectedIds] = useState<string[]>([]);
  const [inviteSelectedDetails, setInviteSelectedDetails] = useState<InviteSearchResult[]>([]);
  const [inviteSearchResults, setInviteSearchResults] = useState<InviteSearchResult[]>([]);
  const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
  const [inviteAdding, setInviteAdding] = useState(false);
  const [isEditingSquad, setIsEditingSquad] = useState(false);
  const [editName, setEditName] = useState('');
  const [editInfo, setEditInfo] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState<'open' | 'private'>('open');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [savingSquad, setSavingSquad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [addDocumentFile, setAddDocumentFile] = useState<File | null>(null);
  const [addDocumentName, setAddDocumentName] = useState('');
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [squadFeedNewPostOpen, setSquadFeedNewPostOpen] = useState(false);
  const [squadFeedRefreshKey, setSquadFeedRefreshKey] = useState(0);
  const [postDetailOpen, setPostDetailOpen] = useState(false);
  const [introInViewMobile, setIntroInViewMobile] = useState(true);
  const [introInViewDesktop, setIntroInViewDesktop] = useState(true);
  const introRef = useRef<HTMLDivElement>(null);
  const introRefDesktop = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRefDesktop = useRef<HTMLDivElement>(null);
  const closePostRef = useRef<() => void>(() => {});
  const isMobile = useIsMobile();
  const introInView = isMobile ? introInViewMobile : introInViewDesktop;

  const loadSquadData = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading !== false;
    try {
      setLoadError(false);
      if (showLoading) setLoading(true);
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
      setLoadError(true);
      setSquad(null);
      setMembers([]);
      setDocuments([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    loadSquadData();
  }, [loadSquadData]);

  useEffect(() => {
    const mobileEl = introRef.current;
    const mobileRoot = scrollContainerRef.current;
    if (!mobileEl || !mobileRoot) return;
    const observerMobile = new IntersectionObserver(
      ([entry]) => setIntroInViewMobile(entry.isIntersecting),
      { threshold: 0, root: mobileRoot, rootMargin: '0px' }
    );
    observerMobile.observe(mobileEl);
    return () => observerMobile.disconnect();
  }, [squad]);

  useEffect(() => {
    const desktopEl = introRefDesktop.current;
    const desktopRoot = scrollContainerRefDesktop.current;
    if (!desktopEl || !desktopRoot) return;
    const observerDesktop = new IntersectionObserver(
      ([entry]) => setIntroInViewDesktop(entry.isIntersecting),
      { threshold: 0, root: desktopRoot, rootMargin: '0px' }
    );
    observerDesktop.observe(desktopEl);
    return () => observerDesktop.disconnect();
  }, [squad]);

  // When opening a post, reset scroll so the top of the post is visible
  useEffect(() => {
    if (!postDetailOpen) return;
    scrollContainerRef.current?.scrollTo({ top: 0 });
    scrollContainerRefDesktop.current?.scrollTo({ top: 0 });
  }, [postDetailOpen]);

  const handleJoinSquad = async () => {
    try {
      setJoining(true);
      await SquadsService.joinSquad(squadId);
      await loadSquadData({ showLoading: false });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (/already a member/i.test(msg)) {
        await loadSquadData({ showLoading: false });
        return;
      }
      console.error('Error joining squad:', error);
      toast.error(msg || 'Error joining squad. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveSquad = () => {
    setShowInfoMenu(false);
    setShowLeaveSheet(true);
  };

  const confirmLeaveSquad = async () => {
    try {
      setLeaving(true);
      await SquadsService.leaveSquad(squadId);
      onBack();
    } catch (error) {
      console.error('Error leaving squad:', error);
      const msg = error instanceof Error ? error.message : (error as { message?: string }).message ?? '';
      toast.error(msg || 'Error leaving squad. Please try again.');
    } finally {
      setLeaving(false);
    }
  };

  const handleDeleteSquad = async () => {
    try {
      setDeleting(true);
      await SquadsService.deleteSquad(squadId);
      // Navigate back after deletion
      onBack();
    } catch (error) {
      console.error('Error deleting squad:', error);
      toast.error('Error deleting squad. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenChat = () => {
    if (squad?.conversation_id) {
      onOpenChat(squad.conversation_id);
    } else {
      onOpenChat();
    }
  };

  const SQUAD_CATEGORIES = [
    { id: 'sports', label: 'Sports' },
    { id: 'social', label: 'Social' },
    { id: 'academic', label: 'Academic' },
    { id: 'hobbies', label: 'Hobbies' },
  ] as const;

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'sports': '#7ba05b',
      'social': '#d47455',
      'academic': '#7b9fb8',
      'hobbies': '#c89b6e',
    };
    return colors[category] || '#787771';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'sports': 'Sports',
      'social': 'Social',
      'academic': 'Academic',
      'hobbies': 'Hobbies',
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

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (bytes == null || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadDocument = async (e: React.MouseEvent, doc: SquadDocument) => {
    const url = doc.file_url?.trim();
    if (!url) return;
    e.preventDefault();
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.name || 'document';
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const existingMemberIds = new Set(members.map((m) => m.user_id));
  useEffect(() => {
    if (!inviteSearch.trim()) {
      setInviteSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setInviteSearchLoading(true);
      const { data } = await MessagingService.searchUsers(inviteSearch.trim());
      setInviteSearchLoading(false);
      if (!data) {
        setInviteSearchResults([]);
        return;
      }
      const filtered = data.filter((u) => u.id !== user?.id && !existingMemberIds.has(u.id));
      setInviteSearchResults(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteSearch, user?.id, members.length]);

  const toggleInviteMember = (person: InviteSearchResult) => {
    const id = person.id;
    setInviteSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setInviteSelectedDetails((prev) =>
      prev.some((p) => p.id === id) ? prev.filter((p) => p.id !== id) : [...prev, person]
    );
  };
  const inviteSelectedSet = new Set(inviteSelectedIds);
  const inviteSearchOnly = inviteSearchResults.filter(
    (p) => !inviteSelectedSet.has(p.id) && !existingMemberIds.has(p.id)
  );
  const inviteDisplayList = [...inviteSelectedDetails, ...inviteSearchOnly];

  const handleAddMembers = async () => {
    if (!squad || !inviteSelectedIds.length || inviteAdding) return;
    try {
      setInviteAdding(true);
      await SquadsService.addSquadMembers(squad.id, inviteSelectedIds);
      setInviteSelectedIds([]);
      setInviteSelectedDetails([]);
      setInviteSearch('');
      setInviteSearchResults([]);
      await loadSquadData({ showLoading: false });
    } catch (e) {
      console.error('Error adding members:', e);
      toast.error('Could not add members. Please try again.');
    } finally {
      setInviteAdding(false);
    }
  };

  const startEditingSquad = () => {
    if (!squad) return;
    setEditName(squad.name);
    setEditInfo(squad.info || '');
    setEditCategory(squad.category);
    setEditType(squad.type);
    setEditAvatarFile(null);
    setIsEditingSquad(true);
  };

  const cancelEditingSquad = () => {
    setEditAvatarPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setEditAvatarFile(null);
    setIsEditingSquad(false);
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setEditAvatarPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    });
    setEditAvatarFile(file && file.type.startsWith('image/') ? file : null);
  };

  const handleSaveSquadEdit = async () => {
    if (!squad || savingSquad) return;
    const name = editName.trim();
    if (!name) {
      toast.error('Squad name is required.');
      return;
    }
    if (!SQUAD_CATEGORIES.some((c) => c.id === editCategory)) {
      toast.error('Please select a valid category.');
      return;
    }
    try {
      setSavingSquad(true);
      let avatarUrl: string | null = squad.avatar_url ?? null;
      if (editAvatarFile) {
        avatarUrl = await SquadsService.uploadSquadAvatar(squad.id, editAvatarFile);
      }
      await SquadsService.updateSquad(squad.id, {
        name,
        info: editInfo.trim() || null,
        category: editCategory,
        type: editType,
        avatar_url: avatarUrl,
      });
      await loadSquadData({ showLoading: false });
      setEditAvatarPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setEditAvatarFile(null);
      setIsEditingSquad(false);
    } catch (e) {
      console.error('Error updating squad:', e);
      toast.error('Could not update squad. Please try again.');
    } finally {
      setSavingSquad(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setAddDocumentFile(files[0]);
    // Do not auto-fill document name from file name; user enters the display name
    e.target.value = '';
  };

  const openAddDocumentModal = () => {
    setAddDocumentFile(null);
    setAddDocumentName('');
    setShowAddDocumentModal(true);
  };

  const closeAddDocumentModal = () => {
    setShowAddDocumentModal(false);
    setAddDocumentFile(null);
    setAddDocumentName('');
  };

  const handleAddDocumentSubmit = async () => {
    if (!squad || !addDocumentFile || !addDocumentName.trim() || uploadingDocs) return;
    try {
      setUploadingDocs(true);
      await SquadsService.uploadAndAddSquadDocument(squad.id, addDocumentFile, addDocumentName.trim());
      await loadSquadData({ showLoading: false });
      closeAddDocumentModal();
    } catch (err) {
      console.error('Error uploading document:', err);
      toast.error('Could not add document. Only squad admins can add documents.');
    } finally {
      setUploadingDocs(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] h-full flex items-center justify-center bg-[#FBF9F5] pt-[18vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
      </div>
    );
  }

  if (loadError && !squad) {
    return (
      <SwipeBackContainer onBack={onBack} className="min-h-[60vh] h-full flex flex-col items-center justify-center bg-[#FBF9F5] pt-[18vh] px-4 gap-4">
        <p className="text-[#27251f] text-center" >
          Could not load squad. It may have been deleted or you may not have access.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-full bg-[#d47455] text-white text-xs hover:bg-[#c06545]"
          style={{ fontWeight: 600 }}
        >
          Go back
        </button>
      </SwipeBackContainer>
    );
  }

  if (!squad) {
    return (
      <div className="min-h-[60vh] h-full flex items-center justify-center bg-[#FBF9F5] pt-[18vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
      </div>
    );
  }

  const isJoined = members.some((m) => m.user_id === user?.id);
  const isCreator = user?.id === squad.created_by;
  const isAdmin = members.find((m) => m.user_id === user?.id)?.role === 'admin';
  const adminCount = members.filter((m) => m.role === 'admin').length;
  const squadColor = getCategoryColor(squad.category);
  const PrivacyIcon = squad.type === 'open' ? Globe : Lock;
  const privacyLabel = squad.type === 'open' ? 'Public' : 'Private';

  const handleRemoveMember = async (userId: string) => {
    if (!squad || removingMemberId) return;
    try {
      setRemovingMemberId(userId);
      await SquadsService.removeSquadMember(squad.id, userId);
      await loadSquadData({ showLoading: false });
    } catch (e) {
      console.error('Error removing member:', e);
      toast.error('Could not remove member. Only squad admins can remove members.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const canRemoveMember = (member: SquadMember) =>
    !!isAdmin &&
    member.user_id !== user?.id &&
    (member.role !== 'admin' || adminCount > 1);

  const handleDeleteDocument = (doc: SquadDocument) => {
    if (!squad || deletingDocumentId) return;
    setDocToDelete(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!squad || !docToDelete) return;
    setDocToDelete(null);
    try {
      setDeletingDocumentId(docToDelete.id);
      await SquadsService.deleteSquadDocument(squad.id, docToDelete.id);
      await loadSquadData({ showLoading: false });
    } catch (e) {
      console.error('Error deleting document:', e);
      toast.error('Could not delete document. Only squad admins can delete documents.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  return (
    <SwipeBackContainer onBack={onBack} className="h-full overflow-hidden flex flex-col bg-[#FBF9F5]">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="*/*"
        onChange={handleFileSelect}
      />
      <Sheet open={showAddDocumentModal} onOpenChange={(open) => { if (!open) closeAddDocumentModal(); }}>
        <SheetContent side="bottom" className="bg-[#FBF9F5] border-[#e7ded1] border-t max-w-sm mx-auto p-0 gap-0">
          <SheetHeader className="p-6 pb-4 border-b border-[#e7ded1]">
            <SheetTitle className="text-[#27251f]" >Add document</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 p-6">
            <div>
              <label className="text-sm font-medium text-[#27251f] block mb-1.5">Document name</label>
              <input
                type="text"
                value={addDocumentName}
                onChange={(e) => setAddDocumentName(e.target.value)}
                placeholder="e.g. Syllabus 2024"
                className="w-full px-3 py-2 rounded-xl border-2 border-[#e7ded1] bg-white text-[#27251f] placeholder:text-[#787771] focus:outline-none focus:border-[#d47455]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#27251f] block mb-1.5">File</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-dashed border-[#e7ded1] bg-white text-[#787771] flex items-center justify-center gap-2 hover:border-[#d47455] hover:text-[#27251f] transition-colors"
              >
                <Upload className="w-4 h-4" />
                {addDocumentFile ? addDocumentFile.name : 'Choose file'}
              </button>
            </div>
          </div>
          <SheetFooter className="flex-row gap-2 p-6 pt-4 border-t border-[#e7ded1]">
            <button
              type="button"
              onClick={closeAddDocumentModal}
              className="px-3 py-1.5 rounded-full border border-[#d9d2c5] text-[#787771] text-xs hover:bg-[#f5f3eb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddDocumentSubmit}
              disabled={!addDocumentFile || !addDocumentName.trim() || uploadingDocs}
              className="px-3 py-1.5 rounded-full bg-[#d47455] text-white text-xs hover:bg-[#c06545] disabled:opacity-50 disabled:pointer-events-none"
            >
              {uploadingDocs ? 'Adding…' : 'Add'}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {/* Mobile View */}
      <div className="md:hidden h-full flex flex-col">
        {/* Mobile Header - hidden when viewing a post; post detail view shows its own header */}
        {!postDetailOpen && (
        <div className="border-b border-black/10 px-4 py-2.5 flex-shrink-0 flex items-center gap-2" style={{ backgroundColor: headerColor }}>
          <button
            onClick={postDetailOpen ? () => closePostRef.current() : onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/10 text-[#27251f] shrink-0 active:scale-95 transition-transform hover:bg-black/15"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 
              className={`text-lg truncate transition-opacity duration-300 text-[#27251f] ${postDetailOpen || !introInView ? 'opacity-100' : 'opacity-0'}`}
              style={{ fontWeight: 600, ...(!postDetailOpen && introInView && { pointerEvents: 'none' as const }) }}
            >
              {postDetailOpen ? 'Post' : squad.name}
            </h1>
            {!postDetailOpen && (
              <p 
                className={`text-xs text-[#787771] truncate transition-opacity duration-300 ${!introInView ? 'opacity-100' : 'opacity-0'}`}
                style={introInView ? { pointerEvents: 'none' as const } : undefined}
              >
                {squad.member_count || 0} members
              </p>
            )}
          </div>
          {!postDetailOpen && (
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <div className="relative w-14 h-8 flex items-center justify-end">
              {isJoined && !isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowLeaveSheet(true)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-full bg-[#e7ded1] text-[#787771] text-xs border border-[#d9d2c5] transition-opacity duration-300 active:scale-95 ${introInView ? 'opacity-0' : 'opacity-100'}`}
                  style={{ fontWeight: 600 }}
                  aria-label="Joined"
                >
                  Joined
                </button>
              ) : !isCreator && (
                <button
                  onClick={handleJoinSquad}
                  disabled={joining}
                  className={`absolute right-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#d47455] text-white text-xs transition-opacity duration-300 ${introInView ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  style={{ fontWeight: 600 }}
                  aria-label="Join squad"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {joining ? '…' : 'Join'}
                </button>
              )}
            </div>
            {(isJoined || isCreator) && (
              <>
                <button
                  type="button"
                  onClick={() => setSquadFeedNewPostOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/10 text-[#27251f] active:scale-95 transition-transform hover:bg-black/15 disabled:opacity-50"
                  aria-label="New post"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={handleOpenChat}
                  disabled={!squad.conversation_id}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/10 text-[#27251f] active:scale-95 transition-transform hover:bg-black/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Chat"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowInfoMenu(true)}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-[#27251f] transition-opacity duration-300 ${!introInView && !isJoined && !isCreator ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              aria-label="Squad info"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          )}
        </div>
        )}

        {/* Info Menu Overlay */}
        {showInfoMenu && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowInfoMenu(false)}
          />
        )}

        {/* Info Menu Bottom Sheet */}
        <div 
          className={`fixed inset-x-0 bottom-0 top-0 z-50 bg-white transition-transform duration-300 ease-out ${
            showInfoMenu ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ height: '100dvh' }}
        >
          <div className="flex flex-col h-full min-h-0">
            {/* Menu Header */}
            <div className="bg-white border-b border-[#e7ded1] px-4 py-4 flex items-center justify-between flex-shrink-0">
              <h2 
                className="text-lg"
                style={{ fontWeight: 600, color: '#27251f' }}
              >
                Squad Info
              </h2>
              <button
                onClick={() => setShowInfoMenu(false)}
                className="w-8 h-8 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#27251f]" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[max(2.5rem,env(safe-area-inset-bottom))]">
            {/* About Section */}
            <div className="px-4 py-4 border-b border-[#e7ded1]">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
                aria-hidden
              />
              <div className="flex items-center justify-between mb-3">
                <h3 
                  className="text-base"
                  style={{ fontWeight: 600, color: '#27251f' }}
                >
                  About
                </h3>
                {isAdmin && !isEditingSquad && (
                  <button
                    type="button"
                    onClick={startEditingSquad}
                    className="flex items-center gap-1.5 text-sm text-[#d47455] hover:text-[#c06545]"
                    style={{ fontWeight: 600 }}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>
              {/* Squad avatar: show in view mode; in edit mode show + Change photo */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden bg-[#f5f3eb] shrink-0"
                  style={{ backgroundColor: squadColor + '20' }}
                >
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : squad.avatar_url ? (
                    <img src={squad.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold" style={{ color: squadColor }}>{squad.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {isEditingSquad && (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-sm text-[#d47455] hover:text-[#c06545]"
                    style={{ fontWeight: 600 }}
                  >
                    Change photo
                  </button>
                )}
              </div>
              {isEditingSquad ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#787771] block mb-1" >Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e7ded1] text-sm focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                      style={{ color: '#27251f' }}
                      placeholder="Squad name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#787771] block mb-1" >Description</label>
                    <textarea
                      value={editInfo}
                      onChange={(e) => setEditInfo(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-[#e7ded1] text-sm focus:outline-none focus:ring-2 focus:ring-[#d47455] resize-none"
                      style={{ color: '#27251f' }}
                      placeholder="Description"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#787771] block mb-1" >Category</label>
                    <div className="flex flex-wrap gap-2">
                      {SQUAD_CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditCategory(c.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${editCategory === c.id ? 'bg-[#d47455] text-white' : 'bg-[#f5f3eb] text-[#27251f]'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#787771] block mb-1" >Privacy</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditType('open')}
                        className={`flex-1 py-1.5 px-3 rounded-full border-2 text-xs font-medium flex items-center justify-center gap-2 ${editType === 'open' ? 'border-[#d47455] bg-[#d4745510] text-[#27251f]' : 'border-[#e7ded1] bg-white text-[#787771]'}`}
                      >
                        <Globe className="w-4 h-4" />
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditType('private')}
                        className={`flex-1 py-1.5 px-3 rounded-full border-2 text-xs font-medium flex items-center justify-center gap-2 ${editType === 'private' ? 'border-[#d47455] bg-[#d4745510] text-[#27251f]' : 'border-[#e7ded1] bg-white text-[#787771]'}`}
                      >
                        <Lock className="w-4 h-4" />
                        Private
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={cancelEditingSquad}
                      className="flex-1 py-1.5 px-3 rounded-full border border-[#e7ded1] text-[#787771] text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSquadEdit}
                      disabled={savingSquad}
                      className="flex-1 py-1.5 px-3 rounded-full bg-[#d47455] text-white text-xs font-medium disabled:opacity-50"
                    >
                      {savingSquad ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p 
                    className="text-sm mb-4"
                    style={{ color: '#27251f', lineHeight: 1.5 }}
                  >
                    {squad.info || 'No description available'}
                  </p>
                  <div className="space-y-2.5 text-sm" >
                    <div className="flex justify-between">
                      <span className="text-[#787771]">Category:</span>
                      <span className="text-[#27251f]">{getCategoryLabel(squad.category)}</span>
                    </div>
                    {squad.meeting_times && (
                      <div className="flex justify-between">
                        <span className="text-[#787771]">Meetings:</span>
                        <span className="text-[#27251f] text-right">{squad.meeting_times}</span>
                      </div>
                    )}
                    {squad.location && (
                      <div className="flex justify-between">
                        <span className="text-[#787771]">Location:</span>
                        <span className="text-[#27251f]">{squad.location}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#787771]">Privacy:</span>
                      <div className="flex items-center gap-1">
                        <PrivacyIcon className="w-3 h-3 text-[#787771]" />
                        <span className="text-[#27251f]">{privacyLabel}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Documents Section */}
            <div className="px-4 py-4 border-b border-[#e7ded1]">
              <div className="flex items-center justify-between mb-3">
                <h3 
                  className="text-base"
                  style={{ fontWeight: 600, color: '#27251f' }}
                >
                  Documents ({documents.length})
                </h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openAddDocumentModal}
                    disabled={uploadingDocs}
                    className="w-8 h-8 rounded-full bg-[#d47455] text-white flex items-center justify-center hover:bg-[#c06545] active:scale-95 disabled:opacity-50"
                    aria-label="Add document"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-sm text-[#787771]" >
                    No documents yet
                  </p>
                ) : (
                  documents.map(doc => (
                    <div
                      key={doc.id}
                      className="bg-[#FBF9F5] rounded-xl p-3 active:bg-[#f5f3eb] transition-colors flex items-center gap-3"
                    >
                      <a
                        href={doc.file_url || '#'}
                        onClick={(e) => handleDownloadDocument(e, doc)}
                        className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer no-underline"
                      >
                        <div className="w-10 h-10 bg-[#f0eee6] rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-[#787771]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 
                            className="text-sm mb-0.5 break-words"
                            style={{ fontWeight: 600, color: '#27251f' }}
                          >
                            {doc.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs" style={{ color: '#787771' }}>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            {formatFileSize(doc.file_size) && (
                              <>
                                <span>•</span>
                                <span>{formatFileSize(doc.file_size)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </a>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteDocument(doc); }}
                          disabled={deletingDocumentId === doc.id}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[#787771] hover:bg-[#e7ded1] hover:text-[#c06545] active:scale-95 disabled:opacity-50 flex-shrink-0"
                          aria-label={`Delete ${doc.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Invite Members (Admin only) */}
            {isAdmin && (
              <div className="px-4 py-4 border-t border-[#e7ded1]">
                <h3 
                  className="text-base mb-3"
                  style={{ fontWeight: 600, color: '#27251f' }}
                >
                  Invite Members{' '}
                  {inviteSelectedIds.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#d47455] text-white" >
                      {inviteSelectedIds.length} selected
                    </span>
                  )}
                </h3>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#e7ded1] focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent transition-all text-sm"
                    style={{ color: '#27251f' }}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto bg-white rounded-xl border border-[#e7ded1] mb-3">
                  {inviteSearchLoading && (
                    <div className="px-4 py-6 text-center text-sm" style={{ color: '#787771' }}>Searching...</div>
                  )}
                  {!inviteSearchLoading && !inviteSearch.trim() && inviteDisplayList.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm" style={{ color: '#787771' }}>Search by name or email to add members</div>
                  )}
                  {!inviteSearchLoading && inviteSearch.trim() && inviteDisplayList.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm" style={{ color: '#787771' }}>No users found</div>
                  )}
                  {!inviteSearchLoading && inviteDisplayList.length > 0 && inviteDisplayList.map((person) => (
                    <div
                      key={person.id}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-[#f5f3eb] last:border-b-0 ${inviteSelectedIds.includes(person.id) ? 'bg-[#d4745510]' : 'hover:bg-[#FBF9F5]'}`}
                      onClick={() => toggleInviteMember(person)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#e7ded1] flex items-center justify-center">
                          <Users className="w-5 h-5 text-[#787771]" />
                        </div>
                        <div>
                          <div className="text-sm" style={{ fontWeight: 600, color: '#27251f' }}>
                            {person.full_name || person.email?.split('@')[0] || 'Unknown'}
                          </div>
                          <div className="text-xs" style={{ color: '#787771' }}>{person.email}</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${inviteSelectedIds.includes(person.id) ? 'bg-[#d47455]' : 'bg-[#e7ded1]'}`}>
                        {inviteSelectedIds.includes(person.id) ? <Check className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-[#787771]" />}
                      </div>
                    </div>
                  ))}
                </div>
                {inviteSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={inviteAdding}
                    className="w-full py-1.5 px-3 bg-[#d47455] text-white rounded-full text-xs font-medium active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {inviteAdding ? 'Adding...' : `Add ${inviteSelectedIds.length} member${inviteSelectedIds.length === 1 ? '' : 's'}`}
                  </button>
                )}
              </div>
            )}

            {/* Members Section */}
            <div className="px-4 py-4">
              <h3 
                className="text-base mb-3"
                style={{ fontWeight: 600, color: '#27251f' }}
              >
                Members ({squad.member_count || 0})
              </h3>
              <div className={`space-y-2 ${members.length > 8 ? 'max-h-[28rem] overflow-y-auto' : ''}`}>
                {members.map(member => {
                  const memberName = member.profile?.full_name || member.profile?.email || 'Unknown';
                  const initials = getInitials(memberName);
                  const avatarColor = getAvatarColor(member.user_id);
                  const showRemove = canRemoveMember(member);
                  const isRemoving = removingMemberId === member.user_id;
                  return (
                    <div 
                      key={member.id}
                      className="bg-[#FBF9F5] rounded-xl p-3 active:bg-[#f5f3eb] transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {member.profile?.avatar_url ? (
                          <img 
                            src={member.profile.avatar_url} 
                            alt={memberName}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                            style={{ backgroundColor: avatarColor, fontWeight: 600 }}
                          >
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-sm truncate"
                            style={{ fontWeight: 600, color: '#27251f' }}
                          >
                            {memberName}
                          </div>
                          {member.role === 'admin' && (
                            <div className="text-xs" style={{ color: '#d47455' }}>
                              Admin
                            </div>
                          )}
                        </div>
                      </div>
                      {showRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={isRemoving}
                          className="text-sm font-medium flex-shrink-0 text-[#d47455] hover:text-[#c06545] disabled:opacity-50"
                        >
                          {isRemoving ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delete Squad Section (Admin only) - At the bottom */}
            {isAdmin && (
              <div className="px-4 py-4 border-t border-[#e7ded1] mt-auto">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 border rounded-full text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ 
                    fontWeight: 600,
                    backgroundColor: '#dc2626',
                    borderColor: '#b91c1c',
                    color: 'white'
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Squad
                </button>
                <p 
                  className="text-xs mt-2 text-center"
                  style={{ color: '#787771' }}
                >
                  This action cannot be undone
                </p>
              </div>
            )}
            </div>

            {/* Leave Squad - bottom right (Non-Creator Members Only) */}
            {isJoined && !isCreator && (
              <div className="flex-shrink-0 px-4 py-4 border-t border-[#e7ded1] flex justify-end">
                <button
                  onClick={handleLeaveSquad}
                  disabled={leaving}
                  className="py-1.5 px-3 bg-red-600 hover:bg-red-700 border border-red-700 text-white rounded-full text-xs active:scale-95 transition-transform disabled:opacity-50"
                  style={{ fontWeight: 600 }}
                >
                  {leaving ? 'Leaving...' : 'Leave Squad'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Leave Squad Bottom Sheet (from Joined button) */}
        {isJoined && !isCreator && (
          <>
            <div
              className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${showLeaveSheet ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setShowLeaveSheet(false)}
              aria-hidden="true"
            />
            <div
              className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl border-t border-[#e7ded1] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
                showLeaveSheet ? 'translate-y-0' : 'translate-y-full'
              }`}
            >
              <button
                onClick={async () => {
                  setShowLeaveSheet(false);
                  await confirmLeaveSquad();
                }}
                disabled={leaving}
                className="py-1.5 px-3 bg-transparent text-[#27251f] rounded-full text-xs font-medium active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              >
                <MinusCircle className="w-4 h-4" />
                {leaving ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </>
        )}

        {/* Delete Document Confirmation */}
        <Sheet open={!!docToDelete} onOpenChange={(open) => { if (!open) setDocToDelete(null); }}>
          <SheetContent side="bottom" className="bg-[#FBF9F5] border-[#e7ded1] border-t max-w-sm mx-auto p-0 gap-0">
            <SheetHeader className="p-6 pb-4 border-b border-[#e7ded1]">
              <SheetTitle className="text-[#27251f]">Delete Document</SheetTitle>
              <p className="text-sm text-[#787771] mt-1">
                {docToDelete ? `Delete "${docToDelete.name}"? This cannot be undone.` : ''}
              </p>
            </SheetHeader>
            <SheetFooter className="flex-row gap-2 p-6 pt-4">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="flex-1 py-1.5 px-3 rounded-full border border-[#d9d2c5] text-[#787771] text-xs hover:bg-[#f5f3eb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDocument}
                disabled={!!deletingDocumentId}
                className="flex-1 py-1.5 px-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50"
              >
                {deletingDocumentId ? 'Deleting...' : 'Delete'}
              </button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Delete Squad Confirmation */}
        <Sheet open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <SheetContent side="bottom" className="bg-[#FBF9F5] border-[#e7ded1] border-t max-w-md mx-auto p-0 gap-0">
            <SheetHeader className="p-6 pb-4 border-b border-[#e7ded1]">
              <SheetTitle className="text-[#27251f]">Delete Squad</SheetTitle>
              <p className="text-sm text-[#787771] mt-2 leading-relaxed">
                Are you sure you want to delete <strong>{squad.name}</strong>? This action cannot be undone and will delete all squad data, members, and documents.
              </p>
            </SheetHeader>
            <SheetFooter className="flex-row gap-3 p-6 pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-1.5 px-3 bg-white border border-[#d9d2c5] text-[#787771] rounded-full text-xs"
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSquad}
                disabled={deleting}
                className="flex-1 py-1.5 px-3 border rounded-full text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ fontWeight: 600, backgroundColor: '#dc2626', borderColor: '#b91c1c', color: 'white' }}
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Mobile Content - single scroll: intro + feed scroll together (not in header); when viewing a post, no outer scroll so post header stays at top */}
        <div ref={scrollContainerRef} className={`flex-1 min-h-0 flex flex-col bg-[#FBF9F5] ${postDetailOpen ? 'overflow-hidden' : 'overflow-y-auto'}`} style={postDetailOpen ? undefined : { WebkitOverflowScrolling: 'touch' }}>
          {!postDetailOpen && (
          <>
          {/* Squad intro: avatar, member count, Join - scrolls with feed */}
          <div ref={introRef} className="flex-shrink-0 px-4 py-3 bg-[#FBF9F5] flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: squadColor + '20' }}
              >
                {squad.avatar_url ? (
                  <img src={squad.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold" style={{ color: squadColor }}>{squad.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#27251f] truncate">{squad.name}</p>
                <p className="text-sm text-[#787771] leading-relaxed">
                  {squad.member_count || 0} members
                </p>
              </div>
              {!isCreator && !isAdmin && (
              isJoined ? (
                <button
                  type="button"
                  onClick={() => setShowLeaveSheet(true)}
                  className="shrink-0 py-1.5 px-3 bg-[#e7ded1] text-[#787771] rounded-full text-xs border border-[#d9d2c5] active:scale-95"
                  style={{ fontWeight: 600 }}
                  aria-label="Joined"
                >
                  Joined
                </button>
              ) : (
                <button
                  onClick={handleJoinSquad}
                  disabled={joining}
                  className="shrink-0 py-1.5 px-3 bg-[#d47455] text-white rounded-full text-xs active:scale-95 transition-transform flex items-center gap-2 disabled:opacity-50"
                  style={{ fontWeight: 600 }}
                >
                  <UserPlus className="w-4 h-4" />
                  {joining ? 'Joining...' : 'Join'}
                </button>
              )
            )}
            </div>
            {squad.info?.trim() && (
              <p className="text-sm text-[#27251f] line-clamp-2 leading-relaxed min-w-0 overflow-hidden max-w-[calc(100%-1.5rem)]">
                {squad.info.trim()}
              </p>
            )}
          </div>
          </>
          )}
          <div className={postDetailOpen ? 'flex-1 min-h-0 flex flex-col min-w-0' : undefined}>
            <HomeFeed
              embedded
              scrollWithParent
              squadId={squad.id}
              squadName="Feed"
              userId={user?.id}
              publicName={propsPublicName ?? user?.user_metadata?.public_name ?? user?.email ?? 'You'}
              userAvatarUrl={propsUserAvatarUrl ?? null}
              newPostModalOpen={squadFeedNewPostOpen}
              onNewPostModalOpenChange={setSquadFeedNewPostOpen}
              onPostDetailChange={setPostDetailOpen}
              embedHeaderTitle={squad.name}
              embedHeaderColor={headerColor}
                embedHeaderDarkText
              embedMemberCount={squad.member_count ?? 0}
              feedRefreshKey={squadFeedRefreshKey}
              onNewPostSuccess={() => setSquadFeedRefreshKey((k) => k + 1)}
              initialPostId={initialFeedPostId}
              onPostChange={onFeedPostChange}
              onRegisterClosePost={(close) => { closePostRef.current = close; }}
            />
          </div>
        </div>
      </div>

      {/* Desktop View - Keep existing design */}
      <div className="hidden md:block h-full overflow-hidden flex flex-col"  >
        {/* Desktop Header - hidden when viewing a post; post detail view shows its own header */}
        {!postDetailOpen && (
        <div className="border-b border-black/10 px-6 py-3 flex items-center justify-between gap-4" style={{ backgroundColor: headerColor }}>
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={postDetailOpen ? () => closePostRef.current() : onBack}
              className="px-3 py-1.5 rounded-full bg-black/10 text-[#27251f] text-xs hover:bg-black/15 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              {postDetailOpen ? 'Back' : 'Back to Squads'}
            </button>
            <h1 
              className={`text-xl text-[#27251f] truncate transition-opacity duration-300 ${postDetailOpen || !introInView ? 'opacity-100' : 'opacity-0'}`}
              style={{ fontWeight: 600, lineHeight: 1.2, ...(!postDetailOpen && introInView && { pointerEvents: 'none' as const }) }}
            >
              {postDetailOpen ? 'Post' : squad.name}
            </h1>
            {!postDetailOpen && (
              <p 
                className={`text-sm text-[#787771] truncate transition-opacity duration-300 ${!introInView ? 'opacity-100' : 'opacity-0'}`}
                style={introInView ? { pointerEvents: 'none' as const } : undefined}
              >
                {squad.member_count || 0} members
              </p>
            )}
          </div>
          {!postDetailOpen && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <div className="relative h-9 flex items-center">
              {isJoined && !isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowLeaveSheet(true)}
                  className={`shrink-0 px-3 py-2 rounded-full bg-[#e7ded1] text-[#787771] text-[13px] border border-[#d9d2c5] transition-opacity duration-300 hover:bg-[#e0d9cc] ${introInView ? 'opacity-0' : 'opacity-100'}`}
                  style={{ fontWeight: 600 }}
                  aria-label="Joined"
                >
                  Joined
                </button>
              ) : !isCreator && (
                <button 
                  onClick={handleJoinSquad}
                  disabled={joining}
                  className={`absolute right-0 px-3 py-1.5 bg-[#d97757] text-white rounded-full text-xs hover:bg-[#c06545] transition-opacity duration-300 flex items-center gap-1.5 disabled:opacity-50 ${introInView ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  style={{ fontWeight: 600 }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {joining ? 'Joining...' : 'Join Squad'}
                </button>
              )}
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 border rounded-full text-xs transition-colors flex items-center gap-1.5"
                style={{ 
                  fontWeight: 600,
                  backgroundColor: '#dc2626',
                  borderColor: '#b91c1c',
                  color: 'white'
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Squad
              </button>
            )}
            {(isJoined || isCreator) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSquadFeedNewPostOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/10 text-[#27251f] hover:bg-black/15 transition-colors"
                  aria-label="New post"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleOpenChat}
                  disabled={!squad.conversation_id}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/10 text-[#27251f] hover:bg-black/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Chat"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowInfoMenu(true)}
              className={`px-3 py-1.5 bg-black/10 border border-black/20 text-[#27251f] rounded-full text-xs hover:bg-black/15 transition-opacity duration-300 flex items-center gap-1.5 ${!introInView && !isJoined && !isCreator ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              aria-label="Squad info"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          )}
        </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex bg-[#fefefc]">
          {/* Left Column - when viewing a post, no outer scroll so post header stays at top */}
          <div ref={scrollContainerRefDesktop} className={`flex-1 min-h-0 flex flex-col px-8 py-6 ${postDetailOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {!postDetailOpen && (
            <>
            {/* Squad intro: avatar, member count, Join - scrolls with feed */}
            <div ref={introRefDesktop} className="max-w-3xl flex-shrink-0 mb-4 py-4 px-4 bg-white border border-[#e7ded1] rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden border-2 border-[#e7ded1] shrink-0"
                  style={{ backgroundColor: squadColor + '20' }}
                >
                  {squad.avatar_url ? (
                    <img src={squad.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold" style={{ color: squadColor }}>{squad.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-[#27251f] truncate">{squad.name}</p>
                <p className="text-sm text-[#787771] leading-relaxed">
                  {squad.member_count || 0} members
                </p>
              </div>
                {!isCreator && !isAdmin && (
                isJoined ? (
                  <button
                    type="button"
                    onClick={() => setShowLeaveSheet(true)}
                    className="shrink-0 px-3 py-1.5 bg-[#e7ded1] text-[#787771] rounded-full text-xs border border-[#d9d2c5] hover:bg-[#e0d9cc] active:scale-95"
                    style={{ fontWeight: 600 }}
                    aria-label="Joined"
                  >
                    Joined
                  </button>
                ) : (
                  <button 
                    onClick={handleJoinSquad}
                    disabled={joining}
                    className="shrink-0 px-3 py-1.5 bg-[#d97757] text-white rounded-full text-xs hover:bg-[#c06545] transition-colors flex items-center gap-2 disabled:opacity-50"
                    style={{ fontWeight: 600 }}
                  >
                    <UserPlus className="w-4 h-4" />
                    {joining ? 'Joining...' : 'Join Squad'}
                  </button>
                )
              )}
              </div>
              {squad.info?.trim() && (
                <p className="text-sm text-[#27251f] line-clamp-2 leading-relaxed min-w-0 overflow-hidden max-w-[calc(100%-1.5rem)]">
                  {squad.info.trim()}
                </p>
              )}
            </div>
            </>
            )}
            <div className={postDetailOpen ? 'max-w-3xl flex-1 min-h-0 flex flex-col' : 'max-w-3xl'}>
              <HomeFeed
                embedded
                scrollWithParent
                squadId={squad.id}
                squadName="Feed"
                userId={user?.id}
                publicName={propsPublicName ?? user?.user_metadata?.public_name ?? user?.email ?? 'You'}
                userAvatarUrl={propsUserAvatarUrl ?? null}
                newPostModalOpen={squadFeedNewPostOpen}
                onNewPostModalOpenChange={setSquadFeedNewPostOpen}
                onPostDetailChange={setPostDetailOpen}
                embedHeaderTitle={squad.name}
                embedHeaderColor={headerColor}
                embedHeaderDarkText
                embedMemberCount={squad.member_count ?? 0}
                feedRefreshKey={squadFeedRefreshKey}
                onNewPostSuccess={() => setSquadFeedRefreshKey((k) => k + 1)}
                initialPostId={initialFeedPostId}
                onPostChange={onFeedPostChange}
                onRegisterClosePost={(close) => { closePostRef.current = close; }}
              />
            </div>
          </div>

          {/* Right Column - Pinned Documents & Info */}
          <div className="w-80 border-l border-[#e7ded1] overflow-y-auto px-6 py-6 bg-[#fefefc]">
            {/* Squad Info */}
            <div className="mb-6 p-4 bg-white border border-[#e7ded1] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 
                  className="text-[16px] text-[#27251f]"
                  style={{ fontWeight: 600 }}
                >
                  About
                </h3>
                {isAdmin && !isEditingSquad && (
                  <button
                    type="button"
                    onClick={startEditingSquad}
                    className="flex items-center gap-1.5 text-[13px] text-[#d47455] hover:text-[#c06545]"
                    style={{ fontWeight: 600 }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
              </div>
              {/* Squad avatar */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden bg-[#f5f3eb] shrink-0"
                  style={{ backgroundColor: squadColor + '20' }}
                >
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : squad.avatar_url ? (
                    <img src={squad.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold" style={{ color: squadColor }}>{squad.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {isEditingSquad && (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-[13px] text-[#d47455] hover:text-[#c06545]"
                    style={{ fontWeight: 600 }}
                  >
                    Change photo
                  </button>
                )}
              </div>
              {isEditingSquad ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[#787771] block mb-1" >Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e7ded1] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                      style={{ color: '#27251f' }}
                      placeholder="Squad name"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#787771] block mb-1" >Description</label>
                    <textarea
                      value={editInfo}
                      onChange={(e) => setEditInfo(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-[#e7ded1] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#d47455] resize-none"
                      style={{ color: '#27251f' }}
                      placeholder="Description"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#787771] block mb-1" >Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SQUAD_CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditCategory(c.id)}
                          className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${editCategory === c.id ? 'bg-[#d47455] text-white' : 'bg-[#f5f3eb] text-[#27251f]'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#787771] block mb-1" >Privacy</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditType('open')}
                        className={`flex-1 py-2 rounded-full border-2 text-[12px] font-medium flex items-center justify-center gap-1.5 ${editType === 'open' ? 'border-[#d47455] bg-[#d4745510] text-[#27251f]' : 'border-[#e7ded1] bg-white text-[#787771]'}`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditType('private')}
                        className={`flex-1 py-1.5 px-3 rounded-full border-2 text-xs font-medium flex items-center justify-center gap-1.5 ${editType === 'private' ? 'border-[#d47455] bg-[#d4745510] text-[#27251f]' : 'border-[#e7ded1] bg-white text-[#787771]'}`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Private
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={cancelEditingSquad}
                      className="flex-1 py-1.5 px-3 rounded-full border border-[#e7ded1] text-[#787771] text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSquadEdit}
                      disabled={savingSquad}
                      className="flex-1 py-1.5 px-3 rounded-full bg-[#d47455] text-white text-xs font-medium disabled:opacity-50"
                    >
                      {savingSquad ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p 
                    className="text-[14px] text-[#27251f] leading-relaxed mb-4"
                  >
                    {squad.info || 'No description available'}
                  </p>
                  <div className="pt-3 border-t border-[#e7ded1] space-y-2 text-[13px]" >
                    <div className="flex justify-between">
                      <span className="text-[#787771]">Category:</span>
                      <span className="text-[#27251f]">{getCategoryLabel(squad.category)}</span>
                    </div>
                    {squad.meeting_times && (
                      <div className="flex justify-between">
                        <span className="text-[#787771]">Meetings:</span>
                        <span className="text-[#27251f]">{squad.meeting_times}</span>
                      </div>
                    )}
                    {squad.location && (
                      <div className="flex justify-between">
                        <span className="text-[#787771]">Location:</span>
                        <span className="text-[#27251f]">{squad.location}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#787771]">Privacy:</span>
                      <div className="flex items-center gap-1">
                        <PrivacyIcon className="w-3 h-3 text-[#787771]" />
                        <span className="text-[#27251f]">{privacyLabel}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Pinned Documents */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <button 
                  onClick={() => setShowDocuments(!showDocuments)}
                  className="flex-1 flex items-center justify-between bg-transparent border-0 cursor-pointer p-0 hover:opacity-70 transition-opacity min-w-0"
                >
                  <h3 
                    className="text-[16px] text-[#27251f]"
                    style={{ fontWeight: 600 }}
                  >
                    Pinned Documents
                  </h3>
                  <ChevronDown 
                    size={16} 
                    className={`text-[#787771] transition-transform flex-shrink-0 ml-2 ${showDocuments ? '' : '-rotate-90'}`} 
                  />
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openAddDocumentModal}
                    disabled={uploadingDocs}
                    className="w-8 h-8 rounded-full bg-[#d47455] text-white flex items-center justify-center hover:bg-[#c06545] flex-shrink-0 ml-2 disabled:opacity-50"
                    aria-label="Add document"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showDocuments && (
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-[13px] text-[#787771]" >
                      No documents yet
                    </p>
                  ) : (
                    documents.map(doc => (
                      <div
                        key={doc.id}
                        className="w-full p-3 bg-white border border-[#e7ded1] rounded-xl hover:border-[#d9d2c5] transition-all flex items-start gap-3"
                      >
                        <a
                          href={doc.file_url || '#'}
                          onClick={(e) => handleDownloadDocument(e, doc)}
                          className="flex-1 flex items-start gap-3 min-w-0 cursor-pointer no-underline hover:bg-[#fefefc] -m-3 p-3 rounded-xl"
                        >
                          <FileText size={16} className="text-[#787771] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-[13px] text-[#27251f] mb-1 break-words"
                              style={{ fontWeight: 600 }}
                            >
                              {doc.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#787771]" >
                              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                              {formatFileSize(doc.file_size) && (
                                <>
                                  <span>•</span>
                                  <span>{formatFileSize(doc.file_size)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </a>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteDocument(doc); }}
                            disabled={deletingDocumentId === doc.id}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#787771] hover:bg-[#e7ded1] hover:text-[#c06545] active:scale-95 disabled:opacity-50 flex-shrink-0 mt-0.5"
                            aria-label={`Delete ${doc.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Invite Members (Admin only) - Desktop */}
            {isAdmin && (
              <div className="mb-6">
                <h3 className="text-[16px] mb-2" style={{ fontWeight: 600, color: '#27251f' }}>
                  Invite Members{' '}
                  {inviteSelectedIds.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#d47455] text-white" >
                      {inviteSelectedIds.length} selected
                    </span>
                  )}
                </h3>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#e7ded1] focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent transition-all text-[13px]"
                    style={{ color: '#27251f' }}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto bg-white rounded-xl border border-[#e7ded1] mb-2">
                  {inviteSearchLoading && (
                    <div className="px-4 py-4 text-center text-sm" style={{ color: '#787771' }}>Searching...</div>
                  )}
                  {!inviteSearchLoading && !inviteSearch.trim() && inviteDisplayList.length === 0 && (
                    <div className="px-4 py-4 text-center text-sm" style={{ color: '#787771' }}>Search by name or email to add members</div>
                  )}
                  {!inviteSearchLoading && inviteSearch.trim() && inviteDisplayList.length === 0 && (
                    <div className="px-4 py-4 text-center text-sm" style={{ color: '#787771' }}>No users found</div>
                  )}
                  {!inviteSearchLoading && inviteDisplayList.length > 0 && inviteDisplayList.map((person) => (
                    <div
                      key={person.id}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors border-b border-[#f5f3eb] last:border-b-0 ${inviteSelectedIds.includes(person.id) ? 'bg-[#d4745510]' : 'hover:bg-[#FBF9F5]'}`}
                      onClick={() => toggleInviteMember(person)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#e7ded1] flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-[#787771]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] truncate" style={{ fontWeight: 600, color: '#27251f' }}>
                            {person.full_name || person.email?.split('@')[0] || 'Unknown'}
                          </div>
                          <div className="text-[11px] truncate" style={{ color: '#787771' }}>{person.email}</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${inviteSelectedIds.includes(person.id) ? 'bg-[#d47455]' : 'bg-[#e7ded1]'}`}>
                        {inviteSelectedIds.includes(person.id) ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-[#787771]" />}
                      </div>
                    </div>
                  ))}
                </div>
                {inviteSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={inviteAdding}
                    className="w-full py-1.5 px-3 bg-[#d47455] text-white rounded-full text-xs font-medium hover:bg-[#c06545] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {inviteAdding ? 'Adding...' : `Add ${inviteSelectedIds.length} member${inviteSelectedIds.length === 1 ? '' : 's'}`}
                  </button>
                )}
              </div>
            )}

            {/* Members Section */}
            <div>
              <button 
                onClick={() => setShowMembers(!showMembers)}
                className="w-full flex items-center justify-between mb-3 bg-transparent border-0 cursor-pointer p-0 hover:opacity-70 transition-opacity"
              >
                <h3 
                  className="text-[16px] text-[#27251f]"
                  style={{ fontWeight: 600 }}
                >
                  Members
                </h3>
                <ChevronDown 
                  size={16} 
                  className={`text-[#787771] transition-transform ${showMembers ? '' : '-rotate-90'}`} 
                />
              </button>
              {showMembers && (
                <div className={`space-y-2 ${members.length > 8 ? 'max-h-[28rem] overflow-y-auto' : ''}`}>
                  {members.map(member => {
                    const memberName = member.profile?.full_name || member.profile?.email || 'Unknown';
                    const initials = getInitials(memberName);
                    const avatarColor = getAvatarColor(member.user_id);
                    const showRemove = canRemoveMember(member);
                    const isRemoving = removingMemberId === member.user_id;
                    return (
                      <div
                        key={member.id}
                        className="w-full p-3 bg-white border border-[#e7ded1] rounded-xl hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {member.profile?.avatar_url ? (
                            <img 
                              src={member.profile.avatar_url} 
                              alt={memberName}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] flex-shrink-0"
                              style={{ backgroundColor: avatarColor, fontWeight: 600 }}
                            >
                              {initials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-[13px] text-[#27251f] truncate"
                              style={{ fontWeight: 600 }}
                            >
                              {memberName}
                            </div>
                            {member.role === 'admin' && (
                              <div className="text-[11px] text-[#d97757]" >
                                Admin
                              </div>
                            )}
                          </div>
                        </div>
                        {showRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={isRemoving}
                            className="text-[13px] font-medium flex-shrink-0 text-[#d47455] hover:text-[#c06545] disabled:opacity-50"
                          >
                            {isRemoving ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {members.length < (squad.member_count || 0) && (
                    <button 
                      className="w-full p-3 bg-white border border-[#e7ded1] rounded-xl hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all text-center cursor-pointer text-[13px] text-[#787771] flex items-center justify-center gap-1" 
                      style={{ fontWeight: 600 }}
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
    </SwipeBackContainer>
  );
}