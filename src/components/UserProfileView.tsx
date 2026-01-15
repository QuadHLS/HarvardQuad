import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Calendar, Book, Award, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileData {
  full_name: string | null;
  email: string | null;
  major: string | null;
  graduation_year: string | null;
  phone: string | null;
  location: string | null;
  gpa: string | null;
  avatar_url: string | null;
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
          .select('full_name, email, class_year, graduation_year, phone, location, gpa, avatar_url')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile({
            full_name: null,
            email: null,
            major: null,
            graduation_year: null,
            phone: null,
            location: null,
            gpa: null,
            avatar_url: null,
          });
        } else {
          // Map class_year from database to major in interface
          setProfile({
            ...data,
            major: data.class_year || null,
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setProfile({
          full_name: null,
          email: null,
          major: null,
          graduation_year: null,
          phone: null,
          location: null,
          gpa: null,
          avatar_url: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const stats = [
    { label: 'Classes', value: '3' },
    { label: 'Squads', value: '5' },
    { label: 'Credits', value: '15' }
  ];

  // Helper function to get class year display
  const getClassYearDisplay = () => {
    if (!profile) return '';
    if (profile.graduation_year) {
      return `Class of ${profile.graduation_year}`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="md:hidden h-screen w-full bg-[#FBF9F5] flex items-center justify-center fixed inset-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455] mx-auto"></div>
          <p className="mt-4 text-[#3d3d3a]" style={{ fontFamily: 'Arial, sans-serif' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#FBF9F5]">
      {/* Mobile View */}
      <div className="md:hidden min-h-full overflow-y-auto" style={{ paddingBottom: '70px' }}>
        {/* Header with Back Button and Profile */}
        <div 
          className="px-5 pt-10 pb-8"
          style={{
            background: 'linear-gradient(135deg, #d47455 0%, #c06545 100%)'
          }}
        >
          {/* Back Button */}
          <button
            onClick={onBack}
            className="mb-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            aria-label="Back to chat"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center">
            {profile?.avatar_url && profile.avatar_url.trim() !== '' ? (
              <img 
                src={profile.avatar_url} 
                alt="Profile" 
                className="w-28 h-28 rounded-full object-cover border-4 border-white/30 mb-3 shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center border-4 border-white/30 mb-3 shadow-lg text-white text-3xl"
              style={{ 
                backgroundColor: (() => {
                  const name = profile?.full_name || profile?.email || 'User';
                  const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
                  return colors[name.charCodeAt(0) % colors.length];
                })(),
                display: (profile?.avatar_url && profile.avatar_url.trim() !== '') ? 'none' : 'flex',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 600
              }}
            >
              {(() => {
                const name = profile?.full_name || profile?.email?.split('@')[0] || 'User';
                if (profile?.full_name) {
                  const parts = profile.full_name.split(' ');
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
                  }
                  return name.charAt(0).toUpperCase().slice(0, 2);
                }
                return name.charAt(0).toUpperCase().slice(0, 2);
              })()}
            </div>
            <h1 
              className="text-3xl text-white mb-1"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
            >
              {profile?.full_name || profile?.email?.split('@')[0] || 'User'}
            </h1>
            <p 
              className="text-sm text-white/90 mb-5"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {getClassYearDisplay()}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-5 -mt-6 mb-6">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-[#f5f3eb]">
                <p 
                  className="text-2xl mb-1"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#d47455' }}
                >
                  {stat.value}
                </p>
                <p 
                  className="text-xs"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
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
            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
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
                  style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                >
                  Email
                </p>
                <p 
                  className="text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                >
                  {profile?.email || 'Not provided'}
                </p>
              </div>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
                <div className="w-11 h-11 rounded-2xl bg-[#f5f7f9] flex items-center justify-center">
                  <Phone className="w-5 h-5" style={{ color: '#7b9fb8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    Phone
                  </p>
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  >
                    {profile.phone}
                  </p>
                </div>
              </div>
            )}
            {profile?.location && (
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-11 h-11 rounded-2xl bg-[#f0f5f0] flex items-center justify-center">
                  <MapPin className="w-5 h-5" style={{ color: '#7ba05b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    Location
                  </p>
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  >
                    {profile.location}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Academic Info */}
        <div className="px-5 mb-6">
          <h2 
            className="text-xl mb-4"
            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
          >
            Academic Info
          </h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f5f3eb]">
            {profile?.major && (
              <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
                <div className="w-11 h-11 rounded-2xl bg-[#f5f3eb] flex items-center justify-center">
                  <Book className="w-5 h-5" style={{ color: '#7b7b74' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    Major
                  </p>
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  >
                    {profile.major}
                  </p>
                </div>
              </div>
            )}
            {profile?.graduation_year && (
              <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f5f3eb]">
                <div className="w-11 h-11 rounded-2xl bg-[#fef3ef] flex items-center justify-center">
                  <Calendar className="w-5 h-5" style={{ color: '#d47455' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    Graduation Year
                  </p>
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  >
                    {profile.graduation_year}
                  </p>
                </div>
              </div>
            )}
            {profile?.gpa && (
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-11 h-11 rounded-2xl bg-[#f5f7f9] flex items-center justify-center">
                  <Award className="w-5 h-5" style={{ color: '#7b9fb8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    GPA
                  </p>
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  >
                    {profile.gpa}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
