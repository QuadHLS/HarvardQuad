import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface OnboardingData {
  fullName: string;
  publicName: string;
  classYear: string;
  courses: string[];
  squads: string[];
  interests: string[];
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

// Steps shown in the flow (step 3 squads/interests UI exists but is excluded for now)
const TOTAL_STEPS = 2;

export function OnboardingFlowStandalone({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    fullName: '',
    publicName: '',
    classYear: '',
    courses: [],
    squads: [],
    interests: []
  });
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

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
          public_name: formData.publicName.trim() || null,
          class_year: formData.classYear || null,
          graduation_year: graduationYear != null ? String(graduationYear) : null,
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
      return formData.fullName && formData.publicName && formData.classYear;
    }
    if (currentStep === 2) {
      return formData.courses.length > 0;
    }
    // Step 3 (squads/interests) skipped for now
    return false;
  };

  return (
    <div className="h-screen bg-[#FBF9F5] flex flex-col">
      {/* Header */}
      <div className="bg-[#F1EFE7] px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl" style={{ fontFamily: 'Lora, serif' }}>Welcome</h1>
        <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
          Let's get you set up
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div 
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-[#d47455]' : 'bg-gray-200'
                }`}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'Arial, sans-serif' }}>
          Step {currentStep} of {TOTAL_STEPS}
        </p>
      </div>

      {saveError && (
        <p className="px-6 text-sm text-red-600" style={{ fontFamily: 'Arial, sans-serif' }}>
          {saveError}
        </p>
      )}

      {/* Content - step 2: only list scrolls; steps 1 & 3: whole content scrolls */}
      <div
        className={`flex-1 px-6 py-4 min-h-0 ${
          currentStep === 2 ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {currentStep === 1 && (
          <Step1
            formData={formData}
            setFormData={setFormData}
          />
        )}
        {currentStep === 2 && (
          <Step2
            formData={formData}
            setFormData={setFormData}
          />
        )}
        {/* Step 3 (squads/interests) excluded from flow for now - UI kept in Step3 below */}
      </div>

      {/* Navigation Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-[#FBF9F5]">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'Arial, sans-serif' }}
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
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            style={{ fontFamily: 'Arial, sans-serif' }}
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
function Step1({ formData, setFormData }: { 
  formData: OnboardingData; 
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
  const classYears = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl mb-2" style={{ fontFamily: 'Lora, serif' }}>
          Tell us about yourself
        </h2>
        <p className="text-sm text-gray-600" style={{ fontFamily: 'Arial, sans-serif' }}>
          We'll use this to personalize your experience
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-2 text-gray-700" style={{ fontFamily: 'Arial, sans-serif' }}>
            Full Name *
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
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
            style={{ fontFamily: 'Arial, sans-serif' }}
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-gray-700" style={{ fontFamily: 'Arial, sans-serif' }}>
            Public Name *
          </label>
          <input
            type="text"
            value={formData.publicName}
            onChange={(e) => setFormData({ ...formData, publicName: e.target.value })}
            placeholder="Name shown to others"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
            style={{ fontFamily: 'Arial, sans-serif' }}
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-gray-700" style={{ fontFamily: 'Arial, sans-serif' }}>
            Class Year *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {classYears.map((year) => (
              <button
                key={year}
                onClick={() => setFormData({ ...formData, classYear: year })}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  formData.classYear === year
                    ? 'border-[#d47455] bg-[#d47455] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#d47455]'
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Course Selection (courses from Supabase courses table)
function Step2({ formData, setFormData }: { 
  formData: OnboardingData; 
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>;
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0">
        <h2 className="text-xl mb-2" style={{ fontFamily: 'Lora, serif' }}>
          Choose the classes you're enrolled in this semester
        </h2>
        <p className="text-sm text-gray-600" style={{ fontFamily: 'Arial, sans-serif' }}>
          Tap to select each course
        </p>
      </div>

      <div className="relative flex-shrink-0 mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by course title..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#d47455] focus:border-transparent"
          style={{ fontFamily: 'Arial, sans-serif' }}
        />
      </div>

      {loading && (
        <div className="flex-shrink-0 mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d47455]"></div>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 flex-shrink-0 mt-4" style={{ fontFamily: 'Arial, sans-serif' }}>{error}</p>
      )}
      {!loading && !error && (
        <div className="flex-1 min-h-0 overflow-y-auto mt-4 space-y-2">
          {sortedCourses.length === 0 ? (
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
              {searchQuery.trim() ? 'No courses match your search.' : 'No courses available.'}
            </p>
          ) : (
            sortedCourses.map((course) => (
          <button
            key={course.id}
            onClick={() => toggleCourse(course.id)}
            className={`w-full px-4 py-4 rounded-lg border transition-all ${
              formData.courses.includes(course.id)
                ? 'border-[#d47455] bg-white shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 text-left flex flex-col gap-0.5 min-w-0">
                <div className="text-sm font-medium" style={{ fontFamily: 'Lora, serif' }}>
                  {((t: string) => t.length > 50 ? t.slice(0, 50) + '...' : t)(course.course_title ?? 'Untitled')}
                </div>
                <div className="text-xs text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {((t: string) => t.length > 40 ? t.slice(0, 40) + '...' : t)(course.instructor ?? '—')}
                </div>
                {(course.meeting_days || course.meeting_time || course.term) && (
                  <div className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {[course.meeting_days, course.meeting_time, course.term].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                formData.courses.includes(course.id)
                  ? 'border-[#d47455] bg-[#d47455]'
                  : 'border-gray-300'
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

// Step 3: Squads and Interests
function Step3({ formData, setFormData }: { 
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
        <h2 className="text-xl mb-2" style={{ fontFamily: 'Lora, serif' }}>
          Join squads & set interests
        </h2>
        <p className="text-sm text-gray-600" style={{ fontFamily: 'Arial, sans-serif' }}>
          Connect with communities and customize your feed
        </p>
      </div>

      {/* Squads Section */}
      <div>
        <h3 className="text-sm mb-3 text-gray-700" style={{ fontFamily: 'Arial, sans-serif' }}>
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
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl flex-shrink-0">{squad.icon}</div>
                <div className="flex-1 text-left">
                  <div className="text-sm" style={{ fontFamily: 'Lora, serif' }}>
                    {squad.name}
                  </div>
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {squad.members} members · {squad.category}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  formData.squads.includes(squad.id)
                    ? 'border-[#d47455] bg-[#d47455]'
                    : 'border-gray-300'
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
        <h3 className="text-sm mb-3 text-gray-700" style={{ fontFamily: 'Arial, sans-serif' }}>
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
                  : 'border-gray-300 bg-white text-gray-700 hover:border-[#d47455]'
              }`}
              style={{ fontFamily: 'Arial, sans-serif' }}
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
