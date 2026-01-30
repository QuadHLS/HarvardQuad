import { useState, useEffect } from 'react';
import { Search, Users, Plus, Dumbbell, PartyPopper, BookOpen, Gamepad2, ChevronRight, ChevronDown, Globe, Lock } from 'lucide-react';
import { SquadsService, Squad } from '../services/squadsService';
import { SquadMakingModal, CreateSquadPayload } from './SquadMakingModal';
import { useAuth } from '../contexts/AuthContext';

interface SquadsPageProps {
  onSquadClick: (squadId: string) => void;
}

export function SquadsPage({ onSquadClick }: SquadsPageProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my-squads'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const categories = [
    { id: 'sports', label: 'Sports', icon: Dumbbell, color: '#7ba05b' },
    { id: 'social', label: 'Social', icon: PartyPopper, color: '#d47455' },
    { id: 'academic', label: 'Academic', icon: BookOpen, color: '#7b9fb8' },
    { id: 'hobbies', label: 'Hobbies', icon: Gamepad2, color: '#c89b6e' },
  ];

  // Load squads on mount
  useEffect(() => {
    if (user) {
      loadSquads();
    }
  }, [user]);

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
      alert('Please fill in the required fields (name and category).');
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
      if (payload.members?.length) {
        await SquadsService.addSquadMembers(squad.id, payload.members);
      }
      setShowCreateModal(false);
      await loadSquads();
    } catch (error) {
      console.error('Error creating squad:', error);
      alert('Error creating squad. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    const cat = categories.find(c => c.id === category);
    return cat?.color || '#7b7b74';
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
    <div className="h-full bg-[#FBF9F5]">
      {/* Mobile View */}
      <div className="md:hidden h-full flex flex-col">
        {/* Header - Fixed */}
        <div className="px-4 pt-6 pb-4 bg-[#FBF9F5] flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h1 
              className="text-3xl"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              Squads
            </h1>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="w-12 h-12 rounded-full bg-[#d47455] flex items-center justify-center active:scale-95 transition-transform shadow-md"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7b7b74]" />
            <input
              type="text"
              placeholder="Search squads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-0 text-sm shadow-sm"
              style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 relative">
            {activeTab === 'all' ? (
              <div className="flex-1 relative">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full py-2.5 px-4 rounded-xl text-sm bg-[#d47455] text-white shadow-sm flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <span className="flex-1 text-center">
                    {selectedCategory 
                      ? categories.find(c => c.id === selectedCategory)?.label || 'All Squads'
                      : 'All Squads'
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCategoryDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-[60]"
                      onClick={() => setShowCategoryDropdown(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#e7ded1] z-[70] overflow-hidden">
                      <button
                        onClick={() => {
                          setSelectedCategory(null);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full py-2.5 px-4 text-sm text-left transition-colors ${
                          selectedCategory === null
                            ? 'bg-[#f5f3eb] text-[#d47455]'
                            : 'text-[#3d3d3a] hover:bg-[#f5f3eb]'
                        }`}
                        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                      >
                        All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full py-2.5 px-4 text-sm text-left transition-colors flex items-center gap-2 ${
                            selectedCategory === cat.id
                              ? 'bg-[#f5f3eb] text-[#d47455]'
                              : 'text-[#3d3d3a] hover:bg-[#f5f3eb]'
                          }`}
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                        >
                          <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSelectedCategory(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm transition-all bg-white text-[#7b7b74]"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                All Squads
              </button>
            )}
            <button
              onClick={() => {
                setActiveTab('my-squads');
                setSelectedCategory(null);
                setShowCategoryDropdown(false);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm transition-all ${
                activeTab === 'my-squads'
                  ? 'bg-[#d47455] text-white shadow-sm'
                  : 'bg-white text-[#7b7b74]'
              }`}
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
            >
              My Squads
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-[#FBF9F5]">
          {/* Squads List */}
          <div className="px-4 pb-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center min-h-[60vh] py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
              </div>
            ) : filteredSquads.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                  {activeTab === 'my-squads' ? 'No squads joined yet' : 'No squads found'}
                </p>
              </div>
            ) : (
              filteredSquads.map((squad) => {
                const Icon = squad.type === 'open' ? Globe : Lock;
                const squadColor = getCategoryColor(squad.category);
                
                return (
                  <div
                    key={squad.id}
                    onClick={() => onSquadClick(squad.id)}
                    className="bg-white rounded-2xl p-4 active:bg-[#f5f3eb] transition-colors shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${squadColor}20` }}
                      >
                        <Users className="w-7 h-7" style={{ color: squadColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 
                            className="text-lg"
                            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                          >
                            {squad.name}
                          </h3>
                          <ChevronRight className="w-5 h-5 flex-shrink-0 text-[#c7bcaa] mt-1" />
                        </div>
                        <p 
                          className="text-sm mb-3 line-clamp-2"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74', lineHeight: 1.4 }}
                        >
                          {squad.info || 'No description'}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-4 h-4 text-[#7b7b74]" />
                            <span 
                              className="text-xs"
                              style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                            >
                              {squad.member_count || 0} members
                            </span>
                          </div>
                          {squad.is_joined && (
                            <span 
                              className="px-2.5 py-1 rounded-full text-xs"
                              style={{ 
                                fontFamily: 'Arial, sans-serif',
                                fontWeight: 600,
                                backgroundColor: '#e8f5e9',
                                color: '#4caf50'
                              }}
                            >
                              Joined
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Desktop View - Keep existing design */}
      <div className="hidden md:block p-12">
        <div className="flex items-center justify-between mb-8">
          <h1 
            className="text-[56px] text-[#3d3d3a]"
            style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}
          >
            Squads
          </h1>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#d47455] text-white rounded-xl hover:bg-[#c06545] transition-colors flex items-center gap-2"
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
          >
            <Plus className="w-5 h-5" />
            Create Squad
          </button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7b7b74]" />
            <input
              type="text"
              placeholder="Search squads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-[#e7ded1]"
              style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
            />
          </div>
        </div>

        <div className="flex gap-3 mb-8 relative">
          {activeTab === 'all' ? (
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="px-6 py-2 rounded-xl bg-[#d47455] text-white flex items-center justify-center gap-2 min-w-[140px]"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}
              >
                <span className="flex-1 text-center">
                  {selectedCategory 
                    ? categories.find(c => c.id === selectedCategory)?.label || 'All Squads'
                    : 'All Squads'
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showCategoryDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setShowCategoryDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-[#e7ded1] z-[70] overflow-hidden min-w-[140px]">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full py-2.5 px-4 text-sm text-left transition-colors ${
                        selectedCategory === null
                          ? 'bg-[#f5f3eb] text-[#d47455]'
                          : 'text-[#3d3d3a] hover:bg-[#f5f3eb]'
                      }`}
                      style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full py-2.5 px-4 text-sm text-left transition-colors flex items-center gap-2 ${
                          selectedCategory === cat.id
                            ? 'bg-[#f5f3eb] text-[#d47455]'
                            : 'text-[#3d3d3a] hover:bg-[#f5f3eb]'
                        }`}
                        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}
                      >
                        <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory(null);
              }}
              className="px-6 py-2 rounded-xl transition-colors bg-white text-[#7b7b74] hover:bg-[#f5f3eb]"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}
            >
              All Squads
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('my-squads');
              setSelectedCategory(null);
              setShowCategoryDropdown(false);
            }}
            className={`px-6 py-2 rounded-xl transition-colors ${
              activeTab === 'my-squads'
                ? 'bg-[#d47455] text-white'
                : 'bg-white text-[#7b7b74] hover:bg-[#f5f3eb]'
            }`}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}
          >
            My Squads ({mySquads.length})
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 flex items-center justify-center min-h-[60vh] py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
            </div>
          ) : filteredSquads.length === 0 ? (
            <div className="col-span-2 flex items-center justify-center py-12">
              <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                {activeTab === 'my-squads' ? 'No squads joined yet' : 'No squads found'}
              </p>
            </div>
          ) : (
            filteredSquads.map((squad) => {
              const Icon = squad.type === 'open' ? Globe : Lock;
              const squadColor = getCategoryColor(squad.category);
              
              return (
                <div
                  key={squad.id}
                  onClick={() => onSquadClick(squad.id)}
                  className="bg-white rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${squadColor}20` }}
                    >
                      <Users className="w-8 h-8" style={{ color: squadColor }} />
                    </div>
                    <div className="flex-1">
                      <h3 
                        className="text-xl mb-1"
                        style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                      >
                        {squad.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#7b7b74]" />
                        <span 
                          className="text-sm"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                        >
                          {squad.member_count || 0} members
                        </span>
                      </div>
                    </div>
                  </div>
                  <p 
                    className="text-sm mb-4"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    {squad.info || 'No description'}
                  </p>
                  {squad.is_joined && (
                    <span 
                      className="inline-block px-3 py-1 rounded-full text-sm"
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        fontWeight: 600,
                        backgroundColor: '#e8f5e9',
                        color: '#4caf50'
                      }}
                    >
                      Joined
                    </span>
                  )}
                </div>
              );
            })
          )}
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