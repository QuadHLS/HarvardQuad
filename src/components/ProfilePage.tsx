import React, { useState, useEffect, useRef } from 'react';
import { Mail, Phone, MapPin, Calendar, Book, Award, Edit2, ChevronRight, LogOut, Save, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfileData {
  full_name: string | null;
  public_name: string | null;
  email: string | null;
  major: string | null;
  graduation_year: string | null;
  phone: string | null;
  location: string | null;
  gpa: string | null;
  avatar_url: string | null;
  classes?: unknown[];
}

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editValues, setEditValues] = useState({
    public_name: '',
    phone: '',
    location: '',
    gpa: '',
    major: '',
    graduation_year: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, public_name, email, class_year, major, graduation_year, phone, location, gpa, avatar_url, classes')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          // If profile doesn't exist, use user email as fallback
          setProfile({
            full_name: user.user_metadata?.full_name || null,
            public_name: null,
            email: user.email || null,
            major: null,
            graduation_year: null,
            phone: null,
            location: null,
            gpa: null,
            avatar_url: null,
            classes: [],
          });
        } else {
          setProfile({
            ...data,
            major: data.major ?? null,
            classes: Array.isArray(data.classes) ? data.classes : [],
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        // Fallback to user email
        setProfile({
          full_name: user.user_metadata?.full_name || null,
          public_name: null,
          email: user.email || null,
          major: null,
          graduation_year: null,
          phone: null,
          location: null,
          gpa: null,
          avatar_url: null,
          classes: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Initialize edit values when profile loads or edit mode is enabled (profile page edits public name)
  useEffect(() => {
    if (profile && isEditing) {
      setEditValues({
        public_name: profile.public_name || '',
        phone: profile.phone || '',
        location: profile.location || '',
        gpa: profile.gpa || '',
        major: profile.major || '',
        graduation_year: profile.graduation_year || '',
      });
    }
  }, [profile, isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  // Function to capitalize first letter of each word
  const capitalizeWords = (text: string): string => {
    return text
      .split(' ')
      .map(word => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValues({ ...editValues, public_name: e.target.value });
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    if (profile) {
      setEditValues({
        public_name: profile.public_name || '',
        phone: profile.phone || '',
        location: profile.location || '',
        gpa: profile.gpa || '',
        major: profile.major || '',
        graduation_year: profile.graduation_year || '',
      });
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          public_name: editValues.public_name.trim() || null,
          phone: editValues.phone || null,
          location: editValues.location || null,
          gpa: editValues.gpa || null,
          major: editValues.major.trim() || null,
          graduation_year: editValues.graduation_year || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
        setSaving(false);
        return;
      }

      // Update local profile state
      setProfile({
        ...profile,
        public_name: editValues.public_name.trim() || null,
        phone: editValues.phone || null,
        location: editValues.location || null,
        gpa: editValues.gpa || null,
        major: editValues.major || null,
        graduation_year: editValues.graduation_year || null,
      });

      // Dispatch event to notify other components of profile update
      window.dispatchEvent(new CustomEvent('profileUpdated'));

      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    // Confirm deletion
    if (!confirm('Are you sure you want to delete your avatar? This action cannot be undone.')) {
      return;
    }

    setDeletingAvatar(true);
    try {
      // Find and delete the avatar file from storage
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('avatars')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (listError) {
        console.error('Error listing avatars for deletion:', listError);
      } else if (existingFiles && existingFiles.length > 0) {
        // Filter files that belong to this user
        const filesToDelete = existingFiles
          .filter(file => file.name.startsWith(`${user.id}-`))
          .map(file => file.name);

        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove(filesToDelete);

          if (deleteError) {
            console.error('Error deleting avatar from storage:', deleteError);
            // Continue with profile update even if storage delete fails
          }
        }
      }

      // Update profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: null, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error removing avatar URL from profile:', updateError);
        alert('Failed to delete avatar. Please try again.');
        setDeletingAvatar(false);
        return;
      }

      // Update local profile state to show default image
      if (profile) {
        setProfile({
          ...profile,
          avatar_url: null,
        });
      }

      // Dispatch event to notify other components of profile update
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (err) {
      console.error('Error deleting avatar:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      // First, find and delete any existing avatar files for this user
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('avatars')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (listError) {
        console.error('Error listing existing avatars:', listError);
      } else if (existingFiles && existingFiles.length > 0) {
        // Filter files that belong to this user (filename starts with user ID)
        const filesToDelete = existingFiles
          .filter(file => file.name.startsWith(`${user.id}-`))
          .map(file => file.name);

        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove(filesToDelete);

          if (deleteError) {
            console.error('Error deleting old avatars:', deleteError);
            // Continue with upload even if delete fails
          }
        }
      }

      // Create a unique filename for the new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // We're deleting old files, so no need for upsert
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        console.error('Upload error details:', {
          message: uploadError.message,
          name: uploadError.name,
        });
        alert(`Failed to upload avatar: ${uploadError.message || 'Unknown error'}. Please check the browser console for details.`);
        setUploadingAvatar(false);
        return;
      }

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL in the profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating avatar URL:', updateError);
        alert('Failed to update avatar. Please try again.');
        setUploadingAvatar(false);
        return;
      }

      // Update local profile state to reflect the new avatar
      if (profile) {
        setProfile({
          ...profile,
          avatar_url: publicUrl,
        });
      }

      // Dispatch event to notify other components of profile update
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const classesCount = profile?.classes?.length ?? 0;
  const creditsTotal = (profile?.classes ?? []).reduce(
    (sum, c) => sum + (Number((c as { credits?: number | null }).credits) || 0),
    0
  );
  const stats = [
    { label: 'Classes', value: String(classesCount) },
    { label: 'Squads', value: '5' },
    { label: 'Credits', value: String(creditsTotal) }
  ];

  // Helper function to get class year display
  const getClassYearDisplay = () => {
    if (!profile) return '';
    if (profile.graduation_year) {
      return `Class of ${profile.graduation_year}`;
    }
    return '';
  };

  // Helper function to get graduation year display
  const getGraduationDisplay = () => {
    if (!profile) return '';
    if (profile.graduation_year) return `Class of ${profile.graduation_year}`;
    return '';
  };

  const profilePageBackground = {
    background: `
      radial-gradient(ellipse 100% 80% at 10% 30%, rgba(255, 218, 190, 0.9), transparent 65%),
      radial-gradient(ellipse 85% 100% at 88% 50%, rgba(252, 198, 168, 0.88), transparent 60%),
      radial-gradient(ellipse 95% 75% at 50% 90%, rgba(253, 208, 178, 0.85), transparent 55%),
      radial-gradient(ellipse 75% 95% at 72% 12%, rgba(254, 218, 192, 0.88), transparent 58%),
      #fbf2eb
    `,
    minHeight: 'var(--app-height, 100vh)',
  };

  if (loading) {
    return (
      <>
        {/* Mobile View - Centered on screen */}
        <div className="md:hidden h-screen w-full flex items-center justify-center fixed inset-0" style={profilePageBackground}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455] mx-auto"></div>
          </div>
        </div>
        {/* Desktop View */}
        <div className="hidden md:flex h-full w-full items-center justify-center" style={profilePageBackground}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455] mx-auto"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-full min-h-full w-full" style={profilePageBackground}>
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />
      {/* Mobile View - gradient on scroll container so it extends to bottom */}
      <div
        className="md:hidden min-h-full overflow-y-auto relative"
        style={{ paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 0px))', ...profilePageBackground }}
      >
        {/* Edit / Save & Cancel - top right only */}
        <div
          className="absolute top-0 right-0 z-10 flex items-center gap-2 pr-5 pt-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="w-10 h-10 rounded-full bg-[#27251f] text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm hover:bg-[#1a1916]"
              aria-label="Edit profile"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="w-10 h-10 rounded-full border-2 border-[#e8e4db] bg-white/90 text-[#27251f] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 shadow-sm"
                aria-label="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-10 h-10 rounded-full bg-[#27251f] text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm hover:bg-[#1a1916] disabled:opacity-50"
                aria-label={saving ? 'Saving' : 'Save'}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Profile content */}
        <div className="px-5 pb-8 pt-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
          <div className="flex flex-col items-center">
            {profile?.avatar_url && profile.avatar_url.trim() !== '' ? (
              <img 
                src={profile.avatar_url} 
                alt="Profile" 
                className="w-32 h-32 rounded-full object-cover mb-3 shadow-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mb-3 shadow-md text-white text-3xl"
              style={{ 
                backgroundColor: (() => {
                  const name = profile?.public_name || profile?.full_name || user?.email || 'User';
                  const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#787771'];
                  return colors[name.charCodeAt(0) % colors.length];
                })(),
                display: (profile?.avatar_url && profile.avatar_url.trim() !== '') ? 'none' : 'flex',
                fontWeight: 600
              }}
            >
              {(() => {
                const name = profile?.public_name || profile?.full_name || user?.email?.split('@')[0] || 'User';
                const forInitials = profile?.public_name || profile?.full_name;
                if (forInitials) {
                  const parts = forInitials.trim().split(/\s+/);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
                  }
                  return name.charAt(0).toUpperCase().slice(0, 2);
                }
                return name.charAt(0).toUpperCase().slice(0, 2);
              })()}
            </div>
            {isEditing && (
              <div className="flex items-center gap-2 mb-4">
                <button 
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar || deletingAvatar}
                  className="px-4 py-1.5 bg-[#27251f] text-white rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition-transform shadow-sm hover:bg-[#1a1916] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{  fontWeight: 500 }}
                >
                  {uploadingAvatar ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-3 h-3" />
                      Change Avatar
                    </>
                  )}
                </button>
                {profile?.avatar_url && profile.avatar_url.trim() !== '' && (
                  <button 
                    onClick={handleDeleteAvatar}
                    disabled={uploadingAvatar || deletingAvatar}
                    className="px-4 py-1.5 bg-red-500/20 backdrop-blur-sm text-white rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition-transform shadow-sm hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{  fontWeight: 500 }}
                  >
                    {deletingAvatar ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" />
                        Delete Avatar
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
            {isEditing ? (
              <input
                type="text"
                value={editValues.public_name}
                onChange={handleNameChange}
                className="text-3xl text-[#27251f] mb-1 rounded-xl px-4 py-2.5 w-full max-w-xs text-center focus:outline-none focus:ring-2 focus:ring-[#d47455] min-h-[48px] bg-white border border-[#e8e4db]"
                style={{ fontWeight: 600 }}
                placeholder="Public name (shown to others)"
              />
            ) : (
              <h1 
                className="text-3xl mb-1"
                style={{ fontWeight: 600, color: '#27251f' }}
              >
                {profile?.public_name || profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </h1>
            )}
            {!isEditing && (
              <p 
                className="text-sm mb-2"
                style={{ color: '#787771' }}
              >
                {getClassYearDisplay()}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-5 mt-2 mb-6">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-[#f5f3eb]">
                <p 
                  className="text-2xl mb-1"
                  style={{ fontWeight: 600, color: '#d47455' }}
                >
                  {stat.value}
                </p>
                <p 
                  className="text-xs"
                  style={{  color: '#787771' }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="px-5 mb-6">
          <h2 
            className="text-xl mb-4"
            style={{ fontWeight: 600, color: '#27251f' }}
          >
            Contact
          </h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f5f3eb]">
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
              <div className="w-11 h-11 rounded-2xl bg-[#fef3ef] flex items-center justify-center">
                <Mail className="w-5 h-5" style={{ color: '#d47455' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p 
                  className="text-xs mb-1"
                  style={{  color: '#787771' }}
                >
                  Email
                </p>
                <p 
                  className="text-sm"
                  style={{  color: '#27251f' }}
                >
                  {profile?.email || user?.email || 'Not provided'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
              <div className="w-11 h-11 rounded-2xl bg-[#f5f7f9] flex items-center justify-center">
                <Phone className="w-5 h-5" style={{ color: '#7b9fb8' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p 
                  className="text-xs mb-1"
                  style={{  color: '#787771' }}
                >
                  Phone
                </p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editValues.phone}
                    onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455] min-h-[44px] bg-white"
                    style={{  color: '#27251f' }}
                    placeholder="Add phone number"
                  />
                ) : (
                  <p 
                    className="text-sm"
                    style={{  color: '#27251f' }}
                  >
                    {profile?.phone || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
              <div className="w-11 h-11 rounded-2xl bg-[#f5f7f5] flex items-center justify-center">
                <MapPin className="w-5 h-5" style={{ color: '#8c9e8c' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p 
                  className="text-xs mb-1"
                  style={{  color: '#787771' }}
                >
                  Location
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editValues.location}
                    onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455] min-h-[44px] bg-white"
                    style={{  color: '#27251f' }}
                    placeholder="Add city or location"
                  />
                ) : (
                  <p 
                    className="text-sm"
                    style={{  color: '#27251f' }}
                  >
                    {profile?.location || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Info */}
        {(profile?.major || profile?.graduation_year || profile?.gpa || isEditing) && (
          <div className="px-5 mb-6">
            <h2 
              className="text-xl mb-4"
              style={{ fontWeight: 600, color: '#27251f' }}
            >
              Academic Info
            </h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f5f3eb]">
              <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
                <div className="w-11 h-11 rounded-2xl bg-[#f5f7f9] flex items-center justify-center">
                  <Book className="w-5 h-5" style={{ color: '#7b9fb8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{  color: '#787771' }}
                  >
                    Major
                  </p>
                  {isEditing ? (
                    <select
                      value={editValues.major}
                      onChange={(e) => setEditValues({ ...editValues, major: e.target.value })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455] bg-white min-h-[44px]"
                      style={{  color: '#27251f' }}
                    >
                      <option value="">Select Major</option>
                      <option value="African and African American Studies (B.A.)">African and African American Studies (B.A.)</option>
                      <option value="Anthropology (B.A.)">Anthropology (B.A.)</option>
                      <option value="Applied Mathematics (B.A.)">Applied Mathematics (B.A.)</option>
                      <option value="Art, Film, and Visual Studies (B.A.)">Art, Film, and Visual Studies (B.A.)</option>
                      <option value="Astrophysics (B.A.)">Astrophysics (B.A.)</option>
                      <option value="Biomedical Engineering (B.A.)">Biomedical Engineering (B.A.)</option>
                      <option value="Chemical and Physical Biology (B.A.)">Chemical and Physical Biology (B.A.)</option>
                      <option value="Chemistry (B.A.)">Chemistry (B.A.)</option>
                      <option value="Chemistry and Physics (B.A.)">Chemistry and Physics (B.A.)</option>
                      <option value="Classics (B.A.)">Classics (B.A.)</option>
                      <option value="Comparative Literature (B.A.)">Comparative Literature (B.A.)</option>
                      <option value="Comparative Study of Religion (B.A.)">Comparative Study of Religion (B.A.)</option>
                      <option value="Computer Science (B.A.)">Computer Science (B.A.)</option>
                      <option value="Earth and Planetary Sciences (B.A.)">Earth and Planetary Sciences (B.A.)</option>
                      <option value="East Asian Studies (B.A.)">East Asian Studies (B.A.)</option>
                      <option value="Economics (B.A.)">Economics (B.A.)</option>
                      <option value="Electrical Engineering (B.A./B.S.)">Electrical Engineering (B.A./B.S.)</option>
                      <option value="Engineering Sciences (B.A./B.S.)">Engineering Sciences (B.A./B.S.)</option>
                      <option value="English (B.A.)">English (B.A.)</option>
                      <option value="Environmental Science and Engineering (B.A.)">Environmental Science and Engineering (B.A.)</option>
                      <option value="Environmental Science and Public Policy (B.A.)">Environmental Science and Public Policy (B.A.)</option>
                      <option value="Folklore and Mythology (B.A.)">Folklore and Mythology (B.A.)</option>
                      <option value="Germanic Languages and Literature (B.A.)">Germanic Languages and Literature (B.A.)</option>
                      <option value="Government (B.A.)">Government (B.A.)</option>
                      <option value="History (B.A.)">History (B.A.)</option>
                      <option value="History and Literature (B.A.)">History and Literature (B.A.)</option>
                      <option value="History and Science (B.A.)">History and Science (B.A.)</option>
                      <option value="History of Art and Architecture (B.A.)">History of Art and Architecture (B.A.)</option>
                      <option value="Human Developmental and Regenerative Biology (B.A.)">Human Developmental and Regenerative Biology (B.A.)</option>
                      <option value="Human Evolutionary Biology (B.A.)">Human Evolutionary Biology (B.A.)</option>
                      <option value="Integrative Biology (B.A.)">Integrative Biology (B.A.)</option>
                      <option value="Linguistics (B.A.)">Linguistics (B.A.)</option>
                      <option value="Mathematics (B.A.)">Mathematics (B.A.)</option>
                      <option value="Mechanical Engineering (B.S.)">Mechanical Engineering (B.S.)</option>
                      <option value="Molecular and Cellular Biology (B.A.)">Molecular and Cellular Biology (B.A.)</option>
                      <option value="Music (B.A.)">Music (B.A.)</option>
                      <option value="Near Eastern Languages and Civilizations (B.A.)">Near Eastern Languages and Civilizations (B.A.)</option>
                      <option value="Neuroscience (B.A.)">Neuroscience (B.A.)</option>
                      <option value="Philosophy (B.A.)">Philosophy (B.A.)</option>
                      <option value="Physics (B.A.)">Physics (B.A.)</option>
                      <option value="Psychology (B.A.)">Psychology (B.A.)</option>
                      <option value="Romance Languages and Literature (B.A.)">Romance Languages and Literature (B.A.)</option>
                      <option value="Slavic Literatures and Cultures (B.A.)">Slavic Literatures and Cultures (B.A.)</option>
                      <option value="Social Studies (B.A.)">Social Studies (B.A.)</option>
                      <option value="Sociology (B.A.)">Sociology (B.A.)</option>
                      <option value="South Asian Studies (B.A.)">South Asian Studies (B.A.)</option>
                      <option value="Statistics (B.A.)">Statistics (B.A.)</option>
                      <option value="Studies of Women, Gender, and Sexuality (B.A.)">Studies of Women, Gender, and Sexuality (B.A.)</option>
                      <option value="Theater, Dance & Media (B.A.)">Theater, Dance & Media (B.A.)</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p 
                      className="text-sm"
                      style={{  color: '#27251f' }}
                    >
                      {profile?.major || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
                <div className="w-11 h-11 rounded-2xl bg-[#f5f7f9] flex items-center justify-center">
                  <Calendar className="w-5 h-5" style={{ color: '#7b9fb8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{  color: '#787771' }}
                  >
                    Graduation Year
                  </p>
                  {isEditing ? (
                    <select
                      value={editValues.graduation_year || ''}
                      onChange={(e) => setEditValues({ ...editValues, graduation_year: e.target.value })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455] bg-white min-h-[44px]"
                      style={{  color: '#27251f' }}
                    >
                      <option value="">Select graduation year</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2029">2029</option>
                    </select>
                  ) : (
                    <p 
                      className="text-sm"
                      style={{  color: '#27251f' }}
                    >
                      {profile?.graduation_year || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-11 h-11 rounded-2xl bg-[#fef3ef] flex items-center justify-center">
                  <Award className="w-5 h-5" style={{ color: '#d47455' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{  color: '#787771' }}
                  >
                    GPA
                  </p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.gpa}
                      onChange={(e) => setEditValues({ ...editValues, gpa: e.target.value })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455] min-h-[44px] bg-white"
                      style={{  color: '#27251f' }}
                      placeholder="e.g. 3.7"
                    />
                  ) : (
                    <p 
                      className="text-sm"
                      style={{  color: '#27251f' }}
                    >
                      {profile?.gpa || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="px-5 pt-2 pb-6">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f5f3eb]">
            <button
              type="button"
              onClick={async () => {
                const { error } = await signOut();
                const isSessionMissing =
                  error?.message?.toLowerCase().includes('session missing') ||
                  (error as { name?: string })?.name === 'AuthSessionMissingError';
                if (error && !isSessionMissing) {
                  console.error('Error signing out:', error);
                  alert('Failed to sign out. Please try again.');
                  return;
                }
                window.location.href = window.location.origin + window.location.pathname;
              }}
              className="w-full flex items-center justify-between px-4 py-4 min-h-[52px] active:bg-[#fef3ef] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#fef3ef] flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-[#d47455]" />
                </div>
                <span 
                  className="text-sm"
                  style={{  color: '#d47455', fontWeight: 600 }}
                >
                  Sign Out
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop View - Keep existing */}
      <div className="hidden md:flex h-full">
        {/* Left Sidebar */}
        <div className="w-[297px] bg-[#faf9f7] border-r border-[#e8e4db] flex flex-col">
          <div className="h-[72px] px-5 py-4 border-b border-[#e8e4db] flex flex-col justify-center">
            <h1 className="text-[20px] m-0 mb-1 text-[#27251f]" >Profile</h1>
            <p className="text-[12px] text-[#787771] m-0" >Student Information</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="space-y-1">
              <button className="w-full text-left px-3 py-2.5 rounded bg-[#ebe8df] text-[#27251f] text-[14px] hover:bg-[#ebe8df] transition-colors" >
                Overview
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="h-[72px] border-b border-[#e8e4db] px-6 flex items-center justify-between">
            <div>
              <h2 className="text-[18px] m-0 mb-0.5 text-[#27251f]" >Student Profile</h2>
              <p className="text-[12px] text-[#787771] m-0" >View and manage your information</p>
            </div>
            {!isEditing ? (
              <button 
                onClick={handleEditClick}
                className="flex items-center gap-2 px-4 py-2 bg-[#27251f] text-white rounded-lg text-[14px] hover:bg-[#1a1916] transition-colors" 
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#27251f] text-white rounded-lg text-[14px] hover:bg-[#1a1916] transition-colors disabled:opacity-50" 
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#27251f] text-white rounded-lg text-[14px] hover:bg-[#1a1916] transition-colors disabled:opacity-50" 
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 relative">
            <div className="max-w-4xl">
              <div className="flex items-start gap-6 mb-8">
                <div className="flex flex-col items-center">
                  {profile?.avatar_url && profile.avatar_url.trim() !== '' ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover mb-2"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center mb-2 text-white text-2xl"
                    style={{ 
                      backgroundColor: (() => {
                        const name = profile?.public_name || profile?.full_name || user?.email || 'User';
                        const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#787771'];
                        return colors[name.charCodeAt(0) % colors.length];
                      })(),
                      display: (profile?.avatar_url && profile.avatar_url.trim() !== '') ? 'none' : 'flex',
                      fontWeight: 600
                    }}
                  >
                    {(() => {
                      const name = profile?.public_name || profile?.full_name || user?.email?.split('@')[0] || 'User';
                      const forInitials = profile?.public_name || profile?.full_name;
                      if (forInitials) {
                        const parts = forInitials.trim().split(/\s+/);
                        if (parts.length >= 2) {
                          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
                        }
                        return name.charAt(0).toUpperCase().slice(0, 2);
                      }
                      return name.charAt(0).toUpperCase().slice(0, 2);
                    })()}
                  </div>
                  {isEditing && (
                    <>
                      <button 
                        onClick={handleAvatarClick}
                        disabled={uploadingAvatar || deletingAvatar}
                        className="mb-2 px-3 py-1.5 bg-[#f5f3eb] text-[#27251f] rounded-lg text-xs flex items-center gap-1.5 hover:bg-[#ebe8df] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{  fontWeight: 500 }}
                      >
                        {uploadingAvatar ? (
                          <>
                            <div className="w-3 h-3 border-2 border-[#27251f] border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-3 h-3" />
                            Change Avatar
                          </>
                        )}
                      </button>
                      {profile?.avatar_url && profile.avatar_url.trim() !== '' && (
                        <button 
                          onClick={handleDeleteAvatar}
                          disabled={uploadingAvatar || deletingAvatar}
                          className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{  fontWeight: 500, backgroundColor: 'rgba(232, 59, 59, 1)', color: 'rgba(255, 255, 255, 1)' }}
                        >
                          {deletingAvatar ? (
                            <>
                              <div className="w-3 h-3 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3" />
                              Delete Avatar
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.public_name}
                      onChange={handleNameChange}
                      className="text-[24px] mb-1 text-[#27251f] w-full px-3 py-2 rounded-lg border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                      style={{ fontWeight: 600, backgroundColor: '#fff' }}
                      placeholder="Public name (shown to others)"
                    />
                  ) : (
                    <h3 className="text-[24px] mb-1 text-[#27251f]" style={{ fontWeight: 600 }}>
                      {profile?.public_name || profile?.full_name || user?.email?.split('@')[0] || 'User'}
                    </h3>
                  )}
                  {!isEditing && (
                    <p className="text-[14px] text-[#787771] mb-3" >
                      {getClassYearDisplay()}
                    </p>
                  )}
                  <div className="flex gap-4">
                    {stats.map((stat, index) => (
                      <div key={index}>
                        <p className="text-[20px] text-[#d47455] m-0" style={{ fontWeight: 600 }}>{stat.value}</p>
                        <p className="text-[12px] text-[#787771] m-0" >{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-[#faf9f7] rounded-xl p-5">
                  <h4 className="text-[16px] mb-4 text-[#27251f]" style={{ fontWeight: 600 }}>Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-[#787771]" />
                      <div>
                        <p className="text-[12px] text-[#787771] m-0 mb-1" >Email</p>
                        <p className="text-[14px] text-[#27251f] m-0" >
                          {profile?.email || user?.email || 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-[#787771]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#787771] m-0 mb-1" >Phone</p>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editValues.phone}
                            onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{  color: '#27251f' }}
                            placeholder="Enter phone number"
                          />
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0" >
                            {profile?.phone || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-[#787771]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#787771] m-0 mb-1" >Location</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.location}
                            onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{  color: '#27251f' }}
                            placeholder="Enter location"
                          />
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0" >
                            {profile?.location || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#faf9f7] rounded-xl p-5">
                  <h4 className="text-[16px] mb-4 text-[#27251f]" style={{ fontWeight: 600 }}>Academic Info</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Book className="w-5 h-5 text-[#787771]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#787771] m-0 mb-1" >Major</p>
                        {isEditing ? (
                          <select
                            value={editValues.major}
                            onChange={(e) => setEditValues({ ...editValues, major: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455] bg-white"
                            style={{  color: '#27251f' }}
                          >
                            <option value="">Select Major</option>
                            <option value="African and African American Studies (B.A.)">African and African American Studies (B.A.)</option>
                            <option value="Anthropology (B.A.)">Anthropology (B.A.)</option>
                            <option value="Applied Mathematics (B.A.)">Applied Mathematics (B.A.)</option>
                            <option value="Art, Film, and Visual Studies (B.A.)">Art, Film, and Visual Studies (B.A.)</option>
                            <option value="Astrophysics (B.A.)">Astrophysics (B.A.)</option>
                            <option value="Biomedical Engineering (B.A.)">Biomedical Engineering (B.A.)</option>
                            <option value="Chemical and Physical Biology (B.A.)">Chemical and Physical Biology (B.A.)</option>
                            <option value="Chemistry (B.A.)">Chemistry (B.A.)</option>
                            <option value="Chemistry and Physics (B.A.)">Chemistry and Physics (B.A.)</option>
                            <option value="Classics (B.A.)">Classics (B.A.)</option>
                            <option value="Comparative Literature (B.A.)">Comparative Literature (B.A.)</option>
                            <option value="Comparative Study of Religion (B.A.)">Comparative Study of Religion (B.A.)</option>
                            <option value="Computer Science (B.A.)">Computer Science (B.A.)</option>
                            <option value="Earth and Planetary Sciences (B.A.)">Earth and Planetary Sciences (B.A.)</option>
                            <option value="East Asian Studies (B.A.)">East Asian Studies (B.A.)</option>
                            <option value="Economics (B.A.)">Economics (B.A.)</option>
                            <option value="Electrical Engineering (B.A./B.S.)">Electrical Engineering (B.A./B.S.)</option>
                            <option value="Engineering Sciences (B.A./B.S.)">Engineering Sciences (B.A./B.S.)</option>
                            <option value="English (B.A.)">English (B.A.)</option>
                            <option value="Environmental Science and Engineering (B.A.)">Environmental Science and Engineering (B.A.)</option>
                            <option value="Environmental Science and Public Policy (B.A.)">Environmental Science and Public Policy (B.A.)</option>
                            <option value="Folklore and Mythology (B.A.)">Folklore and Mythology (B.A.)</option>
                            <option value="Germanic Languages and Literature (B.A.)">Germanic Languages and Literature (B.A.)</option>
                            <option value="Government (B.A.)">Government (B.A.)</option>
                            <option value="History (B.A.)">History (B.A.)</option>
                            <option value="History and Literature (B.A.)">History and Literature (B.A.)</option>
                            <option value="History and Science (B.A.)">History and Science (B.A.)</option>
                            <option value="History of Art and Architecture (B.A.)">History of Art and Architecture (B.A.)</option>
                            <option value="Human Developmental and Regenerative Biology (B.A.)">Human Developmental and Regenerative Biology (B.A.)</option>
                            <option value="Human Evolutionary Biology (B.A.)">Human Evolutionary Biology (B.A.)</option>
                            <option value="Integrative Biology (B.A.)">Integrative Biology (B.A.)</option>
                            <option value="Linguistics (B.A.)">Linguistics (B.A.)</option>
                            <option value="Mathematics (B.A.)">Mathematics (B.A.)</option>
                            <option value="Mechanical Engineering (B.S.)">Mechanical Engineering (B.S.)</option>
                            <option value="Molecular and Cellular Biology (B.A.)">Molecular and Cellular Biology (B.A.)</option>
                            <option value="Music (B.A.)">Music (B.A.)</option>
                            <option value="Near Eastern Languages and Civilizations (B.A.)">Near Eastern Languages and Civilizations (B.A.)</option>
                            <option value="Neuroscience (B.A.)">Neuroscience (B.A.)</option>
                            <option value="Philosophy (B.A.)">Philosophy (B.A.)</option>
                            <option value="Physics (B.A.)">Physics (B.A.)</option>
                            <option value="Psychology (B.A.)">Psychology (B.A.)</option>
                            <option value="Romance Languages and Literature (B.A.)">Romance Languages and Literature (B.A.)</option>
                            <option value="Slavic Literatures and Cultures (B.A.)">Slavic Literatures and Cultures (B.A.)</option>
                            <option value="Social Studies (B.A.)">Social Studies (B.A.)</option>
                            <option value="Sociology (B.A.)">Sociology (B.A.)</option>
                            <option value="South Asian Studies (B.A.)">South Asian Studies (B.A.)</option>
                            <option value="Statistics (B.A.)">Statistics (B.A.)</option>
                            <option value="Studies of Women, Gender, and Sexuality (B.A.)">Studies of Women, Gender, and Sexuality (B.A.)</option>
                            <option value="Theater, Dance & Media (B.A.)">Theater, Dance & Media (B.A.)</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0" >
                            {profile?.major || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[#787771]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#787771] m-0 mb-1" >Graduation Year</p>
                        {isEditing ? (
                          <select
                            value={editValues.graduation_year || ''}
                            onChange={(e) => setEditValues({ ...editValues, graduation_year: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455] bg-white"
                            style={{  color: '#27251f' }}
                          >
                            <option value="">Select Graduation Year</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                            <option value="2029">2029</option>
                          </select>
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0" >
                            {profile?.graduation_year || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-[#787771]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#787771] m-0 mb-1" >GPA</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.gpa}
                            onChange={(e) => setEditValues({ ...editValues, gpa: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{  color: '#27251f' }}
                            placeholder="Enter GPA"
                          />
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0" >
                            {profile?.gpa || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Sign Out Button - Bottom Right */}
            <div className="absolute bottom-6 right-6 z-10">
              <button
                type="button"
                onClick={async () => {
                  const { error } = await signOut();
                  const isSessionMissing =
                    error?.message?.toLowerCase().includes('session missing') ||
                    (error as { name?: string })?.name === 'AuthSessionMissingError';
                  if (error && !isSessionMissing) {
                    console.error('Error signing out:', error);
                    alert('Failed to sign out. Please try again.');
                    return;
                  }
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border-[#f5f3eb] hover:bg-[#fef3ef] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-[#fef3ef] flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-[#d47455]" />
                </div>
                <span 
                  className="text-sm"
                  style={{  color: '#d47455', fontWeight: 600 }}
                >
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}