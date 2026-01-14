import { useState } from 'react';
import { Search, Users, Lock, Globe, Plus, Dumbbell, PartyPopper, BookOpen, Gamepad2, UtensilsCrossed, Building2, ChevronRight, Sparkles } from 'lucide-react';

type SquadType = 'open' | 'locked' | 'private';

interface Squad {
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

interface SquadsPageProps {
  onSquadClick: (squadId: string) => void;
}

export function SquadsPage({ onSquadClick }: SquadsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my-squads'>('all');

  const categories = [
    { id: 'sports', label: 'Sports', icon: Dumbbell, color: '#7ba05b' },
    { id: 'social', label: 'Social', icon: PartyPopper, color: '#d47455' },
    { id: 'academic', label: 'Academic', icon: BookOpen, color: '#7b9fb8' },
    { id: 'hobbies', label: 'Hobbies', icon: Gamepad2, color: '#c89b6e' }
  ];

  const squads: Squad[] = [
    {
      id: '1',
      name: 'Run Club',
      description: 'Morning runs around campus. All paces welcome!',
      members: 156,
      type: 'open',
      category: 'sports',
      isJoined: true,
      color: '#7ba05b'
    },
    {
      id: '2',
      name: 'Coffee Lovers',
      description: 'Weekly cafe tours and coffee tastings',
      members: 89,
      type: 'open',
      category: 'social',
      isJoined: true,
      color: '#d47455'
    },
    {
      id: '3',
      name: 'Contracts Study Group',
      description: 'Weekly case reviews and exam prep',
      members: 24,
      type: 'locked',
      category: 'academic',
      isJoined: false,
      color: '#7b9fb8'
    },
    {
      id: '4',
      name: 'Board Game Night',
      description: 'Thursday game nights at the library',
      members: 42,
      type: 'open',
      category: 'hobbies',
      isJoined: false,
      color: '#c89b6e'
    },
    {
      id: '5',
      name: 'Yoga & Wellness',
      description: 'Daily yoga sessions and mindfulness',
      members: 67,
      type: 'open',
      category: 'sports',
      isJoined: true,
      color: '#7ba05b'
    },
    {
      id: '6',
      name: 'Moot Court Prep',
      description: 'Practice oral arguments and feedback',
      members: 31,
      type: 'locked',
      category: 'academic',
      isJoined: false,
      color: '#7b9fb8'
    }
  ];

  const mySquads = squads.filter(s => s.isJoined);
  const displaySquads = activeTab === 'my-squads' ? mySquads : squads;

  const filteredSquads = displaySquads.filter(squad =>
    squad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    squad.description.toLowerCase().includes(searchQuery.toLowerCase())
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
            <button className="w-12 h-12 rounded-full bg-[#d47455] flex items-center justify-center active:scale-95 transition-transform shadow-md">
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
            {filteredSquads.map((squad) => {
              const Icon = squad.type === 'open' ? Globe : squad.type === 'locked' ? Lock : Users;
              
              return (
                <div
                  key={squad.id}
                  onClick={() => onSquadClick(squad.id)}
                  className="bg-white rounded-2xl p-4 active:bg-[#f5f3eb] transition-colors shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${squad.color}20` }}
                    >
                      <Users className="w-7 h-7" style={{ color: squad.color }} />
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
                        {squad.description}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-4 h-4 text-[#7b7b74]" />
                          <span 
                            className="text-xs"
                            style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                          >
                            {squad.members} members
                          </span>
                        </div>
                        {squad.isJoined && (
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
            })}
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
          {filteredSquads.map((squad) => {
            const Icon = squad.type === 'open' ? Globe : squad.type === 'locked' ? Lock : Users;
            
            return (
              <div
                key={squad.id}
                onClick={() => onSquadClick(squad.id)}
                className="bg-white rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${squad.color}20` }}
                  >
                    <Users className="w-8 h-8" style={{ color: squad.color }} />
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
                        {squad.members} members
                      </span>
                    </div>
                  </div>
                </div>
                <p 
                  className="text-sm mb-4"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                >
                  {squad.description}
                </p>
                {squad.isJoined && (
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
          })}
        </div>
      </div>
    </div>
  );
}