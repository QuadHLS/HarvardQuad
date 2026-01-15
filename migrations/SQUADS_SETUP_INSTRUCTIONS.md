# Squads Backend Setup Instructions

## Overview
Complete squads backend with support for:
- Squad creation with automatic group chat creation
- Squad membership management
- Pinned documents/URLs
- Automatic group chat integration (join/leave squad = join/leave chat)
- Admin controls for squad management

## Setup Steps

### 1. Create Database Tables
Run `create_squads_tables.sql` in Supabase SQL Editor:
- Creates 3 tables: `squads`, `squad_members`, `squad_documents`
- Sets up indexes for performance
- Enables RLS on all tables
- Creates triggers for `updated_at` timestamps
- Links squads to conversations (group chats)

### 2. Create RLS Policies
Run `squads_rls_policies.sql` in Supabase SQL Editor:
- Sets up all Row Level Security policies
- Ensures authenticated access only
- Enforces proper permissions:
  - Open squads: visible to all authenticated users
  - Locked/Private squads: only visible to members
  - Admins can manage members and documents
  - Members can add documents

### 3. Create Functions
Run `squads_functions.sql` in Supabase SQL Editor:
- `create_squad()` - Creates squad and auto-creates group chat
- `join_squad()` - Joins squad and auto-joins group chat
- `leave_squad()` - Leaves squad and auto-leaves group chat
- `remove_squad_member()` - Removes member and auto-removes from group chat

## Database Schema

### squads
- `id` (UUID) - Primary key
- `name` (TEXT) - Squad name
- `info` (TEXT) - Description/details
- `category` (TEXT) - Category (e.g., 'sports', 'social', 'academic', 'hobbies')
- `meeting_times` (TEXT) - Meeting schedule
- `location` (TEXT) - Meeting location
- `type` (TEXT) - 'open', 'locked', or 'private'
- `created_by` (UUID) - User who created the squad
- `conversation_id` (UUID) - Link to auto-created group chat
- `created_at`, `updated_at` (TIMESTAMPTZ)

### squad_members
- `id` (UUID) - Primary key
- `squad_id` (UUID) - Foreign key to squads
- `user_id` (UUID) - Foreign key to auth.users
- `joined_at` (TIMESTAMPTZ)
- `role` (TEXT) - 'admin' or 'member'
- UNIQUE(squad_id, user_id)

### squad_documents
- `id` (UUID) - Primary key
- `squad_id` (UUID) - Foreign key to squads
- `name` (TEXT) - Display name
- `file_path` (TEXT) - Path in storage bucket (if stored)
- `file_url` (TEXT) - Direct URL (if external)
- `storage_bucket` (TEXT) - Bucket name if stored
- `file_size` (BIGINT) - File size in bytes
- `mime_type` (TEXT) - MIME type
- `created_by` (UUID) - User who added the document
- `created_at`, `updated_at` (TIMESTAMPTZ)

## Security

All tables have Row Level Security (RLS) enabled:
- ✅ **Authentication Required**: Every policy checks `auth.uid() IS NOT NULL`
- ✅ **Visibility Control**: Open squads visible to all, locked/private only to members
- ✅ **Membership Verification**: Users can only access squads they're members of
- ✅ **Admin Privileges**: Only admins can manage members and update squad details
- ✅ **Document Management**: Members can add, admins can manage all

## Automatic Group Chat Integration

When a squad is created:
1. A group chat is automatically created
2. The creator is added as admin to both squad and chat

When a user joins a squad:
1. User is added to `squad_members`
2. User is automatically added to the squad's group chat

When a user leaves a squad:
1. User is removed from `squad_members`
2. User is automatically removed from the squad's group chat

When an admin removes a member:
1. Member is removed from `squad_members`
2. Member is automatically removed from the squad's group chat

## Policy Summary

### Squads
- View: All authenticated users can view open squads; members can view locked/private squads
- Create: Authenticated users can create squads
- Update: Creator or admins can update
- Delete: Creator or admins can delete

### Squad Members
- View: Members can view other members; all can view members of open squads
- Join: Users can join open squads
- Leave: Users can leave squads they're in
- Add/Remove: Only admins can add/remove members

### Squad Documents
- View: Members can view documents; all can view documents of open squads
- Add: Members can add documents
- Update/Delete: Creator can update/delete their documents; admins can manage all

## Important Notes

1. **Group Chat Creation**: The `create_squad()` function automatically creates a group chat. The conversation_id is stored in the squad record.

2. **Admin Protection**: The system prevents removing the only admin from a squad. Admins must transfer admin role or delete the squad.

3. **Storage**: Squad documents can be stored in Supabase Storage buckets or as external URLs. The `storage_bucket` field indicates which bucket if stored.

4. **Categories**: Common categories include: 'sports', 'social', 'academic', 'hobbies', but any category can be used.
