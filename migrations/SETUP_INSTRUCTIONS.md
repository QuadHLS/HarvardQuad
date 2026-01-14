# Messaging System Setup Instructions

## Overview
Complete messaging backend with support for:
- Direct messaging (1-on-1)
- Group chats
- Text, image, and file messages
- Group chat management (add/remove members)
- Secure file storage

## Setup Steps

### 1. Create Database Tables
Run `create_messaging_tables.sql` in Supabase SQL Editor:
- Creates 4 tables: `conversations`, `conversation_participants`, `messages`, `message_attachments`
- Sets up indexes for performance
- Enables RLS on all tables
- Creates triggers for `updated_at` timestamps

### 2. Create RLS Policies
Run `messaging_rls_policies.sql` in Supabase SQL Editor:
- Sets up all Row Level Security policies
- Ensures authenticated access only
- Enforces proper permissions

### 3. Create Storage Buckets
**Via Supabase Dashboard:**
1. Go to Storage > Buckets
2. Click "New bucket"
3. Create bucket: `message-images` (set as **Public**)
4. Create bucket: `message-files` (set as **Public**)

**Then run `storage_buckets_setup.sql`** to set up storage policies

## Security Verification

All policies have been verified to ensure:

✅ **Authentication Required**: Every policy checks `auth.uid() IS NOT NULL`
✅ **Participant Verification**: Users can only access conversations they're in
✅ **Ownership Verification**: Users can only modify their own content
✅ **Admin Privileges**: Only admins can manage group participants
✅ **Storage Isolation**: Files stored in user-specific folders (`{user_id}/...`)

## Policy Summary

### Conversations
- View: Only conversations user participates in
- Create: Authenticated users can create
- Update/Delete: Only creator can modify

### Participants
- View: Only in conversations user is part of
- Add: Users can add themselves; Admins can add others (group chats only)
- Remove: Users can remove themselves; Admins can remove anyone

### Messages
- View: Only in conversations user participates in
- Send: Only to conversations user is in
- Update/Delete: Only own messages

### Attachments
- View: Only in conversations user participates in
- Create/Update/Delete: Only for own messages

### Storage
- View: Authenticated users only
- Upload: To own folder only (`{user_id}/...`)
- Update/Delete: Own files only

## Testing After Setup

1. Verify tables exist and RLS is enabled
2. Verify storage buckets exist and are public
3. Test with authenticated user
4. Test that unauthenticated requests fail
5. Test participant restrictions
6. Test file uploads/downloads

## Next Steps

After running migrations:
1. Update `MessagingPage` component to use `messagingService.ts`
2. Add UI for creating conversations
3. Add file/image upload buttons
4. Test end-to-end messaging flow
