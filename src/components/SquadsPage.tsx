import { useState, useEffect } from 'react';
import { Search, Users, Lock, Globe, Plus, Dumbbell, PartyPopper, BookOpen, UtensilsCrossed, Building2, ChevronRight, Sparkles } from 'lucide-react';
import { SquadsService, Squad } from '../services/squadsService';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';

interface SquadsPageProps {
  onSquadClick: (squadId: string) => void;
}

export function SquadsPage({ onSquadClick }: SquadsPageProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my-squads'>('all');
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create squad form state
  const [squadName, setSquadName] = useState('');
  const [squadInfo, setSquadInfo] = useState('');
  const [squadCategory, setSquadCategory] = useState('');
  const [meetingTimes, setMeetingTimes] = useState('');
  const [location, setLocation] = useState('');
  const [privacyType, setPrivacyType] = useState<'open' | 'locked' | 'private'>('open');
  const [creating, setCreating] = useState(false);

  const categories = [
    { id: 'sports', label: 'Sports', icon: Dumbbell, color: '#7ba05b' },
    { id: 'social', label: 'Social', icon: PartyPopper, color: '#d47455' },
    { id: 'academic', label: 'Academic', icon: BookOpen, color: '#7b9fb8' }
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

  const handleCreateSquad = async () => {
    if (!squadName.trim() || !squadCategory) {
      alert('Please fill in the required fields (name and category).');
      return;
    }

    try {
      setCreating(true);
      await SquadsService.createSquad(
        squadName.trim(),
        squadInfo.trim() || null,
        squadCategory,
        meetingTimes.trim() || null,
        location.trim() || null,
        privacyType
      );
      
      // Reset form
      setSquadName('');
      setSquadInfo('');
      setSquadCategory('');
      setMeetingTimes('');
      setLocation('');
      setPrivacyType('open');
      setShowCreateModal(false);
      
      // Reload squads
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
  const displaySquads = activeTab === 'my-squads' ? mySquads : squads;

  const filteredSquads = displaySquads.filter(squad =>
    squad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (squad.info && squad.info.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm transition-all ${
                activeTab === 'all'
                  ? 'bg-[#d47455] text-white shadow-sm'
                  : 'bg-white text-[#7b7b74]'
              }`}
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
            >
              All Squads
            </button>
            <button
              onClick={() => setActiveTab('my-squads')}
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
          {/* Categories */}
          {activeTab === 'all' && (
            <div className="px-4 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      className="flex-shrink-0 bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 active:scale-95 transition-transform shadow-sm"
                    >
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <span 
                        className="text-sm whitespace-nowrap"
                        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Squads List */}
          <div className="px-4 pb-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>Loading squads...</p>
              </div>
            ) : filteredSquads.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                  {activeTab === 'my-squads' ? 'No squads joined yet' : 'No squads found'}
                </p>
              </div>
            ) : (
              filteredSquads.map((squad) => {
                const Icon = squad.type === 'open' ? Globe : squad.type === 'locked' ? Lock : Users;
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

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-2 rounded-xl transition-colors ${
              activeTab === 'all'
                ? 'bg-[#d47455] text-white'
                : 'bg-white text-[#7b7b74] hover:bg-[#f5f3eb]'
            }`}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}
          >
            All Squads
          </button>
          <button
            onClick={() => setActiveTab('my-squads')}
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
            <div className="col-span-2 flex items-center justify-center py-12">
              <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>Loading squads...</p>
            </div>
          ) : filteredSquads.length === 0 ? (
            <div className="col-span-2 flex items-center justify-center py-12">
              <p style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                {activeTab === 'my-squads' ? 'No squads joined yet' : 'No squads found'}
              </p>
            </div>
          ) : (
            filteredSquads.map((squad) => {
              const Icon = squad.type === 'open' ? Globe : squad.type === 'locked' ? Lock : Users;
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

      {/* Create Squad Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-lg border border-[#e7ded1] p-6 shadow-lg z-[75]">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ fontFamily: 'Lora, serif', color: '#3d3d3a' }}
              >
                Create New Squad
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-[#f5f3eb] flex items-center justify-center text-[#3d3d3a] hover:bg-[#e8e5dc]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Squad Name */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}>
                  Squad Name <span className="text-[#d47455]">*</span>
                </label>
                <Input
                  placeholder="Enter squad name"
                  value={squadName}
                  onChange={(e) => setSquadName(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Squad Info/Description */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}>
                  Description
                </label>
                <textarea
                  placeholder="Describe your squad..."
                  value={squadInfo}
                  onChange={(e) => setSquadInfo(e.target.value)}
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-[#e7ded1] bg-white text-sm resize-none"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}>
                  Category <span className="text-[#d47455]">*</span>
                </label>
              <Select value={squadCategory} onValueChange={setSquadCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>

              {/* Meeting Times */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}>
                  Meeting Times
                </label>
                <Input
                  placeholder="e.g., Monday, Wednesday, Friday • 6:30 AM"
                  value={meetingTimes}
                  onChange={(e) => setMeetingTimes(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}>
                  Location
                </label>
                <Input
                  placeholder="e.g., Campus Quad"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Privacy Type */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}>
                  Privacy
                </label>
              <Select value={privacyType} onValueChange={(value) => setPrivacyType(value as 'open' | 'locked' | 'private')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                  <SelectItem value="open" className="[&>span:has(svg)]:!hidden pr-2">Open - Anyone can join</SelectItem>
                  <SelectItem value="locked" className="[&>span:has(svg)]:!hidden pr-2">Locked - Request to join</SelectItem>
                  <SelectItem value="private" className="[&>span:has(svg)]:!hidden pr-2">Private - Invite only</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="min-w-[96px] justify-center bg-[#f5f3eb] hover:bg-[#e8e5dc]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSquad}
                disabled={creating || !squadName.trim() || !squadCategory}
                style={{ backgroundColor: '#d47455', color: 'white' }}
                className="min-w-[96px] justify-center"
              >
                {creating ? 'Creating...' : 'Create Squad'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}