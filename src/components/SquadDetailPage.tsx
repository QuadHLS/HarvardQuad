import { UserPlus, UserMinus, MessageCircle, Users as UsersIcon, ChevronLeft, ChevronDown, MoreVertical, X, Globe, Lock, Users, FileText, Image, Trash2, Search, Check, Plus, Pencil, Upload } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SquadsService, Squad, SquadMember, SquadDocument } from '../services/squadsService';
import { MessagingService } from '../services/messagingService';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';

type InviteSearchResult = { id: string; email: string; full_name: string | null };

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
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
  const [savingSquad, setSavingSquad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [addDocumentFile, setAddDocumentFile] = useState<File | null>(null);
  const [addDocumentName, setAddDocumentName] = useState('');
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

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

  const handleJoinSquad = async () => {
    try {
      setJoining(true);
      await SquadsService.joinSquad(squadId);
      await loadSquadData({ showLoading: false });
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
      await loadSquadData({ showLoading: false });
    } catch (error) {
      console.error('Error leaving squad:', error);
      alert('Error leaving squad. Please try again.');
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
      alert('Error deleting squad. Please try again.');
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
    return colors[category] || '#7b7b74';
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
      alert('Could not add members. Please try again.');
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
    setIsEditingSquad(true);
  };

  const cancelEditingSquad = () => {
    setIsEditingSquad(false);
  };

  const handleSaveSquadEdit = async () => {
    if (!squad || savingSquad) return;
    const name = editName.trim();
    if (!name) {
      alert('Squad name is required.');
      return;
    }
    if (!SQUAD_CATEGORIES.some((c) => c.id === editCategory)) {
      alert('Please select a valid category.');
      return;
    }
    try {
      setSavingSquad(true);
      await SquadsService.updateSquad(squad.id, {
        name,
        info: editInfo.trim() || null,
        category: editCategory,
        type: editType,
      });
      await loadSquadData({ showLoading: false });
      setIsEditingSquad(false);
    } catch (e) {
      console.error('Error updating squad:', e);
      alert('Could not update squad. Please try again.');
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
      alert('Could not add document. Only squad admins can add documents.');
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
      <div className="min-h-[60vh] h-full flex flex-col items-center justify-center bg-[#FBF9F5] pt-[18vh] px-4 gap-4">
        <p className="text-[#3d3d3a] text-center" style={{ fontFamily: 'Arial, sans-serif' }}>
          Could not load squad. It may have been deleted or you may not have access.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#d47455] text-white hover:bg-[#c06545]"
          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
        >
          Go back
        </button>
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="min-h-[60vh] h-full flex items-center justify-center bg-[#FBF9F5] pt-[18vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
      </div>
    );
  }

  const isJoined = squad.is_joined || false;
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
      alert('Could not remove member. Only squad admins can remove members.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const canRemoveMember = (member: SquadMember) =>
    !!isAdmin &&
    member.user_id !== user?.id &&
    (member.role !== 'admin' || adminCount > 1);

  const handleDeleteDocument = async (doc: SquadDocument) => {
    if (!squad || deletingDocumentId) return;
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      setDeletingDocumentId(doc.id);
      await SquadsService.deleteSquadDocument(squad.id, doc.id);
      await loadSquadData({ showLoading: false });
    } catch (e) {
      console.error('Error deleting document:', e);
      alert('Could not delete document. Only squad admins can delete documents.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[#FBF9F5]" style={{ fontFamily: 'Arial, sans-serif' }}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="*/*"
        onChange={handleFileSelect}
      />
      <Dialog open={showAddDocumentModal} onOpenChange={(open) => { if (!open) closeAddDocumentModal(); }}>
        <DialogContent className="bg-[#FBF9F5] border-[#e7ded1] rounded-xl max-w-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
          <DialogHeader>
            <DialogTitle className="text-[#3d3d3a]" style={{ fontFamily: 'Lora, serif' }}>Add document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <label className="text-sm font-medium text-[#3d3d3a] block mb-1.5">Document name</label>
              <input
                type="text"
                value={addDocumentName}
                onChange={(e) => setAddDocumentName(e.target.value)}
                placeholder="e.g. Syllabus 2024"
                className="w-full px-3 py-2 rounded-xl border-2 border-[#e7ded1] bg-white text-[#3d3d3a] placeholder:text-[#8c867d] focus:outline-none focus:border-[#d47455]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#3d3d3a] block mb-1.5">File</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-dashed border-[#e7ded1] bg-white text-[#7b7b74] flex items-center justify-center gap-2 hover:border-[#d47455] hover:text-[#3d3d3a] transition-colors"
              >
                <Upload className="w-4 h-4" />
                {addDocumentFile ? addDocumentFile.name : 'Choose file'}
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={closeAddDocumentModal}
              className="px-4 py-2 rounded-xl border border-[#d9d2c5] text-[#7b7b74] hover:bg-[#f5f3eb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddDocumentSubmit}
              disabled={!addDocumentFile || !addDocumentName.trim() || uploadingDocs}
              className="px-4 py-2 rounded-xl bg-[#d47455] text-white hover:bg-[#c06545] disabled:opacity-50 disabled:pointer-events-none"
            >
              {uploadingDocs ? 'Adding…' : 'Add'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            {isJoined && (
              <button 
                onClick={handleOpenChat}
                disabled={!squad.conversation_id}
                className="flex-1 py-2.5 bg-[#d47455] text-white rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                <MessageCircle className="w-4 h-4" />
                Open Chat
              </button>
            )}
            {!isJoined && !isCreator && (
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
          className={`fixed top-0 right-0 h-full w-80 bg-white z-50 transition-transform duration-300 shadow-xl rounded-l-2xl ${
            showInfoMenu ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full overflow-y-auto">
            {/* Menu Header */}
            <div className="bg-[#F1EFE7] px-4 py-4 flex items-center justify-between sticky top-0 z-10 rounded-tl-2xl">
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
              <div className="flex items-center justify-between mb-3">
                <h3 
                  className="text-base"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                >
                  About
                </h3>
                {isAdmin && !isEditingSquad && (
                  <button
                    type="button"
                    onClick={startEditingSquad}
                    className="flex items-center gap-1.5 text-sm text-[#d47455] hover:text-[#c06545]"
                    style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>
              {isEditingSquad ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#7b7b74] block mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#e7ded1] text-sm focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                      placeholder="Squad name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#7b7b74] block mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Description</label>
                    <textarea
                      value={editInfo}
                      onChange={(e) => setEditInfo(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-[#e7ded1] text-sm focus:outline-none focus:ring-2 focus:ring-[#d47455] resize-none"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                      placeholder="Description"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#7b7b74] block mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Category</label>
                    <div className="flex flex-wrap gap-2">
                      {SQUAD_CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditCategory(c.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${editCategory === c.id ? 'bg-[#d47455] text-white' : 'bg-[#f5f3eb] text-[#3d3d3a]'}`}
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#7b7b74] block mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Privacy</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditType('open')}
                        className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium flex items-center justify-center gap-2 ${editType === 'open' ? 'border-[#d47455] bg-[#d4745510] text-[#3d3d3a]' : 'border-[#e7ded1] bg-white text-[#7b7b74]'}`}
                        style={{ fontFamily: 'Arial, sans-serif' }}
                      >
                        <Globe className="w-4 h-4" />
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditType('private')}
                        className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium flex items-center justify-center gap-2 ${editType === 'private' ? 'border-[#d47455] bg-[#d4745510] text-[#3d3d3a]' : 'border-[#e7ded1] bg-white text-[#7b7b74]'}`}
                        style={{ fontFamily: 'Arial, sans-serif' }}
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
                      className="flex-1 py-2.5 rounded-xl border border-[#e7ded1] text-[#7b7b74] text-sm font-medium"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSquadEdit}
                      disabled={savingSquad}
                      className="flex-1 py-2.5 rounded-xl bg-[#d47455] text-white text-sm font-medium disabled:opacity-50"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      {savingSquad ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                        <span className="text-[#3d3d3a]">{privacyLabel}</span>
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
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
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
                  <p className="text-sm text-[#7b7b74]" style={{ fontFamily: 'Arial, sans-serif' }}>
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
                        <div className="w-10 h-10 bg-[#f0eee6] rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-[#7b7b74]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 
                            className="text-sm mb-0.5 break-words"
                            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                          >
                            {doc.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
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
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#7b7b74] hover:bg-[#e7ded1] hover:text-[#c06545] active:scale-95 disabled:opacity-50 flex-shrink-0"
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

            {/* Leave Squad Section (Non-Creator Members Only) */}
            {isJoined && !isCreator && (
              <div className="px-4 py-4 border-t border-[#e7ded1]">
                <button
                  onClick={handleLeaveSquad}
                  disabled={leaving}
                  className="w-full py-3 bg-white border border-[#d9d2c5] text-[#7b7b74] rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <UserMinus className="w-4 h-4" />
                  {leaving ? 'Leaving...' : 'Leave Squad'}
                </button>
              </div>
            )}

            {/* Invite Members (Admin only) */}
            {isAdmin && (
              <div className="px-4 py-4 border-t border-[#e7ded1]">
                <h3 
                  className="text-base mb-3"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                >
                  Invite Members{' '}
                  {inviteSelectedIds.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#d47455] text-white" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {inviteSelectedIds.length} selected
                    </span>
                  )}
                </h3>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7b7b74]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#e7ded1] focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent transition-all text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto bg-white rounded-xl border border-[#e7ded1] mb-3">
                  {inviteSearchLoading && (
                    <div className="px-4 py-6 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>Searching...</div>
                  )}
                  {!inviteSearchLoading && !inviteSearch.trim() && inviteDisplayList.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>Search by name or email to add members</div>
                  )}
                  {!inviteSearchLoading && inviteSearch.trim() && inviteDisplayList.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>No users found</div>
                  )}
                  {!inviteSearchLoading && inviteDisplayList.length > 0 && inviteDisplayList.map((person) => (
                    <div
                      key={person.id}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-[#f5f3eb] last:border-b-0 ${inviteSelectedIds.includes(person.id) ? 'bg-[#d4745510]' : 'hover:bg-[#FBF9F5]'}`}
                      onClick={() => toggleInviteMember(person)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#e7ded1] flex items-center justify-center">
                          <Users className="w-5 h-5 text-[#7b7b74]" />
                        </div>
                        <div>
                          <div className="text-sm" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}>
                            {person.full_name || person.email?.split('@')[0] || 'Unknown'}
                          </div>
                          <div className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>{person.email}</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${inviteSelectedIds.includes(person.id) ? 'bg-[#d47455]' : 'bg-[#e7ded1]'}`}>
                        {inviteSelectedIds.includes(person.id) ? <Check className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-[#7b7b74]" />}
                      </div>
                    </div>
                  ))}
                </div>
                {inviteSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={inviteAdding}
                    className="w-full py-3 bg-[#d47455] text-white rounded-xl text-sm font-medium active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Arial, sans-serif' }}
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
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
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
                      {showRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={isRemoving}
                          className="text-sm font-medium flex-shrink-0 text-[#d47455] hover:text-[#c06545] disabled:opacity-50"
                          style={{ fontFamily: 'Arial, sans-serif' }}
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
                  className="w-full py-3 border rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
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
                  style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                >
                  This action cannot be undone
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowDeleteConfirm(false)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-md bg-white rounded-lg border border-[#e7ded1] p-6 shadow-lg z-[101]">
              <h2
                className="text-xl mb-4"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Delete Squad
              </h2>
              <p
                className="text-sm mb-6"
                style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', lineHeight: 1.5 }}
              >
                Are you sure you want to delete <strong>{squad.name}</strong>? This action cannot be undone and will delete all squad data, members, and documents.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-white border border-[#d9d2c5] text-[#7b7b74] rounded-xl text-sm active:scale-95 transition-transform"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSquad}
                  disabled={deleting}
                  className="flex-1 py-2.5 border rounded-xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontWeight: 600,
                    backgroundColor: '#dc2626',
                    borderColor: '#b91c1c',
                    color: 'white'
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

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
              {!isJoined && !isCreator && (
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
              {isAdmin && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2.5 border rounded-lg text-[14px] transition-colors flex items-center gap-2"
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontWeight: 600,
                    backgroundColor: '#dc2626',
                    borderColor: '#b91c1c',
                    color: 'white'
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Squad
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
              <div className="flex items-center justify-between mb-3">
                <h3 
                  className="text-[16px] text-[#3d3d3a]"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
                >
                  About
                </h3>
                {isAdmin && !isEditingSquad && (
                  <button
                    type="button"
                    onClick={startEditingSquad}
                    className="flex items-center gap-1.5 text-[13px] text-[#d47455] hover:text-[#c06545]"
                    style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
              </div>
              {isEditingSquad ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[#8c867d] block mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#e7ded1] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                      placeholder="Squad name"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8c867d] block mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Description</label>
                    <textarea
                      value={editInfo}
                      onChange={(e) => setEditInfo(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-[#e7ded1] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#d47455] resize-none"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                      placeholder="Description"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8c867d] block mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SQUAD_CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditCategory(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${editCategory === c.id ? 'bg-[#d47455] text-white' : 'bg-[#f5f3eb] text-[#3d3d3a]'}`}
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8c867d] block mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Privacy</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditType('open')}
                        className={`flex-1 py-2 rounded-lg border-2 text-[12px] font-medium flex items-center justify-center gap-1.5 ${editType === 'open' ? 'border-[#d47455] bg-[#d4745510] text-[#3d3d3a]' : 'border-[#e7ded1] bg-white text-[#7b7b74]'}`}
                        style={{ fontFamily: 'Arial, sans-serif' }}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditType('private')}
                        className={`flex-1 py-2 rounded-lg border-2 text-[12px] font-medium flex items-center justify-center gap-1.5 ${editType === 'private' ? 'border-[#d47455] bg-[#d4745510] text-[#3d3d3a]' : 'border-[#e7ded1] bg-white text-[#7b7b74]'}`}
                        style={{ fontFamily: 'Arial, sans-serif' }}
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
                      className="flex-1 py-2 rounded-lg border border-[#e7ded1] text-[#7b7b74] text-[13px] font-medium"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSquadEdit}
                      disabled={savingSquad}
                      className="flex-1 py-2 rounded-lg bg-[#d47455] text-white text-[13px] font-medium disabled:opacity-50"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      {savingSquad ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                        <span className="text-[#3d3d3a]">{privacyLabel}</span>
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
                    className="text-[16px] text-[#3d3d3a]"
                    style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
                  >
                    Pinned Documents
                  </h3>
                  <ChevronDown 
                    size={16} 
                    className={`text-[#8c867d] transition-transform flex-shrink-0 ml-2 ${showDocuments ? '' : '-rotate-90'}`} 
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
                    <p className="text-[13px] text-[#8c867d]" style={{ fontFamily: 'Arial, sans-serif' }}>
                      No documents yet
                    </p>
                  ) : (
                    documents.map(doc => (
                      <div
                        key={doc.id}
                        className="w-full p-3 bg-white border border-[#e7ded1] rounded-lg hover:border-[#d9d2c5] transition-all flex items-start gap-3"
                      >
                        <a
                          href={doc.file_url || '#'}
                          onClick={(e) => handleDownloadDocument(e, doc)}
                          className="flex-1 flex items-start gap-3 min-w-0 cursor-pointer no-underline hover:bg-[#fefefc] -m-3 p-3 rounded-lg"
                        >
                          <FileText size={16} className="text-[#8c867d] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-[13px] text-[#3d3d3a] mb-1 break-words"
                              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {doc.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#8c867d]" style={{ fontFamily: 'Arial, sans-serif' }}>
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
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8c867d] hover:bg-[#e7ded1] hover:text-[#c06545] active:scale-95 disabled:opacity-50 flex-shrink-0 mt-0.5"
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
                <h3 className="text-[16px] mb-2" style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}>
                  Invite Members{' '}
                  {inviteSelectedIds.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#d47455] text-white" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {inviteSelectedIds.length} selected
                    </span>
                  )}
                </h3>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7b7b74]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#e7ded1] focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent transition-all text-[13px]"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto bg-white rounded-xl border border-[#e7ded1] mb-2">
                  {inviteSearchLoading && (
                    <div className="px-4 py-4 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>Searching...</div>
                  )}
                  {!inviteSearchLoading && !inviteSearch.trim() && inviteDisplayList.length === 0 && (
                    <div className="px-4 py-4 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>Search by name or email to add members</div>
                  )}
                  {!inviteSearchLoading && inviteSearch.trim() && inviteDisplayList.length === 0 && (
                    <div className="px-4 py-4 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>No users found</div>
                  )}
                  {!inviteSearchLoading && inviteDisplayList.length > 0 && inviteDisplayList.map((person) => (
                    <div
                      key={person.id}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors border-b border-[#f5f3eb] last:border-b-0 ${inviteSelectedIds.includes(person.id) ? 'bg-[#d4745510]' : 'hover:bg-[#FBF9F5]'}`}
                      onClick={() => toggleInviteMember(person)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#e7ded1] flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-[#7b7b74]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] truncate" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}>
                            {person.full_name || person.email?.split('@')[0] || 'Unknown'}
                          </div>
                          <div className="text-[11px] truncate" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>{person.email}</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${inviteSelectedIds.includes(person.id) ? 'bg-[#d47455]' : 'bg-[#e7ded1]'}`}>
                        {inviteSelectedIds.includes(person.id) ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-[#7b7b74]" />}
                      </div>
                    </div>
                  ))}
                </div>
                {inviteSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={inviteAdding}
                    className="w-full py-2.5 bg-[#d47455] text-white rounded-xl text-[13px] font-medium hover:bg-[#c06545] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Arial, sans-serif' }}
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
                        className="w-full p-3 bg-white border border-[#e7ded1] rounded-lg hover:border-[#d9d2c5] hover:bg-[#fefefc] transition-all flex items-center justify-between gap-3"
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
                        {showRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={isRemoving}
                            className="text-[13px] font-medium flex-shrink-0 text-[#d47455] hover:text-[#c06545] disabled:opacity-50"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                          >
                            {isRemoving ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
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