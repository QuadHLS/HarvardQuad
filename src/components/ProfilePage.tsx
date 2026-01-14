import { Mail, Phone, MapPin, Calendar, Book, Award, Edit2, ChevronRight, Bell, Lock, HelpCircle, LogOut } from 'lucide-react';
import imgBitmap1 from "../assets/80922ffffc76a0f79d25191840d09536bcb80db6.png";

export function ProfilePage() {
  const courses = [
    { name: 'Contracts', professor: 'Prof. Kingsfield', time: 'Mon/Wed 8:15 AM - 10:00 AM', room: 'WCC 1015' },
    { name: 'Property', professor: 'Prof. Anderson', time: 'Tue/Thu 1:00 PM - 3:00 PM', room: 'WCC 1010' },
    { name: 'Legal Writing', professor: 'Prof. Martinez', time: 'Mon/Wed 5:00 PM - 7:30 PM', room: 'Pound 102' },
  ];

  const stats = [
    { label: 'Classes', value: '3' },
    { label: 'Squads', value: '5' },
    { label: 'Credits', value: '15' }
  ];

  return (
    <div className="h-full bg-[#FBF9F5]">
      {/* Mobile View */}
      <div className="md:hidden h-full overflow-y-auto">
        {/* Header with Profile */}
        <div 
          className="px-5 pt-10 pb-8"
          style={{
            background: 'linear-gradient(135deg, #d47455 0%, #c06545 100%)'
          }}
        >
          <div className="flex flex-col items-center">
            <img 
              src={imgBitmap1} 
              alt="Profile" 
              className="w-28 h-28 rounded-full object-cover border-4 border-white/30 mb-4 shadow-lg"
            />
            <h1 
              className="text-3xl text-white mb-1"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
            >
              Justin Anderson
            </h1>
            <p 
              className="text-sm text-white/90 mb-5"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Freshman • Class of 2028
            </p>
            <button 
              className="px-8 py-2.5 bg-white/25 backdrop-blur-sm text-white rounded-2xl text-sm flex items-center gap-2 active:scale-95 transition-transform shadow-sm"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
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
                  justin.anderson@law.harvard.edu
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
                <p 
                  className="text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                >
                  (617) 555-0123
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
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
                <p 
                  className="text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a' }}
                >
                  Cambridge, MA
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Courses */}
        <div className="px-5 mb-6">
          <h2 
            className="text-xl mb-4"
            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
          >
            Current Courses
          </h2>
          <div className="space-y-2.5">
            {courses.map((course, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-[#f5f3eb]">
                <h3 
                  className="text-base mb-1.5"
                  style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                >
                  {course.name}
                </h3>
                <p 
                  className="text-sm mb-1"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                >
                  {course.professor}
                </p>
                <p 
                  className="text-xs"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#c7bcaa' }}
                >
                  {course.time} • {course.room}
                </p>
              </div>
            ))}
          </div>
        </div>

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
                  <Bell className="w-5 h-5 text-[#7b7b74]" />
                </div>
                <span 
                  className="text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', fontWeight: 500 }}
                >
                  Notifications
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#c7bcaa]" />
            </button>
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
            <button className="w-full flex items-center justify-between px-4 py-4 border-b border-[#f5f3eb] active:bg-[#f5f3eb] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f3eb] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[#7b7b74]" />
                </div>
                <span 
                  className="text-sm"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', fontWeight: 500 }}
                >
                  Help & Support
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
            <button className="flex items-center gap-2 px-4 py-2 bg-[#d47455] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-colors" style={{ fontFamily: 'Arial, sans-serif' }}>
              <Edit2 size={16} />
              Edit Profile
            </button>
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
                  <h3 className="text-[24px] mb-1 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>Justin Anderson</h3>
                  <p className="text-[14px] text-[#999] mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>Freshman • Class of 2028</p>
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
                        <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>justin.anderson@law.harvard.edu</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-[#7b7b74]" />
                      <div>
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Phone</p>
                        <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>(617) 555-0123</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-[#7b7b74]" />
                      <div>
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Location</p>
                        <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>Cambridge, MA</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#faf9f7] rounded-xl p-5">
                  <h4 className="text-[16px] mb-4 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>Academic Info</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[#7b7b74]" />
                      <div>
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Enrolled</p>
                        <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>Fall 2024</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Book className="w-5 h-5 text-[#7b7b74]" />
                      <div>
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>Credits</p>
                        <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>15 Credits</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-[#7b7b74]" />
                      <div>
                        <p className="text-[12px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>GPA</p>
                        <p className="text-[14px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>3.85</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#faf9f7] rounded-xl p-5">
                <h4 className="text-[16px] mb-4 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>Current Courses</h4>
                <div className="space-y-3">
                  {courses.map((course, index) => (
                    <div key={index} className="bg-white rounded-lg p-4">
                      <h5 className="text-[15px] mb-1 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>{course.name}</h5>
                      <p className="text-[13px] text-[#999] m-0 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>{course.professor}</p>
                      <p className="text-[12px] text-[#999] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>{course.time} • {course.room}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}