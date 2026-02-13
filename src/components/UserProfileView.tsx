import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Phone, MapPin, Calendar, Book, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isValidSocialUrl, normalizeSocialUrl } from '../lib/urlUtils';
import { SwipeBackContainer } from './ui/SwipeBackContainer';

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

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
}

export function UserProfileView({ userId, onBack }: UserProfileViewProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [socialNotification, setSocialNotification] = useState<'instagram' | 'linkedin' | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, public_name, email, class_year, major, graduation_year, phone, location, avatar_url, instagram_url, linkedin_url, classes')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile({
            full_name: null,
            public_name: null,
            email: null,
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
        setProfile({
          full_name: null,
          public_name: null,
          email: null,
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
  }, [userId]);

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
    return profile?.public_name || profile?.full_name || profile?.email?.split('@')[0] || 'User';
  }, [profile?.public_name, profile?.full_name, profile?.email]);

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
      <div className="md:hidden h-screen w-full flex items-center justify-center fixed inset-0" style={PROFILE_PAGE_BACKGROUND}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455] mx-auto" aria-label="Loading profile"></div>
        </div>
      </div>
    );
  }

  return (
    <SwipeBackContainer onBack={onBack} className="h-full min-h-full w-full md:hidden" style={PROFILE_PAGE_BACKGROUND}>
      {/* Mobile View - v2 iOS-native premium design */}
      <div
        className="min-h-full overflow-y-auto"
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', 
          ...PROFILE_PAGE_BACKGROUND 
        }}
      >
        {/* Compact Header with Back button */}
        <div 
          className="flex items-center justify-between px-5 h-11"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <button
            onClick={onBack}
            className="text-[15px] font-medium text-[#d47455] active:opacity-60 transition-opacity min-h-[44px] -my-2 flex items-center gap-1"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-[13px] font-medium text-[#9b8f7f] tracking-wide uppercase">Profile</span>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Hero Card - Unified identity block */}
        <div className="mx-4 mt-2 mb-5">
          <div 
            className="rounded-[20px] px-5 py-5"
            style={GLASS_SURFACE_STRONG}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
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

              {/* Name + Year */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-semibold text-[#27251f] leading-tight truncate">
                    {displayName}
                  </h1>
                  {/* Social links - always visible at full opacity; popup when not linked */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isValidSocialUrl(profile?.instagram_url) ? (
                      <a
                        href={normalizeSocialUrl(profile?.instagram_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center active:scale-95 transition-transform"
                        aria-label="Instagram profile"
                      >
                        <img src="/Instagram_Glyph_Gradient.png" alt="" className="h-[18px] w-auto rounded-none" />
                      </a>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setSocialNotification('instagram');
                            setTimeout(() => setSocialNotification(null), 3000);
                          }}
                          className="flex items-center justify-center active:scale-95 transition-transform"
                          aria-label="Instagram not linked"
                        >
                          <img src="/Instagram_Glyph_Gradient.png" alt="" className="h-[18px] w-auto rounded-none" />
                        </button>
                        {socialNotification === 'instagram' && (
                          <div
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#27251f] text-white text-[11px] rounded-lg shadow-lg whitespace-nowrap z-20"
                            style={{ minWidth: '180px', animation: 'fadeIn 0.2s ease-out' }}
                          >
                            {displayName} hasn&apos;t added Instagram.
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#27251f] rotate-45" />
                          </div>
                        )}
                      </div>
                    )}
                    {isValidSocialUrl(profile?.linkedin_url) ? (
                      <a
                        href={normalizeSocialUrl(profile?.linkedin_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center active:scale-95 transition-transform"
                        aria-label="LinkedIn profile"
                      >
                        <img src="/LI-In-Bug.png" alt="" className="h-[18px] w-auto rounded-none" />
                      </a>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setSocialNotification('linkedin');
                            setTimeout(() => setSocialNotification(null), 3000);
                          }}
                          className="flex items-center justify-center active:scale-95 transition-transform"
                          aria-label="LinkedIn not linked"
                        >
                          <img src="/LI-In-Bug.png" alt="" className="h-[18px] w-auto rounded-none" />
                        </button>
                        {socialNotification === 'linkedin' && (
                          <div
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#27251f] text-white text-[11px] rounded-lg shadow-lg whitespace-nowrap z-20"
                            style={{ minWidth: '180px', animation: 'fadeIn 0.2s ease-out' }}
                          >
                            {displayName} hasn&apos;t added LinkedIn.
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#27251f] rotate-45" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {classYearDisplay && (
                  <p className="text-[14px] text-[#9b8f7f] mt-0.5">
                    {classYearDisplay}
                  </p>
                )}
                {profile?.major && (
                  <p className="text-[13px] text-[#787771] mt-1 line-clamp-1">
                    {cleanMajorName(profile.major)}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Row - Inline pill style */}
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
                    {profile?.email || 'Not provided'}
                  </p>
                </div>
              </div>
              {/* Phone */}
              <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <Phone className="w-[18px] h-[18px] text-[#b8b2a7] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] truncate ${profile?.phone ? 'text-[#27251f]' : 'text-[#b8b2a7]'}`}>
                    {profile?.phone || 'Not provided'}
                  </p>
                </div>
              </div>
              {/* Location */}
              <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <MapPin className="w-[18px] h-[18px] text-[#b8b2a7] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] truncate ${profile?.location ? 'text-[#27251f]' : 'text-[#b8b2a7]'}`}>
                    {profile?.location || 'Not provided'}
                  </p>
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
                  <p className={`text-[15px] line-clamp-2 ${profile?.major ? 'text-[#27251f]' : 'text-[#b8b2a7]'}`}>
                    {profile?.major ? cleanMajorName(profile.major) : 'Not provided'}
                  </p>
                </div>
              </div>
              {/* Graduation */}
              <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
                <Calendar className="w-[18px] h-[18px] text-[#b8b2a7] flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] ${profile?.graduation_year ? 'text-[#27251f]' : 'text-[#b8b2a7]'}`}>
                    {classYearDisplay || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SwipeBackContainer>
  );
}
