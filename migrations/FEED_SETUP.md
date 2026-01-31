# Feed Backend Setup

SQL migrations for the home feed: posts (text/pic, social URL, poll), replies (threaded), hearts (likes), poll options/votes. All policies require auth.

## Run order (Supabase SQL Editor)

1. **create_feed_tables.sql** – Creates tables, indexes, triggers, enables RLS.
2. **feed_rls_policies.sql** – RLS policies (all auth; author can edit/delete post/reply; one vote per user per poll; one heart per user per post/reply).
3. **create_feed_post_images_bucket.sql** – Bucket and policies for post images.
4. **create_feed_user_pins.sql** – Per-user pinning: each user can pin posts for themselves (table `feed_user_pins` + RLS).
5. **drop_feed_posts_pin_columns.sql** – Optional: only if you previously ran an older `create_feed_tables.sql` that had `is_pinned`/`pinned_by`. Drops those columns and the is_pinned index. Safe to run (IF EXISTS); no-op if columns already gone.

Optional: create bucket **feed-post-images** (public) in Dashboard first, then run step 3. The script also inserts the bucket if your project allows it.

## Tables

### feed_posts
- `id`, `author_id`, `source_type` ('user' | 'squad'), `source_id` (e.g. squad_id), `post_type` ('text_pic' | 'social_url' | 'poll')
- `title`, `content` (nullable), `image_path` (nullable), `url` (nullable for social_url)
- `created_at`, `updated_at`
- Pinning is per-user via `feed_user_pins`. (If you have old `is_pinned`/`pinned_by` from an earlier schema, run drop_feed_posts_pin_columns.sql.)

### feed_poll_options
- `id`, `post_id`, `option_text`, `sort_order`, `created_at`

### feed_poll_votes
- `id`, `post_id`, `option_id`, `user_id`, `created_at`
- UNIQUE(post_id, user_id) – one vote per user per poll

### feed_replies
- `id`, `post_id`, `parent_reply_id` (nullable, for threading), `author_id`, `content`, `created_at`, `updated_at`

### feed_hearts
- `id`, `user_id`, `post_id` (nullable), `reply_id` (nullable), `created_at`
- Exactly one of `post_id` or `reply_id`. Partial unique indexes enforce one heart per user per post and per user per reply.

### feed_user_pins (per-user pinning)
- `id`, `user_id`, `post_id`, `created_at`
- UNIQUE(user_id, post_id) – each user can pin a post at most once.

## Security (RLS)

- **feed_posts**: Auth can read; insert as author; update/delete author only.
- **feed_poll_options**: Auth can read; insert/update/delete only post author.
- **feed_poll_votes**: Auth can read; insert/update/delete own vote (upsert uses UPDATE; one per user per poll by UNIQUE).
- **feed_replies**: Auth can read; insert as author; update/delete author only.
- **feed_hearts**: Auth can read; insert own heart; delete own heart.
- **feed_user_pins**: Auth can read own; insert own; delete own.

## Indexes

- **feed_posts**: author_id, (source_type, source_id), created_at DESC.
- **feed_poll_options**: post_id.
- **feed_poll_votes**: post_id, user_id; composite (post_id, option_id) in feed_performance_indexes.
- **feed_replies**: post_id, parent_reply_id, author_id; composite (post_id, created_at) in feed_performance_indexes.
- **feed_hearts**: post_id, reply_id, user_id; partial unique (user_id, post_id) and (user_id, reply_id).
- **feed_user_pins**: user_id, post_id; UNIQUE(user_id, post_id).

## Storage

- **Bucket**: `feed-post-images` (public).
- Path pattern: `{user_id}/{post_id}/{filename}` – only the owning user can upload/update/delete.
