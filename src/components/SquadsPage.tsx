import { useState, useEffect, useRef } from 'react';
import { Search, Users, Plus, Dumbbell, PartyPopper, BookOpen, Gamepad2, ChevronRight } from 'lucide-react';
import { SquadsService, Squad } from '../services/squadsService';
import { FeedService } from '../services/feedService';
import { SquadMakingModal, CreateSquadPayload } from './SquadMakingModal';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface SquadsPageProps {
  onSquadClick: (squadId: string) => void;
}

export function SquadsPage({ onSquadClick }: SquadsPageProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my-squads'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningSquadId, setJoiningSquadId] = useState<string | null>(null);

  const categories = [
    { id: 'sports', label: 'Sports', icon: Dumbbell, color: '#7ba05b' },
    { id: 'social', label: 'Social', icon: PartyPopper, color: '#d47455' },
    { id: 'academic', label: 'Academic', icon: BookOpen, color: '#7b9fb8' },
    { id: 'hobbies', label: 'Hobbies', icon: Gamepad2, color: '#c89b6e' },
  ];

  const filterScrollRef = useRef<HTMLDivElement>(null);
  const filterScrollRefDesktop = useRef<HTMLDivElement>(null);

  const scrollFilterRight = () => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const scrollEl = isDesktop ? filterScrollRefDesktop.current : filterScrollRef.current;
    if (!scrollEl) return;
    scrollEl.scrollTo({ left: scrollEl.scrollWidth - scrollEl.clientWidth, behavior: 'smooth' });
  };

  // Load squads on mount
  useEffect(() => {
    if (user) {
      loadSquads();
    }
  }, [user]);

  const handleJoinSquad = async (e: React.MouseEvent, squadId: string) => {
    e.stopPropagation();
    try {
      setJoiningSquadId(squadId);
      await SquadsService.joinSquad(squadId);
      setSquads(prev => prev.map(s => s.id === squadId ? { ...s, is_joined: true, member_count: (s.member_count ?? 0) + 1 } : s));
    } catch (error) {
      console.error('Error joining squad:', error);
      toast.error('Could not join squad. Please try again.');
    } finally {
      setJoiningSquadId(null);
    }
  };

  const loadSquads = async () => {
    try {
      setLoading(true);
      const loadedSquads = await SquadsService.getSquads();
      setSquads(loadedSquads);
    } catch (error) {
      console.error('Error loading squads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSquadFromPayload = async (payload: CreateSquadPayload) => {
    if (!payload.name.trim() || !payload.category) {
      toast.error('Please fill in the required fields (name and category).');
      return;
    }
    const privacyType = payload.type === 'public' ? 'open' : 'private';
    try {
      setCreating(true);
      const squad = await SquadsService.createSquad(
        payload.name.trim(),
        payload.description.trim() || null,
        payload.category,
        null,
        null,
        privacyType
      );
      if (payload.avatarFile) {
        try {
          const avatarUrl = await SquadsService.uploadSquadAvatar(squad.id, payload.avatarFile);
          await SquadsService.updateSquad(squad.id, { avatar_url: avatarUrl });
        } catch (e) {
          console.warn('Could not upload squad avatar:', e);
        }
      }
      if (user?.id) {
        try {
          await FeedService.createSquadWelcomePost(squad.id, user.id);
        } catch (e) {
          console.warn('Could not create squad welcome post:', e);
        }
      }
      if (payload.members?.length) {
        await SquadsService.addSquadMembers(squad.id, payload.members);
      }
      setShowCreateModal(false);
      await loadSquads();
    } catch (error) {
      console.error('Error creating squad:', error);
      toast.error('Error creating squad. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    const cat = categories.find(c => c.id === category);
    return cat?.color || '#787771';
  };

  const mySquads = squads.filter(s => s.is_joined);
  // All squads tab: only show public (open) squads; private squads are invite-only
  const displaySquads = activeTab === 'my-squads' ? mySquads : squads.filter(s => s.type === 'open');

  const filteredSquads = displaySquads.filter(squad => {
    // Filter by category if selected
    if (selectedCategory && squad.category !== selectedCategory) {
      return false;
    }
    // Filter by search query
    return (
      squad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (squad.info && squad.info.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="h-full bg-white">
      {/* Mobile View */}
      <div className="md:hidden h-full flex flex-col">
        {/* Header - Fixed */}
        <div className="px-4 py-2.5 bg-white flex-shrink-0 border-b border-[#e7ded1]">
          <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787771]" />
              <input
                type="text"
                placeholder="Search by squad name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white rounded-full border border-[#e7ded1] text-sm focus:outline-none focus:border-[#d47455]"
                style={{ color: '#27251f' }}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-1.5 px-2.5 rounded-full bg-[#d47455] text-white text-xs font-semibold active:scale-95 transition-transform shadow-sm shrink-0 min-w-[4.5rem]"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-white">
          <h2 className="px-4 pt-4 pb-1 text-lg font-semibold text-[#27251f]">Explore squads</h2>
          {/* Filter carousel - all chips visible, arrow scrolls to end */}
          <div className="px-4 pt-2 pb-2 flex items-center gap-2">
            <div ref={filterScrollRef} className="filter-scroll flex-1 min-w-0 overflow-x-auto overflow-y-hidden flex gap-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button
                onClick={() => { setActiveTab('all'); setSelectedCategory(null); }}
                className={`shrink-0 py-1.5 px-3 rounded-xl text-xs transition-all ${
                  activeTab === 'all' && !selectedCategory ? 'bg-[#d47455] text-white shadow-sm' : 'bg-white text-[#787771]'
                }`}
                style={{ fontWeight: 600 }}
              >
                All
              </button>
              <button
                onClick={() => { setActiveTab('my-squads'); setSelectedCategory(null); }}
                className={`shrink-0 py-1.5 px-3 rounded-xl text-xs transition-all ${
                  activeTab === 'my-squads' ? 'bg-[#d47455] text-white shadow-sm' : 'bg-white text-[#787771]'
                }`}
                style={{ fontWeight: 600 }}
              >
                My Squads
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveTab('all'); setSelectedCategory(cat.id); }}
                  className={`shrink-0 py-1.5 px-3 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
                    activeTab === 'all' && selectedCategory === cat.id ? 'bg-[#d47455] text-white shadow-sm' : 'bg-white text-[#787771]'
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  <cat.icon className="w-4 h-4" style={{ color: activeTab === 'all' && selectedCategory === cat.id ? undefined : cat.color }} />
                  {cat.label}
                </button>
              ))}
            </div>
            <button onClick={scrollFilterRight} className="shrink-0 w-9 h-9 rounded-full bg-white border border-[#e7ded1] flex items-center justify-center text-[#787771] active:bg-[#f5f3eb] transition-colors" aria-label="Scroll filters">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Squads List */}
          <div className="px-4 pb-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center min-h-[60vh] py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
              </div>
            ) : filteredSquads.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p style={{ color: '#787771' }}>
                  {activeTab === 'my-squads' ? 'No squads joined yet' : 'No squads found'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-lg font-semibold text-[#27251f] mb-2">Recommended for you</p>
                {filteredSquads.map((squad) => {
                const squadColor = getCategoryColor(squad.category);
                
                return (
                  <div
                    key={squad.id}
                    onClick={() => onSquadClick(squad.id)}
                    className="bg-white rounded-2xl p-3 border border-[#d4cfc4] active:bg-[#f5f5f5] transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: `${squadColor}20`, borderRadius: '50%' }}
                      >
                        {squad.avatar_url ? (
                          <img src={squad.avatar_url} alt={squad.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5" style={{ color: squadColor }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <h3 
                            className="text-base"
                            style={{ fontWeight: 600, color: '#27251f' }}
                          >
                            {squad.name}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {squad.is_joined ? (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[11px]"
                                style={{ 
                                  fontWeight: 600,
                                  backgroundColor: '#e8f5e9',
                                  color: '#4caf50'
                                }}
                              >
                                Joined
                              </span>
                            ) : (
                              <button
                                onClick={(e) => handleJoinSquad(e, squad.id)}
                                disabled={joiningSquadId === squad.id}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#d47455] text-white active:opacity-80 disabled:opacity-60"
                              >
                                {joiningSquadId === squad.id ? '…' : 'Join'}
                              </button>
                            )}
                            <ChevronRight className="w-4 h-4 text-[#c7bcaa]" />
                          </div>
                        </div>
                        <span 
                          className="text-xs block"
                          style={{ color: '#787771', lineHeight: 1.35 }}
                        >
                          {squad.member_count || 0} members
                        </span>
                      </div>
                    </div>
                    {squad.info?.trim() && (
                      <p 
                        className="text-xs line-clamp-2 overflow-hidden mt-2"
                        style={{ color: '#787771', lineHeight: 1.35 }}
                      >
                        {squad.info}
                      </p>
                    )}
                  </div>
                );
              })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block h-full flex flex-col">
        <div className="flex-shrink-0 px-8 py-2.5 border-b border-[#e7ded1] bg-white">
          <div className="flex items-stretch gap-3">
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787771]" />
              <input
                type="text"
                placeholder="Search by squad name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 bg-white rounded-full border border-[#e7ded1] text-sm focus:outline-none focus:border-[#d47455]"
                style={{ color: '#27251f' }}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-3 rounded-full bg-[#d47455] text-white text-xs font-semibold hover:bg-[#c06848] transition-colors shrink-0 min-w-[4.5rem]"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">

        <h2 className="text-xl font-semibold text-[#27251f] mb-3">Explore squads</h2>
        <div className="flex items-center gap-2 mb-6">
          <div ref={filterScrollRefDesktop} className="filter-scroll flex-1 min-w-0 overflow-x-auto overflow-y-hidden flex gap-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => { setActiveTab('all'); setSelectedCategory(null); }}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm transition-colors ${
                activeTab === 'all' && !selectedCategory ? 'bg-[#d47455] text-white' : 'bg-white text-[#787771] hover:bg-[#f5f3eb]'
              }`}
              style={{ fontWeight: 500 }}
            >
              All
            </button>
            <button
              onClick={() => { setActiveTab('my-squads'); setSelectedCategory(null); }}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm transition-colors ${
                activeTab === 'my-squads' ? 'bg-[#d47455] text-white' : 'bg-white text-[#787771] hover:bg-[#f5f3eb]'
              }`}
              style={{ fontWeight: 500 }}
            >
              My Squads ({mySquads.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveTab('all'); setSelectedCategory(cat.id); }}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'all' && selectedCategory === cat.id ? 'bg-[#d47455] text-white' : 'bg-white text-[#787771] hover:bg-[#f5f3eb]'
                }`}
                style={{ fontWeight: 500 }}
              >
                <cat.icon className="w-4 h-4" style={{ color: activeTab === 'all' && selectedCategory === cat.id ? undefined : cat.color }} />
                {cat.label}
              </button>
            ))}
          </div>
          <button onClick={scrollFilterRight} className="shrink-0 w-9 h-9 rounded-full bg-white border border-[#e7ded1] flex items-center justify-center text-[#787771] hover:bg-[#f5f3eb] transition-colors" aria-label="Scroll filters">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 flex items-center justify-center min-h-[60vh] py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
            </div>
          ) : filteredSquads.length === 0 ? (
            <div className="col-span-2 flex items-center justify-center py-12">
              <p style={{ color: '#787771' }}>
                {activeTab === 'my-squads' ? 'No squads joined yet' : 'No squads found'}
              </p>
            </div>
          ) : (
            <>
              <p className="col-span-2 text-xl font-semibold text-[#27251f] mb-2">Recommended for you</p>
              {filteredSquads.map((squad) => {
              const squadColor = getCategoryColor(squad.category);
              
              return (
                <div
                  key={squad.id}
                  onClick={() => onSquadClick(squad.id)}
                  className="bg-white rounded-2xl p-4 border border-[#d4cfc4] cursor-pointer hover:bg-[#f5f5f5] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                      style={{ backgroundColor: `${squadColor}20`, borderRadius: '50%' }}
                    >
                      {squad.avatar_url ? (
                        <img src={squad.avatar_url} alt={squad.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6" style={{ color: squadColor }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h3 
                          className="text-base"
                          style={{ fontWeight: 600, color: '#27251f' }}
                        >
                          {squad.name}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {squad.is_joined ? (
                            <span 
                              className="inline-block px-2 py-0.5 rounded-full text-xs"
                              style={{ 
                                fontWeight: 600,
                                backgroundColor: '#e8f5e9',
                                color: '#4caf50'
                              }}
                            >
                              Joined
                            </span>
                          ) : (
                            <button
                              onClick={(e) => handleJoinSquad(e, squad.id)}
                              disabled={joiningSquadId === squad.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#d47455] text-white hover:bg-[#c06848] disabled:opacity-60 transition-colors"
                            >
                              {joiningSquadId === squad.id ? '…' : 'Join'}
                            </button>
                          )}
                        </div>
                      </div>
                      <span 
                        className="text-xs block"
                        style={{ color: '#787771', lineHeight: 1.35 }}
                      >
                        {squad.member_count || 0} members
                      </span>
                    </div>
                  </div>
                  {squad.info?.trim() && (
                    <p 
                      className="text-xs line-clamp-2 overflow-hidden mt-2"
                      style={{ color: '#787771', lineHeight: 1.35 }}
                    >
                      {squad.info}
                    </p>
                  )}
                </div>
              );
            })}
            </>
          )}
        </div>
        </div>
      </div>

      <SquadMakingModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreate={handleCreateSquadFromPayload}
      />
    </div>
  );
}