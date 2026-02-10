import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mail, Phone, MapPin, Calendar, Book, Edit2, ChevronRight, LogOut, Save, X, Trash2, Dices } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { navigateWithoutReload } from '../lib/navigation';
import { supabase } from '../lib/supabase';
import { isValidSocialUrl, normalizeSocialUrl } from '../lib/urlUtils';

interface ProfileData {
  full_name: string | null;
  public_name: string | null;
  email: string | null;
  major: string | null;
  graduation_year: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  classes?: unknown[];
}

// Stable background gradient style
const PROFILE_PAGE_BACKGROUND = {
  background: `
    radial-gradient(ellipse 100% 80% at 10% 30%, rgba(255, 218, 190, 0.9), transparent 65%),
    radial-gradient(ellipse 85% 100% at 88% 50%, rgba(252, 198, 168, 0.88), transparent 60%),
    radial-gradient(ellipse 95% 75% at 50% 90%, rgba(253, 208, 178, 0.85), transparent 55%),
    radial-gradient(ellipse 75% 95% at 72% 12%, rgba(254, 218, 192, 0.88), transparent 58%),
    #fbf2eb
  `,
  minHeight: 'var(--app-height, 100vh)',
};

// Glassmorphic surface styles
const GLASS_SURFACE_STRONG = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

const GLASS_SURFACE_LIGHT = {
  background: 'rgba(255, 255, 255, 0.65)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

// Helper: Get avatar color from name
function getAvatarColor(name: string): string {
  const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#787771'];
  return colors[name.charCodeAt(0) % colors.length];
}

// Helper: Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

// Helper: Remove degree suffix from major
function cleanMajorName(major: string): string {
  return major.replace(/ \(B\.[A-Z.\/]+\)$/, '');
}

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rerollingAvatar, setRerollingAvatar] = useState(false);
  const [socialNotification, setSocialNotification] = useState<'instagram' | 'linkedin' | null>(null);
  const [editValues, setEditValues] = useState({
    public_name: '',
    phone: '',
    location: '',
    major: '',
    graduation_year: '',
    instagram_url: '',
    linkedin_url: '',
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
          .select('full_name, public_name, email, class_year, major, graduation_year, phone, location, avatar_url, instagram_url, linkedin_url, classes')
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
            avatar_url: null,
            instagram_url: null,
            linkedin_url: null,
            classes: [],
          });
        } else {
          setProfile({
            ...data,
            major: data.major ?? null,
            instagram_url: data.instagram_url ?? null,
            linkedin_url: data.linkedin_url ?? null,
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
          avatar_url: null,
          instagram_url: null,
          linkedin_url: null,
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
        major: profile.major || '',
        graduation_year: profile.graduation_year || '',
        instagram_url: profile.instagram_url || '',
        linkedin_url: profile.linkedin_url || '',
      });
    }
  }, [profile, isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
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
        major: profile.major || '',
        graduation_year: profile.graduation_year || '',
        instagram_url: profile.instagram_url || '',
        linkedin_url: profile.linkedin_url || '',
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
          major: editValues.major.trim() || null,
          graduation_year: editValues.graduation_year || null,
          instagram_url: editValues.instagram_url.trim() || null,
          linkedin_url: editValues.linkedin_url.trim() || null,
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
        major: editValues.major || null,
        graduation_year: editValues.graduation_year || null,
        instagram_url: editValues.instagram_url.trim() || null,
        linkedin_url: editValues.linkedin_url.trim() || null,
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

  const DICEBEAR_STYLES = [
    'adventurer', 'avataaars', 'croodles', 'adventurer-neutral', 'big-smile',
    'lorelei', 'miniavs', 'pixel-art', 'pixel-art-neutral',
  ];
  const generateAvatarSeed = () => Math.random().toString(36).substring(2, 12);
  const pickRandomStyle = () => DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];

  const handleRerollAvatar = async () => {
    if (!user || !profile) return;
    setRerollingAvatar(true);
    try {
      const style = pickRandomStyle();
      const seed = generateAvatarSeed();
      const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      if (error) {
        alert('Failed to update avatar. Please try again.');
        return;
      }
      setProfile({ ...profile, avatar_url: avatarUrl });
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (err) {
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setRerollingAvatar(false);
    }
  };


  // Memoized computed values
  const stats = useMemo(() => {
    const classesCount = profile?.classes?.length ?? 0;
    const creditsTotal = (profile?.classes ?? []).reduce(
      (sum, c) => sum + (Number((c as { credits?: number | null }).credits) || 0),
      0
    );
    return [
      { label: 'Classes', value: String(classesCount) },
      { label: 'Squads', value: '5' },
      { label: 'Credits', value: String(creditsTotal) }
    ];
  }, [profile?.classes]);

  const displayName = useMemo(() => {
    return profile?.public_name || profile?.full_name || user?.email?.split('@')[0] || 'User';
  }, [profile?.public_name, profile?.full_name, user?.email]);

  const classYearDisplay = useMemo(() => {
    return profile?.graduation_year ? `Class of ${profile.graduation_year}` : '';
  }, [profile?.graduation_year]);

  const avatarColor = useMemo(() => getAvatarColor(displayName), [displayName]);
  const avatarInitials = useMemo(() => {
    const forInitials = profile?.public_name || profile?.full_name;
    return forInitials ? getInitials(forInitials) : displayName.charAt(0).toUpperCase();
  }, [profile?.public_name, profile?.full_name, displayName]);

  if (loading) {
    return (
      <>
        {/* Mobile View - Centered on screen */}
        <div className="md:hidden h-screen w-full flex items-center justify-center fixed inset-0" style={PROFILE_PAGE_BACKGROUND}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455] mx-auto" aria-label="Loading profile"></div>
          </div>
        </div>
        {/* Desktop View */}
        <div className="hidden md:flex h-full w-full items-center justify-center" style={PROFILE_PAGE_BACKGROUND}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455] mx-auto" aria-label="Loading profile"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-full min-h-full w-full" style={PROFILE_PAGE_BACKGROUND}>
      {/* Mobile View - v2 iOS-native premium redesign */}
      <div
        className="md:hidden min-h-full overflow-y-auto"
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', 
          ...PROFILE_PAGE_BACKGROUND 
        }}
      >
        {/* Compact Header with Edit */}
        <div 
          className="flex items-center justify-between px-5 h-11"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <span className="text-[13px] font-medium text-[#9b8f7f] tracking-wide uppercase">Profile</span>
          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="text-[15px] font-medium text-[#d47455] active:opacity-60 transition-opacity min-h-[44px] -my-2"
              aria-label="Edit profile"
            >
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="text-[15px] font-medium text-[#787771] active:opacity-60 transition-opacity disabled:opacity-40 min-h-[44px] -my-2"
                aria-label="Cancel editing"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-[15px] font-semibold text-[#d47455] active:opacity-60 transition-opacity disabled:opacity-40 min-h-[44px] -my-2"
                aria-label={saving ? 'Saving profile' : 'Save profile'}
              >
                {saving ? 'Saving...' : 'Done'}
              </button>
            </div>
          )}
        </div>

        {/* Hero Card - Unified identity block */}
        <div className="mx-4 mt-2 mb-5">
          <div 
            className="rounded-[20px] px-5 py-5"
            style={GLASS_SURFACE_STRONG}
          >
            <div className="flex items-center gap-4">
              {/* Avatar + Roll again (same UI as onboarding step 3) */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="relative">
                  {profile?.avatar_url && profile.avatar_url.trim() !== '' ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={`${displayName}'s profile picture`}
                      className="w-[72px] h-[72px] rounded-full object-cover"
                      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-xl font-semibold"
                    style={{ 
                      backgroundColor: avatarColor,
                      display: (profile?.avatar_url && profile.avatar_url.trim() !== '') ? 'none' : 'flex',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    }}
                    aria-label={`${displayName}'s avatar`}
                  >
                    {avatarInitials}
                  </div>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleRerollAvatar}
                    disabled={rerollingAvatar}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      rerollingAvatar
                        ? 'border-[#e8e4db] bg-[#f5f4f2] text-[#787771] cursor-not-allowed'
                        : 'border-[#d47455] bg-white text-[#d47455] hover:bg-[#fef9f5] active:scale-95'
                    }`}
                  >
                    <Dices className={`w-4 h-4 ${rerollingAvatar ? 'animate-spin' : ''}`} />
                    {rerollingAvatar ? 'Rolling...' : 'Roll again'}
                  </button>
                )}
              </div>

              {/* Name + Year */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editValues.public_name}
                    onChange={handleNameChange}
                    className="text-[20px] font-semibold text-[#27251f] w-full px-0 py-1 bg-transparent border-b-2 border-[#d47455]/30 focus:border-[#d47455] focus:outline-none transition-colors"
                    placeholder="Display name"
                    aria-label="Display name"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-[20px] font-semibold text-[#27251f] leading-tight truncate">
                      {displayName}
                    </h1>
                    {/* Social links - always visible */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="relative">
                        <button
                          onClick={() => {
                            const instagramUrl = normalizeSocialUrl(profile?.instagram_url);
                            if (instagramUrl) {
                              window.open(instagramUrl, '_blank', 'noopener,noreferrer');
                            } else {
                              setSocialNotification('instagram');
                              setTimeout(() => setSocialNotification(null), 3000);
                            }
                          }}
                          className="flex items-center justify-center active:scale-95 transition-transform"
                          aria-label={isValidSocialUrl(profile?.instagram_url) ? 'Instagram profile' : 'Add Instagram profile'}
                        >
                          <img src="/Instagram_Glyph_Gradient.png" alt="" className="h-[18px] w-auto rounded-none" />
                        </button>
                        {socialNotification === 'instagram' && (
                          <div
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#27251f] text-white text-[11px] rounded-lg shadow-lg whitespace-nowrap z-20"
                            style={{ minWidth: '180px', animation: 'fadeIn 0.2s ease-out' }}
                          >
                            No Instagram added. Click &quot;Edit&quot; to add.
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#27251f] rotate-45" />
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => {
                            const linkedinUrl = normalizeSocialUrl(profile?.linkedin_url);
                            if (linkedinUrl) {
                              window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
                            } else {
                              setSocialNotification('linkedin');
                              setTimeout(() => setSocialNotification(null), 3000);
                            }
                          }}
                          className="flex items-center justify-center active:scale-95 transition-transform"
                          aria-label={isValidSocialUrl(profile?.linkedin_url) ? 'LinkedIn profile' : 'Add LinkedIn profile'}
                        >
                          <img src="/LI-In-Bug.png" alt="" className="h-[18px] w-auto rounded-none" />
                        </button>
                        {socialNotification === 'linkedin' && (
                          <div
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#27251f] text-white text-[11px] rounded-lg shadow-lg whitespace-nowrap z-20"
                            style={{ minWidth: '180px', animation: 'fadeIn 0.2s ease-out' }}
                          >
                            No LinkedIn added. Click &quot;Edit&quot; to add.
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#27251f] rotate-45" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {!isEditing && classYearDisplay && (
                  <p className="text-[14px] text-[#9b8f7f] mt-0.5">
                    {classYearDisplay}
                  </p>
                )}
                {!isEditing && profile?.major && (
                  <p className="text-[13px] text-[#787771] mt-1 line-clamp-1">
                    {cleanMajorName(profile.major)}
                  </p>
                )}
              </div>
            </div>

            {/* Social links edit mode */}
            {isEditing && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <img src="/Instagram_Glyph_Gradient.png" alt="" className="h-[16px] w-auto flex-shrink-0 rounded-none" />
                  <input
                    type="url"
                    value={editValues.instagram_url}
                    onChange={(e) => setEditValues({ ...editValues, instagram_url: e.target.value })}
                    className="flex-1 text-[14px] text-[#27251f] bg-transparent border-b border-[#d4cfc4] focus:border-[#d47455] focus:outline-none py-0.5 transition-colors"
                    placeholder="Instagram URL"
                    aria-label="Instagram URL"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <img src="/LI-In-Bug.png" alt="" className="h-[16px] w-auto flex-shrink-0 rounded-none" />
                  <input
                    type="url"
                    value={editValues.linkedin_url}
                    onChange={(e) => setEditValues({ ...editValues, linkedin_url: e.target.value })}
                    className="flex-1 text-[14px] text-[#27251f] bg-transparent border-b border-[#d4cfc4] focus:border-[#d47455] focus:outline-none py-0.5 transition-colors"
                    placeholder="LinkedIn URL"
                    aria-label="LinkedIn URL"
                  />
                </div>
              </div>
            )}

            {/* Stats Row - Inline pill style */}
            {!isEditing && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#27251f]/[0.06]" role="list" aria-label="Profile statistics">
                {stats.map((stat, index) => (
                  <React.Fragment key={stat.label}>
                    <div className="flex items-center gap-1.5" role="listitem">
                      <span className="text-[15px] font-semibold text-[#27251f]">{stat.value}</span>
                      <span className="text-[13px] text-[#9b8f7f]">{stat.label}</span>
                    </div>
                    {index < stats.length - 1 && (
                      <div className="w-[3px] h-[3px] rounded-full bg-[#d4cfc4]" aria-hidden="true" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Sections */}
        <div className="px-4 space-y-6">
          {/* Contact Section */}
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-[12px] font-semibold text-[#9b8f7f] uppercase tracking-wider mb-2 px-1">
              Contact
            </h2>
            <div 
              className="rounded-2xl divide-y divide-[#27251f]/[0.06]"
              style={GLASS_SURFACE_LIGHT}
            >
              {/* Email */}
              <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <Mail className="w-[18px] h-[18px] text-[#b8b2a7] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-[#27251f] truncate">
                    {profile?.email || user?.email || 'Not provided'}
                  </p>
                </div>
              </div>
              {/* Phone */}
              <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <Phone className="w-[18px] h-[18px] text-[#b8b2a7] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editValues.phone}
                      onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                      className="w-full text-[15px] text-[#27251f] bg-transparent border-b border-[#d4cfc4] focus:border-[#d47455] focus:outline-none py-0.5 transition-colors"
                      placeholder="Add phone"
                      aria-label="Phone number"
                    />
                  ) : (
                    <p className={`text-[15px] truncate ${profile?.phone ? 'text-[#27251f]' : 'text-[#b8b2a7]'}`}>
                      {profile?.phone || 'Add phone'}
                    </p>
                  )}
                </div>
              </div>
              {/* Location */}
              <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <MapPin className="w-[18px] h-[18px] text-[#b8b2a7] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.location}
                      onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                      className="w-full text-[15px] text-[#27251f] bg-transparent border-b border-[#d4cfc4] focus:border-[#d47455] focus:outline-none py-0.5 transition-colors"
                      placeholder="Add location"
                      aria-label="Location"
                    />
                  ) : (
                    <p className={`text-[15px] truncate ${profile?.location ? 'text-[#27251f]' : 'text-[#b8b2a7]'}`}>
                      {profile?.location || 'Add location'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Academic Section */}
          <section aria-labelledby="academic-heading">
            <h2 id="academic-heading" className="text-[12px] font-semibold text-[#9b8f7f] uppercase tracking-wider mb-2 px-1">
              Academic
            </h2>
            <div 
              className="rounded-2xl divide-y divide-[#27251f]/[0.06]"
              style={GLASS_SURFACE_LIGHT}
            >
              {/* Major */}
              <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <Book className="w-[18px] h-[18px] text-[#b8b2a7] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <select
                      value={editValues.major}
                      onChange={(e) => setEditValues({ ...editValues, major: e.target.value })}
                      className="w-full text-[15px] text-[#27251f] bg-transparent border-b border-[#d4cfc4] focus:border-[#d47455] focus:outline-none py-0.5 transition-colors appearance-none"
                      aria-label="Major"
                    >
                      <option value="">Select major</option>
                      <option value="African and African American Studies (B.A.)">African and African American Studies</option>
                      <option value="Anthropology (B.A.)">Anthropology</option>
                      <option value="Applied Mathematics (B.A.)">Applied Mathematics</option>
                      <option value="Art, Film, and Visual Studies (B.A.)">Art, Film, and Visual Studies</option>
                      <option value="Astrophysics (B.A.)">Astrophysics</option>
                      <option value="Biomedical Engineering (B.A.)">Biomedical Engineering</option>
                      <option value="Chemical and Physical Biology (B.A.)">Chemical and Physical Biology</option>
                      <option value="Chemistry (B.A.)">Chemistry</option>
                      <option value="Chemistry and Physics (B.A.)">Chemistry and Physics</option>
                      <option value="Classics (B.A.)">Classics</option>
                      <option value="Comparative Literature (B.A.)">Comparative Literature</option>
                      <option value="Comparative Study of Religion (B.A.)">Comparative Study of Religion</option>
                      <option value="Computer Science (B.A.)">Computer Science</option>
                      <option value="Earth and Planetary Sciences (B.A.)">Earth and Planetary Sciences</option>
                      <option value="East Asian Studies (B.A.)">East Asian Studies</option>
                      <option value="Economics (B.A.)">Economics</option>
                      <option value="Electrical Engineering (B.A./B.S.)">Electrical Engineering</option>
                      <option value="Engineering Sciences (B.A./B.S.)">Engineering Sciences</option>
                      <option value="English (B.A.)">English</option>
                      <option value="Environmental Science and Engineering (B.A.)">Environmental Science and Engineering</option>
                      <option value="Environmental Science and Public Policy (B.A.)">Environmental Science and Public Policy</option>
                      <option value="Folklore and Mythology (B.A.)">Folklore and Mythology</option>
                      <option value="Germanic Languages and Literature (B.A.)">Germanic Languages and Literature</option>
                      <option value="Government (B.A.)">Government</option>
                      <option value="History (B.A.)">History</option>
                      <option value="History and Literature (B.A.)">History and Literature</option>
                      <option value="History and Science (B.A.)">History and Science</option>
                      <option value="History of Art and Architecture (B.A.)">History of Art and Architecture</option>
                      <option value="Human Developmental and Regenerative Biology (B.A.)">Human Developmental and Regenerative Biology</option>
                      <option value="Human Evolutionary Biology (B.A.)">Human Evolutionary Biology</option>
                      <option value="Integrative Biology (B.A.)">Integrative Biology</option>
                      <option value="Linguistics (B.A.)">Linguistics</option>
                      <option value="Mathematics (B.A.)">Mathematics</option>
                      <option value="Mechanical Engineering (B.S.)">Mechanical Engineering</option>
                      <option value="Molecular and Cellular Biology (B.A.)">Molecular and Cellular Biology</option>
                      <option value="Music (B.A.)">Music</option>
                      <option value="Near Eastern Languages and Civilizations (B.A.)">Near Eastern Languages and Civilizations</option>
                      <option value="Neuroscience (B.A.)">Neuroscience</option>
                      <option value="Philosophy (B.A.)">Philosophy</option>
                      <option value="Physics (B.A.)">Physics</option>
                      <option value="Psychology (B.A.)">Psychology</option>
                      <option value="Romance Languages and Literature (B.A.)">Romance Languages and Literature</option>
                      <option value="Slavic Literatures and Cultures (B.A.)">Slavic Literatures and Cultures</option>
                      <option value="Social Studies (B.A.)">Social Studies</option>
                      <option value="Sociology (B.A.)">Sociology</option>
                      <option value="South Asian Studies (B.A.)">South Asian Studies</option>
                      <option value="Statistics (B.A.)">Statistics</option>
                      <option value="Studies of Women, Gender, and Sexuality (B.A.)">Studies of Women, Gender, and Sexuality</option>
                      <option value="Theater, Dance & Media (B.A.)">Theater, Dance & Media</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className={`text-[15px] line-clamp-2 ${profile?.major ? 'text-[#27251f]' : 'text-[#b8b2a7]'}`}>
                      {profile?.major ? cleanMajorName(profile.major) : 'Add major'}
                    </p>
                  )}
                </div>
                {isEditing && <ChevronRight className="w-4 h-4 text-[#d4cfc4]" aria-hidden="true" />}
              </div>
              {/* Graduation */}
              <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <Calendar className="w-[18px] h-[18px] text-[#b8b2a7] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <select
                      value={editValues.graduation_year || ''}
                      onChange={(e) => setEditValues({ ...editValues, graduation_year: e.target.value })}
                      className="w-full text-[15px] text-[#27251f] bg-transparent border-b border-[#d4cfc4] focus:border-[#d47455] focus:outline-none py-0.5 transition-colors appearance-none"
                      aria-label="Graduation year"
                    >
                      <option value="">Select year</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2029">2029</option>
                    </select>
                  ) : (
                    <p className={`text-[15px] ${profile?.graduation_year ? 'text-[#27251f]' : 'text-[#b8b2a7]'}`}>
                      {classYearDisplay || 'Add graduation year'}
                    </p>
                  )}
                </div>
                {isEditing && <ChevronRight className="w-4 h-4 text-[#d4cfc4]" aria-hidden="true" />}
              </div>
            </div>
          </section>

          {/* Sign Out - Minimal destructive */}
          <section className="pt-4">
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
                navigateWithoutReload('/');
              }}
              className="w-full py-3.5 rounded-2xl text-[15px] font-medium text-[#c94a3a] active:bg-[#c94a3a]/10 transition-colors min-h-[44px]"
              style={{ 
                background: 'rgba(201, 74, 58, 0.08)',
              }}
              aria-label="Sign out of your account"
            >
              Sign Out
            </button>
          </section>
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
                      alt={`${displayName}'s profile picture`}
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
                      backgroundColor: avatarColor,
                      display: (profile?.avatar_url && profile.avatar_url.trim() !== '') ? 'none' : 'flex',
                      fontWeight: 600
                    }}
                    aria-label={`${displayName}'s avatar`}
                  >
                    {avatarInitials}
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleRerollAvatar}
                      disabled={rerollingAvatar}
                      className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        rerollingAvatar
                          ? 'border-[#e8e4db] bg-[#f5f4f2] text-[#787771] cursor-not-allowed'
                          : 'border-[#d47455] bg-white text-[#d47455] hover:bg-[#fef9f5] active:scale-95'
                      }`}
                    >
                      <Dices className={`w-4 h-4 ${rerollingAvatar ? 'animate-spin' : ''}`} />
                      {rerollingAvatar ? 'Rolling...' : 'Roll again'}
                    </button>
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
                      aria-label="Display name"
                    />
                  ) : (
                    <h3 className="text-[24px] mb-1 text-[#27251f]" style={{ fontWeight: 600 }}>
                      {displayName}
                    </h3>
                  )}
                  {!isEditing && classYearDisplay && (
                    <p className="text-[14px] text-[#787771] mb-3">
                      {classYearDisplay}
                    </p>
                  )}
                  <div className="flex gap-4" role="list" aria-label="Profile statistics">
                    {stats.map((stat, index) => (
                      <div key={stat.label} role="listitem">
                        <p className="text-[20px] text-[#d47455] m-0" style={{ fontWeight: 600 }}>{stat.value}</p>
                        <p className="text-[12px] text-[#787771] m-0">{stat.label}</p>
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
                            style={{ color: '#27251f' }}
                            placeholder="Enter phone number"
                            aria-label="Phone number"
                          />
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0">
                            {profile?.phone || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-[#787771]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#787771] m-0 mb-1">Location</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.location}
                            onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{ color: '#27251f' }}
                            placeholder="Enter location"
                            aria-label="Location"
                          />
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0">
                            {profile?.location || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <img src="/Instagram_Glyph_Gradient.png" alt="" className="h-5 w-auto rounded-none" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#787771] m-0 mb-1">Instagram</p>
                        {isEditing ? (
                          <input
                            type="url"
                            value={editValues.instagram_url}
                            onChange={(e) => setEditValues({ ...editValues, instagram_url: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{ color: '#27251f' }}
                            placeholder="Instagram URL"
                            aria-label="Instagram URL"
                          />
                        ) : isValidSocialUrl(profile?.instagram_url) ? (
                          <a 
                            href={normalizeSocialUrl(profile?.instagram_url)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] text-[#d47455] m-0 hover:underline"
                          >
                            View Profile
                          </a>
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0">
                            Not provided
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <img src="/LI-In-Bug.png" alt="" className="h-5 w-auto rounded-none" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#787771] m-0 mb-1">LinkedIn</p>
                        {isEditing ? (
                          <input
                            type="url"
                            value={editValues.linkedin_url}
                            onChange={(e) => setEditValues({ ...editValues, linkedin_url: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{ color: '#27251f' }}
                            placeholder="LinkedIn URL"
                            aria-label="LinkedIn URL"
                          />
                        ) : isValidSocialUrl(profile?.linkedin_url) ? (
                          <a 
                            href={normalizeSocialUrl(profile?.linkedin_url)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] text-[#d47455] m-0 hover:underline"
                          >
                            View Profile
                          </a>
                        ) : (
                          <p className="text-[14px] text-[#27251f] m-0">
                            Not provided
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
                            style={{ color: '#27251f' }}
                            aria-label="Major"
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
                            style={{ color: '#27251f' }}
                            aria-label="Graduation year"
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
                  navigateWithoutReload('/');
                }}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border-[#f5f3eb] hover:bg-[#fef3ef] transition-colors"
                aria-label="Sign out of your account"
              >
                <div className="w-9 h-9 rounded-xl bg-[#fef3ef] flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-[#d47455]" aria-hidden="true" />
                </div>
                <span 
                  className="text-sm"
                  style={{ color: '#d47455', fontWeight: 600 }}
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