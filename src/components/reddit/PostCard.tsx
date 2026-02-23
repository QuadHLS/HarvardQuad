import React from 'react';
import { Heart, MessageSquare, Pin } from 'lucide-react';
import type { FeedPostWithAuthor, ProfileRow } from '../../services/feedService';
import { getEmbedInfo } from '../../lib/embedUrl';

const QUADLY_AVATAR_URL = 'https://api.dicebear.com/9.x/thumbs/svg?seed=quadly';

interface PostCardProps {
  post: FeedPostWithAuthor;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorProfile: ProfileRow | null | undefined;
  timeStr: string;
  /** Reddit-style short time (e.g. "6d" instead of "6d ago") */
  timeShort?: string;
  onOpen: () => void;
  onVote: (e: React.MouseEvent) => void;
  onPin?: (e: React.MouseEvent) => void;
  onOpenUserProfile?: (userId: string) => void;
  userId?: string;
}

function AuthorAvatar({
  profile,
  color,
  initials,
  avatarUrl,
}: {
  profile: ProfileRow | null | undefined;
  color: string;
  initials: string;
  avatarUrl?: string | null;
}) {
  const [imgError, setImgError] = React.useState(false);
  const url = avatarUrl ?? profile?.avatar_url?.trim();
  const showImg = !!url && !imgError;

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0"
      style={showImg ? undefined : { backgroundColor: color }}
    >
      {showImg ? (
        <img
          src={url!}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-xs font-semibold text-white">{initials}</span>
      )}
    </div>
  );
}

function EmbedBlock({ url, className = '' }: { url: string; className?: string }) {
  const embed = getEmbedInfo(url);
  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`text-[#d47455] text-sm font-medium hover:underline block ${className}`}>
        {url}
      </a>
    );
  }
  return (
    <div className={`rounded-lg overflow-hidden bg-[#f5f3eb] ${className}`} style={{ aspectRatio: embed.aspectRatio, maxHeight: 360 }}>
      <iframe
        src={embed.embedUrl}
        title="Embedded"
        className="rounded-lg w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export function PostCard({
  post,
  authorName,
  authorInitials,
  authorColor,
  authorProfile,
  timeStr,
  onOpen,
  onVote,
  onPin,
  onOpenUserProfile,
  userId,
  timeShort,
}: PostCardProps) {
  const avatarUrl = post.override_author_name?.trim() ? QUADLY_AVATAR_URL : authorProfile?.avatar_url;
  const displayTime = timeShort ?? timeStr;

  return (
    <div
      className="bg-white rounded-xl border border-[#e4e4e4] shadow-sm overflow-hidden cursor-pointer"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {post.author_id !== userId && onOpenUserProfile ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUserProfile(post.author_id);
                }}
                className="flex items-center gap-2 min-w-0 flex-1 text-left"
              >
                <AuthorAvatar
                  profile={authorProfile}
                  color={post.override_author_name ? '#d47455' : authorColor}
                  initials={authorInitials}
                  avatarUrl={post.override_author_name ? QUADLY_AVATAR_URL : undefined}
                />
                <span className="text-sm text-[#7c7c7c] truncate">{authorName}</span>
                <span className="text-xs text-[#7c7c7c] shrink-0">{displayTime}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <AuthorAvatar
                  profile={authorProfile}
                  color={post.override_author_name ? '#d47455' : authorColor}
                  initials={authorInitials}
                  avatarUrl={post.override_author_name ? QUADLY_AVATAR_URL : undefined}
                />
                <span className="text-sm text-[#7c7c7c] truncate">{authorName}</span>
                <span className="text-xs text-[#7c7c7c] shrink-0">{displayTime}</span>
              </div>
            )}
          </div>
          {onPin && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPin(e); }}
              className="p-1.5 rounded text-[#7c7c7c] hover:bg-[#f5f5f5] shrink-0"
              aria-label={post.current_user_pinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="w-4 h-4" style={post.current_user_pinned ? { color: '#d97757', fill: '#d97757' } : undefined} fill={post.current_user_pinned ? '#d97757' : 'none'} />
            </button>
          )}
        </div>

        <h3 className="text-base font-bold text-[#1c1c1c] mb-2 leading-tight">{post.title}</h3>

        {post.post_type === 'poll' && post.poll_options && post.poll_options.length > 0 ? (
          <div className="mb-2 space-y-2">
            {post.poll_options.map((opt) => {
              const total = post.poll_options!.reduce((s, o) => s + (o.vote_count ?? 0), 0);
              const pct = total > 0 ? Math.round(((opt.vote_count ?? 0) / total) * 100) : 0;
              const isSelected = post.current_user_vote_option_id === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`w-full text-left rounded-lg border-2 px-3 py-2 transition-colors ${isSelected ? 'border-[#d47455] bg-[#fff3e0]' : 'border-[#e7ded1]'}`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm font-medium text-[#27251f]">{opt.option_text}</span>
                    <span className="text-xs text-[#787771]">{opt.vote_count ?? 0} votes ({pct}%)</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#f5f3eb] overflow-hidden">
                    <div className="h-full rounded-full bg-[#d47455]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {post.content && (
              <p className="text-sm text-[#1c1c1c] mb-2 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            )}
            {post.image_path && (
              <div className="rounded-lg overflow-hidden max-h-64 mb-2 bg-[#f5f3eb]">
                <img
                  src={post.image_path}
                  alt=""
                  className="w-full max-h-64 object-contain"
                />
              </div>
            )}
            {post.url && (
              <div className="mb-2">
                <EmbedBlock url={post.url} />
              </div>
            )}
          </>
        )}
      </div>

      <div
        className="border-t border-[#e4e4e4] px-4 py-2 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onVote}
          className="flex items-center gap-1 py-1.5 px-2.5 rounded-full border border-[#e4e4e4] bg-transparent text-[#7c7c7c] hover:text-[#ff4500] hover:border-[#ff4500]/80 transition-colors"
        >
          <Heart
            size={18}
            className={post.current_user_hearted ? 'text-[#ff4500]' : ''}
            fill={post.current_user_hearted ? '#ff4500' : 'none'}
          />
          <span className="text-sm font-medium text-[#1c1c1c]">{post.heart_count ?? 0}</span>
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1 py-1.5 px-2.5 rounded-full border border-[#e4e4e4] bg-transparent text-[#7c7c7c] hover:text-[#0079d3] hover:border-[#0079d3]/80 transition-colors"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-medium text-[#1c1c1c]">{post.reply_count ?? 0}</span>
        </button>
      </div>
    </div>
  );
}
