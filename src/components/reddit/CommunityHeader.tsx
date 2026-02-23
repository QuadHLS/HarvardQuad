import { ChevronDown, Plus } from 'lucide-react';
import type { Squad } from '../../services/squadsService';

function formatCategory(cat: string): string {
  if (!cat) return 'Community';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

interface CommunityHeaderProps {
  squad: Squad;
  squadColor: string;
  isJoined: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  joining: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onNewPost?: () => void;
  onSeeMore?: () => void;
}

export function CommunityHeader({
  squad,
  squadColor,
  isJoined,
  isCreator,
  isAdmin,
  joining,
  onJoin,
  onLeave,
  onNewPost,
  onSeeMore,
}: CommunityHeaderProps) {
  const showJoinOrJoined = isJoined || !isCreator;
  const mc = squad.member_count ?? 0;
  const statsLabel = mc === 1 ? '1 member' : `${mc} members`;

  return (
    <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0"
            style={{ backgroundColor: squadColor + '20' }}
          >
            {squad.avatar_url ? (
              <img src={squad.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-semibold" style={{ color: squadColor }}>
                {squad.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#1c1c1c] truncate">{squad.name}</h1>
            <p className="text-xs text-[#7c7c7c] mt-0.5">{statsLabel}</p>
          </div>
        </div>
        {showJoinOrJoined && (
          <div className="flex items-center gap-2 mt-2.5">
            {isJoined ? (
              <>
                {onNewPost && (
                  <button
                    type="button"
                    onClick={onNewPost}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#7c7c7c] bg-transparent text-[#1c1c1c] text-xs font-semibold hover:bg-[#f5f5f5] transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create post
                  </button>
                )}
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onLeave(); }}
                    className="px-4 py-1.5 rounded-full bg-[#e4e4e4] text-[#1c1c1c] text-sm font-semibold hover:bg-[#d7d7d7] transition-colors"
                  >
                    Joined
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onJoin}
                disabled={joining}
                className="px-4 py-1.5 rounded-full bg-[#d47455] text-white text-sm font-semibold hover:bg-[#c06545] disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                {joining ? '…' : 'Join'}
              </button>
            )}
          </div>
        )}
        {squad.info?.trim() && (
          <p className="text-sm text-[#1c1c1c] mt-3 leading-relaxed line-clamp-3">
            {squad.info.trim()}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3 text-sm">
          <button type="button" onClick={onSeeMore} className="text-[#d47455] font-medium hover:underline">
            See more
          </button>
          <span className="text-[#d7d7d7]">|</span>
          <span className="text-[#1c1c1c] text-sm font-medium">
            {formatCategory(squad.category)}
          </span>
        </div>
      </div>
  );
}
