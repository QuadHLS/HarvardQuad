# Messaging System Database Setup

This directory contains SQL migrations to set up the messaging backend.

## Setup Steps

### 1. Run Database Migrations

Execute these SQL files in order in your Supabase SQL Editor:

1. **create_messaging_tables.sql** - Creates all tables, indexes, and triggers
2. **messaging_rls_policies.sql** - Sets up Row Level Security policies

### 2. Create Storage Buckets

Go to Supabase Dashboard > Storage and create two public buckets:

- **message-images** - For image attachments
- **message-files** - For file attachments

Then run:
3. **storage_buckets_setup.sql** - Sets up storage policies

### 3. Verify Setup

After running the migrations, verify:
- Tables are created: `conversations`, `conversation_participants`, `messages`, `message_attachments`
- RLS is enabled on all tables
- Storage buckets exist and are public
- Policies are active

## Database Schema

### conversations
- `id` (UUID) - Primary key
- `name` (TEXT) - Conversation name (null for DMs)
- `type` (TEXT) - 'dm' or 'group'
- `created_by` (UUID) - User who created the conversation
- `created_at`, `updated_at` (TIMESTAMPTZ)

### conversation_participants
- `id` (UUID) - Primary key
- `conversation_id` (UUID) - Foreign key to conversations
- `user_id` (UUID) - Foreign key to auth.users
- `joined_at` (TIMESTAMPTZ)
- `role` (TEXT) - 'admin' or 'member'

### messages
- `id` (UUID) - Primary key
- `conversation_id` (UUID) - Foreign key to conversations
- `sender_id` (UUID) - Foreign key to auth.users
- `content` (TEXT) - Message text
- `message_type` (TEXT) - 'text', 'image', or 'file'
- `created_at`, `updated_at` (TIMESTAMPTZ)

### message_attachments
- `id` (UUID) - Primary key
- `message_id` (UUID) - Foreign key to messages
- `file_name` (TEXT)
- `file_path` (TEXT) - Path in storage bucket
- `file_size` (BIGINT)
- `mime_type` (TEXT)
- `storage_bucket` (TEXT) - 'message-images' or 'message-files'
- `created_at` (TIMESTAMPTZ)

## Security

All tables have Row Level Security (RLS) enabled:
- Users can only see conversations they participate in
- Users can only send messages to conversations they're in
- Admins can add/remove participants from group chats
- Users can only delete their own messages
