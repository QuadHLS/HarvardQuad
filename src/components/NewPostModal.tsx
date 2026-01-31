/**
 * NewPostModal.tsx
 * Create a new feed post: text_pic, social_url, or poll. No anonymous option; posts as public_name.
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { FeedService, type PostType } from '../services/feedService';
import { Plus, X } from 'lucide-react';

export interface NewPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorId: string;
  publicName: string;
  onSuccess: () => void;
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
}: NewPostModalProps) {
  const [postType, setPostType] = useState<PostType>('text_pic');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (pollOptions.length < 10) setPollOptions([...pollOptions, '']);
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

    setSubmitting(true);
    try {
      if (postType === 'poll') {
        const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
        await FeedService.createPost({
          author_id: authorId,
          source_type: 'user',
          post_type: 'poll',
          title: trimmedTitle,
          poll_options: opts.map((text, i) => ({ option_text: text, sort_order: i })),
        });
      } else if (postType === 'social_url') {
        await FeedService.createPost({
          author_id: authorId,
          source_type: 'user',
          post_type: 'social_url',
          title: trimmedTitle,
          content: content.trim() || null,
          url: url.trim() || null,
        });
      } else {
        const post = await FeedService.createPost({
          author_id: authorId,
          source_type: 'user',
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
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-[#FBF9F5] border-[#e7ded1]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#3d3d3a]" style={{ fontFamily: 'Lora, serif' }}>
            New post
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[#7b7b74] -mt-2" style={{ fontFamily: 'Arial, sans-serif' }}>
          Posting as <span className="font-semibold text-[#3d3d3a]">{publicName || 'You'}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post type tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-[#F1EFE7]">
            {POST_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPostType(value)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  postType === value ? 'bg-white text-[#3d3d3a] shadow-sm' : 'text-[#7b7b74] hover:text-[#3d3d3a]'
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3d3d3a] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="bg-white border-[#e7ded1] text-[#3d3d3a]"
              maxLength={500}
              required
            />
          </div>

          {postType === 'text_pic' && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#3d3d3a] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Body (optional)
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="bg-white border-[#e7ded1] text-[#3d3d3a] min-h-[80px]"
                  maxLength={5000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3d3d3a] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Photo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[#3d3d3a] file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#d47455] file:text-white file:font-medium"
                />
              </div>
            </>
          )}

          {postType === 'social_url' && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#3d3d3a] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Description (optional)
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Brief description of the link"
                  className="bg-white border-[#e7ded1] text-[#3d3d3a] min-h-[60px]"
                  maxLength={1000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3d3d3a] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Link URL
                </label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-white border-[#e7ded1] text-[#3d3d3a]"
                />
              </div>
            </>
          )}

          {postType === 'poll' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[#3d3d3a]" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Options (min 2, max 10)
                </label>
                {pollOptions.length < 10 && (
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="flex items-center gap-1 text-sm text-[#d47455] font-medium hover:underline"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  >
                    <Plus size={14} /> Add option
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => setPollOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="bg-white border-[#e7ded1] text-[#3d3d3a]"
                      maxLength={200}
                    />
                    <button
                      type="button"
                      onClick={() => removePollOption(i)}
                      disabled={pollOptions.length <= 2}
                      className="p-2 rounded-lg text-[#7b7b74] hover:bg-[#F1EFE7] disabled:opacity-40"
                      aria-label="Remove option"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600" style={{ fontFamily: 'Arial, sans-serif' }}>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-[#e7ded1] text-[#3d3d3a]"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#d47455] hover:bg-[#c06545] text-white"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
            >
              {submitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
