import React from 'react';
import { Pin, ChevronUp } from 'lucide-react';
import { PostCard } from './PostCard';
import { FeedService } from '../../services/feedService';
import type { FeedPostWithAuthor } from '../../services/feedService';

interface HighlightsSectionProps {
  pinnedPosts?: FeedPostWithAuthor[];
  pinnedHandlersRef?: React.MutableRefObject<{
    onOpen: (post: FeedPostWithAuthor) => void;
    onVote: (e: React.MouseEvent, post: FeedPostWithAuthor) => void;
    onPin: (e: React.MouseEvent, post: FeedPostWithAuthor) => void;
  } | null>;
  userId?: string;
}

export function HighlightsSection({ pinnedPosts = [], pinnedHandlersRef, userId }: HighlightsSectionProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full py-3 px-4 text-left bg-transparent border-0 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-[#1c1c1c]" />
          <span className="text-sm font-bold text-[#1c1c1c]">Pinned</span>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-[#7c7c7c] transition-transform ${expanded ? '' : 'rotate-180'}`}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          {pinnedPosts.length > 0 ? (
            <div className="space-y-3">
              {pinnedPosts.map((post) => {
                const handlers = pinnedHandlersRef?.current;
                const authorName = FeedService.postAuthorName(post);
                const authorInitials = FeedService.postInitials(post);
                const authorColor = FeedService.avatarColor(post.author_id);
                const timeStr = FeedService.timeAgo(post.created_at);
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    authorName={authorName}
                    authorInitials={authorInitials}
                    authorColor={authorColor}
                    authorProfile={post.author}
                    timeStr={timeStr}
                    timeShort={timeStr.replace(/\s*ago$/, '')}
                    onOpen={() => handlers?.onOpen(post)}
                    onVote={(e) => handlers?.onVote(e, post)}
                    onPin={userId && handlers ? (e) => handlers.onPin(e, post) : undefined}
                    userId={userId}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#7c7c7c] py-2 pl-1">No pinned posts yet</p>
          )}
        </div>
      )}
    </>
  );
}
