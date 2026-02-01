/**
 * HomeFeed.tsx
 * Self-contained home feed + post detail view. Uses FeedService and profiles (public_name).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  MessageSquare,
  Pin,
  ChevronLeft,
  Plus,
} from 'lucide-react';
import { FeedService, type FeedPostWithAuthor, type FeedReplyWithAuthor } from '../services/feedService';
import { getEmbedInfo } from '../lib/embedUrl';
import { ScrollArea } from './ui/scroll-area';
import { NewPostModal } from './NewPostModal';

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
  onBack: () => void;
}

function PostDetailView({ post, userId, userDisplayName, onBack }: PostDetailViewProps) {
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

  const handleHeartPost = async () => {
    if (!userId || !detailPost) return;
    try {
      const { hearted } = await FeedService.toggleHeartPost(detailPost.id, userId);
      setDetailPost((prev) => prev ? { ...prev, current_user_hearted: hearted, heart_count: (prev.heart_count ?? 0) + (hearted ? 1 : -1) } : null);
    } catch {}
  };

  const handleVote = async (optionId: string) => {
    if (!userId || !detailPost) return;
    try {
      await FeedService.votePoll(detailPost.id, optionId, userId);
      await loadDetail();
    } catch {}
  };

  const handlePinPost = async () => {
    if (!userId || !detailPost) return;
    try {
      const { pinned } = await FeedService.togglePinPost(detailPost.id, userId);
      setDetailPost((prev) => prev ? { ...prev, current_user_pinned: pinned } : null);
    } catch {}
  };

  const countTotalReplies = (replies: FeedReplyWithAuthor[]): number => {
    return replies.reduce((sum, r) => sum + 1 + (r.replies?.length ? countTotalReplies(r.replies) : 0), 0);
  };

  const handleSubmitReply = async () => {
    const content = replyInput.replace(/^[ \t]+|[ \t]+$/g, '');
    if (!userId || !detailPost || !content || !content.trim()) return;
    setSubmitting(true);
    try {
      await FeedService.createReply(detailPost.id, userId, content, replyingTo ?? undefined);
      setReplyInput('');
      setReplyingTo(null);
      const r = await FeedService.listReplies(detailPost.id, userId);
      setReplies(r);
      setDetailPost((prev) => prev ? { ...prev, reply_count: countTotalReplies(r) } : null);
    } catch {}
    finally {
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
          <h1 className="text-lg flex-1 font-semibold text-[#27251f]" >Home</h1>
        </div>
        <div className="flex-1 flex items-center justify-center text-[#787771]">Loading...</div>
      </div>
    );
  }

  const authorName = FeedService.displayName(detailPost.author);
  const authorInitials = FeedService.initials(detailPost.author);
  const authorColor = FeedService.avatarColor(detailPost.author_id);
  const timeStr = FeedService.timeAgo(detailPost.created_at);
  const sourceLabel = detailPost.source_type === 'squad' ? 'Squad' : 'Student';
  const sourceColor = '#d47455';

  return (
    <div className="h-full flex flex-col bg-[#FBF9F5]">
      <div className="bg-[#F1EFE7] px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-6 h-6 text-[#27251f]" />
          </button>
          <h1 className="text-lg flex-1 font-semibold text-[#27251f]" >Home</h1>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="pr-4">
        <div className="bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                style={{ backgroundColor: authorColor, fontWeight: 600 }}
              >
                {authorInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#27251f]">{authorName}</span>
                  <span className="text-xs text-[#787771]">• {timeStr}</span>
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded-full inline-block mt-1"
                  style={{ backgroundColor: sourceColor + '20', color: sourceColor, fontWeight: 600 }}
                >
                  {sourceLabel}
                </div>
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
                    onClick={() => !detailPost.current_user_vote_option_id && handleVote(opt.id)}
                    disabled={!!detailPost.current_user_vote_option_id}
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
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                  style={{ backgroundColor: userId ? FeedService.avatarColor(userId) : '#787771', fontWeight: 600 }}
                >
                  {userId && userDisplayName
                    ? FeedService.initials({ public_name: userDisplayName, full_name: userDisplayName } as Parameters<typeof FeedService.initials>[0])
                    : userId
                      ? 'You'.slice(0, 2)
                      : '?'}
                </div>
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
                onReplyInputFocusChange={setIsReplyInputFocused}
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
  /** 0 = top-level, 1 = first reply, 2 = second, 3+ = flat with "replying to name" */
  depth?: number;
  /** When set, show "replying to [name]" next to author (for depth > 4 only) */
  parentReply?: FeedReplyWithAuthor | null;
  /** Called when inline reply textarea is focused/blurred (for keyboard/padding) */
  onReplyInputFocusChange?: (focused: boolean) => void;
}

function InlineReplyForm({
  userId,
  replyInput,
  setReplyInput,
  setReplyingTo,
  onSubmitReply,
  submitting,
  userDisplayName,
  onReplyInputFocusChange,
}: {
  userId: string | undefined;
  replyInput: string;
  setReplyInput: (v: string) => void;
  setReplyingTo: (id: string | null) => void;
  onSubmitReply: () => void;
  submitting: boolean;
  userDisplayName?: string;
  onReplyInputFocusChange?: (focused: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-2 min-w-0 max-w-full">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
        style={{ backgroundColor: userId ? FeedService.avatarColor(userId) : '#787771', fontWeight: 600 }}
      >
        {userId && userDisplayName
          ? FeedService.initials({ public_name: userDisplayName, full_name: userDisplayName } as Parameters<typeof FeedService.initials>[0])
          : 'Yo'}
      </div>
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
  depth = 0,
  parentReply,
  onReplyInputFocusChange,
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
  return (
    <div className={indentClass}>
      <div className={isTopLevel ? 'bg-white rounded-2xl p-4 shadow-sm' : 'bg-[#fefefc] rounded-2xl p-4'}>
        <div className="flex items-start gap-3">
          <div className={`${size} rounded-full flex items-center justify-center text-white flex-shrink-0`} style={{ backgroundColor: color, fontWeight: 600 }}>
            {initials}
          </div>
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
              depth={depth + 1}
              parentReply={reply}
              onReplyInputFocusChange={onReplyInputFocusChange}
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
}

export function HomeFeed({
  greeting = 'Good morning',
  userName = 'Justin',
  userId,
  publicName = 'You',
}: HomeFeedProps) {
  const [posts, setPosts] = useState<FeedPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<FeedPostWithAuthor | null>(null);
  const [newPostModalOpen, setNewPostModalOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await FeedService.listPosts(userId);
      setPosts(list);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleHeartPost = async (e: React.MouseEvent, post: FeedPostWithAuthor) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      const { hearted } = await FeedService.toggleHeartPost(post.id, userId);
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, current_user_hearted: hearted, heart_count: (p.heart_count ?? 0) + (hearted ? 1 : -1) } : p));
    } catch {}
  };

  const handlePinPost = async (e: React.MouseEvent, post: FeedPostWithAuthor) => {
    e.stopPropagation();
    if (!userId) return;
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
    } catch {}
  };

  if (selectedPost) {
    return (
      <PostDetailView
        post={selectedPost}
        userId={userId}
        userDisplayName={publicName}
        onBack={() => {
          setSelectedPost(null);
          loadPosts();
        }}
      />
    );
  }

  const sourceLabel = (p: FeedPostWithAuthor) => (p.source_type === 'squad' ? 'Squad' : 'Student');
  const sourceColor = '#d47455';

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-[#e7ded1] bg-[#FBF9F5] px-5 py-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl flex-1 min-w-0 font-medium text-[#27251f]" >
          {greeting}, {userName}
        </h1>
        {userId && (
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#d47455] text-white text-sm flex-shrink-0 active:scale-[0.98] transition-transform hover:bg-[#c06545]"
            style={{ fontWeight: 600 }}
            onClick={() => setNewPostModalOpen(true)}
          >
            <Plus size={18} />
            New post
          </button>
        )}
      </header>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#FBF9F5] px-4 py-4 pb-24 md:pb-4"
        style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[#787771]">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#787771] text-center">
            <p className="mb-2">No posts yet.</p>
            {userId && (
              <button
                type="button"
                onClick={() => setNewPostModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#d47455] text-white text-sm font-semibold"
              >
                New post
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const authorName = FeedService.displayName(post.author);
              const authorInitials = FeedService.initials(post.author);
              const authorColor = FeedService.avatarColor(post.author_id);
              const timeStr = FeedService.timeAgo(post.created_at);
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0" style={{ backgroundColor: authorColor, fontWeight: 600 }}>
                          {authorInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#27251f]">{authorName}</span>
                            <span className="text-xs text-[#787771]">• {timeStr}</span>
                          </div>
                          <div className="text-xs px-2 py-0.5 rounded-full inline-block mt-1" style={{ backgroundColor: sourceColor + '20', color: sourceColor, fontWeight: 600 }}>
                            {sourceLabel(post)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
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

                    <h3 className="text-base mb-2 font-semibold text-[#27251f] leading-tight" >{post.title}</h3>

                    {post.post_type === 'poll' && post.poll_options && post.poll_options.length > 0 ? (
                      <div className="text-sm text-[#787771] mb-2">
                        Poll · {post.poll_options.reduce((s, o) => s + (o.vote_count ?? 0), 0)} votes
                      </div>
                    ) : (
                      <>
                        {post.content && (
                          <p className="selectable-text text-sm mb-2 line-clamp-2 text-[#27251f] leading-relaxed whitespace-pre-wrap">{post.content}</p>
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

                  <div className="border-t border-[#f5f3eb] px-4 py-2 flex items-center justify-between">
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
          onSuccess={loadPosts}
        />
      )}
    </div>
  );
}
