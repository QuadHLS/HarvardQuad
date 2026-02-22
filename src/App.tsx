import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
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
import { navigateWithoutReload } from './lib/navigation';
import { supabase } from './lib/supabase';

type ViewState = 'dashboard' | 'messaging' | 'course' | 'profile' | 'classes' | 'squads' | 'squad-detail' | 'calendar';
type KeepAliveView = 'dashboard' | 'messaging' | 'profile' | 'classes' | 'squads' | 'calendar';

interface ProfileData {
  full_name: string | null;
  public_name: string | null;
  email: string | null;
  class_year: string | null;
  graduation_year: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  onboarding_completed?: boolean | null;
}

interface AppSnapshot {
  view: ViewState;
  course: string;
  squad: string;
  previous: ViewState;
  conversation: string;
  post: string;
  classesTab: string;
  squadPost: string;
  calendarMonth: string;
  calendarDate: string;
  updatedAt: number;
}

const APP_SNAPSHOT_KEY = 'hqAppSnapshotV1';

export default function App() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  
  // Subpage state keys for sessionStorage (remember which subpage per view)
  const SUBPAGE_KEYS = {
    conversation: 'subpageConversation',
    post: 'subpagePost',
    classesTab: 'subpageClassesTab',
    squadPost: 'subpageSquadPost',
    calendarMonth: 'subpageCalendarMonth',
    calendarDate: 'subpageCalendarDate',
  } as const;

  // Parse URL to get initial state (memoized to only calculate once)
  const initialState = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        view: 'dashboard' as ViewState,
        course: '',
        squad: '',
        previous: 'dashboard' as ViewState,
        conversation: '',
        post: '',
        classesTab: 'overview',
        squadPost: '',
        calendarMonth: '',
        calendarDate: '',
      };
    }
    let snapshot: Partial<AppSnapshot> = {};
    try {
      const raw = localStorage.getItem(APP_SNAPSHOT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSnapshot>;
        if (parsed && typeof parsed === 'object') {
          snapshot = parsed;
        }
      }
    } catch {
      // Ignore corrupt cache.
    }
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') || sessionStorage.getItem('currentView') || snapshot.view || 'dashboard';
    const course = params.get('course') || sessionStorage.getItem('selectedCourse') || snapshot.course || '';
    const squad = params.get('squad') || sessionStorage.getItem('selectedSquad') || snapshot.squad || '';
    const previous = params.get('previous') || sessionStorage.getItem('previousView') || snapshot.previous || 'dashboard';
    const conversation = params.get('conversation') || sessionStorage.getItem(SUBPAGE_KEYS.conversation) || sessionStorage.getItem('selectedConversationId') || snapshot.conversation || '';
    const post = params.get('post') || sessionStorage.getItem(SUBPAGE_KEYS.post) || snapshot.post || '';
    const classesTab = params.get('classesTab') || sessionStorage.getItem(SUBPAGE_KEYS.classesTab) || snapshot.classesTab || 'overview';
    const squadPost = params.get('squadPost') || sessionStorage.getItem(SUBPAGE_KEYS.squadPost) || snapshot.squadPost || '';
    const calendarMonth = params.get('calendarMonth') || sessionStorage.getItem(SUBPAGE_KEYS.calendarMonth) || snapshot.calendarMonth || '';
    const calendarDate = params.get('calendarDate') || sessionStorage.getItem(SUBPAGE_KEYS.calendarDate) || snapshot.calendarDate || '';
    const validViews: ViewState[] = ['dashboard', 'messaging', 'course', 'profile', 'classes', 'squads', 'squad-detail', 'calendar'];
    const validClassesTabs = ['overview', 'schedule', 'assignments'];
    return {
      view: (validViews.includes(view as ViewState) ? view : 'dashboard') as ViewState,
      course,
      squad,
      previous: (validViews.includes(previous as ViewState) ? previous : 'dashboard') as ViewState,
      conversation,
      post,
      classesTab: validClassesTabs.includes(classesTab) ? classesTab : 'overview',
      squadPost,
      calendarMonth,
      calendarDate,
    };
  }, []); // Only calculate once on mount
  const [currentView, setCurrentView] = useState<ViewState>(initialState.view);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialState.course);
  const [selectedSquad, setSelectedSquad] = useState<string>(initialState.squad);
  const [subpageConversation, setSubpageConversation] = useState<string>(initialState.conversation);
  const [subpagePost, setSubpagePost] = useState<string>(initialState.post);
  const [subpageClassesTab, setSubpageClassesTab] = useState<string>(initialState.classesTab);
  const [subpageSquadPost, setSubpageSquadPost] = useState<string>(initialState.squadPost);
  const [subpageCalendarMonth, setSubpageCalendarMonth] = useState<string>(initialState.calendarMonth);
  const [subpageCalendarDate, setSubpageCalendarDate] = useState<string>(initialState.calendarDate);
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
  const bottomNavRef = useRef<HTMLDivElement | null>(null);
  const keepAliveViews: KeepAliveView[] = ['dashboard', 'messaging', 'profile', 'classes', 'squads', 'calendar'];
  const [mountedKeepAliveViews, setMountedKeepAliveViews] = useState<Record<KeepAliveView, boolean>>({
    dashboard: initialState.view === 'dashboard',
    messaging: initialState.view === 'messaging',
    profile: initialState.view === 'profile',
    classes: initialState.view === 'classes',
    squads: initialState.view === 'squads',
    calendar: initialState.view === 'calendar',
  });

  // Ref to keep full height when keyboard is open (any input focused)
  const lastFullHeightRef = useRef<number>(
    typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 800
  );

  // Safari iOS: set visual viewport height. Freeze --app-height when any input is focused so the
  // page doesn't move when the keyboard opens (onboarding, sign-in, feed, messaging). Only messaging
  // needs special nav behavior; layout freeze applies everywhere.
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
        // When not focused: always update --app-height so layout resizes when viewport shrinks
        // (e.g. Responsive Design Mode). Only grow lastFullHeightRef so we have a good freeze value.
        if (vh >= lastFullHeightRef.current) {
          lastFullHeightRef.current = vh;
        }
        document.documentElement.style.setProperty('--app-height', `${vh}px`);
      }
    };
    setAppHeight();
    window.visualViewport?.addEventListener('resize', setAppHeight);
    window.addEventListener('resize', setAppHeight);
    const onFocusIn = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      lastFullHeightRef.current = vh;
      setAppHeight();
    };
    const onFocusOut = () => setAppHeight();
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      window.visualViewport?.removeEventListener('resize', setAppHeight);
      window.removeEventListener('resize', setAppHeight);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Update URL and sessionStorage when view/subpage changes
  const updateURL = useCallback((
    view: ViewState,
    course?: string,
    squad?: string,
    previous?: ViewState,
    subpage?: { conversation?: string; post?: string; classesTab?: string; squadPost?: string; calendarMonth?: string; calendarDate?: string }
  ) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('view', view);
    if (course) params.set('course', course);
    if (squad) params.set('squad', squad);
    if (previous) params.set('previous', previous);
    if (subpage?.conversation) params.set('conversation', subpage.conversation);
    if (subpage?.post) params.set('post', subpage.post);
    if (subpage?.classesTab) params.set('classesTab', subpage.classesTab);
    if (subpage?.squadPost) params.set('squadPost', subpage.squadPost);
    if (subpage?.calendarMonth) params.set('calendarMonth', subpage.calendarMonth);
    if (subpage?.calendarDate) params.set('calendarDate', subpage.calendarDate);
    const state = {
      view, course: course ?? '', squad: squad ?? '', previous: previous ?? 'dashboard' as ViewState,
      conversation: subpage?.conversation ?? '', post: subpage?.post ?? '', classesTab: subpage?.classesTab ?? '',
      squadPost: subpage?.squadPost ?? '', calendarMonth: subpage?.calendarMonth ?? '', calendarDate: subpage?.calendarDate ?? '',
    };
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(state, '', newURL);
    sessionStorage.setItem('currentView', view);
    if (previous) sessionStorage.setItem('previousView', previous);
    if (course) sessionStorage.setItem('selectedCourse', course);
    else sessionStorage.removeItem('selectedCourse');
    if (squad) sessionStorage.setItem('selectedSquad', squad);
    else sessionStorage.removeItem('selectedSquad');
    // Only update sessionStorage for keys present in subpage (don't clear other views' data)
    if (subpage) {
      if ('conversation' in subpage) {
        if (subpage.conversation) {
          sessionStorage.setItem(SUBPAGE_KEYS.conversation, subpage.conversation);
          sessionStorage.setItem('selectedConversationId', subpage.conversation);
        } else {
          sessionStorage.removeItem(SUBPAGE_KEYS.conversation);
          sessionStorage.removeItem('selectedConversationId');
        }
      }
      if ('post' in subpage) {
        if (subpage.post) sessionStorage.setItem(SUBPAGE_KEYS.post, subpage.post);
        else sessionStorage.removeItem(SUBPAGE_KEYS.post);
      }
      if ('classesTab' in subpage) {
        if (subpage.classesTab) sessionStorage.setItem(SUBPAGE_KEYS.classesTab, subpage.classesTab);
        else sessionStorage.removeItem(SUBPAGE_KEYS.classesTab);
      }
      if ('squadPost' in subpage) {
        if (subpage.squadPost) sessionStorage.setItem(SUBPAGE_KEYS.squadPost, subpage.squadPost);
        else sessionStorage.removeItem(SUBPAGE_KEYS.squadPost);
      }
      if ('calendarMonth' in subpage) {
        if (subpage.calendarMonth) sessionStorage.setItem(SUBPAGE_KEYS.calendarMonth, subpage.calendarMonth);
        else sessionStorage.removeItem(SUBPAGE_KEYS.calendarMonth);
      }
      if ('calendarDate' in subpage) {
        if (subpage.calendarDate) sessionStorage.setItem(SUBPAGE_KEYS.calendarDate, subpage.calendarDate);
        else sessionStorage.removeItem(SUBPAGE_KEYS.calendarDate);
      }
    }
    try {
      let existingSnapshot: Partial<AppSnapshot> = {};
      const rawSnapshot = localStorage.getItem(APP_SNAPSHOT_KEY);
      if (rawSnapshot) {
        const parsed = JSON.parse(rawSnapshot) as Partial<AppSnapshot>;
        if (parsed && typeof parsed === 'object') existingSnapshot = parsed;
      }
      const snapshot: AppSnapshot = {
        view,
        course: course ?? '',
        squad: squad ?? '',
        previous: previous ?? 'dashboard',
        conversation: subpage && 'conversation' in subpage ? subpage.conversation ?? '' : existingSnapshot.conversation ?? '',
        post: subpage && 'post' in subpage ? subpage.post ?? '' : existingSnapshot.post ?? '',
        classesTab: subpage && 'classesTab' in subpage ? subpage.classesTab ?? 'overview' : existingSnapshot.classesTab ?? 'overview',
        squadPost: subpage && 'squadPost' in subpage ? subpage.squadPost ?? '' : existingSnapshot.squadPost ?? '',
        calendarMonth: subpage && 'calendarMonth' in subpage ? subpage.calendarMonth ?? '' : existingSnapshot.calendarMonth ?? '',
        calendarDate: subpage && 'calendarDate' in subpage ? subpage.calendarDate ?? '' : existingSnapshot.calendarDate ?? '',
        updatedAt: Date.now(),
      };
      localStorage.setItem(APP_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage write failures.
    }
  }, []);

  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  const hasInitializedURL = useRef(false);
  const latestAppSnapshotRef = useRef<AppSnapshot>({
    view: initialState.view,
    course: initialState.course,
    squad: initialState.squad,
    previous: initialState.previous,
    conversation: initialState.conversation,
    post: initialState.post,
    classesTab: initialState.classesTab,
    squadPost: initialState.squadPost,
    calendarMonth: initialState.calendarMonth,
    calendarDate: initialState.calendarDate,
    updatedAt: Date.now(),
  });

  useEffect(() => {
    latestAppSnapshotRef.current = {
      view: currentView,
      course: selectedCourse,
      squad: selectedSquad,
      previous: previousView,
      conversation: subpageConversation,
      post: subpagePost,
      classesTab: subpageClassesTab,
      squadPost: subpageSquadPost,
      calendarMonth: subpageCalendarMonth,
      calendarDate: subpageCalendarDate,
      updatedAt: Date.now(),
    };
  }, [currentView, selectedCourse, selectedSquad, previousView, subpageConversation, subpagePost, subpageClassesTab, subpageSquadPost, subpageCalendarMonth, subpageCalendarDate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const persistSnapshot = () => {
      try {
        localStorage.setItem(APP_SNAPSHOT_KEY, JSON.stringify({
          ...latestAppSnapshotRef.current,
          updatedAt: Date.now(),
        } as AppSnapshot));
      } catch {
        // Ignore storage write failures.
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistSnapshot();
    };

    let removeNativeListener: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
          if (!isActive) persistSnapshot();
        });
        removeNativeListener = () => listener.remove();
      } catch {
        // not native
      }
    })();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', persistSnapshot);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', persistSnapshot);
      removeNativeListener?.();
    };
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const params = new URLSearchParams(window.location.search);
      const view = state?.view ?? params.get('view');
      const course = state?.course ?? params.get('course') ?? '';
      const squad = state?.squad ?? params.get('squad') ?? '';
      const previous = state?.previous ?? params.get('previous');
      const conversation = state?.conversation ?? params.get('conversation') ?? '';
      const post = state?.post ?? params.get('post') ?? '';
      const classesTab = state?.classesTab ?? params.get('classesTab') ?? '';
      const squadPost = state?.squadPost ?? params.get('squadPost') ?? '';
      const calendarMonth = state?.calendarMonth ?? params.get('calendarMonth') ?? '';
      const calendarDate = state?.calendarDate ?? params.get('calendarDate') ?? '';
      if (view) {
        const validViews: ViewState[] = ['dashboard', 'messaging', 'course', 'profile', 'classes', 'squads', 'squad-detail', 'calendar'];
        if (validViews.includes(view as ViewState)) {
          setCurrentView(view as ViewState);
          setSelectedCourse(course);
          setSelectedSquad(squad);
          setSubpageConversation(conversation);
          setSubpagePost(post);
          setSubpageClassesTab(classesTab === 'schedule' || classesTab === 'assignments' ? classesTab : 'overview');
          setSubpageSquadPost(squadPost);
          setSubpageCalendarMonth(calendarMonth);
          setSubpageCalendarDate(calendarDate);
          if (previous && validViews.includes(previous as ViewState)) setPreviousView(previous as ViewState);
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
        previous: currentPreviousValue,
        conversation: initialState.conversation,
        post: initialState.post,
        classesTab: initialState.classesTab,
        squadPost: initialState.squadPost,
        calendarMonth: initialState.calendarMonth,
        calendarDate: initialState.calendarDate,
      };
      const newParams = new URLSearchParams();
      newParams.set('view', currentViewValue);
      if (currentCourseValue) newParams.set('course', currentCourseValue);
      if (currentSquadValue) newParams.set('squad', currentSquadValue);
      if (currentPreviousValue) newParams.set('previous', currentPreviousValue);
      if (initialState.conversation) newParams.set('conversation', initialState.conversation);
      if (initialState.post) newParams.set('post', initialState.post);
      if (initialState.classesTab) newParams.set('classesTab', initialState.classesTab);
      if (initialState.squadPost) newParams.set('squadPost', initialState.squadPost);
      if (initialState.calendarMonth) newParams.set('calendarMonth', initialState.calendarMonth);
      if (initialState.calendarDate) newParams.set('calendarDate', initialState.calendarDate);
      window.history.replaceState(state, '', `${window.location.pathname}?${newParams.toString()}`);
    }
    
    hasInitializedURL.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only run when user changes

  // Update URL when state changes (but not on initial mount). Only pass current view's subpage so we don't clear other views' persisted data.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (user && hasInitializedURL.current) {
      const subpage =
        currentView === 'messaging' ? { conversation: subpageConversation || undefined } :
        currentView === 'dashboard' ? { post: subpagePost || undefined } :
        currentView === 'classes' ? { classesTab: subpageClassesTab } :
        currentView === 'squad-detail' ? { squadPost: subpageSquadPost || undefined } :
        currentView === 'calendar' ? { calendarMonth: subpageCalendarMonth || undefined, calendarDate: subpageCalendarDate || undefined } :
        undefined;
      updateURL(currentView, selectedCourse || undefined, selectedSquad || undefined, previousView, subpage);
    }
  }, [currentView, selectedCourse, selectedSquad, previousView, subpageConversation, subpagePost, subpageClassesTab, subpageSquadPost, subpageCalendarMonth, subpageCalendarDate, user, updateURL]);

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
      setProfileLoading(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, public_name, email, class_year, graduation_year, phone, location, avatar_url, onboarding_completed')
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
            avatar_url: null,
          });
        } else {
          setProfile(data);
          if (data?.onboarding_completed) {
            setOnboardingComplete(true);
          }
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
          avatar_url: null,
        });
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Sync onboardingComplete from profile when profile loads (so returning users skip onboarding)
  useEffect(() => {
    if (profile?.onboarding_completed) {
      setOnboardingComplete(true);
    }
  }, [profile?.onboarding_completed]);

  useEffect(() => {
    if (!user) return;

    const handleProfileUpdate = () => {
      supabase
        .from('profiles')
        .select('full_name, public_name, email, class_year, graduation_year, phone, location, avatar_url, onboarding_completed')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
            if (data.onboarding_completed) setOnboardingComplete(true);
          }
        });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
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

  // Reset feed input focus when leaving dashboard/squad-detail so nav never stays hidden
  useEffect(() => {
    if (currentView !== 'dashboard' && currentView !== 'squad-detail') {
      setIsFeedInputFocused(false);
    }
  }, [currentView]);

  useEffect(() => {
    if ((keepAliveViews as string[]).includes(currentView)) {
      const view = currentView as KeepAliveView;
      setMountedKeepAliveViews((prev) => (prev[view] ? prev : { ...prev, [view]: true }));
    }
  }, [currentView]);

  // Keep a CSS var synced with the actual mobile bottom-nav height so other
  // fixed bars (e.g. post reply composer) can sit flush above it.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const setNavHeightVar = () => {
      const rect = bottomNavRef.current?.getBoundingClientRect();
      if (!rect) return;
      const h = rect.height;
      const offsetFromBottom = Math.max(0, window.innerHeight - rect.top);
      if (h && Number.isFinite(h)) {
        document.documentElement.style.setProperty('--mobile-bottom-nav-height', `${Math.round(h)}px`);
      }
      if (Number.isFinite(offsetFromBottom)) {
        // Exact visible offset to the nav's top edge (more reliable than height on iOS).
        document.documentElement.style.setProperty('--mobile-bottom-nav-offset', `${Math.round(offsetFromBottom)}px`);
      }
    };
    setNavHeightVar();
    window.addEventListener('resize', setNavHeightVar);
    window.visualViewport?.addEventListener('resize', setNavHeightVar);
    return () => {
      window.removeEventListener('resize', setNavHeightVar);
      window.visualViewport?.removeEventListener('resize', setNavHeightVar);
    };
  }, [currentView, isMessageInputFocused, isFeedInputFocused, subpageConversation, subpagePost]);

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
    const colors = ['#6ec9c4', '#e87461', '#d47455', '#9b8f7f', '#787771'];
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
    setIsSidebarExpanded(false);
    // If we were viewing a squad, return to that squad detail (remember subpage)
    if (selectedSquad) {
      setCurrentView('squad-detail');
      updateURL('squad-detail', undefined, selectedSquad, previousView);
    } else {
      setCurrentView('squads');
      updateURL('squads', undefined, undefined, previousView);
    }
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
    setSubpageSquadPost('');
    sessionStorage.removeItem(SUBPAGE_KEYS.squadPost);
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
          <Bell className="w-5 h-5 md:w-5 md:h-5 text-[#27251f]" />
          {hasUnreadNotifications && unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-[#d47455] text-white rounded-full flex items-center justify-center text-[9px] px-1" style={{ fontWeight: 600 }}>
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="fixed md:absolute top-0 md:top-full left-0 md:left-auto right-0 md:right-0 md:mt-2 bg-white md:rounded-2xl shadow-2xl z-50 md:w-[420px] border-0 md:border md:border-[#e8e4db] h-full md:h-auto">
            <div className="px-4 md:px-6 py-4 border-b border-[#e8e4db] bg-gradient-to-r from-[#faf9f7] to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] text-[#27251f] m-0" style={{ fontWeight: 600 }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <p className="text-[12px] text-[#787771] mt-0.5 m-0" >
                      {unreadCount} unread
                    </p>
                  )}
                </div>
                <button 
                  className="text-[12px] text-[#d47455] hover:text-[#c06545] px-3 py-1.5 rounded-full hover:bg-[#fef9f5]" 
                  style={{ fontWeight: 600 }}
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
                        <Icon className={`w-5 h-5 ${notification.unread ? 'text-white' : 'text-[#787771]'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-[14px] text-[#27251f] m-0 leading-snug" style={{ fontWeight: 600 }}>
                            {notification.title}
                          </h4>
                          {notification.unread && (
                            <div className="w-2 h-2 rounded-full bg-[#d47455] flex-shrink-0 mt-1.5"></div>
                          )}
                        </div>
                        <p className="text-[13px] text-[#787771] mb-2 m-0 leading-relaxed" >
                          {notification.message}
                        </p>
                        <span className="text-[11px] text-[#787771]" style={{ fontWeight: 500 }}>
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
                className="text-xs text-[#d47455] hover:text-[#c06545] px-3 py-1.5 rounded-full hover:bg-white transition-colors" 
                style={{ fontWeight: 600 }}
              >
                View all notifications
              </button>
            </div>

            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#e8e4db]">
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-full py-1.5 px-3 bg-[#d47455] text-white rounded-full text-xs" 
                style={{ fontWeight: 600 }}
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
      setProfile(null);
      sessionStorage.removeItem('currentView');
      sessionStorage.removeItem('previousView');
      sessionStorage.removeItem('selectedCourse');
      sessionStorage.removeItem('selectedSquad');
      localStorage.removeItem(APP_SNAPSHOT_KEY);
    }
  }, [user]);

  // Handle auth callback route
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  // Handle /login route - show auth screen
  if (window.location.pathname === '/login') {
    return <AuthScreensStandalone onBack={() => navigateWithoutReload('/')} />;
  }

  // Single loading state: checking auth session or loading profile (for onboarding check)
  if (loading || (user && profileLoading)) {
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

  // After login: show onboarding only if profile says not completed (never show if already completed)
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
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
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
              <button onClick={handleHomeClick} className="w-full flex items-center gap-3 px-3 py-3 mx-3 rounded-full hover:bg-[#e8e5dc] transition-colors text-[#27251f]" >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Home</span>
              </button>
              <button onClick={handleSquadsClick} className="w-full flex items-center gap-3 px-3 py-3 mx-3 rounded-full hover:bg-[#e8e5dc] transition-colors text-[#27251f] mt-1" >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Squads</span>
              </button>
              <button onClick={handleClassesClick} className="w-full flex items-center gap-3 px-3 py-3 mx-3 rounded-full hover:bg-[#e8e5dc] transition-colors text-[#27251f] mt-1" >
                <BookOpen className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Classes</span>
              </button>
              <button onClick={handleCalendarClick} className="w-full flex items-center gap-3 px-3 py-3 mx-3 rounded-full hover:bg-[#e8e5dc] transition-colors text-[#27251f] mt-1" >
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
              <h1 className="text-[20px] text-[#27251f] m-0" style={{ fontWeight: 600 }}>
                Law School
              </h1>
            </div>
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787771]" />
              <input
                type="text"
                placeholder="Search courses, assignments, peers…"
                className="w-full pl-10 pr-4 py-2 bg-white/70 rounded-lg border-0 text-sm text-[#787771] placeholder:text-[#787771]/50"
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
                <div className="text-sm text-[#27251f]" style={{ fontWeight: 400 }}>{profileLoading ? 'Loading...' : getDisplayNameShort()}</div>
                <div className="text-xs text-[#787771]" style={{ fontWeight: 400 }}>{profileLoading ? '...' : getClassYearDisplay()}</div>
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
          {mountedKeepAliveViews.messaging && (
            <div className={`bg-[#fbf8f7] md:rounded-tl-2xl md:rounded-tr-2xl h-full ${currentView === 'messaging' ? '' : 'hidden'}`}>
              <MessagingPage
                initialConversationId={subpageConversation || undefined}
                onConversationChange={(id) => {
                  setSubpageConversation(id ?? '');
                  if (id) {
                    sessionStorage.setItem('selectedConversationId', id);
                    sessionStorage.setItem(SUBPAGE_KEYS.conversation, id);
                  } else {
                    sessionStorage.removeItem('selectedConversationId');
                    sessionStorage.removeItem(SUBPAGE_KEYS.conversation);
                  }
                }}
                onCourseClick={handleCourseClick}
                onBackToSquad={() => {
                  if (typeof window !== 'undefined' && sessionStorage.getItem('messagingReturnTo') === 'squad-detail') {
                    sessionStorage.removeItem('messagingReturnTo');
                    setCurrentView('squad-detail');
                    updateURL('squad-detail', undefined, selectedSquad, 'messaging');
                    return true;
                  }
                  return false;
                }}
              />
            </div>
          )}
          {mountedKeepAliveViews.profile && (
            <div className={`bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full ${currentView === 'profile' ? '' : 'hidden'}`}>
              <ProfilePage />
            </div>
          )}
          {mountedKeepAliveViews.classes && (
            <div className={`bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full ${currentView === 'classes' ? '' : 'hidden'}`}>
              <ClassesPage
                initialTab={subpageClassesTab as 'overview' | 'schedule' | 'assignments'}
                onTabChange={(tab) => {
                  setSubpageClassesTab(tab);
                  sessionStorage.setItem(SUBPAGE_KEYS.classesTab, tab);
                }}
              />
            </div>
          )}
          {mountedKeepAliveViews.squads && (
            <div className={`bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full ${currentView === 'squads' ? '' : 'hidden'}`}>
              <SquadsPage onSquadClick={handleSquadDetailClick} />
            </div>
          )}
          {currentView === 'squad-detail' && (
            <div className="bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full">
              <SquadDetailPage 
                squadId={selectedSquad} 
                onBack={handleBackFromSquadDetail} 
                initialFeedPostId={subpageSquadPost || undefined}
                onFeedPostChange={(postId) => {
                  setSubpageSquadPost(postId ?? '');
                  if (postId) sessionStorage.setItem(SUBPAGE_KEYS.squadPost, postId);
                  else sessionStorage.removeItem(SUBPAGE_KEYS.squadPost);
                }}
                onOpenChat={(conversationId) => {
                  if (conversationId) {
                    setSubpageConversation(conversationId);
                    sessionStorage.setItem('selectedConversationId', conversationId);
                  }
                  sessionStorage.setItem('messagingReturnTo', 'squad-detail');
                  setCurrentView('messaging');
                }}
                userAvatarUrl={profile?.avatar_url?.trim() || null}
                publicName={profile?.public_name?.trim() || profile?.full_name?.trim() || user?.email?.split('@')[0] || 'You'}
              />
            </div>
          )}
          {mountedKeepAliveViews.calendar && (
            <div className={`bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl h-full ${currentView === 'calendar' ? '' : 'hidden'}`}>
              <CalendarPage
                initialMonth={subpageCalendarMonth || undefined}
                initialDate={subpageCalendarDate || undefined}
                onCalendarChange={(month, date) => {
                  setSubpageCalendarMonth(month ?? '');
                  setSubpageCalendarDate(date ?? '');
                  if (month) sessionStorage.setItem(SUBPAGE_KEYS.calendarMonth, month);
                  else sessionStorage.removeItem(SUBPAGE_KEYS.calendarMonth);
                  if (date) sessionStorage.setItem(SUBPAGE_KEYS.calendarDate, date);
                  else sessionStorage.removeItem(SUBPAGE_KEYS.calendarDate);
                }}
              />
            </div>
          )}
          {mountedKeepAliveViews.dashboard && (
            <div className={`bg-[#FBF9F5] md:rounded-tl-2xl md:rounded-tr-2xl flex-1 flex flex-col min-h-0 overflow-hidden ${currentView === 'dashboard' ? '' : 'hidden'}`}>
              <HomeFeed
                greeting={greeting}
                userName={profileLoading || !profile?.full_name ? '...' : profile.full_name.split(' ')[0]}
                userId={user?.id}
                publicName={profile?.public_name?.trim() || profile?.full_name?.trim() || user?.email?.split('@')[0] || 'You'}
                userAvatarUrl={profile?.avatar_url?.trim() || null}
                initialPostId={subpagePost || undefined}
                onPostChange={(postId) => {
                  setSubpagePost(postId ?? '');
                  if (postId) sessionStorage.setItem(SUBPAGE_KEYS.post, postId);
                  else sessionStorage.removeItem(SUBPAGE_KEYS.post);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div
        ref={bottomNavRef}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fbf8f7] border-t border-[#e7ded1] z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-in-out"
        style={{ 
          backgroundColor: '#fbf8f7',
          transform: (() => {
            const keyboardHiding = (isMessageInputFocused && currentView === 'messaging') || (isFeedInputFocused && (currentView === 'dashboard' || currentView === 'squad-detail'));
            const subPageHiding = currentView === 'squad-detail' || currentView === 'course' || (currentView === 'messaging' && !!subpageConversation) || (currentView === 'dashboard' && !!subpagePost);
            return keyboardHiding || subPageHiding ? 'translateY(100%)' : 'translateY(0)';
          })(),
          willChange: 'transform'
        }}
      >
        <div className="flex items-center justify-around px-1 py-2">
          <button
            onClick={handleCalendarClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'calendar' || currentView === 'classes' ? 'text-[#d47455]' : 'text-[#787771]'
            }`}
          >
            <CalendarIcon className="w-6 h-6" />
            <span className="text-[10px]" style={{ fontWeight: 500 }}>Schedule</span>
          </button>

          <button
            onClick={handleSquadsClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'squads' || currentView === 'squad-detail' ? 'text-[#d47455]' : 'text-[#787771]'
            }`}
          >
            <Users className="w-6 h-6" />
            <span className="text-[10px]" style={{ fontWeight: 500 }}>Squads</span>
          </button>

          <button
            onClick={handleHomeClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'dashboard' ? 'text-[#d47455]' : 'text-[#787771]'
            }`}
          >
            <HouseIcon className="w-6 h-6" />
            <span className="text-[10px]" style={{ fontWeight: 500 }}>Home</span>
          </button>

          <button
            onClick={handleMessagingClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'messaging' ? 'text-[#d47455]' : 'text-[#787771]'
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-[10px]" style={{ fontWeight: 500 }}>Messages</span>
          </button>

          <button
            onClick={handleProfileClick}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'profile' ? 'text-[#d47455]' : 'text-[#787771]'
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
                fontWeight: 600
              }}
            >
              {getInitials(profile?.full_name || null, user?.email || null)}
            </div>
            <span className="text-[10px]" style={{ fontWeight: 500 }}>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}