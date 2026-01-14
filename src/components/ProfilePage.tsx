import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Calendar, Book, Award, Edit2, ChevronRight, Lock, LogOut, Save, X } from 'lucide-react';
import imgBitmap1 from "../assets/80922ffffc76a0f79d25191840d09536bcb80db6.png";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfileData {
  full_name: string | null;
  email: string | null;
  class_year: string | null;
  graduation_year: string | null;
  phone: string | null;
  location: string | null;
  gpa: string | null;
  avatar_url: string | null;
}

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({
    phone: '',
    location: '',
    gpa: '',
    class_year: '',
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
          .select('full_name, email, class_year, graduation_year, phone, location, gpa, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          // If profile doesn't exist, use user email as fallback
          setProfile({
            full_name: user.user_metadata?.full_name || null,
            email: user.email || null,
            class_year: null,
            graduation_year: null,
            phone: null,
            location: null,
            gpa: null,
            avatar_url: null,
          });
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        // Fallback to user email
        setProfile({
          full_name: user.user_metadata?.full_name || null,
          email: user.email || null,
          class_year: null,
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
  }, [user]);

  // Initialize edit values when profile loads or edit mode is enabled
  useEffect(() => {
    if (profile && isEditing) {
      setEditValues({
        phone: profile.phone || '',
        location: profile.location || '',
        gpa: profile.gpa || '',
        class_year: profile.class_year || '',
        graduation_year: profile.graduation_year || '',
      });
    }
  }, [profile, isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    if (profile) {
      setEditValues({
        phone: profile.phone || '',
        location: profile.location || '',
        gpa: profile.gpa || '',
        class_year: profile.class_year || '',
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
          phone: editValues.phone || null,
          location: editValues.location || null,
          gpa: editValues.gpa || null,
          class_year: editValues.class_year || null,
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
        phone: editValues.phone || null,
        location: editValues.location || null,
        gpa: editValues.gpa || null,
        class_year: editValues.class_year || null,
        graduation_year: editValues.graduation_year || null,
      });

      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Classes', value: '3' },
    { label: 'Squads', value: '5' },
    { label: 'Credits', value: '15' }
  ];

  // Helper function to get class year display
  const getClassYearDisplay = () => {
    if (!profile) return 'Student';
    if (profile.class_year) return profile.class_year;
    if (profile.graduation_year) {
      const currentYear = new Date().getFullYear();
      const gradYear = parseInt(profile.graduation_year);
      const yearDiff = gradYear - currentYear;
      if (yearDiff === 0) return 'Graduating';
      if (yearDiff === 1) return 'Senior';
      if (yearDiff === 2) return 'Junior';
      if (yearDiff === 3) return 'Sophomore';
      if (yearDiff === 4) return 'Freshman';
    }
    return 'Student';
  };

  // Helper function to get graduation year display
  const getGraduationDisplay = () => {
    if (!profile) return '';
    if (profile.graduation_year) return `Class of ${profile.graduation_year}`;
    return '';
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-[#FBF9F5] flex items-center justify-center">
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
        {/* Header with Profile */}
        <div 
          className="px-5 pt-10 pb-8"
          style={{
            background: 'linear-gradient(135deg, #d47455 0%, #c06545 100%)'
          }}
        >
          <div className="flex flex-col items-center">
            <img 
              src={profile?.avatar_url || imgBitmap1} 
              alt="Profile" 
              className="w-28 h-28 rounded-full object-cover border-4 border-white/30 mb-4 shadow-lg"
            />
            <h1 
              className="text-3xl text-white mb-1"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
            >
              {profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </h1>
            <p 
              className="text-sm text-white/90 mb-5"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {getClassYearDisplay()}{profile?.graduation_year ? ` • ${getGraduationDisplay()}` : ''}
            </p>
            {!isEditing ? (
              <button 
                onClick={handleEditClick}
                className="px-8 py-2.5 bg-white/25 backdrop-blur-sm text-white rounded-2xl text-sm flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-white/25 backdrop-blur-sm text-white rounded-2xl text-sm flex items-center gap-2 active:scale-95 transition-transform shadow-sm disabled:opacity-50"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2.5 bg-white/25 backdrop-blur-sm text-white rounded-2xl text-sm flex items-center gap-2 active:scale-95 transition-transform shadow-sm disabled:opacity-50"
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
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
                  style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                >
                  Phone
                </p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editValues.phone}
                    onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                    className="w-full text-sm px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
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
                  style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                >
                  Location
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editValues.location}
                    onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                    className="w-full text-sm px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                    placeholder="Enter location"
                  />
                ) : (
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  >
                    {profile?.location || 'Not provided'}
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
                  style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                >
                  GPA
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editValues.gpa}
                    onChange={(e) => setEditValues({ ...editValues, gpa: e.target.value })}
                    className="w-full text-sm px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                    placeholder="Enter GPA"
                  />
                ) : (
                  <p 
                    className="text-sm"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                  >
                    {profile?.gpa || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Info */}
        {(profile?.class_year || profile?.graduation_year || isEditing) && (
          <div className="px-5 mb-6">
            <h2 
              className="text-xl mb-4"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
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
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    Class Year
                  </p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.class_year}
                      onChange={(e) => setEditValues({ ...editValues, class_year: e.target.value })}
                      className="w-full text-sm px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                      placeholder="e.g., Freshman, Sophomore"
                    />
                  ) : (
                    <p 
                      className="text-sm"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                    >
                      {profile?.class_year || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-11 h-11 rounded-2xl bg-[#f5f7f9] flex items-center justify-center">
                  <Calendar className="w-5 h-5" style={{ color: '#7b9fb8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-xs mb-1"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                  >
                    Graduation Year
                  </p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.graduation_year}
                      onChange={(e) => setEditValues({ ...editValues, graduation_year: e.target.value })}
                      className="w-full text-sm px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                      placeholder="e.g., 2028"
                    />
                  ) : (
                    <p 
                      className="text-sm"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                    >
                      {profile?.graduation_year || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="px-5 pb-6">
          <h2 
            className="text-xl mb-4"
            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
          >
            Settings
          </h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f5f3eb]">
            <button className="w-full flex items-center justify-between px-4 py-4 border-b border-[#f5f3eb] active:bg-[#f5f3eb] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f3eb] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#7b7b74]" />
                </div>
                <span 
                  className="text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', fontWeight: 500 }}
                >
                  Privacy & Security
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#c7bcaa]" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-4 active:bg-[#fef3ef] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#fef3ef] flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-[#d47455]" />
                </div>
                <span 
                  className="text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#d47455', fontWeight: 600 }}
                >
                  Sign Out
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop View - Keep existing */}
      <div className="hidden md:flex h-full bg-white">
        {/* Left Sidebar */}
        <div className="w-[297px] bg-[#faf9f7] border-r border-[#e8e4db] flex flex-col">
          <div className="h-[72px] px-5 py-4 border-b border-[#e8e4db] flex flex-col justify-center">
            <h1 className="text-[20px] m-0 mb-1 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif' }}>Profile</h1>
            <p className="text-[12px] text-[#999] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>Student Information</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="space-y-1">
              <button className="w-full text-left px-3 py-2.5 rounded bg-[#ebe8df] text-[#1a1a1a] text-[14px] hover:bg-[#ebe8df] transition-colors" style={{ fontFamily: 'Arial, sans-serif' }}>
                Overview
              </button>
              <button className="w-full text-left px-3 py-2.5 rounded text-[#999] text-[14px] hover:bg-[#ebe8df] hover:text-[#1a1a1a] transition-colors" style={{ fontFamily: 'Arial, sans-serif' }}>
                Academic Records
              </button>
              <button className="w-full text-left px-3 py-2.5 rounded text-[#999] text-[14px] hover:bg-[#ebe8df] hover:text-[#1a1a1a] transition-colors" style={{ fontFamily: 'Arial, sans-serif' }}>
                Settings
              </button>
              <button className="w-full text-left px-3 py-2.5 rounded text-[#999] text-[14px] hover:bg-[#ebe8df] hover:text-[#1a1a1a] transition-colors" style={{ fontFamily: 'Arial, sans-serif' }}>
                Privacy
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="h-[72px] border-b border-[#e8e4db] px-6 flex items-center justify-between">
            <div>
              <h2 className="text-[18px] m-0 mb-0.5 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif' }}>Student Profile</h2>
              <p className="text-[12px] text-[#999] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>View and manage your information</p>
            </div>
            {!isEditing ? (
              <button 
                onClick={handleEditClick}
                className="flex items-center gap-2 px-4 py-2 bg-[#d47455] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-colors" 
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d47455] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-colors disabled:opacity-50" 
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#999] text-white rounded-lg text-[14px] hover:bg-[#888] transition-colors disabled:opacity-50" 
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl">
              <div className="flex items-start gap-6 mb-8">
                <img 
                  src={imgBitmap1} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-[24px] mb-1 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
                    {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-[14px] text-[#999] mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {getClassYearDisplay()}{profile?.graduation_year ? ` • ${getGraduationDisplay()}` : ''}
                  </p>
                  <div className="flex gap-4">
                    {stats.map((stat, index) => (
                      <div key={index}>
                        <p className="text-[20px] text-[#d47455] m-0" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>{stat.value}</p>
                        <p className="text-[12px] text-[#999] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-[#faf9f7] rounded-xl p-5">
                  <h4 className="text-[16px] mb-4 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-[#7b7b74]" />
                      <div>
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Email</p>
                        <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                          {profile?.email || user?.email || 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-[#7b7b74]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Phone</p>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editValues.phone}
                            onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{ fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}
                            placeholder="Enter phone number"
                          />
                        ) : (
                          <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {profile?.phone || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-[#7b7b74]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Location</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.location}
                            onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{ fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}
                            placeholder="Enter location"
                          />
                        ) : (
                          <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {profile?.location || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#faf9f7] rounded-xl p-5">
                  <h4 className="text-[16px] mb-4 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>Academic Info</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Book className="w-5 h-5 text-[#7b7b74]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Class Year</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.class_year}
                            onChange={(e) => setEditValues({ ...editValues, class_year: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{ fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}
                            placeholder="e.g., Freshman, Sophomore"
                          />
                        ) : (
                          <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {profile?.class_year || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[#7b7b74]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Graduation Year</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.graduation_year}
                            onChange={(e) => setEditValues({ ...editValues, graduation_year: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{ fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}
                            placeholder="e.g., 2028"
                          />
                        ) : (
                          <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {profile?.graduation_year || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-[#7b7b74]" />
                      <div className="flex-1">
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>GPA</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.gpa}
                            onChange={(e) => setEditValues({ ...editValues, gpa: e.target.value })}
                            className="w-full text-[14px] px-2 py-1 rounded border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-[#d47455]"
                            style={{ fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}
                            placeholder="Enter GPA"
                          />
                        ) : (
                          <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {profile?.gpa || 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}