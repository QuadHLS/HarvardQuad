/**
 * NewPostModal.tsx
 * Create a new feed post: text_pic, social_url, or poll. No anonymous option; posts as public_name.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { FeedService, type PostType } from '../services/feedService';
import { X } from 'lucide-react';

export interface NewPostModalOptimisticData {
  title: string;
  content: string | null;
  url: string | null;
  postType: PostType;
  pollOptions?: string[];
}

export interface NewPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorId: string;
  publicName: string;
  onSuccess: () => void;
  /** When set, post is created as squad feed (source_type: 'squad', source_id: squadId). */
  squadId?: string | null;
  /** Called before createPost so parent can show optimistic post. */
  onOptimisticSubmit?: (data: NewPostModalOptimisticData) => void;
  /** Called when create fails so parent can clear optimistic post. */
  onError?: () => void;
}

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'text_pic', label: 'Text or photo' },
  { value: 'social_url', label: 'Link' },
  { value: 'poll', label: 'Poll' },
];

export function NewPostModal({
  open,
  onOpenChange,
  authorId,
  publicName,
  onSuccess,
  squadId,
  onOptimisticSubmit,
  onError,
}: NewPostModalProps) {
  const sourceType = squadId ? 'squad' as const : 'user' as const;
  const sourceId = squadId ?? null;
  const [postType, setPostType] = useState<PostType>('text_pic');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollOptionsScrollRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setPostType('text_pic');
    setTitle('');
    setContent('');
    setUrl('');
    setImageFile(null);
    setPollOptions(['', '']);
    setError(null);
  }, []);

  const addPollOption = () => {
    if (pollOptions.length >= 15) return;
    setPollOptions([...pollOptions, '']);
    setTimeout(() => {
      const el = pollOptionsScrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const setPollOption = (index: number, value: string) => {
    const next = [...pollOptions];
    next[index] = value;
    setPollOptions(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    if (postType === 'social_url' && !url.trim()) {
      setError('Link URL is required for link posts.');
      return;
    }
    if (postType === 'poll') {
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) {
        setError('Add at least 2 poll options.');
        return;
      }
    }

    onOptimisticSubmit?.({
      title: trimmedTitle,
      content: content.trim() || null,
      url: postType === 'social_url' ? url.trim() || null : null,
      postType,
      pollOptions: postType === 'poll' ? pollOptions.map((o) => o.trim()).filter(Boolean) : undefined,
    });
    setSubmitting(true);
    try {
      if (postType === 'poll') {
        const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
        await FeedService.createPost({
          author_id: authorId,
          source_type: sourceType,
          source_id: sourceId,
          post_type: 'poll',
          title: trimmedTitle,
          poll_options: opts.map((text, i) => ({ option_text: text, sort_order: i })),
        });
      } else if (postType === 'social_url') {
        await FeedService.createPost({
          author_id: authorId,
          source_type: sourceType,
          source_id: sourceId,
          post_type: 'social_url',
          title: trimmedTitle,
          content: content.trim() || null,
          url: url.trim() || null,
        });
      } else {
        const post = await FeedService.createPost({
          author_id: authorId,
          source_type: sourceType,
          source_id: sourceId,
          post_type: 'text_pic',
          title: trimmedTitle,
          content: content.trim() || null,
        });
        let imagePath: string | null = null;
        if (imageFile) {
          imagePath = await FeedService.uploadPostImage(authorId, post.id, imageFile);
          await FeedService.updatePost(post.id, authorId, { image_path: imagePath });
        }
      }
      reset();
      // Refetch feed before closing so the new post appears immediately (await if callback is async)
      await Promise.resolve(onSuccess());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post.');
      onError?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
      <DrawerContent
        className="w-full max-w-none bg-[#FBF9F5] border-0 p-0 gap-0 flex flex-col !mt-0 !max-h-none min-h-[100dvh] h-[100dvh] rounded-t-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-4 border-b border-[#e7ded1]">
            <h2 className="text-xl font-semibold text-[#27251f] m-0">New Post</h2>
            <p className="text-sm text-[#787771] mt-1 m-0">
              Posting as <span className="font-medium text-[#27251f]">{publicName || 'You'}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="max-w-xl mx-auto">
                {/* Post type tabs */}
                <div className="flex gap-2 p-1.5 rounded-xl bg-[#F1EFE7] mb-6">
                  {POST_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPostType(value)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        postType === value
                          ? 'bg-white text-[#27251f] shadow-sm'
                          : 'text-[#787771] hover:text-[#27251f]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Title */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-[#27251f] mb-2">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's your post about?"
                    className="bg-white border-2 border-[#e7ded1] text-[#27251f] h-12 rounded-xl focus:border-[#d47455]"
                    maxLength={500}
                    required
                  />
                </div>

                {postType === 'text_pic' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-[#27251f] mb-2">Body (optional)</label>
                      <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind?"
                        className="bg-white border-2 border-[#e7ded1] text-[#27251f] min-h-[120px] rounded-xl focus:border-[#d47455] resize-none"
                        maxLength={5000}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#27251f] mb-2">Photo (optional)</label>
                      <label className="flex items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-[#e7ded1] bg-white hover:border-[#d47455] hover:bg-[#fef9f5] transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                        <span className="text-sm text-[#787771]">
                          {imageFile ? imageFile.name : 'Tap to add photo'}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {postType === 'social_url' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-[#27251f] mb-2">Link URL</label>
                      <Input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-white border-2 border-[#e7ded1] text-[#27251f] h-12 rounded-xl focus:border-[#d47455]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#27251f] mb-2">Description (optional)</label>
                      <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Brief description of the link"
                        className="bg-white border-2 border-[#e7ded1] text-[#27251f] min-h-[100px] rounded-xl focus:border-[#d47455] resize-none"
                        maxLength={1000}
                      />
                    </div>
                  </div>
                )}

                {postType === 'poll' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-[#27251f]">Options (min 2, max 15)</label>
                      {pollOptions.length < 15 && (
                        <button
                          type="button"
                          onClick={addPollOption}
                          className="text-sm text-[#d47455] font-medium hover:text-[#c06545]"
                        >
                          + Add option
                        </button>
                      )}
                    </div>
                    <div ref={pollOptionsScrollRef} className="space-y-3 max-h-[280px] overflow-y-auto">
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => setPollOption(i, e.target.value)}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 bg-white border-2 border-[#e7ded1] text-[#27251f] rounded-xl focus:border-[#d47455]"
                            maxLength={200}
                          />
                          <button
                            type="button"
                            onClick={() => removePollOption(i)}
                            disabled={pollOptions.length <= 2}
                            className="p-2.5 rounded-xl text-[#787771] hover:bg-[#F1EFE7] disabled:opacity-40 shrink-0"
                            aria-label="Remove option"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <p className="mt-4 text-sm text-red-600">{error}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-[#e7ded1] bg-[#FBF9F5]">
              <div className="max-w-xl mx-auto flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="h-11 px-5 rounded-xl text-sm border-[#e7ded1] text-[#27251f] hover:bg-[#F1EFE7]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 rounded-xl text-sm bg-[#d47455] hover:bg-[#c06545] text-white font-medium"
                >
                  {submitting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
