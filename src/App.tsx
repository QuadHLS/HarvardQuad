import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Menu, Search, Calendar as CalendarIcon, Bell, MessageCircle, LayoutDashboard, Briefcase, Store, HomeIcon as HouseIcon, BookOpen, Users } from 'lucide-react';
import { MessagingPage } from './components/MessagingPage';
import { CoursePage } from './components/CoursePage';
import { ProfilePage } from './components/ProfilePage';
import { ClassesPage } from './components/ClassesPage';
import { SquadsPage } from './components/SquadsPage';
import { SquadDetailPage } from './components/SquadDetailPage';
import { CalendarPage } from './components/CalendarPage';
import { IconButton } from './components/IconButton';
import { AuthPage } from './components/auth/AuthPage';
import { AuthScreensStandalone } from './components/auth/MobileLoginPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { OnboardingFlowStandalone } from './components/onboarding/OnboardingFlow';
import { useIsMobile } from './components/ui/use-mobile';
import { LandingPage } from './components/LandingPage';
import { HomeFeed } from './components/HomeFeed';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';

type ViewState = 'dashboard' | 'messaging' | 'course' | 'profile' | 'classes' | 'squads' | 'squad-detail' | 'calendar';

interface ProfileData {
  full_name: string | null;
  public_name: string | null;
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
  const isMobile = useIsMobile();
  
  // Parse URL to get initial state (memoized to only calculate once)
  const initialState = useMemo(() => {
    if (typeof window === 'undefined') {
      return { view: 'dashboard' as ViewState, course: '', squad: '', previous: 'dashboard' as ViewState };
    }
    
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || sessionStorage.getItem('currentView') || 'dashboard';
    const course = params.get('course') || sessionStorage.getItem('selectedCourse') || '';
    const squad = params.get('squad') || sessionStorage.getItem('selectedSquad') || '';
    const previous = params.get('previous') || sessionStorage.getItem('previousView') || 'dashboard';
    
    const validViews: ViewState[] = ['dashboard', 'messaging', 'course', 'profile', 'classes', 'squads', 'squad-detail', 'calendar'];
    return {
      view: (validViews.includes(view as ViewState) ? view : 'dashboard') as ViewState,
      course,
      squad,
      previous: (validViews.includes(previous as ViewState) ? previous : 'dashboard') as ViewState,
    };
  }, []); // Only calculate once on mount
  const [currentView, setCurrentView] = useState<ViewState>(initialState.view);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialState.course);
  const [selectedSquad, setSelectedSquad] = useState<string>(initialState.squad);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [previousView, setPreviousView] = useState<ViewState>(initialState.previous);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [isMessageInputFocused, setIsMessageInputFocused] = useState(false);
  const [isFeedInputFocused, setIsFeedInputFocused] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Ref to keep full height when keyboard is open so layout doesn't shrink and leave a box
  const lastFullHeightRef = useRef<number>(
    typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 800
  );

  // Safari iOS: set visual viewport height so layout doesn't jump when address bar shows/hides.
  // When an input/textarea is focused (keyboard open), freeze --app-height to last full height
  // so the page doesn't resize and leave a visible box/gap.
  useEffect(() => {
    const setAppHeight = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const active = document.activeElement;
      const isInputFocused =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable);
      if (isInputFocused) {
        document.documentElement.style.setProperty('--app-height', `${lastFullHeightRef.current}px`);
      } else {
        // Only update when viewport is full or larger — never shrink so bottom bar doesn't jump up
        if (vh >= lastFullHeightRef.current) {
          lastFullHeightRef.current = vh;
          document.documentElement.style.setProperty('--app-height', `${vh}px`);
        }
      }
    };
    setAppHeight();
    window.visualViewport?.addEventListener('resize', setAppHeight);
    window.addEventListener('resize', setAppHeight);
    // Capture full height when an input is focused (before keyboard opens)
    const onFocusIn = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      lastFullHeightRef.current = vh;
      setAppHeight();
    };
    // When keyboard closes, update height after it's fully gone. Only apply if larger so we never shrink
    // (avoids bottom bar jumping up on onboarding/sign-in when blurring the 2nd input).
    let focusOutTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const onFocusOut = () => {
      if (focusOutTimeoutId) clearTimeout(focusOutTimeoutId);
      focusOutTimeoutId = setTimeout(() => {
        focusOutTimeoutId = null;
        const vh = window.visualViewport?.height ?? window.innerHeight;
        if (vh >= lastFullHeightRef.current) {
          lastFullHeightRef.current = vh;
          document.documentElement.style.setProperty('--app-height', `${vh}px`);
        }
      }, 500);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      if (focusOutTimeoutId) clearTimeout(focusOutTimeoutId);
      window.visualViewport?.removeEventListener('resize', setAppHeight);
      window.removeEventListener('resize', setAppHeight);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Update URL and sessionStorage when view changes
  const updateURL = useCallback((view: ViewState, course?: string, squad?: string, previous?: ViewState) => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams();
    params.set('view', view);
    if (course) params.set('course', course);
    if (squad) params.set('squad', squad);
    if (previous) params.set('previous', previous);
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ view, course, squad, previous }, '', newURL);
    
    // Also save to sessionStorage
    sessionStorage.setItem('currentView', view);
    if (previous) sessionStorage.setItem('previousView', previous);
    if (course) {
      sessionStorage.setItem('selectedCourse', course);
    } else {
      sessionStorage.removeItem('selectedCourse');
    }
    if (squad) {
      sessionStorage.setItem('selectedSquad', squad);
    } else {
      sessionStorage.removeItem('selectedSquad');
    }
  }, []);

  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  const hasInitializedURL = useRef(false);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { view, course, squad, previous } = event.state;
        if (view) {
          setCurrentView(view);
          setSelectedCourse(course || '');
          setSelectedSquad(squad || '');
          if (previous) setPreviousView(previous);
        }
      } else {
        // Fallback to URL params if state is not available
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const course = params.get('course');
        const squad = params.get('squad');
        const previous = params.get('previous');
        
        if (view) {
          const validViews: ViewState[] = ['dashboard', 'messaging', 'course', 'profile', 'classes', 'squads', 'squad-detail', 'calendar'];
          if (validViews.includes(view as ViewState)) {
            setCurrentView(view as ViewState);
            setSelectedCourse(course || '');
            setSelectedSquad(squad || '');
            if (previous && validViews.includes(previous as ViewState)) {
              setPreviousView(previous as ViewState);
            }
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Only set up listener once

  // Initialize URL on mount (only once when user is available)
  useEffect(() => {
    if (typeof window === 'undefined' || !user || hasInitializedURL.current) return;
    
    // Read current state values - they're already initialized from URL/sessionStorage
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');
    
    // Get current values from state (they're in the closure from initial render)
    // Since we only run this once when user becomes available, the values are correct
    const currentViewValue = initialState.view;
    const currentCourseValue = initialState.course;
    const currentSquadValue = initialState.squad;
    const currentPreviousValue = initialState.previous;
    
    // Only replace URL if it doesn't match current state
    if (urlView !== currentViewValue) {
      const state = { 
        view: currentViewValue, 
        course: currentCourseValue, 
        squad: currentSquadValue, 
        previous: currentPreviousValue 
      };
      const newParams = new URLSearchParams();
      newParams.set('view', currentViewValue);
      if (currentCourseValue) newParams.set('course', currentCourseValue);
      if (currentSquadValue) newParams.set('squad', currentSquadValue);
      if (currentPreviousValue) newParams.set('previous', currentPreviousValue);
      window.history.replaceState(state, '', `${window.location.pathname}?${newParams.toString()}`);
    }
    
    hasInitializedURL.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only run when user changes

  // Update URL when state changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (user && hasInitializedURL.current) {
      updateURL(currentView, selectedCourse || undefined, selectedSquad || undefined, previousView);
    }
  }, [currentView, selectedCourse, selectedSquad, previousView, user, updateURL]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    // Check on mount as well
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
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
          .select('full_name, public_name, email, class_year, graduation_year, phone, location, gpa, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile({
            full_name: user.user_metadata?.full_name || null,
            public_name: null,
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
          public_name: null,
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

  // Listen for message input focus events to hide/show bottom navigation
  useEffect(() => {
    const handleMessageInputFocus = (event: Event) => {
      const customEvent = event as CustomEvent<{ focused: boolean }>;
      if (customEvent.detail) {
        setIsMessageInputFocused(customEvent.detail.focused);
      }
    };

    document.addEventListener('messageInputFocused', handleMessageInputFocus);
    window.addEventListener('messageInputFocused', handleMessageInputFocus);

    return () => {
      document.removeEventListener('messageInputFocused', handleMessageInputFocus);
      window.removeEventListener('messageInputFocused', handleMessageInputFocus);
    };
  }, []);

  // Listen for feed (post page) input focus so bottom nav doesn't get pushed up by keyboard
  useEffect(() => {
    const handleFeedInputFocus = (event: Event) => {
      const customEvent = event as CustomEvent<{ focused: boolean }>;
      if (customEvent.detail) {
        setIsFeedInputFocused(customEvent.detail.focused);
      }
    };

    document.addEventListener('feedInputFocused', handleFeedInputFocus);
    window.addEventListener('feedInputFocused', handleFeedInputFocus);

    return () => {
      document.removeEventListener('feedInputFocused', handleFeedInputFocus);
      window.removeEventListener('feedInputFocused', handleFeedInputFocus);
    };
  }, []);

  // Reset feed input focus when leaving dashboard so nav never stays hidden
  useEffect(() => {
    if (currentView !== 'dashboard') {
      setIsFeedInputFocused(false);
    }
  }, [currentView]);

  // Reset onboarding when user logs out so next login shows it again (must be before any conditional returns)
  useEffect(() => {
    if (!user) setOnboardingComplete(false);
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

  // Home/header: use full name (not public name)
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
    const newPrevious = currentView;
    setPreviousView(newPrevious);
    setSelectedCourse(courseId);
    setCurrentView('course');
    setIsSidebarExpanded(false);
    updateURL('course', courseId, undefined, newPrevious);
  };

  const handleBackFromCourse = () => {
    setCurrentView(previousView);
    setSelectedCourse('');
    updateURL(previousView, undefined, undefined, previousView);
  };

  const handleHomeClick = () => {
    setCurrentView('dashboard');
    setIsSidebarExpanded(false);
    updateURL('dashboard', undefined, undefined, previousView);
  };

  const handleProfileClick = () => {
    setCurrentView('profile');
    setIsSidebarExpanded(false);
    updateURL('profile', undefined, undefined, previousView);
  };

  const handleClassesClick = () => {
    setCurrentView('classes');
    setIsSidebarExpanded(false);
    updateURL('classes', undefined, undefined, previousView);
  };

  const handleSquadsClick = () => {
    setCurrentView('squads');
    setIsSidebarExpanded(false);
    updateURL('squads', undefined, undefined, previousView);
  };

  const handleSquadDetailClick = (squadId: string) => {
    const newPrevious = currentView;
    setPreviousView(newPrevious);
    setSelectedSquad(squadId);
    setCurrentView('squad-detail');
    setIsSidebarExpanded(false);
    updateURL('squad-detail', undefined, squadId, newPrevious);
  };

  const handleBackFromSquadDetail = () => {
    setCurrentView(previousView);
    setSelectedSquad('');
    updateURL(previousView, undefined, undefined, previousView);
  };

  const handleCalendarClick = () => {
    setCurrentView('calendar');
    setIsSidebarExpanded(false);
    updateURL('calendar', undefined, undefined, previousView);
  };

  const handleMessagingClick = () => {
    setCurrentView('messaging');
    setIsSidebarExpanded(false);
    updateURL('messaging', undefined, undefined, previousView);
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

  // Clear saved state when user logs out (must be before any early returns)
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      sessionStorage.removeItem('currentView');
      sessionStorage.removeItem('previousView');
      sessionStorage.removeItem('selectedCourse');
      sessionStorage.removeItem('selectedSquad');
    }
  }, [user]);

  // Handle auth callback route
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d47455]"></div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user) {
    if (showAuth) {
      // Use mobile login/onboarding flow for both mobile and desktop for now (AuthPage kept but not used)
      return <AuthScreensStandalone onBack={() => setShowAuth(false)} />;
    }
    
    return <LandingPage 
      onSignIn={() => {
        setAuthMode('login');
        setShowAuth(true);
      }}
    />;
  }

  // After login: show onboarding every time until they complete it (for now, not persisted)
  if (user && !onboardingComplete) {
    return (
      <OnboardingFlowStandalone
        onComplete={() => setOnboardingComplete(true)}
      />
    );
  }

  return (
    <div
      className="h-screen max-h-screen flex flex-col md:flex-row overflow-hidden"
      style={{
        backgroundColor: isMessagingView ? '#fbf8f7' : '#F1EFE7',
        minHeight: 'var(--app-height, 100vh)',
        height: 'var(--app-height, 100vh)',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
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
        className="flex-1 flex flex-col min-h-0 ml-0 md:min-w-0 transition-all duration-300"
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

        <div
          className={`flex-1 flex flex-col min-h-0 ${currentView === 'messaging' ? 'overflow-hidden' : currentView === 'dashboard' ? 'overflow-hidden' : 'overflow-auto'}`}
          style={{
            backgroundColor: currentView === 'messaging' ? '#fbf8f7' : '#FBF9F5',
            overscrollBehavior: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
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
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl flex-1 flex flex-col min-h-0 overflow-hidden">
              <HomeFeed
                greeting={greeting}
                userName={profileLoading || !profile?.full_name ? '...' : profile.full_name.split(' ')[0]}
                userId={user?.id}
                publicName={profile?.public_name?.trim() || profile?.full_name?.trim() || user?.email?.split('@')[0] || 'You'}
              />
            </div>
          )}
        </div>
      </div>

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fbf8f7] border-t border-[#e7ded1] z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-in-out"
        style={{ 
          backgroundColor: '#fbf8f7',
          transform: (isMessageInputFocused && currentView === 'messaging') || (isFeedInputFocused && currentView === 'dashboard') ? 'translateY(100%)' : 'translateY(0)',
          willChange: 'transform'
        }}
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