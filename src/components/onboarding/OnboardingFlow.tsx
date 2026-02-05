import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, ChevronDown, Search, Dices } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface OnboardingData {
  fullName: string;
  publicName: string;
  classYear: string;
  phone: string;
  location: string;
  courses: string[];
  squads: string[];
  interests: string[];
  avatarSeed: string;
  avatarStyle: string;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

// Steps shown in the flow
const TOTAL_STEPS = 3;

/** DiceBear 9.x style names (API kebab-case). One is chosen at random when rolling. */
const DICEBEAR_STYLES = [
  'adventurer',
  'avataaars',
  'croodles',
  'adventurer-neutral',
  'big-smile',
  'lorelei',
  'miniavs',
  'pixel-art',
  'pixel-art-neutral',
] as const;

function generateAvatarSeed(): string {
  return Math.random().toString(36).substring(2, 12);
}

function pickRandomAvatarStyle(): string {
  return DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
}

function buildDiceBearUrl(style: string, seed: string): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
}

export function OnboardingFlowStandalone({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    fullName: '',
    publicName: '',
    classYear: '',
    phone: '',
    location: '',
    courses: [],
    squads: [],
    interests: [],
    avatarSeed: generateAvatarSeed(),
    avatarStyle: pickRandomAvatarStyle(),
  });
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // When user reaches step 3, ensure a random avatar (style + seed) is showing
  useEffect(() => {
    if (currentStep === 3) {
      setFormData((prev) => ({
        ...prev,
        avatarSeed: generateAvatarSeed(),
        avatarStyle: pickRandomAvatarStyle(),
      }));
    }
  }, [currentStep]);

  const getGraduationYearFromClassYear = (classYear: string): number | null => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    // Academic year: Fall (Sept) = new year. Jan-Aug = still previous academic year (e.g. Jan 2026 = 2025-26).
    const academicYearStart = month >= 9 ? currentYear : currentYear - 1;
    const map: Record<string, number> = {
      Freshman: 4,
      Sophomore: 3,
      Junior: 2,
      Senior: 1,
      Graduate: 0,
    };
    const yearsUntil = map[classYear];
    return yearsUntil !== undefined ? academicYearStart + yearsUntil : null;
  };

  const handleNext = async () => {
    if (currentStep === 1 && user?.id) {
      setSaveError('');
      setSaving(true);
      const graduationYear = formData.classYear ? getGraduationYearFromClassYear(formData.classYear) : null;
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName.trim() || null,
          class_year: formData.classYear || null,
          graduation_year: graduationYear != null ? String(graduationYear) : null,
          phone: formData.phone.trim() || null,
          location: formData.location.trim() || null,
        })
        .eq('id', user.id);
      setSaving(false);
      if (error) {
        setSaveError(error.message || 'Failed to save. Please try again.');
        return;
      }
    }

    if (currentStep === 2 && user?.id && formData.courses.length > 0) {
      setSaveError('');
      setSaving(true);
      const { data: courseRows, error: fetchErr } = await supabase
        .from('courses')
        .select('id, course_number, course_title, meeting_days, meeting_time, instructor, course_id, term, credits, course_description, distribution')
        .in('id', formData.courses);
      if (fetchErr) {
        setSaving(false);
        setSaveError(fetchErr.message || 'Failed to load selected courses.');
        return;
      }
      // Save all course columns except created_at to profiles.classes (uuid, title, days, time, number, instructor, course_id, etc.)
      const classes = (courseRows ?? []).map((r) => ({
        id: r.id,
        course_number: r.course_number ?? null,
        course_title: r.course_title ?? null,
        meeting_days: r.meeting_days ?? null,
        meeting_time: r.meeting_time ?? null,
        instructor: r.instructor ?? null,
        course_id: r.course_id ?? null,
        term: r.term ?? null,
        credits: r.credits != null ? Number(r.credits) : null,
        course_description: r.course_description ?? null,
        distribution: r.distribution ?? null,
      }));
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ classes })
        .eq('id', user.id);
      setSaving(false);
      if (updateErr) {
        setSaveError(updateErr.message || 'Failed to save courses.');
        return;
      }
    }

    if (currentStep === 3 && user?.id) {
      setSaveError('');
      setSaving(true);
      const avatarUrl = buildDiceBearUrl(formData.avatarStyle, formData.avatarSeed);
      const { error } = await supabase
        .from('profiles')
        .update({
          public_name: formData.publicName.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);
      setSaving(false);
      if (error) {
        setSaveError(error.message || 'Failed to save. Please try again.');
        return;
      }
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.fullName && formData.classYear;
    }
    if (currentStep === 2) {
      return formData.courses.length > 0;
    }
    if (currentStep === 3) {
      // Require public name and avatar seed
      return !!formData.avatarSeed && !!formData.publicName;
    }
    return false;
  };

  const progressBar = (
    <div className="px-0 py-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                step <= currentStep ? 'bg-[#d47455]' : 'bg-[#e8e4db]'
              }`}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-[#787771] mt-2" >
        Step {currentStep} of {TOTAL_STEPS}
      </p>
    </div>
  );

  return (
    <div
      className="landing-bg flex flex-col overflow-hidden"
      style={{
        minHeight: 'var(--app-height, 100vh)',
        height: 'var(--app-height, 100vh)',
        maxHeight: 'var(--app-height, 100vh)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {saveError && (
        <p className="px-6 text-sm text-red-600" >
          {saveError}
        </p>
      )}

      {/* Content - step 2: only list scrolls; steps 1, 3: whole content scrolls */}
      <div
        className={`flex-1 px-6 py-4 min-h-0 ${
          currentStep === 2 ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {currentStep === 1 && (
          <Step1
            formData={formData}
            setFormData={setFormData}
            progressBar={progressBar}
          />
        )}
        {currentStep === 2 && (
          <Step2
            formData={formData}
            setFormData={setFormData}
            progressBar={progressBar}
          />
        )}
        {currentStep === 3 && (
          <Step3Avatar
            formData={formData}
            setFormData={setFormData}
            progressBar={progressBar}
          />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="px-6 py-4 flex-shrink-0">
        <div className="flex gap-3 max-w-sm mx-auto w-full">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#e8e4db] bg-white text-[#27251f] hover:bg-[#faf9f7] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white transition-colors ${
              canProceed() && !saving
                ? 'bg-[#d47455] hover:bg-[#c26645]' 
                : 'bg-[#e8e4db] cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : currentStep === TOTAL_STEPS ? 'Get Started' : 'Continue'}
            {currentStep < TOTAL_STEPS && !saving && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Capitalize first letter of each word while typing (length-preserving so cursor doesn't jump)
function capitalizeWordsAsYouType(value: string): string {
  if (!value) return value;
  return value.replace(/(^|\s)([a-z])/g, (_, before, letter) => before + letter.toUpperCase());
}

// Capitalize and normalize on blur (trim, title-case each word)
function capitalizeWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Step 1: Personal Information
function Step1({ formData, setFormData, progressBar }: {
  formData: OnboardingData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  progressBar: React.ReactNode;
}) {
  const classYearOptions: { value: string; label: string; hint?: string }[] = [
    { value: 'Freshman', label: 'Freshman' },
    { value: 'Sophomore', label: 'Sophomore' },
    { value: 'Junior', label: 'Junior' },
    { value: 'Senior', label: 'Senior' },
    { value: 'Graduate', label: 'Graduate student', hint: 'Master\'s, PhD, or other grad program' },
  ];
  const [classYearOpen, setClassYearOpen] = useState(false);
  const classYearRef = useRef<HTMLDivElement>(null);
  const selectedOption = classYearOptions.find((o) => o.value === formData.classYear);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (classYearRef.current && !classYearRef.current.contains(e.target as Node)) {
        setClassYearOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-sm mx-auto w-full space-y-8">
      {progressBar}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl text-[#27251f] mb-2" style={{ fontWeight: 600 }}>
          Let&apos;s get you set up
        </h2>
        <p className="text-sm text-[#787771] max-w-xs mx-auto">
          A few details so we can personalize your experience
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm mb-2 text-[#27251f]" style={{ fontWeight: 500 }}>
            Full name
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: capitalizeWordsAsYouType(e.target.value) })}
            onBlur={(e) => {
              const capped = capitalizeWords(e.target.value);
              if (capped !== formData.fullName) setFormData({ ...formData, fullName: capped });
            }}
            placeholder="Enter your full name"
            autoCapitalize="words"
            className="w-full px-4 py-3 rounded-xl border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
          />
        </div>

        <div ref={classYearRef} className="relative">
          <label className="block text-sm mb-2 text-[#27251f]" style={{ fontWeight: 500 }}>
            Class year
          </label>
          <button
            type="button"
            onClick={() => setClassYearOpen((o) => !o)}
            className={`w-full px-4 py-3 rounded-xl border bg-white text-left flex items-center justify-between gap-2 transition-colors ${
              classYearOpen
                ? 'border-[#d47455] ring-2 ring-[#d47455] ring-opacity-30'
                : 'border-[#e8e4db] hover:border-[#d47455]/50'
            }`}
            aria-haspopup="listbox"
            aria-expanded={classYearOpen}
            aria-label="Class year"
          >
            <span className={formData.classYear ? 'text-[#27251f]' : 'text-[#787771]'}>
              {selectedOption ? selectedOption.label : 'Select class year'}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-[#787771] flex-shrink-0 transition-transform ${classYearOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {classYearOpen && (
            <ul
              className="absolute z-10 w-full mt-1 py-1 rounded-xl border border-[#e8e4db] bg-white shadow-lg max-h-52 overflow-y-auto"
              role="listbox"
            >
              {classYearOptions.map((opt) => (
                <li key={opt.value} role="option" aria-selected={formData.classYear === opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, classYear: opt.value });
                      setClassYearOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      formData.classYear === opt.value
                        ? 'bg-[#fef9f5] text-[#d47455] font-medium'
                        : 'text-[#27251f] hover:bg-[#faf9f7]'
                    }`}
                  >
                    <span className="block">{opt.label}</span>
                    {opt.hint && (
                      <span className="block text-xs text-[#787771] mt-0.5 font-normal">{opt.hint}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm mb-2 text-[#27251f]" style={{ fontWeight: 500 }}>
            Phone number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Add phone"
            className="w-full px-4 py-3 rounded-xl border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-[#27251f]" style={{ fontWeight: 500 }}>
            Location / Hometown
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Add location"
            className="w-full px-4 py-3 rounded-xl border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

// Step 2: Course Selection (courses from Supabase courses table)
function Step2({ formData, setFormData, progressBar }: { 
  formData: OnboardingData; 
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  progressBar: React.ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<{ id: string; course_title: string | null; instructor: string | null; meeting_days: string | null; meeting_time: string | null; term: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('courses')
        .select('id, course_title, instructor, meeting_days, meeting_time, term')
        .order('course_title');
      setLoading(false);
      if (err) {
        setError(err.message || 'Failed to load courses.');
        return;
      }
      setCourses(data ?? []);
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) =>
    (course.course_title ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const getSortKey = (title: string): string => {
    const t = (title ?? '').trim();
    const firstLetterIndex = t.search(/[a-zA-Z]/);
    if (firstLetterIndex === -1) return t.toLowerCase();
    return t.slice(firstLetterIndex).toLowerCase();
  };

  const sortedCourses = [...filteredCourses].sort((a, b) =>
    getSortKey(a.course_title ?? '').localeCompare(getSortKey(b.course_title ?? ''), undefined, { sensitivity: 'base' })
  );

  const toggleCourse = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.includes(courseId)
        ? prev.courses.filter(id => id !== courseId)
        : [...prev.courses, courseId]
    }));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-sm mx-auto w-full">
      {progressBar}

      <div className="text-center flex-shrink-0">
        <h2 className="text-2xl sm:text-3xl text-[#27251f] mb-2" style={{ fontWeight: 600 }}>
          Pick your classes
        </h2>
        <p className="text-sm text-[#787771] max-w-xs mx-auto">
          Select the courses you&apos;re in this semester — we&apos;ll use them for your calendar and feed
        </p>
      </div>

      <div className="relative flex-shrink-0 mt-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787771] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by course title..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
        />
      </div>

      {loading && (
        <div className="flex-shrink-0 mt-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d47455]"></div>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 flex-shrink-0 mt-4">{error}</p>
      )}
      {!loading && !error && (
        <div
          className="mt-4 space-y-2 rounded-xl border border-[#e8e4db] bg-white p-2 flex-1 min-h-0 overflow-y-auto"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {sortedCourses.length === 0 ? (
            <p className="text-sm text-[#787771] py-4 text-center">
              {searchQuery.trim() ? 'No courses match your search.' : 'No courses available.'}
            </p>
          ) : (
            sortedCourses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => toggleCourse(course.id)}
                className={`w-full px-4 py-4 rounded-xl border transition-all text-left ${
                  formData.courses.includes(course.id)
                    ? 'border-[#d47455] bg-[#fef9f5] shadow-sm'
                    : 'border-[#e8e4db] bg-white hover:border-[#d47455]/50 hover:bg-[#fef9f5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <div className="text-sm font-medium text-[#27251f]">
                      {((t: string) => t.length > 50 ? t.slice(0, 50) + '...' : t)(course.course_title ?? 'Untitled')}
                    </div>
                    <div className="text-xs text-[#787771]">
                      {((t: string) => t.length > 40 ? t.slice(0, 40) + '...' : t)(course.instructor ?? '—')}
                    </div>
                    {(course.meeting_days || course.meeting_time || course.term) && (
                      <div className="text-xs text-[#787771] mt-0.5">
                        {[course.meeting_days, course.meeting_time, course.term].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    formData.courses.includes(course.id)
                      ? 'border-[#d47455] bg-[#d47455]'
                      : 'border-[#e8e4db]'
                  }`}>
                    {formData.courses.includes(course.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Step 3: Avatar Selection
function Step3Avatar({ formData, setFormData, progressBar }: {
  formData: OnboardingData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  progressBar: React.ReactNode;
}) {
  const [isRolling, setIsRolling] = useState(false);

  const rollAvatar = () => {
    setIsRolling(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        avatarSeed: generateAvatarSeed(),
        avatarStyle: pickRandomAvatarStyle(),
      }));
      setIsRolling(false);
    }, 300);
  };

  const avatarUrl = buildDiceBearUrl(formData.avatarStyle, formData.avatarSeed);

  return (
    <div className="max-w-sm mx-auto w-full space-y-8">
      {progressBar}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl text-[#27251f] mb-2" style={{ fontWeight: 600 }}>
          Pick your avatar
        </h2>
        <p className="text-sm text-[#787771] max-w-xs mx-auto">
          Roll the dice to find the perfect look
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* Avatar frame */}
        <div 
          className={`relative w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-white border-4 border-[#e8e4db] shadow-lg overflow-hidden transition-transform duration-300 ${
            isRolling ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
          }`}
        >
          <img
            src={avatarUrl}
            alt="Your avatar"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Dice roll button */}
        <button
          onClick={rollAvatar}
          disabled={isRolling}
          className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all ${
            isRolling
              ? 'border-[#e8e4db] bg-[#f5f4f2] text-[#787771] cursor-not-allowed'
              : 'border-[#d47455] bg-white text-[#d47455] hover:bg-[#fef9f5] active:scale-95'
          }`}
        >
          <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
          <span className="font-medium">{isRolling ? 'Rolling...' : 'Roll again'}</span>
        </button>

        {/* Public name input */}
        <div className="w-full max-w-xs">
          <label className="block text-sm mb-2 text-[#27251f] text-center" style={{ fontWeight: 500 }}>
            Public name
          </label>
          <p className="text-xs text-[#787771] mb-2 text-center">Shown to other students</p>
          <input
            type="text"
            value={formData.publicName}
            onChange={(e) => setFormData({ ...formData, publicName: e.target.value })}
            placeholder="e.g. First name or nickname"
            className="w-full px-4 py-3 rounded-xl border border-[#e8e4db] bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent text-center"
          />
        </div>
      </div>
    </div>
  );
}

// Step for Squads and Interests (currently unused in flow)
function StepSquadsInterests({ formData, setFormData }: { 
  formData: OnboardingData; 
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const availableSquads = [
    { id: 'study-1l', name: '1L Study Group', members: 24, icon: '📚', category: 'Study Group' },
    { id: 'moot-court', name: 'Moot Court Society', members: 45, icon: '⚖️', category: 'Competition' },
    { id: 'law-review', name: 'Law Review', members: 32, icon: '📝', category: 'Publication' },
    { id: 'public-interest', name: 'Public Interest Law', members: 28, icon: '🏛️', category: 'Interest' },
    { id: 'entertainment', name: 'Entertainment Law', members: 19, icon: '🎬', category: 'Interest' },
    { id: 'tech-law', name: 'Tech & IP Law', members: 31, icon: '💻', category: 'Interest' },
  ];

  const availableInterests = [
    { id: 'litigation', name: 'Litigation', icon: '⚖️' },
    { id: 'corporate', name: 'Corporate Law', icon: '💼' },
    { id: 'public-interest', name: 'Public Interest', icon: '🏛️' },
    { id: 'ip', name: 'IP & Tech', icon: '💻' },
    { id: 'international', name: 'International Law', icon: '🌍' },
    { id: 'criminal', name: 'Criminal Law', icon: '🔒' },
    { id: 'environmental', name: 'Environmental', icon: '🌱' },
    { id: 'family', name: 'Family Law', icon: '👨‍👩‍👧' },
  ];

  const toggleSquad = (squadId: string) => {
    setFormData(prev => ({
      ...prev,
      squads: prev.squads.includes(squadId)
        ? prev.squads.filter(id => id !== squadId)
        : [...prev.squads, squadId]
    }));
  };

  const toggleInterest = (interestId: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl mb-2" >
          Join squads & set interests
        </h2>
        <p className="text-sm text-[#787771]" >
          Connect with communities and customize your feed
        </p>
      </div>

      {/* Squads Section */}
      <div>
        <h3 className="text-sm mb-3 text-[#27251f]" >
          Recommended Squads
        </h3>
        <div className="space-y-2">
          {availableSquads.map((squad) => (
            <button
              key={squad.id}
              onClick={() => toggleSquad(squad.id)}
              className={`w-full px-4 py-3 rounded-lg border transition-all ${
                formData.squads.includes(squad.id)
                  ? 'border-[#d47455] bg-white shadow-sm'
                  : 'border-[#e8e4db] bg-white hover:border-[#e8e4db]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl flex-shrink-0">{squad.icon}</div>
                <div className="flex-1 text-left">
                  <div className="text-sm" >
                    {squad.name}
                  </div>
                  <div className="text-xs text-[#787771]" >
                    {squad.members} members · {squad.category}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  formData.squads.includes(squad.id)
                    ? 'border-[#d47455] bg-[#d47455]'
                    : 'border-[#e8e4db]'
                }`}>
                  {formData.squads.includes(squad.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Interests Section */}
      <div>
        <h3 className="text-sm mb-3 text-[#27251f]" >
          Your Interests
        </h3>
        <div className="flex flex-wrap gap-2">
          {availableInterests.map((interest) => (
            <button
              key={interest.id}
              onClick={() => toggleInterest(interest.id)}
              className={`px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${
                formData.interests.includes(interest.id)
                  ? 'border-[#d47455] bg-[#d47455] text-white'
                  : 'border-[#e8e4db] bg-white text-[#27251f] hover:border-[#d47455]'
              }`}
            >
              <span>{interest.icon}</span>
              <span className="text-sm">{interest.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
