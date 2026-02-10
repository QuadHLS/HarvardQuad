/**
 * HomeFeed.tsx
 * Self-contained home feed + post detail view. Uses FeedService and profiles (public_name).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart,
  MessageSquare,
  Pin,
  ChevronLeft,
  Plus,
} from 'lucide-react';
import { FeedService, type FeedPostWithAuthor, type FeedReplyWithAuthor, type ProfileRow } from '../services/feedService';
import { getEmbedInfo } from '../lib/embedUrl';
import { ScrollArea } from './ui/scroll-area';
import { NewPostModal, type NewPostModalOptimisticData } from './NewPostModal';
import { UserProfileView } from './UserProfileView';

/** DiceBear thumbs avatar for Quadly (override-author) posts. */
const QUADLY_AVATAR_URL = 'https://api.dicebear.com/9.x/thumbs/svg?seed=quadly';

/** Renders avatar image when profile has avatar_url, otherwise colored circle with initials. */
function AuthorAvatar({
  profile,
  color,
  initials,
  sizeClass = 'w-9 h-9',
  className = '',
  asButton = false,
  onClick,
  onPointerDown,
  onKeyDown,
  'aria-label': ariaLabel,
  ...rest
}: {
  profile: ProfileRow | null | undefined;
  color: string;
  initials: string;
  sizeClass?: string;
  className?: string;
  asButton?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  'aria-label'?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = profile?.avatar_url?.trim();
  const showImg = !!avatarUrl && !imgError;
  const baseClass = `${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative ${className}`.trim();
  const content = (
    <>
      {showImg ? (
        <img
          src={avatarUrl!}
          alt=""
          className="absolute inset-0 w-full h-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : null}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center text-white text-xs"
        style={{
          backgroundColor: color,
          fontWeight: 600,
          display: showImg ? 'none' : 'flex',
        }}
        aria-hidden={showImg}
      >
        {initials}
      </div>
    </>
  );
  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className={`${baseClass} active:scale-95 transition-transform cursor-pointer`}
        aria-label={ariaLabel}
        {...rest}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={baseClass} {...rest}>
      {content}
    </div>
  );
}

function EmbedBlock({ url, className = '', compact = false }: { url: string; className?: string; compact?: boolean }) {
  const embed = getEmbedInfo(url);
  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`text-[#d47455] text-sm font-medium hover:underline block ${className}`}>
        {url}
      </a>
    );
  }
  const maxH = compact ? 240 : 360;
  const maxW = maxH * embed.aspectRatio;
  return (
    <div
      className={`w-full ${className}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-lg overflow-hidden bg-muted/30"
        style={{
          aspectRatio: embed.aspectRatio,
          maxHeight: maxH,
          maxWidth: maxW,
        }}
      >
        <iframe
          src={embed.embedUrl}
          title="Embedded video"
          className="rounded-lg w-full h-full border-0"
          style={{ pointerEvents: 'auto' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <a href={embed.originalUrl} target="_blank" rel="noopener noreferrer" className="text-[#d47455] text-xs font-medium hover:underline mt-1.5 block">
        Open in {embed.kind === 'youtube' || embed.kind === 'youtube_shorts' ? 'YouTube' : embed.kind === 'tiktok' ? 'TikTok' : 'Instagram'}
      </a>
    </div>
  );
}

// --- Post Detail View ---

interface PostDetailViewProps {
  post: FeedPostWithAuthor;
  userId: string | undefined;
  userDisplayName?: string;
  userAvatarUrl?: string | null;
  onBack: () => void;
  onOpenUserProfile?: (userId: string) => void;
  /** When set (e.g. embedded in squad page), used as the header title instead of "Home". */
  headerTitle?: string;
}

function PostDetailView({ post, userId, userDisplayName, userAvatarUrl, onBack, onOpenUserProfile, headerTitle = 'Home' }: PostDetailViewProps) {
  const [detailPost, setDetailPost] = useState<FeedPostWithAuthor | null>(post);
  const [replies, setReplies] = useState<FeedReplyWithAuthor[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isReplyInputFocused, setIsReplyInputFocused] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        FeedService.getPost(post.id, userId),
        FeedService.listReplies(post.id, userId),
      ]);
      if (p) setDetailPost(p);
      setReplies(r);
    } catch {
      setDetailPost(null);
    } finally {
      setLoading(false);
    }
  }, [post.id, userId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Realtime: replies, throttled hearts, and (for polls) options + throttled votes
  useEffect(() => {
    const replyChannel = FeedService.subscribeToFeedReplies(post.id, loadDetail);
    const { unsubscribe: unsubscribeHearts } = FeedService.subscribeToFeedHearts(post.id, loadDetail, { throttleMs: 4000 });
    const cleanups: (() => void)[] = [
      () => FeedService.unsubscribeFromFeedReplies(replyChannel),
      unsubscribeHearts,
    ];
    if (post.post_type === 'poll') {
      const pollOptsChannel = FeedService.subscribeToFeedPollOptions(post.id, loadDetail);
      const { unsubscribe: unsubscribePollVotes } = FeedService.subscribeToFeedPollVotes(post.id, loadDetail, { throttleMs: 4000 });
      cleanups.push(() => FeedService.unsubscribeFromFeedPollOptions(pollOptsChannel), unsubscribePollVotes);
    }
    return () => cleanups.forEach((c) => c());
  }, [post.id, post.post_type, loadDetail]);

  const handleHeartPost = async () => {
    if (!userId || !detailPost) return;
    const nextHearted = !detailPost.current_user_hearted;
    const nextCount = (detailPost.heart_count ?? 0) + (nextHearted ? 1 : -1);
    setDetailPost((prev) => prev ? { ...prev, current_user_hearted: nextHearted, heart_count: nextCount } : null);
    try {
      const { hearted } = await FeedService.toggleHeartPost(detailPost.id, userId);
      setDetailPost((prev) => prev ? { ...prev, current_user_hearted: hearted, heart_count: prev.heart_count ?? 0 } : null);
    } catch {
      setDetailPost((prev) => prev ? { ...prev, current_user_hearted: detailPost.current_user_hearted, heart_count: detailPost.heart_count ?? 0 } : null);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!userId || !detailPost?.poll_options) return;
    const prevOptionId = detailPost.current_user_vote_option_id ?? null;
    if (prevOptionId === optionId) return;
    const options = detailPost.poll_options.map((o) => ({
      ...o,
      vote_count: o.id === optionId ? (o.vote_count || 0) + 1 : o.id === prevOptionId ? Math.max(0, (o.vote_count || 0) - 1) : o.vote_count || 0,
    }));
    setDetailPost((prev) => prev ? { ...prev, current_user_vote_option_id: optionId, poll_options: options } : null);
    try {
      await FeedService.votePoll(detailPost.id, optionId, userId);
      await loadDetail();
    } catch {
      setDetailPost((prev) => prev ? { ...prev, current_user_vote_option_id: prevOptionId, poll_options: detailPost.poll_options } : null);
    }
  };

  const handlePinPost = async () => {
    if (!userId || !detailPost) return;
    const nextPinned = !detailPost.current_user_pinned;
    setDetailPost((prev) => prev ? { ...prev, current_user_pinned: nextPinned } : null);
    try {
      const { pinned } = await FeedService.togglePinPost(detailPost.id, userId);
      setDetailPost((prev) => prev ? { ...prev, current_user_pinned: pinned } : null);
    } catch {
      setDetailPost((prev) => prev ? { ...prev, current_user_pinned: detailPost.current_user_pinned } : null);
    }
  };

  const countTotalReplies = (replies: FeedReplyWithAuthor[]): number => {
    return replies.reduce((sum, r) => sum + 1 + (r.replies?.length ? countTotalReplies(r.replies) : 0), 0);
  };

  const handleSubmitReply = async () => {
    const content = replyInput.replace(/^[ \t]+|[ \t]+$/g, '');
    if (!userId || !detailPost || !content || !content.trim()) return;
    const parentId = replyingTo ?? null;
    const optimisticReply: FeedReplyWithAuthor = {
      id: `opt-reply-${Date.now()}`,
      post_id: detailPost.id,
      parent_reply_id: parentId,
      author_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: { id: userId, public_name: userDisplayName ?? '', full_name: userDisplayName ?? '', avatar_url: userAvatarUrl ?? null },
      heart_count: 0,
      current_user_hearted: false,
      replies: [],
    };
    const addOptimisticReply = (list: FeedReplyWithAuthor[], parent: string | null, reply: FeedReplyWithAuthor): FeedReplyWithAuthor[] => {
      if (parent == null) return [...list, reply];
      return list.map((r) =>
        r.id === parent ? { ...r, replies: [...(r.replies ?? []), reply] } : { ...r, replies: r.replies ? addOptimisticReply(r.replies, parent, reply) : r.replies }
      );
    };
    setReplies((prev) => addOptimisticReply(prev, parentId, optimisticReply));
    setDetailPost((prev) => prev ? { ...prev, reply_count: (prev.reply_count ?? 0) + 1 } : null);
    setReplyInput('');
    setReplyingTo(null);
    setSubmitting(true);
    try {
      await FeedService.createReply(detailPost.id, userId, content.trim(), replyingTo ?? undefined);
      const r = await FeedService.listReplies(detailPost.id, userId);
      setReplies(r);
      setDetailPost((prev) => prev ? { ...prev, reply_count: countTotalReplies(r) } : null);
    } catch {
      setReplies((prev) => {
        const removeOpt = (list: FeedReplyWithAuthor[]): FeedReplyWithAuthor[] =>
          list.filter((r) => !r.id.startsWith('opt-reply-')).map((r) => ({ ...r, replies: r.replies ? removeOpt(r.replies) : r.replies }));
        return removeOpt(prev);
      });
      setDetailPost((prev) => prev ? { ...prev, reply_count: Math.max(0, (prev.reply_count ?? 1) - 1) } : null);
      setReplyInput(content);
      setReplyingTo(parentId);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !detailPost) {
    return (
      <div className="h-full flex flex-col bg-[#FBF9F5]">
        <div className="bg-[#F1EFE7] px-4 py-4 flex-shrink-0 flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-6 h-6 text-[#27251f]" />
          </button>
          <h1 className="text-lg flex-1 font-semibold text-[#27251f]" >{headerTitle}</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
        </div>
      </div>
    );
  }

  const authorName = FeedService.postAuthorName(detailPost);
  const authorInitials = FeedService.postInitials(detailPost);
  const authorColor = FeedService.avatarColor(detailPost.author_id);
  const timeStr = FeedService.timeAgo(detailPost.created_at);
  const sourceLabel = detailPost.source_type === 'squad'
    ? (detailPost.is_squad_admin ? `${detailPost.source_name ?? 'Squad'} Admin` : 'Member')
    : 'Student';
  const sourceColor = '#d47455';

  return (
    <div className="h-full flex flex-col bg-[#FBF9F5]">
      <div className="bg-[#F1EFE7] px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-6 h-6 text-[#27251f]" />
          </button>
          <h1 className="text-lg flex-1 font-semibold text-[#27251f]" >{headerTitle}</h1>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="pr-4">
        <div className="bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {detailPost.override_author_name?.trim() ? (
                <AuthorAvatar
                  profile={{ id: '', public_name: authorName, full_name: authorName, avatar_url: QUADLY_AVATAR_URL } as ProfileRow}
                  color="#d47455"
                  initials={authorInitials}
                  sizeClass="min-w-[44px] min-h-[44px] w-10 h-10"
                />
              ) : detailPost.author_id !== userId ? (
                <AuthorAvatar
                  profile={detailPost.author}
                  color={authorColor}
                  initials={authorInitials}
                  sizeClass="min-w-[44px] min-h-[44px] w-10 h-10"
                  asButton
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenUserProfile?.(detailPost.author_id);
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenUserProfile?.(detailPost.author_id);
                  }}
                  aria-label={`View ${authorName}'s profile`}
                />
              ) : (
                <AuthorAvatar
                  profile={detailPost.author}
                  color={authorColor}
                  initials={authorInitials}
                  sizeClass="w-10 h-10"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#27251f]">{authorName}</span>
                  <span className="text-xs text-[#787771]">• {timeStr}</span>
                </div>
                {!detailPost.override_author_name?.trim() && (
                  <div
                    className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
                    style={{ backgroundColor: sourceColor + '20', color: sourceColor, fontWeight: 600 }}
                  >
                    {sourceLabel}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {userId && (
                <button
                  type="button"
                  onClick={handlePinPost}
                  className="p-2 rounded-lg text-[#787771] hover:bg-[#F1EFE7] active:scale-95 transition-transform"
                  aria-label={detailPost.current_user_pinned ? 'Unpin' : 'Pin'}
                  title={detailPost.current_user_pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin size={18} className={detailPost.current_user_pinned ? 'text-[#d97757]' : ''} fill={detailPost.current_user_pinned ? '#d97757' : 'none'} />
                </button>
              )}
              {detailPost.current_user_pinned && (
                <button
                  type="button"
                  onClick={handlePinPost}
                  className="text-xs font-semibold text-[#d97757] hover:underline active:scale-95 transition-transform cursor-pointer"
                  title="Unpin"
                >
                  Pinned
                </button>
              )}
            </div>
          </div>

          <h2 className="text-xl mb-3 font-semibold text-[#27251f] leading-tight" >{detailPost.title}</h2>

          {detailPost.content && (
            <p className="selectable-text text-base mb-3 text-[#27251f] leading-relaxed whitespace-pre-wrap">{detailPost.content}</p>
          )}
          {detailPost.image_path && (
            <div className="block isolate rounded-xl overflow-hidden max-h-80 mb-3 bg-muted/30">
              <img src={detailPost.image_path} alt="" className="block w-full max-h-80 object-contain" />
            </div>
          )}
          {detailPost.url && (
            getEmbedInfo(detailPost.url) ? (
              <EmbedBlock url={detailPost.url} className="mb-3" />
            ) : (
              <a href={detailPost.url} target="_blank" rel="noopener noreferrer" className="text-[#d47455] text-sm font-medium hover:underline block mb-3">{detailPost.url}</a>
            )
          )}

          {detailPost.post_type === 'poll' && detailPost.poll_options && detailPost.poll_options.length > 0 && (
            <div className="mb-4 space-y-2">
              {detailPost.poll_options.map((opt) => {
                const total = detailPost.poll_options!.reduce((s, o) => s + (o.vote_count ?? 0), 0);
                const pct = total > 0 ? Math.round(((opt.vote_count ?? 0) / total) * 100) : 0;
                const isSelected = detailPost.current_user_vote_option_id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleVote(opt.id)}
                    className={`w-full text-left rounded-lg border-2 px-3 py-2 transition-colors ${isSelected ? 'border-[#d47455] bg-[#fff3e0]' : 'border-[#e7ded1] hover:border-[#d47455]/50'}`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium text-[#27251f]">{opt.option_text}</span>
                      <span className="text-xs text-[#787771]">{opt.vote_count ?? 0} votes ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#F1EFE7] overflow-hidden">
                      <div className="h-full rounded-full bg-[#d47455]" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 border-t border-[#f5f3eb]">
            <button onClick={handleHeartPost} className="flex items-center gap-1.5 py-2 active:scale-95 transition-transform">
              <Heart size={20} className={detailPost.current_user_hearted ? 'text-[#d47455]' : 'text-[#787771]'} fill={detailPost.current_user_hearted ? '#d47455' : 'none'} />
              <span className="text-base font-semibold" style={{ color: detailPost.current_user_hearted ? '#d47455' : '#27251f' }}>{detailPost.heart_count ?? 0}</span>
            </button>
            <span className="flex items-center gap-1.5 py-2 text-[#787771]">
              <MessageSquare size={20} />
              <span className="text-base">{detailPost.reply_count ?? 0}</span>
            </span>
          </div>

          {!replyingTo && (
            <div className="pt-4 mt-2 border-t border-[#f5f3eb]">
              <div className="flex items-center gap-3">
                <AuthorAvatar
                  profile={userId ? { id: userId, public_name: userDisplayName ?? '', full_name: userDisplayName ?? '', avatar_url: userAvatarUrl ?? null } as ProfileRow : null}
                  color={userId ? FeedService.avatarColor(userId) : '#787771'}
                  initials={userId && userDisplayName ? FeedService.initials({ public_name: userDisplayName, full_name: userDisplayName } as ProfileRow) : userId ? 'You'.slice(0, 2) : '?'}
                  sizeClass="w-9 h-9"
                />
                <textarea
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onFocus={() => {
                    setIsReplyInputFocused(true);
                    window.dispatchEvent(new CustomEvent('feedInputFocused', { detail: { focused: true } }));
                  }}
                  onBlur={() => {
                    setIsReplyInputFocused(false);
                    window.dispatchEvent(new CustomEvent('feedInputFocused', { detail: { focused: false } }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitReply();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                  placeholder="Join the conversation..."
                  className="flex-1 min-h-[44px] resize-none overflow-y-auto bg-[#FBF9F5] rounded-xl px-4 py-2.5 text-sm border border-[#e7ded1] focus:outline-none focus:border-[#d47455]"
                  style={{ color: '#27251f', maxHeight: '120px', lineHeight: '24px' }}
                  disabled={!userId || submitting}
                  rows={1}
                />
                <button
                  type="button"
                  onClick={handleSubmitReply}
                  disabled={!userId || submitting || !replyInput.trim()}
                  className="px-3 py-2 rounded-lg bg-[#d47455] text-white text-sm font-semibold disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`px-4 py-4 ${isReplyInputFocused ? 'pb-4' : 'pb-24 md:pb-12'}`}>
          <div className="space-y-4">
            {replies.map((comment) => (
              <ReplyBlock
                key={comment.id}
                reply={comment}
                userId={userId}
                onReply={() => setReplyingTo(comment.id)}
                onHeart={async () => {
                  if (!userId) return;
                  await FeedService.toggleHeartReply(comment.id, userId);
                  loadDetail();
                }}
                onReplySubmit={handleSubmitReply}
                refreshReplies={loadDetail}
                isTopLevel
                replyingTo={replyingTo}
                replyInput={replyInput}
                setReplyInput={setReplyInput}
                setReplyingTo={setReplyingTo}
                onSubmitReply={handleSubmitReply}
                submitting={submitting}
                userDisplayName={userDisplayName}
                userAvatarUrl={userAvatarUrl}
                onReplyInputFocusChange={setIsReplyInputFocused}
                onOpenUserProfile={onOpenUserProfile}
              />
            ))}
          </div>
        </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface ReplyBlockProps {
  reply: FeedReplyWithAuthor;
  userId: string | undefined;
  onReply: () => void;
  onHeart: () => void | Promise<void>;
  onReplySubmit: () => void;
  refreshReplies?: () => void;
  isTopLevel: boolean;
  key?: React.Key;
  replyingTo?: string | null;
  replyInput?: string;
  setReplyInput?: (v: string) => void;
  setReplyingTo?: (id: string | null) => void;
  onSubmitReply?: () => void;
  submitting?: boolean;
  userDisplayName?: string;
  userAvatarUrl?: string | null;
  /** 0 = top-level, 1 = first reply, 2 = second, 3+ = flat with "replying to name" */
  depth?: number;
  /** When set, show "replying to [name]" next to author (for depth > 4 only) */
  parentReply?: FeedReplyWithAuthor | null;
  /** Called when inline reply textarea is focused/blurred (for keyboard/padding) */
  onReplyInputFocusChange?: (focused: boolean) => void;
  /** When avatar is clicked, open this user's profile */
  onOpenUserProfile?: (userId: string) => void;
}

function InlineReplyForm({
  userId,
  replyInput,
  setReplyInput,
  setReplyingTo,
  onSubmitReply,
  submitting,
  userDisplayName,
  userAvatarUrl,
  onReplyInputFocusChange,
}: {
  userId: string | undefined;
  replyInput: string;
  setReplyInput: (v: string) => void;
  setReplyingTo: (id: string | null) => void;
  onSubmitReply: () => void;
  submitting: boolean;
  userDisplayName?: string;
  userAvatarUrl?: string | null;
  onReplyInputFocusChange?: (focused: boolean) => void;
}) {
  const currentUserProfile: ProfileRow | null = userId
    ? { id: userId, public_name: userDisplayName ?? '', full_name: userDisplayName ?? '', avatar_url: userAvatarUrl ?? null }
    : null;
  return (
    <div className="flex items-center gap-2 mt-2 min-w-0 max-w-full">
      <AuthorAvatar
        profile={currentUserProfile}
        color={userId ? FeedService.avatarColor(userId) : '#787771'}
        initials={userId && userDisplayName ? FeedService.initials({ public_name: userDisplayName, full_name: userDisplayName } as ProfileRow) : 'Yo'}
        sizeClass="w-8 h-8"
      />
      <textarea
        value={replyInput}
        onChange={(e) => setReplyInput(e.target.value)}
        onFocus={() => {
          onReplyInputFocusChange?.(true);
          window.dispatchEvent(new CustomEvent('feedInputFocused', { detail: { focused: true } }));
        }}
        onBlur={() => {
          onReplyInputFocusChange?.(false);
          window.dispatchEvent(new CustomEvent('feedInputFocused', { detail: { focused: false } }));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmitReply();
          }
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
        }}
        placeholder=""
        className="flex-1 min-w-0 min-h-[40px] resize-none overflow-y-auto bg-[#FBF9F5] rounded-xl px-3 py-2 text-sm border border-[#e7ded1] focus:outline-none focus:border-[#d47455]"
        style={{ color: '#27251f', maxHeight: '120px', lineHeight: '24px' }}
        disabled={!userId || submitting}
        autoFocus
        rows={1}
      />
      <button type="button" onClick={() => setReplyingTo(null)} className="text-xs font-medium text-[#787771] hover:text-[#27251f] flex-shrink-0 whitespace-nowrap">Cancel</button>
      <button
        type="button"
        onClick={onSubmitReply}
        disabled={!userId || submitting || !replyInput.trim()}
        className="px-2.5 py-2 rounded-lg bg-[#d47455] text-white text-sm font-semibold disabled:opacity-50 flex-shrink-0"
      >
        Post
      </button>
    </div>
  );
}

function ReplyBlock({
  reply,
  userId,
  onReply,
  onHeart,
  onReplySubmit,
  refreshReplies,
  isTopLevel,
  replyingTo,
  replyInput = '',
  setReplyInput,
  setReplyingTo,
  onSubmitReply,
  submitting = false,
  userDisplayName,
  userAvatarUrl,
  depth = 0,
  parentReply,
  onReplyInputFocusChange,
  onOpenUserProfile,
}: ReplyBlockProps) {
  const name = FeedService.displayName(reply.author);
  const initials = FeedService.initials(reply.author);
  const color = FeedService.avatarColor(reply.author_id);
  const timeStr = FeedService.timeAgo(reply.created_at);
  const size = isTopLevel ? 'w-9 h-9 text-xs' : 'w-8 h-8 text-xs';
  const handleNestedHeart = async (replyId: string) => {
    if (!userId) return;
    await FeedService.toggleHeartReply(replyId, userId);
    refreshReplies?.();
  };
  const showInlineForm = replyingTo != null && setReplyInput && setReplyingTo && onSubmitReply;
  const isFlat = depth >= 3;
  const indentClass =
    depth === 0
      ? ''
      : isFlat
        ? 'mt-2 min-w-0'
        : 'ml-8 mt-2 min-w-0 max-w-[calc(100%-2rem)]';
  const parentName = parentReply ? FeedService.displayName(parentReply.author) : '';
  const avatarClass = `${size} rounded-full flex items-center justify-center text-white flex-shrink-0`;
  const isOwnReply = reply.author_id === userId;
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenUserProfile?.(reply.author_id);
  };
  const handleAvatarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenUserProfile?.(reply.author_id);
  };
  return (
    <div className={indentClass}>
      <div className={isTopLevel ? 'bg-white rounded-2xl p-4 shadow-sm' : 'bg-[#fefefc] rounded-2xl p-4'}>
        <div className="flex items-start gap-3">
          {onOpenUserProfile && !isOwnReply ? (
            <AuthorAvatar
              profile={reply.author}
              color={color}
              initials={initials}
              sizeClass={`min-w-[44px] min-h-[44px] ${size}`}
              asButton
              onClick={handleAvatarClick}
              onPointerDown={handleAvatarPointerDown}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenUserProfile(reply.author_id);
                }
              }}
              aria-label={`View ${name}'s profile`}
              className="relative z-10 cursor-pointer"
            />
          ) : (
            <AuthorAvatar
              profile={reply.author}
              color={color}
              initials={initials}
              sizeClass={size}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
              <span className="text-sm font-semibold text-[#27251f]">{name}</span>
              {depth > 4 && parentName && (
                <span className="text-xs text-[#787771]">
                  replying to {parentName}
                </span>
              )}
              <span className="text-xs text-[#787771]">{timeStr}</span>
            </div>
            <p className="selectable-text text-sm mb-2 text-[#27251f] leading-relaxed whitespace-pre-wrap">{reply.content}</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onHeart} className="flex items-center gap-1 active:scale-95 transition-transform">
                <Heart size={isTopLevel ? 16 : 14} className={reply.current_user_hearted ? 'text-[#d47455]' : 'text-[#787771]'} fill={reply.current_user_hearted ? '#d47455' : 'none'} />
                <span className="text-xs font-semibold" style={{ color: reply.current_user_hearted ? '#d47455' : '#27251f' }}>{reply.heart_count ?? 0}</span>
              </button>
              <button type="button" onClick={onReply} className="text-xs font-semibold text-[#787771] hover:text-[#27251f]">Reply</button>
            </div>
          </div>
        </div>
      </div>
      {showInlineForm && replyingTo === reply.id && (() => {
        const form = (
          <InlineReplyForm
            userId={userId}
            replyInput={replyInput}
            setReplyInput={setReplyInput}
            setReplyingTo={setReplyingTo}
            onSubmitReply={onSubmitReply}
            submitting={submitting}
            userDisplayName={userDisplayName}
            userAvatarUrl={userAvatarUrl}
            onReplyInputFocusChange={onReplyInputFocusChange}
          />
        );
        if (depth === 0) return form;
        const formWrapperClass = depth === 1
          ? 'min-w-0 max-w-[calc(100%-2rem)]'
          : depth === 2
            ? '-ml-8 min-w-0 max-w-[calc(100%-2rem)]'
            : 'min-w-0 max-w-[calc(100%-2rem)]';
        return <div className={formWrapperClass}>{form}</div>;
      })()}
      {reply.replies && reply.replies.length > 0 && (
        <div className={isFlat ? 'mt-2 space-y-2' : 'ml-8 mt-2 space-y-2'}>
          {reply.replies.map((r) => (
            <ReplyBlock
              key={r.id}
              reply={r}
              userId={userId}
              onReply={setReplyingTo ? () => setReplyingTo(r.id) : () => {}}
              onHeart={async () => handleNestedHeart(r.id)}
              onReplySubmit={onReplySubmit}
              refreshReplies={refreshReplies}
              isTopLevel={false}
              replyingTo={replyingTo}
              replyInput={replyInput}
              setReplyInput={setReplyInput}
              setReplyingTo={setReplyingTo}
              onSubmitReply={onSubmitReply}
              submitting={submitting}
              userDisplayName={userDisplayName}
              userAvatarUrl={userAvatarUrl}
              depth={depth + 1}
              parentReply={reply}
              onReplyInputFocusChange={onReplyInputFocusChange}
              onOpenUserProfile={onOpenUserProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Home Feed View ---

export interface HomeFeedProps {
  greeting?: string;
  userName?: string;
  userId?: string;
  publicName?: string;
  userAvatarUrl?: string | null;
  /** When set, load only posts for this squad (source_type='squad', source_id=squadId). */
  squadId?: string | null;
  /** Label for squad feed (e.g. squad name); used in embedded header when squadId is set. */
  squadName?: string | null;
  /** When true, omit the main "Good morning" header; use for embedding inside squad page. */
  embedded?: boolean;
  /** When provided with onNewPostModalOpenChange, modal is controlled by parent (e.g. squad page shows Post button). */
  newPostModalOpen?: boolean;
  onNewPostModalOpenChange?: (open: boolean) => void;
  /** Called when user opens or closes a post (for hiding parent header when embedded). */
  onPostDetailChange?: (isOpen: boolean) => void;
  /** When embedded, title shown in post detail header instead of "Home". */
  embedHeaderTitle?: string;
  /** When this value changes, feed refetches (e.g. parent bumps after new post so all instances update). */
  feedRefreshKey?: number;
  /** When provided (e.g. embedded), called after a new post is created so parent can refresh all feed instances. */
  onNewPostSuccess?: () => void;
  /** Restore this post when returning to the page (open post detail by id). */
  initialPostId?: string | null;
  /** Called when user opens or closes a post so parent can persist subpage. */
  onPostChange?: (postId: string | null) => void;
}

export function HomeFeed({
  greeting = 'Good morning',
  userName = 'Justin',
  userId,
  publicName = 'You',
  userAvatarUrl = null,
  squadId,
  squadName,
  embedded = false,
  newPostModalOpen: controlledNewPostOpen,
  onNewPostModalOpenChange: onControlledNewPostOpenChange,
  onPostDetailChange,
  embedHeaderTitle,
  feedRefreshKey,
  onNewPostSuccess,
  initialPostId,
  onPostChange,
}: HomeFeedProps) {
  const [posts, setPosts] = useState<FeedPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<FeedPostWithAuthor | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [internalNewPostOpen, setInternalNewPostOpen] = useState(false);
  const [optimisticNewPost, setOptimisticNewPost] = useState<FeedPostWithAuthor | null>(null);
  const hasRestoredPostRef = useRef(false);
  const isControlled = controlledNewPostOpen !== undefined && onControlledNewPostOpenChange !== undefined;
  const newPostModalOpen = isControlled ? controlledNewPostOpen : internalNewPostOpen;
  const setNewPostModalOpen = isControlled ? onControlledNewPostOpenChange : setInternalNewPostOpen;

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      let list = squadId
        ? await FeedService.listPostsForSquad(squadId, userId)
        : await FeedService.listPosts(userId);
      // Squad feed: only show posts for this squad (source_type=squad, source_id=squadId)
      if (squadId && list.length > 0) {
        list = list.filter((p) => p.source_type === 'squad' && p.source_id === squadId);
      }
      setPosts(list);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId, squadId ?? '']);

  useEffect(() => {
    loadPosts();
  }, [loadPosts, feedRefreshKey]);

  // Realtime: refetch posts when feed_posts change (home or squad)
  useEffect(() => {
    const channel = FeedService.subscribeToFeedPosts(squadId ?? null, loadPosts);
    return () => FeedService.unsubscribeFromFeedPosts(channel);
  }, [squadId, loadPosts]);

  useEffect(() => {
    if (onPostDetailChange) onPostDetailChange(!!selectedPost);
  }, [selectedPost, onPostDetailChange]);

  // Restore opened post when returning to the page (from URL/sessionStorage). Reset ref when initialPostId is cleared so a new restore can run later.
  useEffect(() => {
    if (!initialPostId) {
      hasRestoredPostRef.current = false;
      return;
    }
    if (loading || hasRestoredPostRef.current) return;
    const post = posts.find((p) => p.id === initialPostId);
    if (post) {
      hasRestoredPostRef.current = true;
      setSelectedPost(post);
    } else {
      // Post not in list (e.g. deleted); mark attempted so we don't retry on every posts update
      hasRestoredPostRef.current = true;
    }
  }, [initialPostId, loading, posts]);


  const handleHeartPost = async (e: React.MouseEvent, post: FeedPostWithAuthor) => {
    e.stopPropagation();
    if (!userId || post.id.startsWith('opt-')) return;
    const nextHearted = !post.current_user_hearted;
    const nextCount = (post.heart_count ?? 0) + (nextHearted ? 1 : -1);
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, current_user_hearted: nextHearted, heart_count: nextCount } : p));
    try {
      const { hearted } = await FeedService.toggleHeartPost(post.id, userId);
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, current_user_hearted: hearted, heart_count: p.heart_count ?? 0 } : p));
    } catch {
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, current_user_hearted: post.current_user_hearted, heart_count: post.heart_count ?? 0 } : p));
    }
  };

  const handlePinPost = async (e: React.MouseEvent, post: FeedPostWithAuthor) => {
    e.stopPropagation();
    if (!userId || post.id.startsWith('opt-')) return;
    const nextPinned = !post.current_user_pinned;
    setPosts((prev) => {
      const next = prev.map((p) => p.id === post.id ? { ...p, current_user_pinned: nextPinned } : p);
      return next.sort((a, b) => {
        const aP = a.current_user_pinned ? 1 : 0;
        const bP = b.current_user_pinned ? 1 : 0;
        if (bP !== aP) return bP - aP;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
    try {
      const { pinned } = await FeedService.togglePinPost(post.id, userId);
      setPosts((prev) => {
        const next = prev.map((p) => p.id === post.id ? { ...p, current_user_pinned: pinned } : p);
        return next.sort((a, b) => {
          const aP = a.current_user_pinned ? 1 : 0;
          const bP = b.current_user_pinned ? 1 : 0;
          if (bP !== aP) return bP - aP;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
    } catch {
      setPosts((prev) => {
        const next = prev.map((p) => p.id === post.id ? { ...p, current_user_pinned: post.current_user_pinned } : p);
        return next.sort((a, b) => {
          const aP = a.current_user_pinned ? 1 : 0;
          const bP = b.current_user_pinned ? 1 : 0;
          if (bP !== aP) return bP - aP;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
    }
  };

  if (viewingUserId) {
    return (
      <UserProfileView
        userId={viewingUserId}
        onBack={() => setViewingUserId(null)}
      />
    );
  }

  if (selectedPost) {
    return (
      <PostDetailView
        post={selectedPost}
        userId={userId}
        userDisplayName={publicName}
        userAvatarUrl={userAvatarUrl}
        onBack={() => {
          setSelectedPost(null);
          onPostChange?.(null);
          loadPosts();
        }}
        onOpenUserProfile={(id) => id !== userId && setViewingUserId(id)}
        headerTitle={embedHeaderTitle ?? 'Home'}
      />
    );
  }

  const sourceLabel = (p: FeedPostWithAuthor) =>
    p.source_type === 'squad' ? (p.is_squad_admin ? `${p.source_name ?? 'Squad'} Admin` : 'Member') : 'Student';
  const sourceColor = '#d47455';

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {!embedded && (
        <header className="flex-shrink-0 border-b border-[#e7ded1] bg-[#FBF9F5] px-5 py-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl flex-1 min-w-0 font-medium text-[#27251f]" >
            {greeting}, {publicName}
          </h1>
          {userId && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#d47455] text-white text-sm flex-shrink-0 active:scale-[0.98] transition-transform hover:bg-[#c06545]"
              style={{ fontWeight: 600 }}
              onClick={() => setNewPostModalOpen(true)}
            >
              <Plus size={18} />
              New post
            </button>
          )}
        </header>
      )}
      {embedded && (squadId || squadName) && !isControlled && (
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-0 py-3">
          <h2 className="text-lg font-semibold text-[#27251f]">
            {squadName ?? 'Feed'}
          </h2>
          {userId && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#d47455] text-white text-sm flex-shrink-0 active:scale-[0.98] transition-transform hover:bg-[#c06545]"
              style={{ fontWeight: 600 }}
              onClick={() => setNewPostModalOpen(true)}
            >
              <Plus size={18} />
              Post
            </button>
          )}
        </div>
      )}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#FBF9F5] px-4 py-4 pb-24 md:pb-4"
        style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
          </div>
        ) : (optimisticNewPost ? [optimisticNewPost, ...posts] : posts).length === 0 ? (
          <div className="py-12" />
        ) : (
          <div className="space-y-3">
            {(optimisticNewPost ? [optimisticNewPost, ...posts] : posts).map((post) => {
              const authorName = FeedService.postAuthorName(post);
              const authorInitials = FeedService.postInitials(post);
              const authorColor = FeedService.avatarColor(post.author_id);
              const timeStr = FeedService.timeAgo(post.created_at);
              const isOptimistic = post.id.startsWith('opt-');
              const openPost = () => {
                if (!isOptimistic) {
                  setSelectedPost(post);
                  onPostChange?.(post.id);
                }
              };
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {post.override_author_name?.trim() ? (
                          <AuthorAvatar
                            profile={{ id: '', public_name: authorName, full_name: authorName, avatar_url: QUADLY_AVATAR_URL } as ProfileRow}
                            color="#d47455"
                            initials={authorInitials}
                            sizeClass="min-w-[44px] min-h-[44px] w-9 h-9"
                            className="relative z-10"
                          />
                        ) : post.author_id !== userId ? (
                          <AuthorAvatar
                            profile={post.author}
                            color={authorColor}
                            initials={authorInitials}
                            sizeClass="min-w-[44px] min-h-[44px] w-9 h-9"
                            asButton
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setViewingUserId(post.author_id);
                            }}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setViewingUserId(post.author_id);
                            }}
                            aria-label={`View ${authorName}'s profile`}
                            className="relative z-10 cursor-pointer"
                          />
                        ) : (
                          <AuthorAvatar
                            profile={post.author}
                            color={authorColor}
                            initials={authorInitials}
                            sizeClass="w-9 h-9"
                          />
                        )}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={openPost}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPost(); } }}
                          className="flex-1 min-w-0 cursor-pointer active:scale-[0.98] transition-transform"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#27251f]">{authorName}</span>
                            <span className="text-xs text-[#787771]">• {timeStr}</span>
                          </div>
                          {!post.override_author_name?.trim() && (
                            <div className="text-xs px-2 py-0.5 rounded-full inline-block mt-1" style={{ backgroundColor: sourceColor + '20', color: sourceColor, fontWeight: 600 }}>
                              {sourceLabel(post)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {userId && (
                          <button
                            type="button"
                            onClick={(e) => handlePinPost(e, post)}
                            className="p-1.5 rounded-lg text-[#787771] hover:bg-[#F1EFE7] active:scale-95 transition-transform"
                            aria-label={post.current_user_pinned ? 'Unpin' : 'Pin'}
                            title={post.current_user_pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin size={16} className={post.current_user_pinned ? 'text-[#d97757]' : ''} fill={post.current_user_pinned ? '#d97757' : 'none'} />
                          </button>
                        )}
                        {post.current_user_pinned && (
                          <button
                            type="button"
                            onClick={(e) => handlePinPost(e, post)}
                            className="text-xs font-semibold text-[#d97757] hover:underline active:scale-95 transition-transform cursor-pointer"
                            title="Unpin"
                          >
                            Pinned
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={openPost}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPost(); } }}
                      className="cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <h3 className="text-base mb-2 font-semibold text-[#27251f] leading-tight" >{post.title}</h3>

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
                                <div className="mt-1 h-1.5 rounded-full bg-[#F1EFE7] overflow-hidden">
                                  <div className="h-full rounded-full bg-[#d47455]" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <>
                          {post.content && (
                            <p className="selectable-text text-sm mb-2 line-clamp-[7] text-[#27251f] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                          )}
                          {post.image_path && (
                            <div className="block isolate rounded-xl overflow-hidden max-h-48 mb-2 bg-muted/30">
                              <img src={post.image_path} alt="" className="block w-full max-h-48 object-contain" />
                            </div>
                          )}
                          {post.url && (
                            <div className="mb-2">
                              <EmbedBlock url={post.url} className="text-xs" compact />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={openPost}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPost(); } }}
                    className="border-t border-[#f5f3eb] px-4 py-2 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center gap-4">
                      <button type="button" className="flex items-center gap-1.5 py-1 active:scale-95 transition-transform" onClick={(e) => handleHeartPost(e, post)}>
                        <Heart size={18} className={post.current_user_hearted ? 'text-[#d47455]' : 'text-[#787771]'} fill={post.current_user_hearted ? '#d47455' : 'none'} />
                        <span className="text-sm font-semibold" style={{ color: post.current_user_hearted ? '#d47455' : '#27251f' }}>{post.heart_count ?? 0}</span>
                      </button>
                      <span className="flex items-center gap-1.5 py-1 text-[#787771]">
                        <MessageSquare size={18} />
                        <span className="text-sm">{post.reply_count ?? 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {userId && (
        <NewPostModal
          open={newPostModalOpen}
          onOpenChange={setNewPostModalOpen}
          authorId={userId}
          publicName={publicName}
          onSuccess={async () => {
            setOptimisticNewPost(null);
            await loadPosts();
            onNewPostSuccess?.();
          }}
          onOptimisticSubmit={(data: NewPostModalOptimisticData) => {
            const now = new Date().toISOString();
            const sourceType = squadId ? ('squad' as const) : ('user' as const);
            const sourceId = squadId ?? null;
            const opt: FeedPostWithAuthor = {
              id: `opt-post-${Date.now()}`,
              author_id: userId,
              source_type: sourceType,
              source_id: sourceId,
              post_type: data.postType,
              title: data.title,
              content: data.content,
              image_path: null,
              url: data.url ?? null,
              created_at: now,
              updated_at: now,
              author: { id: userId, public_name: publicName, full_name: publicName, avatar_url: userAvatarUrl ?? null },
              heart_count: 0,
              reply_count: 0,
              current_user_hearted: false,
              current_user_pinned: false,
              poll_options: data.pollOptions?.map((text, i) => ({ id: `opt-opt-${i}`, post_id: '', option_text: text, sort_order: i, created_at: now, vote_count: 0 })),
            };
            setOptimisticNewPost(opt);
          }}
          onError={() => setOptimisticNewPost(null)}
          squadId={squadId ?? undefined}
        />
      )}
    </div>
  );
}
