import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Calendar as CalendarIcon, Bell, MessageCircle, LayoutDashboard, Briefcase, Store, HomeIcon as HouseIcon, BookOpen, Users, Sparkles } from 'lucide-react';
import { MessagingPage } from './components/MessagingPage';
import { CoursePage } from './components/CoursePage';
import { ProfilePage } from './components/ProfilePage';
import { ClassesPage } from './components/ClassesPage';
import { SquadsPage } from './components/SquadsPage';
import { SquadDetailPage } from './components/SquadDetailPage';
import { CalendarPage } from './components/CalendarPage';
import { IconButton } from './components/IconButton';
import { MobileDashboard } from './components/MobileDashboard';
import { AuthPage } from './components/auth/AuthPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';

type ViewState = 'dashboard' | 'messaging' | 'course' | 'profile' | 'classes' | 'squads' | 'squad-detail' | 'calendar';

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

export default function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSquad, setSelectedSquad] = useState<string>('');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [previousView, setPreviousView] = useState<ViewState>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfileLoading(false);
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
        setProfileLoading(false);
      }
    };

    fetchProfile();

    // Listen for profile update events
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user]);

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return { time: `${hours}:${minutesStr}`, ampm };
  };

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNumber = date.getDate();
    const getOrdinalSuffix = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };
    return `${dayName}, ${monthName} ${dayNumber}${getOrdinalSuffix(dayNumber)}`;
  };

  const getGreeting = (date: Date) => {
    const hour = date.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const getClassYearDisplay = () => {
    if (!profile) return '';
    if (profile.graduation_year) {
      return `Class of ${profile.graduation_year}`;
    }
    return '';
  };

  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getDisplayNameShort = () => {
    if (profile?.full_name) {
      const parts = profile.full_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
      }
      return parts[0];
    }
    if (user?.email) {
      const name = user.email.split('@')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return 'User';
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
      }
      return name.charAt(0).toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.split('@')[0].charAt(0).toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  const getAvatarColor = (name: string | null, email: string | null) => {
    const text = name || email || 'User';
    const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#7b7b74'];
    return colors[text.charCodeAt(0) % colors.length];
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url && profile.avatar_url.trim() !== '') {
      return profile.avatar_url;
    }
    return null;
  };

  const isPastFivePM = currentTime.getHours() >= 17;
  const { time, ampm } = formatTime(currentTime);
  const formattedDate = formatDate(currentTime);
  const greeting = getGreeting(currentTime);
  const isMessagingView = currentView === 'messaging';

  const handleCourseClick = (courseId: string) => {
    setPreviousView(currentView);
    setSelectedCourse(courseId);
    setCurrentView('course');
    setIsSidebarExpanded(false);
  };

  const handleBackFromCourse = () => {
    setCurrentView(previousView);
  };

  const handleHomeClick = () => {
    setCurrentView('dashboard');
    setIsSidebarExpanded(false);
  };

  const handleProfileClick = () => {
    setCurrentView('profile');
    setIsSidebarExpanded(false);
  };

  const handleClassesClick = () => {
    setCurrentView('classes');
    setIsSidebarExpanded(false);
  };

  const handleSquadsClick = () => {
    setCurrentView('squads');
    setIsSidebarExpanded(false);
  };

  const handleSquadDetailClick = (squadId: string) => {
    setPreviousView(currentView);
    setSelectedSquad(squadId);
    setCurrentView('squad-detail');
    setIsSidebarExpanded(false);
  };

  const handleBackFromSquadDetail = () => {
    setCurrentView(previousView);
  };

  const handleCalendarClick = () => {
    setCurrentView('calendar');
    setIsSidebarExpanded(false);
  };

  const handleMessagingClick = () => {
    setCurrentView('messaging');
    setIsSidebarExpanded(false);
  };

  function NotificationDropdown() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setShowNotifications(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = () => {
      setShowNotifications(!showNotifications);
      if (!showNotifications) {
        setHasUnreadNotifications(false);
      }
    };

    const notifications = [
      {
        id: 1,
        type: 'exchange',
        title: 'Exchange listing responded to',
        message: 'Sarah M. is interested in your Contracts textbook',
        time: '5m ago',
        unread: true,
        icon: Store
      },
      {
        id: 2,
        type: 'mention',
        title: 'Mentioned in class group chat',
        message: 'Alex mentioned you in Property Law Study Group',
        time: '1h ago',
        unread: true,
        icon: MessageCircle
      },
      {
        id: 3,
        type: 'assignment',
        title: 'Assignment due soon',
        message: 'Case Brief: Hawkins v. McGee due tomorrow at 9:00 AM',
        time: '2h ago',
        unread: true,
        icon: BookOpen
      },
      {
        id: 4,
        type: 'connect',
        title: 'New review posted',
        message: 'New review for Kirkland & Ellis on Connect',
        time: '3h ago',
        unread: false,
        icon: Briefcase
      },
      {
        id: 5,
        type: 'rent',
        title: 'Housing listing update',
        message: 'New summer sublet available in Cambridge',
        time: '5h ago',
        unread: false,
        icon: HouseIcon
      },
      {
        id: 6,
        type: 'squads',
        title: 'New member joined your squad',
        message: 'Jordan P. joined Run Club',
        time: '1d ago',
        unread: false,
        icon: Users
      }
    ];

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          className="p-2 hover:bg-[#e8e5dc] rounded-xl transition-colors relative"
          onClick={handleNotificationClick}
        >
          <Bell className="w-5 h-5 md:w-5 md:h-5 text-[#3d3d3a]" />
          {hasUnreadNotifications && unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-[#d47455] text-white rounded-full flex items-center justify-center text-[9px] px-1" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="fixed md:absolute top-0 md:top-full left-0 md:left-auto right-0 md:right-0 md:mt-2 bg-white md:rounded-2xl shadow-2xl z-50 md:w-[420px] border-0 md:border md:border-[#e8e4db] h-full md:h-auto">
            <div className="px-4 md:px-6 py-4 border-b border-[#e8e4db] bg-gradient-to-r from-[#faf9f7] to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <p className="text-[12px] text-[#999] mt-0.5 m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {unreadCount} unread
                    </p>
                  )}
                </div>
                <button 
                  className="text-[12px] text-[#d47455] hover:text-[#c06545] px-3 py-1.5 rounded-lg hover:bg-[#fef9f5]" 
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                >
                  Mark all read
                </button>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {notifications.map((notification, index) => {
                const Icon = notification.icon;
                return (
                  <div
                    key={notification.id}
                    className={`px-4 md:px-6 py-4 hover:bg-[#faf9f7] cursor-pointer transition-colors ${
                      notification.unread ? 'bg-[#fef9f5]' : 'bg-white'
                    } ${index !== notifications.length - 1 ? 'border-b border-[#f0ede5]' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          notification.unread ? 'bg-[#d47455]' : 'bg-[#f5f3eb]'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${notification.unread ? 'text-white' : 'text-[#999]'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-[14px] text-[#1a1a1a] m-0 leading-snug" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                            {notification.title}
                          </h4>
                          {notification.unread && (
                            <div className="w-2 h-2 rounded-full bg-[#d47455] flex-shrink-0 mt-1.5"></div>
                          )}
                        </div>
                        <p className="text-[13px] text-[#666] mb-2 m-0 leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
                          {notification.message}
                        </p>
                        <span className="text-[11px] text-[#999]" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}>
                          {notification.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block px-6 py-4 border-t border-[#e8e4db] text-center bg-[#faf9f7]">
              <button 
                className="text-[13px] text-[#d47455] hover:text-[#c06545] px-4 py-2 rounded-lg hover:bg-white transition-colors" 
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                View all notifications
              </button>
            </div>

            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#e8e4db]">
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-full py-3 bg-[#d47455] text-white rounded-xl text-[15px]" 
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Handle auth callback route
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
          <p className="mt-4 text-neutral-600" style={{ fontFamily: 'Arial, sans-serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user) {
    if (showAuth) {
      return <AuthPage onBack={() => setShowAuth(false)} initialMode={authMode} />;
    }
    
    return <LandingPage 
      onSignIn={() => {
        setAuthMode('login');
        setShowAuth(true);
      }}
    />;
  }

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ backgroundColor: isMessagingView ? '#fbf8f7' : '#F1EFE7' }}
    >
      {/* Desktop Sidebar Overlay */}
      {isSidebarExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarExpanded(false)}
        />
      )}

      <div className="hidden md:block fixed top-2 left-0 z-50" style={{ width: '50px' }}>
        <div className="w-full flex justify-center">
          <IconButton 
            icon={Menu} 
            label="Menu"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            tooltipPosition="right"
          />
        </div>
      </div>

      <div 
        className={`hidden md:flex bg-[#F1EFE7] flex-col items-start py-2 transition-all duration-300 fixed h-full z-40 overflow-hidden ${
          isSidebarExpanded ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ width: isSidebarExpanded ? '200px' : '50px' }}
      >
        <div style={{ height: '40px' }} />
        
        <div className="w-full mt-6 px-0">
          {isSidebarExpanded ? (
            <>
              <button onClick={handleHomeClick} className="w-full flex items-center gap-3 px-3 py-3 mx-3 rounded-xl hover:bg-[#e8e5dc] transition-colors text-[#3d3d3a]" style={{ fontFamily: 'Arial, sans-serif' }}>
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Home</span>
              </button>
              <button onClick={handleSquadsClick} className="w-full flex items-center gap-3 px-3 py-3 mx-3 rounded-xl hover:bg-[#e8e5dc] transition-colors text-[#3d3d3a] mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Squads</span>
              </button>
              <button onClick={handleClassesClick} className="w-full flex items-center gap-3 px-3 py-3 mx-3 rounded-xl hover:bg-[#e8e5dc] transition-colors text-[#3d3d3a] mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                <BookOpen className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Classes</span>
              </button>
              <button onClick={handleCalendarClick} className="w-full flex items-center gap-3 px-3 py-3 mx-3 rounded-xl hover:bg-[#e8e5dc] transition-colors text-[#3d3d3a] mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                <CalendarIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Calendar</span>
              </button>
            </>
          ) : (
            <>
              <div className="w-full flex justify-center">
                <IconButton icon={LayoutDashboard} label="Home" onClick={handleHomeClick} tooltipPosition="right" />
              </div>
              <div className="w-full flex justify-center mt-1">
                <IconButton icon={Users} label="Squads" onClick={handleSquadsClick} tooltipPosition="right" />
              </div>
              <div className="w-full flex justify-center mt-1">
                <IconButton icon={BookOpen} label="Classes" onClick={handleClassesClick} tooltipPosition="right" />
              </div>
              <div className="w-full flex justify-center mt-1">
                <IconButton icon={CalendarIcon} label="Calendar" onClick={handleCalendarClick} tooltipPosition="right" />
              </div>
            </>
          )}
        </div>
      </div>

      <div 
        className="flex-1 flex flex-col ml-0 md:min-w-0 transition-all duration-300"
        style={{ 
          marginLeft: window.innerWidth >= 768 ? (isSidebarExpanded ? '200px' : '70px') : '0'
        }}
      >
        <div 
          className="bg-[#F1EFE7] hidden md:flex items-center justify-between px-4 md:pr-8 py-3 md:py-2"
          style={{ paddingLeft: window.innerWidth >= 768 ? '32px' : '16px' }}
        >
          <div 
            className="flex-1 max-w-md"
            style={{ paddingLeft: window.innerWidth >= 768 ? '24px' : '0' }}
          >
            <div className="md:hidden">
              <h1 className="text-[20px] text-[#3d3d3a] m-0" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
                Law School
              </h1>
            </div>
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses, assignments, peers…"
                className="w-full pl-10 pr-4 py-2 bg-white/70 rounded-lg border-0 text-sm text-[#87888b] placeholder:text-[#87888b]/50"
                style={{ fontFamily: 'Arial, sans-serif' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <div className="hidden md:flex items-center gap-4">
              <IconButton icon={CalendarIcon} label="Calendar" onClick={handleCalendarClick} />
              <IconButton icon={BookOpen} label="Classes" onClick={handleClassesClick} />
            </div>
            <NotificationDropdown />
            <div className="hidden md:block h-8 w-px bg-[#e4e0e0]"></div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-right hidden md:block">
                <div className="text-sm text-[#3d3d3a]" style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}>{profileLoading ? 'Loading...' : getDisplayNameShort()}</div>
                <div className="text-xs text-[#7b7b74]" style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}>{profileLoading ? '...' : getClassYearDisplay()}</div>
              </div>
              {getAvatarUrl() ? (
                <img 
                  src={getAvatarUrl()!} 
                  alt="Profile" 
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-[#d47455] transition-all hidden md:block"
                  onClick={handleProfileClick}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#d47455] transition-all hidden md:block text-white text-sm"
                style={{ 
                  backgroundColor: getAvatarColor(profile?.full_name || null, user?.email || null),
                  display: getAvatarUrl() ? 'none' : 'flex',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 600
                }}
                onClick={handleProfileClick}
              >
                {getInitials(profile?.full_name || null, user?.email || null)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {currentView === 'course' && (
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full">
              <CoursePage courseId={selectedCourse} onBack={handleBackFromCourse} previousView={previousView} />
            </div>
          )}
          {currentView === 'messaging' && (
            <div className="bg-[#fbf8f7] md:rounded-tl-2xl md:rounded-tr-2xl h-full">
              <MessagingPage onCourseClick={handleCourseClick} />
            </div>
          )}
          {currentView === 'profile' && (
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full">
              <ProfilePage />
            </div>
          )}
          {currentView === 'classes' && (
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full">
              <ClassesPage />
            </div>
          )}
          {currentView === 'squads' && (
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full">
              <SquadsPage onSquadClick={handleSquadDetailClick} />
            </div>
          )}
          {currentView === 'squad-detail' && (
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full">
              <SquadDetailPage 
                squadId={selectedSquad} 
                onBack={handleBackFromSquadDetail} 
                onOpenChat={(conversationId) => {
                  if (conversationId) {
                    // Store conversation ID to select when messaging page loads
                    sessionStorage.setItem('selectedConversationId', conversationId);
                  }
                  setCurrentView('messaging');
                }}
              />
            </div>
          )}
          {currentView === 'calendar' && (
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full">
              <CalendarPage />
            </div>
          )}
          {currentView === 'dashboard' && (
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl px-4 md:px-12 py-4 md:py-8 min-h-full">
              <div className="md:hidden">
                <MobileDashboard
                  greeting={greeting}
                  formattedDate={formattedDate}
                  time={time}
                  ampm={ampm}
                  isPastFivePM={isPastFivePM}
                  handleCourseClick={handleCourseClick}
                  userName={profileLoading ? '...' : (profile?.full_name ? profile.full_name.split(' ')[0] : user?.email?.split('@')[0] || 'User')}
                />
              </div>

              <div className="hidden md:block">
                <div className="mb-6">
                  <h1 
                    className="text-[56px] text-[#3d3d3a] mb-2"
                    style={{ fontFamily: 'Lora, serif', fontWeight: 400, lineHeight: 1.2 }}
                  >
                    {greeting}, {profileLoading ? '...' : (profile?.full_name ? profile.full_name.split(' ')[0] : user?.email?.split('@')[0] || 'User')}
                  </h1>
                  <p 
                    className="text-[26px] text-[#7b7b74]"
                    style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}
                  >
                    You have <span style={{ fontWeight: 700 }}>3</span> assignments left this week
                  </p>
                </div>

                <div className="text-right mb-8">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-full ${
                      isPastFivePM 
                        ? 'bg-gradient-to-br from-[#919FC7] to-[#586595]' 
                        : 'bg-gradient-to-br from-[#eeaf90] to-[#d97757]'
                    }`}></span>
                    <span 
                      className="text-[56px] text-[#3d3d3a]"
                      style={{ fontFamily: 'Lora, serif', fontWeight: 400, lineHeight: 1.2 }}
                    >
                      {time} <span className="text-[#3d3d39]">{ampm}</span>
                    </span>
                  </div>
                  <p 
                    className="text-[24px] text-[#7b7b74]"
                    style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}
                  >
                    {formattedDate}
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_320px] gap-16">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 
                        className="text-[24px] text-[#3d3d3a]"
                        style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
                      >
                        This Week
                      </h2>
                      <button 
                        className="text-[14px] text-[#8c867d] hover:text-[#3d3d3a]"
                        style={{ fontFamily: 'Arial, sans-serif' }}
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-[#fefefc] border border-[#e7ded1] rounded-xl p-4 flex items-center gap-3">
                        <div className="w-1 h-12 bg-[#d97757] rounded-sm flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="text-[15px] text-[#3d3d3a] mb-0.5"
                            style={{ fontFamily: 'Lora, serif', fontWeight: 700 }}
                          >
                            Case Brief: Hawkins v. McGee
                          </h3>
                          <p 
                            className="text-[14px] text-[#7b7b74]"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                          >
                            Contracts • Tomorrow, 9:00 AM
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#fefefc] border border-[#e7ded1] rounded-xl p-4 flex items-center gap-3">
                        <div className="w-1 h-12 bg-[#8c9e8c] rounded-sm flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="text-[15px] text-[#3d3d3a] mb-0.5"
                            style={{ fontFamily: 'Lora, serif', fontWeight: 700 }}
                          >
                            Memo Draft 1
                          </h3>
                          <p 
                            className="text-[14px] text-[#7b7b74]"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                          >
                            Legal Writing • Friday, 5:00 PM
                          </p>
                        </div>
                      </div>

                      <button className="w-full bg-[#fefefc] border-2 border-dashed border-[#c7bcaa] rounded-xl p-4 text-[14px] text-[#8c867d] hover:border-[#8c867d] transition-colors active:bg-[#f5f3eb]"
                        style={{ fontFamily: 'Arial, sans-serif' }}
                      >
                        + Add new task
                      </button>
                    </div>
                  </div>

                  <div>
                    <h2 
                      className="text-[24px] text-[#3d3d3a] mb-4"
                      style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
                    >
                      Today's Classes
                    </h2>

                    <div className="space-y-3">
                      <div 
                        className="bg-[#f0eee6] rounded-xl p-4 cursor-pointer hover:bg-[#e8e5da] transition-colors"
                        onClick={() => handleCourseClick('contracts-101')}
                      >
                        <h3 
                          className="text-[16px] text-[#3d3d3a] mb-1"
                          style={{ fontFamily: 'Lora, serif', fontWeight: 700 }}
                        >
                          Contracts
                        </h3>
                        <p 
                          className="text-[15px] text-[#3d3d3a]"
                          style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}
                        >
                          8:15 AM - 10:00 AM • WCC 1015
                        </p>
                      </div>

                      <div 
                        className="bg-[#f0eee6] rounded-xl p-4 cursor-pointer hover:bg-[#e8e5da] transition-colors"
                        onClick={() => handleCourseClick('property-law')}
                      >
                        <h3 
                          className="text-[16px] text-[#3d3d3a] mb-1"
                          style={{ fontFamily: 'Lora, serif', fontWeight: 700 }}
                        >
                          Property
                        </h3>
                        <p 
                          className="text-[15px] text-[#3d3d3a]"
                          style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}
                        >
                          1:00 PM - 3:00 PM • WCC 1010
                        </p>
                      </div>

                      <div 
                        className="bg-[#f0eee6] rounded-xl p-4 cursor-pointer hover:bg-[#e8e5da] transition-colors"
                        onClick={() => handleCourseClick('legal-writing')}
                      >
                        <h3 
                          className="text-[16px] text-[#3d3d3a] mb-1"
                          style={{ fontFamily: 'Lora, serif', fontWeight: 700 }}
                        >
                          Legal Writing
                        </h3>
                        <p 
                          className="text-[15px] text-[#3d3d3a]"
                          style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}
                        >
                          5:00 PM - 7:30 PM • Pound 102
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fbf8f7] border-t border-[#e7ded1] z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-0"
        style={{ backgroundColor: '#fbf8f7' }}
      >
        <div className="flex items-center justify-around px-1 py-2">
          <button
            onClick={handleCalendarClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'calendar' || currentView === 'classes' ? 'text-[#d47455]' : 'text-[#7b7b74]'
            }`}
          >
            <CalendarIcon className="w-6 h-6" />
            <span className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}>Schedule</span>
          </button>

          <button
            onClick={handleSquadsClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'squads' || currentView === 'squad-detail' ? 'text-[#d47455]' : 'text-[#7b7b74]'
            }`}
          >
            <Users className="w-6 h-6" />
            <span className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}>Squads</span>
          </button>

          <button
            onClick={handleHomeClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'dashboard' ? 'text-[#d47455]' : 'text-[#7b7b74]'
            }`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}>Home</span>
          </button>

          <button
            onClick={handleMessagingClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'messaging' ? 'text-[#d47455]' : 'text-[#7b7b74]'
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}>Messages</span>
          </button>

          <button
            onClick={handleProfileClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'profile' ? 'text-[#d47455]' : 'text-[#7b7b74]'
            }`}
          >
            {getAvatarUrl() ? (
              <img 
                src={getAvatarUrl()!} 
                alt="Profile" 
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
              style={{ 
                backgroundColor: getAvatarColor(profile?.full_name || null, user?.email || null),
                display: getAvatarUrl() ? 'none' : 'flex',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 600
              }}
            >
              {getInitials(profile?.full_name || null, user?.email || null)}
            </div>
            <span className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 500 }}>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}