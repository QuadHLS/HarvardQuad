import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Calendar, Book, Award, ChevronLeft } from 'lucide-react';
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

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
}

export function UserProfileView({ userId, onBack }: UserProfileViewProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, public_name, email, class_year, major, graduation_year, phone, location, gpa, avatar_url, classes')
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
        setProfile({
          full_name: null,
          public_name: null,
          email: null,
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
  }, [userId]);

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
      <div className="md:hidden h-screen w-full flex items-center justify-center fixed inset-0" style={profilePageBackground}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-full w-full md:hidden" style={profilePageBackground}>
      {/* Mobile View - same design as own profile, no editing */}
      <div
        className="min-h-full overflow-y-auto relative"
        style={{ paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 0px))', ...profilePageBackground }}
      >
        {/* Back button - top left */}
        <div
          className="absolute top-0 left-0 z-10 flex items-center pl-5 pt-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#27251f] text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm hover:bg-[#1a1916]"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Profile content - same layout as ProfilePage */}
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
                  const name = profile?.public_name || profile?.full_name || profile?.email || 'User';
                  const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#787771'];
                  return colors[name.charCodeAt(0) % colors.length];
                })(),
                display: (profile?.avatar_url && profile.avatar_url.trim() !== '') ? 'none' : 'flex',
                fontWeight: 600
              }}
            >
              {(() => {
                const name = profile?.public_name || profile?.full_name || profile?.email?.split('@')[0] || 'User';
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
            <h1 
              className="text-3xl mb-1"
              style={{ fontWeight: 600, color: '#27251f' }}
            >
              {profile?.public_name || profile?.full_name || profile?.email?.split('@')[0] || 'User'}
            </h1>
            <p 
              className="text-sm mb-2"
              style={{ color: '#787771' }}
            >
              {getClassYearDisplay()}
            </p>
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
                  style={{ color: '#787771' }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info - same as ProfilePage, always show all rows */}
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
                <p className="text-xs mb-1" style={{ color: '#787771' }}>Email</p>
                <p className="text-sm" style={{ color: '#27251f' }}>
                  {profile?.email || 'Not provided'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
              <div className="w-11 h-11 rounded-2xl bg-[#f5f7f9] flex items-center justify-center">
                <Phone className="w-5 h-5" style={{ color: '#7b9fb8' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-1" style={{ color: '#787771' }}>Phone</p>
                <p className="text-sm" style={{ color: '#27251f' }}>
                  {profile?.phone || 'Not provided'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-11 h-11 rounded-2xl bg-[#f5f7f5] flex items-center justify-center">
                <MapPin className="w-5 h-5" style={{ color: '#8c9e8c' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-1" style={{ color: '#787771' }}>Location</p>
                <p className="text-sm" style={{ color: '#27251f' }}>
                  {profile?.location || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Info - same as ProfilePage, always show all rows */}
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
                <p className="text-xs mb-1" style={{ color: '#787771' }}>Major</p>
                <p className="text-sm" style={{ color: '#27251f' }}>
                  {profile?.major || 'Not provided'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
              <div className="w-11 h-11 rounded-2xl bg-[#f5f7f9] flex items-center justify-center">
                <Calendar className="w-5 h-5" style={{ color: '#7b9fb8' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-1" style={{ color: '#787771' }}>Graduation Year</p>
                <p className="text-sm" style={{ color: '#27251f' }}>
                  {profile?.graduation_year || 'Not provided'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-11 h-11 rounded-2xl bg-[#fef3ef] flex items-center justify-center">
                <Award className="w-5 h-5" style={{ color: '#d47455' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-1" style={{ color: '#787771' }}>GPA</p>
                <p className="text-sm" style={{ color: '#27251f' }}>
                  {profile?.gpa || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
