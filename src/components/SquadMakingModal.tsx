/**
 * Squad Making Modal – self-contained squad creation model and UI.
 * Same UI, format, and dependencies as the create-squad flow in SquadsPage.
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Users,
  Lock,
  Globe,
  Plus,
  Dumbbell,
  PartyPopper,
  BookOpen,
  Gamepad2,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { MessagingService } from '../services/messagingService';
import { useAuth } from '../contexts/AuthContext';

// --- Model: types ---
export type SquadType = 'open' | 'private';

export interface Squad {
  id: string;
  name: string;
  description: string;
  members: number;
  type: SquadType;
  category: string;
  isJoined?: boolean;
  isPending?: boolean;
  color: string;
}

/** Same shape as the object logged in SquadsPage handleCreateSquad */
export interface CreateSquadPayload {
  name: string;
  description: string;
  type: 'public' | 'private';
  category: string;
  members: string[];
}

// --- Sample data (same as SquadsPage) ---
const CATEGORIES = [
  { id: 'sports', label: 'Sports', icon: Dumbbell, color: '#7ba05b' },
  { id: 'social', label: 'Social', icon: PartyPopper, color: '#d47455' },
  { id: 'academic', label: 'Academic', icon: BookOpen, color: '#7b9fb8' },
  { id: 'hobbies', label: 'Hobbies', icon: Gamepad2, color: '#c89b6e' },
];

type InviteSearchResult = { id: string; email: string; full_name: string | null };

// --- Props ---
export interface SquadMakingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (payload: CreateSquadPayload) => void;
}

// --- Component ---
export function SquadMakingModal({
  open,
  onOpenChange,
  onCreate,
}: SquadMakingModalProps) {
  const [newSquadName, setNewSquadName] = useState('');
  const [newSquadDescription, setNewSquadDescription] = useState('');
  const [newSquadType, setNewSquadType] = useState<'public' | 'private'>('public');
  const [newSquadCategory, setNewSquadCategory] = useState('');
  const [inviteSearch, setInviteSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPeopleDetails, setSelectedPeopleDetails] = useState<InviteSearchResult[]>([]);
  const [inviteSearchResults, setInviteSearchResults] = useState<InviteSearchResult[]>([]);
  const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
  const { user } = useAuth();

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
      const filtered = data.filter((u) => u.id !== user?.id);
      setInviteSearchResults(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteSearch, user?.id]);

  const handleCreateSquad = () => {
    const payload: CreateSquadPayload = {
      name: newSquadName,
      description: newSquadDescription,
      type: newSquadType,
      category: newSquadCategory,
      members: selectedMembers,
    };
    onCreate?.(payload);
    onOpenChange(false);
    setNewSquadName('');
    setNewSquadDescription('');
    setNewSquadType('public');
    setNewSquadCategory('');
    setSelectedMembers([]);
    setSelectedPeopleDetails([]);
    setInviteSearch('');
  };

  const toggleMember = (person: InviteSearchResult) => {
    const memberId = person.id;
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
    setSelectedPeopleDetails((prev) =>
      prev.some((p) => p.id === memberId)
        ? prev.filter((p) => p.id !== memberId)
        : [...prev, person]
    );
  };

  // Selected people stay visible at top; then current search results (excluding already selected)
  const selectedSet = new Set(selectedMembers);
  const searchOnly = inviteSearchResults.filter((p) => !selectedSet.has(p.id));
  const displayList = [...selectedPeopleDetails, ...searchOnly];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[82vh] overflow-y-auto bg-[#FBF9F5] border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-4 border-b border-[#e7ded1]">
          <DialogTitle
            className="text-2xl"
            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
          >
            Create a New Squad
          </DialogTitle>
          <DialogDescription
            className="mt-2"
            style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
          >
            Build your community and connect with like-minded individuals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-6">
          {/* Squad Name */}
          <div className="space-y-2">
            <label
              className="text-sm block"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              Squad Name
            </label>
            <input
              type="text"
              value={newSquadName}
              onChange={(e) => setNewSquadName(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl border border-[#e7ded1] focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent transition-all"
              style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
              placeholder="e.g., Run Club, Coffee Lovers"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              className="text-sm block"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              Description
            </label>
            <textarea
              value={newSquadDescription}
              onChange={(e) => setNewSquadDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl border border-[#e7ded1] focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent transition-all resize-none"
              style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', lineHeight: 1.5 }}
              placeholder="Share what your squad is all about..."
              rows={4}
            />
          </div>

          {/* Privacy Type */}
          <div className="space-y-3">
            <label
              className="text-sm block"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              Privacy
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewSquadType('public')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  newSquadType === 'public'
                    ? 'border-[#d47455] bg-[#d4745510]'
                    : 'border-[#e7ded1] bg-white hover:border-[#c7bcaa]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      newSquadType === 'public' ? 'border-[#d47455]' : 'border-[#c7bcaa]'
                    }`}
                  >
                    {newSquadType === 'public' && (
                      <div className="w-3 h-3 rounded-full bg-[#d47455]" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-[#7b7b74]" />
                      <span
                        className="text-sm"
                        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                      >
                        Public
                      </span>
                    </div>
                    <p
                      className="text-xs"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                    >
                      Anyone can join
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setNewSquadType('private')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  newSquadType === 'private'
                    ? 'border-[#d47455] bg-[#d4745510]'
                    : 'border-[#e7ded1] bg-white hover:border-[#c7bcaa]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      newSquadType === 'private' ? 'border-[#d47455]' : 'border-[#c7bcaa]'
                    }`}
                  >
                    {newSquadType === 'private' && (
                      <div className="w-3 h-3 rounded-full bg-[#d47455]" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-[#7b7b74]" />
                      <span
                        className="text-sm"
                        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                      >
                        Private
                      </span>
                    </div>
                    <p
                      className="text-xs"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                    >
                      Invite only
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label
              className="text-sm block"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNewSquadCategory(cat.id)}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      newSquadCategory === cat.id
                        ? 'border-[#d47455] bg-[#d4745510]'
                        : 'border-[#e7ded1] bg-white hover:border-[#c7bcaa]'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <span
                      className="text-sm"
                      style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Invite Members */}
          <div className="space-y-3">
            <label
              className="text-sm block"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              Invite Members{' '}
              {selectedMembers.length > 0 && (
                <span
                  className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#d47455] text-white"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  {selectedMembers.length} selected
                </span>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7b7b74]" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#e7ded1] focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent transition-all"
                style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
              />
            </div>
            <div className="max-h-48 overflow-y-auto bg-white rounded-xl border border-[#e7ded1]">
              {inviteSearchLoading && (
                <div className="px-4 py-6 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                  Searching...
                </div>
              )}
              {!inviteSearchLoading && !inviteSearch.trim() && displayList.length === 0 && (
                <div className="px-4 py-6 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                  Search by name or email to invite members
                </div>
              )}
              {!inviteSearchLoading && inviteSearch.trim() && displayList.length === 0 && (
                <div className="px-4 py-6 text-center text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                  No users found
                </div>
              )}
              {!inviteSearchLoading && displayList.length > 0 && displayList.map((person) => (
                <div
                  key={person.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-[#f5f3eb] last:border-b-0 ${
                    selectedMembers.includes(person.id)
                      ? 'bg-[#d4745510]'
                      : 'hover:bg-[#FBF9F5]'
                  }`}
                  onClick={() => toggleMember(person)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e7ded1] flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#7b7b74]" />
                    </div>
                    <div>
                      <div
                        className="text-sm"
                        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                      >
                        {person.full_name || person.email?.split('@')[0] || 'Unknown'}
                      </div>
                      <div
                        className="text-xs"
                        style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                      >
                        {person.email}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      selectedMembers.includes(person.id) ? 'bg-[#d47455]' : 'bg-[#e7ded1]'
                    }`}
                  >
                    {selectedMembers.includes(person.id) ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Plus className="w-4 h-4 text-[#7b7b74]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#e7ded1] flex gap-3">
          <button
            className="flex-1 px-6 py-3 bg-white border-2 border-[#e7ded1] rounded-xl hover:bg-[#F1EFE7] transition-colors"
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#7b7b74' }}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-6 py-3 bg-[#d47455] text-white rounded-xl hover:bg-[#c06545] transition-colors shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
            onClick={handleCreateSquad}
            disabled={!newSquadName.trim() || !newSquadCategory}
          >
            Create Squad
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
