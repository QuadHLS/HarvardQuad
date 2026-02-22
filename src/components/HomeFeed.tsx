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
import { toast } from 'sonner';
import { getEmbedInfo } from '../lib/embedUrl';
import { NewPostModal, type NewPostModalOptimisticData } from './NewPostModal';
import { UserProfileView } from './UserProfileView';
import { SwipeBackContainer } from './ui/SwipeBackContainer';

/** DiceBear thumbs avatar for Quadly (override-author) posts. */
const QUADLY_AVATAR_URL = 'https://api.dicebear.com/9.x/thumbs/svg?seed=quadly';

/** Renders avatar image when profile has avatar_url, otherwise colored circle with initials. */
function AuthorAvatar({
  profile,
  color,
  initials,
  sizeClass = 'w-7 h-7',
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
  /** When true (e.g. embedded in squad), do not show the header bar; parent provides it. */
  hideHeader?: boolean;
  /** When set (e.g. from squad), header uses this background color. */
  headerColor?: string;
  /** When true, header uses dark text (for light backgrounds like squad footer color). */
  headerDarkText?: boolean;
  /** When set (e.g. from squad), show "X members" under the title in the header. */
  memberCount?: number;
}

function PostDetailView({ post, userId, userDisplayName, userAvatarUrl, onBack, onOpenUserProfile, headerTitle = 'Home', hideHeader = false, headerColor, headerDarkText, memberCount }: PostDetailViewProps) {
  const [detailPost, setDetailPost] = useState<FeedPostWithAuthor | null>(post);
  const [replies, setReplies] = useState<FeedReplyWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyInput, setReplyInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomInputRef = useRef<HTMLDivElement>(null);

  const loadDetail = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        FeedService.getPost(post.id, userId),
        FeedService.listReplies(post.id, userId),
      ]);
      if (p) setDetailPost(p);
      setReplies(r || []);
    } catch {
      setDetailPost(null);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  }, [post.id, userId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [post.id]);

  // Realtime: refetch post + replies when they change
  useEffect(() => {
    const chReplies = FeedService.subscribeToFeedReplies(post.id, loadDetail);
    const { unsubscribe: unsubHearts } = FeedService.subscribeToFeedHearts(post.id, loadDetail);
    return () => {
      FeedService.unsubscribeFromFeedReplies(chReplies);
      unsubHearts();
    };
  }, [post.id, loadDetail]);

  const handleHeartPost = async () => {
    if (!userId || !detailPost) return;
    const next = !detailPost.current_user_hearted;
    setDetailPost((p) => p ? { ...p, current_user_hearted: next, heart_count: (p.heart_count ?? 0) + (next ? 1 : -1) } : null);
    try {
      const { hearted } = await FeedService.toggleHeartPost(post.id, userId);
      setDetailPost((p) => p ? { ...p, current_user_hearted: hearted } : null);
      loadDetail();
    } catch {
      setDetailPost((p) => p ? { ...p, current_user_hearted: detailPost.current_user_hearted, heart_count: detailPost.heart_count } : null);
    }
  };

  const handleSubmitReply = async (parentReplyId?: string | null) => {
    if (!userId || !replyInput.trim()) return;
    setSubmitting(true);
    try {
      await FeedService.createReply(post.id, userId, replyInput.trim(), parentReplyId ?? null);
      setReplyInput('');
      setReplyingTo(null);
      await loadDetail();
    } catch {
      toast.error('Failed to post reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !detailPost) {
    return (
      <SwipeBackContainer onBack={onBack} className="h-full flex flex-col bg-[#FBF9F5]">
        {!hideHeader && (
          <div
            className={`flex-shrink-0 px-4 ${headerColor ? 'py-2.5 border-b border-black/10' : 'py-4 bg-[#F1EFE7]'}`}
            style={headerColor ? { backgroundColor: headerColor } : undefined}
          >
            <div className="flex items-center gap-2 w-full max-w-3xl mx-auto">
              <button
                onClick={onBack}
                className={headerColor
                  ? `w-9 h-9 flex items-center justify-center rounded-full shrink-0 active:scale-95 transition-transform ${headerDarkText ? 'bg-black/10 text-[#27251f] hover:bg-black/15' : 'bg-black/65 text-white hover:bg-black/75'}`
                  : 'w-8 h-8 flex items-center justify-center shrink-0'}
                aria-label="Back"
              >
                <ChevronLeft className={headerColor ? (headerDarkText ? 'w-5 h-5 text-[#27251f]' : 'w-5 h-5 text-white') : 'w-6 h-6 text-[#27251f]'} />
              </button>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h1
                  className={`text-lg truncate font-semibold ${headerColor ? (headerDarkText ? 'text-[#27251f]' : 'text-white') : 'text-[#27251f]'}`}
                  style={{ fontWeight: 600 }}
                >
                  {headerTitle}
                </h1>
                {headerColor != null && memberCount != null && (
                  <p className={`text-xs truncate ${headerDarkText ? 'text-[#787771]' : 'text-white/90'}`}>
                    {memberCount} members
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
        </div>
      </SwipeBackContainer>
    );
  }

  return (
    <SwipeBackContainer onBack={onBack} className="h-full min-h-0 flex flex-col bg-[#FBF9F5]">
      {!hideHeader && (
        <div
          className={`flex-shrink-0 px-4 ${headerColor ? 'py-2.5 border-b border-black/10' : 'py-4 bg-[#F1EFE7]'}`}
          style={headerColor ? { backgroundColor: headerColor } : undefined}
        >
          <div className="flex items-center gap-2 w-full max-w-3xl mx-auto">
            <button
              onClick={onBack}
              className={headerColor
                ? `w-9 h-9 flex items-center justify-center rounded-full shrink-0 active:scale-95 transition-transform ${headerDarkText ? 'bg-black/10 text-[#27251f] hover:bg-black/15' : 'bg-black/65 text-white hover:bg-black/75'}`
                : 'w-8 h-8 flex items-center justify-center shrink-0'}
              aria-label="Back"
            >
              <ChevronLeft className={headerColor ? (headerDarkText ? 'w-5 h-5 text-[#27251f]' : 'w-5 h-5 text-white') : 'w-6 h-6 text-[#27251f]'} />
            </button>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h1
                className={`text-lg truncate font-semibold ${headerColor ? (headerDarkText ? 'text-[#27251f]' : 'text-white') : 'text-[#27251f]'}`}
                style={{ fontWeight: 600 }}
              >
                {headerTitle}
              </h1>
              {headerColor != null && memberCount != null && (
                <p className={`text-xs truncate ${headerDarkText ? 'text-[#787771]' : 'text-white/90'}`}>
                  {memberCount} members
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-24"
      >
        <div className="px-4 max-w-3xl mx-auto w-full py-4">
          {/* Post card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                {detailPost.override_author_name?.trim() ? (
                  <AuthorAvatar
                    profile={{ id: '', public_name: FeedService.postAuthorName(detailPost), full_name: '', avatar_url: QUADLY_AVATAR_URL } as ProfileRow}
                    color="#d47455"
                    initials={FeedService.postInitials(detailPost)}
                    sizeClass="w-10 h-10 shrink-0"
                  />
                ) : detailPost.author_id !== userId && onOpenUserProfile ? (
                  <AuthorAvatar
                    profile={detailPost.author}
                    color={FeedService.avatarColor(detailPost.author_id)}
                    initials={FeedService.initials(detailPost.author)}
                    sizeClass="w-10 h-10 shrink-0"
                    asButton
                    onClick={(e) => { e.preventDefault(); onOpenUserProfile(detailPost.author_id); }}
                    onPointerDown={(e) => { e.preventDefault(); onOpenUserProfile(detailPost.author_id); }}
                    aria-label={`View ${FeedService.postAuthorName(detailPost)}'s profile`}
                  />
                ) : (
                  <AuthorAvatar
                    profile={detailPost.author}
                    color={FeedService.avatarColor(detailPost.author_id)}
                    initials={FeedService.initials(detailPost.author)}
                    sizeClass="w-10 h-10 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#27251f]">{FeedService.postAuthorName(detailPost)}</p>
                  <p className="text-xs text-[#787771]">{FeedService.timeAgo(detailPost.created_at)}</p>
                </div>
              </div>
              <h2 className="text-lg font-semibold text-[#27251f] mb-2">{detailPost.title}</h2>
              {detailPost.post_type === 'poll' && detailPost.poll_options && detailPost.poll_options.length > 0 ? (
                <div className="space-y-2">
                  {detailPost.poll_options.map((opt) => {
                    const total = detailPost.poll_options!.reduce((s, o) => s + (o.vote_count ?? 0), 0);
                    const pct = total > 0 ? Math.round(((opt.vote_count ?? 0) / total) * 100) : 0;
                    const isSelected = detailPost.current_user_vote_option_id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={async () => {
                          if (!userId) return;
                          try {
                            await FeedService.votePoll(post.id, opt.id, userId);
                            await loadDetail();
                          } catch {
                            toast.error('Failed to vote. Please try again.');
                          }
                        }}
                        className={`w-full text-left rounded-lg border-2 px-3 py-2 transition-colors ${isSelected ? 'border-[#d47455] bg-[#fff3e0]' : 'border-[#e7ded1] hover:border-[#d9d2c5]'}`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-sm font-medium text-[#27251f]">{opt.option_text}</span>
                          <span className="text-xs text-[#787771]">{opt.vote_count ?? 0} ({pct}%)</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-[#F1EFE7] overflow-hidden">
                          <div className="h-full rounded-full bg-[#d47455]" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  {detailPost.content && (
                    <p className="text-sm text-[#27251f] leading-relaxed whitespace-pre-wrap mb-3">{detailPost.content}</p>
                  )}
                  {detailPost.image_path && (
                    <div className="rounded-xl overflow-hidden max-h-80 mb-3 bg-[#f5f3eb]">
                      <img src={detailPost.image_path} alt="" className="w-full h-auto object-contain" />
                    </div>
                  )}
                  {detailPost.url && <EmbedBlock url={detailPost.url} className="mb-3" />}
                </>
              )}
            </div>
            <div className="border-t border-[#f0ede5] px-4 py-2.5 flex items-center gap-4">
              <button
                type="button"
                onClick={handleHeartPost}
                className="flex items-center gap-1.5 py-1 active:scale-95 transition-transform"
              >
                <Heart size={18} className={detailPost.current_user_hearted ? 'text-[#d47455]' : 'text-[#787771]'} fill={detailPost.current_user_hearted ? '#d47455' : 'none'} />
                <span className="text-sm font-semibold" style={{ color: detailPost.current_user_hearted ? '#d47455' : '#27251f' }}>
                  {detailPost.heart_count ?? 0}
                </span>
              </button>
              <span className="flex items-center gap-1.5 text-[#787771]">
                <MessageSquare size={18} />
                <span className="text-sm">{detailPost.reply_count ?? 0} replies</span>
              </span>
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#27251f]">Replies</h3>
            {replies.length === 0 ? (
              <p className="text-sm text-[#787771] py-4">No replies yet. Be the first to reply!</p>
            ) : (
              replies.map((r) => (
                <ReplyBlock
                  key={r.id}
                  reply={r}
                  userId={userId}
                  onReply={setReplyingTo ? () => setReplyingTo(r.id) : () => {}}
                  onHeart={async () => {
                    if (!userId) return;
                    await FeedService.toggleHeartReply(r.id, userId);
                    loadDetail();
                  }}
                  onReplySubmit={() => {}}
                  refreshReplies={loadDetail}
                  isTopLevel={true}
                  replyingTo={replyingTo}
                  replyInput={replyInput}
                  setReplyInput={setReplyInput}
                  setReplyingTo={setReplyingTo}
                  onSubmitReply={() => handleSubmitReply(r.id)}
                  submitting={submitting}
                  userDisplayName={userDisplayName}
                  userAvatarUrl={userAvatarUrl}
                  onOpenUserProfile={onOpenUserProfile}
                  useBottomBarOnly
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom input bar */}
      {userId && (
        <div
          ref={bottomInputRef}
          className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#e7ded1] px-4 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-3xl mx-auto">
            {replyingTo && (() => {
              const flatten = (rs: FeedReplyWithAuthor[]): FeedReplyWithAuthor[] =>
                rs.flatMap((r) => [r, ...flatten(r.replies || [])]);
              const target = flatten(replies).find((x) => x.id === replyingTo);
              const replyingToName = target ? FeedService.displayName(target.author) : '';
              return (
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-[#787771]">Replying to {replyingToName}</span>
                  <button
                    type="button"
                    onClick={() => { setReplyingTo(null); setReplyInput(''); }}
                    className="text-xs text-[#d47455] hover:text-[#c06545] font-medium"
                  >
                    Cancel
                  </button>
                </div>
              );
            })()}
            <div className="flex items-end gap-2">
              <AuthorAvatar
                profile={{ id: userId, public_name: userDisplayName ?? '', full_name: userDisplayName ?? '', avatar_url: userAvatarUrl ?? null }}
                color={FeedService.avatarColor(userId)}
                initials={userDisplayName ? FeedService.initials({ public_name: userDisplayName, full_name: userDisplayName } as ProfileRow) : '?'}
                sizeClass="w-9 h-9 shrink-0"
              />
              <div className="flex-1 flex items-end gap-2 bg-[#FBF9F5] rounded-xl border-2 border-[#e7ded1] focus-within:border-[#d47455] px-3 py-2 min-h-[44px] transition-colors">
                <textarea
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onFocus={() => window.dispatchEvent(new CustomEvent('feedInputFocused', { detail: { focused: true } }))}
                  onBlur={() => window.dispatchEvent(new CustomEvent('feedInputFocused', { detail: { focused: false } }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitReply(replyingTo);
                    }
                  }}
                  placeholder={replyingTo ? 'Write your reply...' : 'Add a reply...'}
                  className="flex-1 min-w-0 bg-transparent text-sm text-[#27251f] resize-none focus:outline-none placeholder:text-[#787771]"
                  rows={1}
                  style={{ maxHeight: 100 }}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => handleSubmitReply(replyingTo)}
                  disabled={!replyInput.trim() || submitting}
                  className="px-4 py-1.5 rounded-lg bg-[#d47455] text-white text-xs font-semibold disabled:opacity-50 shrink-0 hover:bg-[#c06545] transition-colors"
                >
                  {submitting ? '…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SwipeBackContainer>
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
  /** When true, do not show inline reply form (use external bottom bar instead) */
  useBottomBarOnly?: boolean;
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
        sizeClass="w-6 h-6"
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
        className="px-3 py-1.5 rounded-lg bg-[#d47455] text-white text-xs font-semibold disabled:opacity-50 flex-shrink-0"
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
  useBottomBarOnly = false,
}: ReplyBlockProps) {
  const name = FeedService.displayName(reply.author);
  const initials = FeedService.initials(reply.author);
  const color = FeedService.avatarColor(reply.author_id);
  const timeStr = FeedService.timeAgo(reply.created_at);
  const size = isTopLevel ? 'w-7 h-7 text-xs' : 'w-6 h-6 text-xs';
  const handleNestedHeart = async (replyId: string) => {
    if (!userId) return;
    await FeedService.toggleHeartReply(replyId, userId);
    refreshReplies?.();
  };
  const showInlineForm = !useBottomBarOnly && replyingTo != null && setReplyInput && setReplyingTo && onSubmitReply;
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
      <div className={isTopLevel ? 'bg-white rounded-xl p-4 shadow-sm' : 'bg-[#fefefc] rounded-xl p-4'}>
        <div className="flex items-start gap-3">
          {onOpenUserProfile && !isOwnReply ? (
            <AuthorAvatar
              profile={reply.author}
              color={color}
              initials={initials}
              sizeClass={`min-w-[28px] min-h-[28px] ${size}`}
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
              useBottomBarOnly={useBottomBarOnly}
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
  /** When embedded (e.g. squad), header uses this background color so post header matches squad header. */
  embedHeaderColor?: string;
  /** When true, embedded post header uses dark text (for light backgrounds). */
  embedHeaderDarkText?: boolean;
  /** When embedded (e.g. squad), show this member count under the header title. */
  embedMemberCount?: number;
  /** When this value changes, feed refetches (e.g. parent bumps after new post so all instances update). */
  feedRefreshKey?: number;
  /** When provided (e.g. embedded), called after a new post is created so parent can refresh all feed instances. */
  onNewPostSuccess?: () => void;
  /** Restore this post when returning to the page (open post detail by id). */
  initialPostId?: string | null;
  /** Called when user opens or closes a post so parent can persist subpage. */
  onPostChange?: (postId: string | null) => void;
  /** When true (e.g. embedded in squad detail), feed does not use internal scroll; parent scrolls intro + feed together. */
  scrollWithParent?: boolean;
  /** When provided (e.g. embedded), parent can register a function to close the post detail from outside. */
  onRegisterClosePost?: (close: () => void) => void;
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
  embedHeaderColor,
  embedHeaderDarkText,
  embedMemberCount,
  feedRefreshKey,
  onNewPostSuccess,
  initialPostId,
  onPostChange,
  scrollWithParent = false,
  onRegisterClosePost,
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

  useEffect(() => {
    onRegisterClosePost?.(() => {
      setSelectedPost(null);
      onPostChange?.(null);
    });
    return () => onRegisterClosePost?.(() => {});
  }, [onRegisterClosePost, onPostChange]);

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
        }}
        onOpenUserProfile={(id) => id !== userId && setViewingUserId(id)}
        headerTitle={embedHeaderTitle ?? 'Home'}
        hideHeader={false}
        headerColor={embedHeaderColor}
        headerDarkText={embedHeaderDarkText}
        memberCount={embedMemberCount}
      />
    );
  }

  const sourceLabel = (p: FeedPostWithAuthor) =>
    p.source_type === 'squad' ? (p.is_squad_admin ? 'Admin' : 'Member') : 'Student';
  const sourceColor = '#d47455';

  const rootClass = scrollWithParent
    ? 'flex flex-col min-h-0'
    : 'flex-1 min-h-0 flex flex-col overflow-hidden';
  const listWrapperClass = scrollWithParent
    ? 'overflow-x-hidden bg-[#FBF9F5] px-2 py-4 pb-24 md:pb-4'
    : 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#FBF9F5] px-2 py-4 pb-24 md:pb-4';

  return (
    <div className={rootClass}>
      {!embedded && (
        <header className="flex-shrink-0 border-b border-[#e7ded1] bg-[#FBF9F5] px-5 py-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl flex-1 min-w-0 font-medium text-[#27251f]" >
            {greeting}, {publicName}
          </h1>
          {userId && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d47455] text-white text-xs flex-shrink-0 active:scale-[0.98] transition-transform hover:bg-[#c06545]"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d47455] text-white text-xs flex-shrink-0 active:scale-[0.98] transition-transform hover:bg-[#c06545]"
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
        className={listWrapperClass}
        style={scrollWithParent ? undefined : { overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}
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
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="p-4 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={openPost}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPost(); } }}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        {post.override_author_name?.trim() ? (
                          <AuthorAvatar
                            profile={{ id: '', public_name: authorName, full_name: authorName, avatar_url: QUADLY_AVATAR_URL } as ProfileRow}
                            color="#d47455"
                            initials={authorInitials}
                            sizeClass="min-w-[28px] min-h-[28px] w-7 h-7 shrink-0"
                            className="relative z-10"
                          />
                        ) : post.author_id !== userId ? (
                          <AuthorAvatar
                            profile={post.author}
                            color={authorColor}
                            initials={authorInitials}
                            sizeClass="min-w-[28px] min-h-[28px] w-7 h-7 shrink-0"
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
                            sizeClass="w-7 h-7 shrink-0"
                          />
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                          <span className="text-sm font-semibold text-[#27251f] truncate">{authorName}</span>
                          <span className="text-xs text-[#787771] shrink-0">• {timeStr}</span>
                          {!post.override_author_name?.trim() && (
                            <span className="text-xs px-2 py-0.5 rounded-full inline-block shrink-0" style={{ backgroundColor: sourceColor + '20', color: sourceColor, fontWeight: 600 }}>
                              {sourceLabel(post)}
                            </span>
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
                            <div className="w-full flex justify-center rounded-xl overflow-hidden max-h-48 mb-2 bg-muted/30">
                              <img src={post.image_path} alt="" className="max-w-full max-h-48 w-auto h-auto object-contain" />
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
