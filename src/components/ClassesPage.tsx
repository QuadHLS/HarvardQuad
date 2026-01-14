import { useState } from 'react';
import { Upload, Calendar, Clock, MapPin, User, FileText, Plus, Edit2, Trash2, BookOpen, CheckCircle } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string;
  professor: string;
  schedule: string;
  location: string;
  credits: number;
  color: string;
}

interface Assignment {
  id: number;
  courseId: string;
  courseName: string;
  title: string;
  dueDate: string;
  type: string;
  completed: boolean;
}

export function ClassesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'assignments'>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const courses: Course[] = [
    {
      id: 'contracts-101',
      name: 'Contracts',
      code: 'LAW 501',
      professor: 'Prof. Anderson',
      schedule: 'Mon/Wed 8:15 AM - 10:00 AM',
      location: 'WCC 1015',
      credits: 4,
      color: '#d97757'
    },
    {
      id: 'property-law',
      name: 'Property Law',
      code: 'LAW 502',
      professor: 'Prof. Chen',
      schedule: 'Tue/Thu 1:00 PM - 3:00 PM',
      location: 'WCC 1010',
      credits: 4,
      color: '#8c9e8c'
    },
    {
      id: 'legal-writing',
      name: 'Legal Writing',
      code: 'LAW 503',
      professor: 'Prof. Martinez',
      schedule: 'Wed 5:00 PM - 7:30 PM',
      location: 'Pound 102',
      credits: 3,
      color: '#7b8fa3'
    },
    {
      id: 'torts',
      name: 'Torts',
      code: 'LAW 504',
      professor: 'Prof. Johnson',
      schedule: 'Mon/Wed 10:30 AM - 12:15 PM',
      location: 'WCC 2020',
      credits: 4,
      color: '#c4a57b'
    }
  ];

  const assignments: Assignment[] = [
    {
      id: 1,
      courseId: 'contracts-101',
      courseName: 'Contracts',
      title: 'Case Brief: Hawkins v. McGee',
      dueDate: 'Tomorrow, 9:00 AM',
      type: 'Case Brief',
      completed: false
    },
    {
      id: 2,
      courseId: 'legal-writing',
      courseName: 'Legal Writing',
      title: 'Memo Draft 1',
      dueDate: 'Friday, 5:00 PM',
      type: 'Memo',
      completed: false
    },
    {
      id: 3,
      courseId: 'property-law',
      courseName: 'Property Law',
      title: 'Reading: Chapters 5-7',
      dueDate: 'Thursday, 1:00 PM',
      type: 'Reading',
      completed: false
    },
    {
      id: 4,
      courseId: 'torts',
      courseName: 'Torts',
      title: 'Problem Set 3',
      dueDate: 'Next Monday, 10:30 AM',
      type: 'Problem Set',
      completed: true
    }
  ];

  const weekSchedule = [
    { day: 'Monday', date: 'Dec 16', classes: ['Contracts', 'Torts'] },
    { day: 'Tuesday', date: 'Dec 17', classes: ['Property Law'] },
    { day: 'Wednesday', date: 'Dec 18', classes: ['Contracts', 'Legal Writing'] },
    { day: 'Thursday', date: 'Dec 19', classes: ['Property Law'] },
    { day: 'Friday', date: 'Dec 20', classes: [] }
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }} className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#e8e4db]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] m-0 text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
              My Classes
            </h1>
            <p className="text-[14px] text-[#666] mt-1 mb-0" style={{ fontFamily: 'Arial, sans-serif' }}>
              Spring 2024 • {courses.reduce((sum, c) => sum + c.credits, 0)} Credits
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-white border border-[#e8e4db] text-[#1a1a1a] rounded-lg text-[14px] hover:bg-[#faf9f7] transition-colors flex items-center gap-2"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
            >
              <Upload className="w-4 h-4" />
              Upload Syllabus
            </button>
            <button 
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-[#d47455] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-colors flex items-center gap-2"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
            >
              <Edit2 className="w-4 h-4" />
              Edit Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 py-4 border-b border-[#e8e4db]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 text-[15px] border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-[#d47455] text-[#1a1a1a]'
                : 'border-transparent text-[#666] hover:text-[#1a1a1a]'
            }`}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: activeTab === 'overview' ? 600 : 400 }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 px-2 text-[15px] border-b-2 transition-all ${
              activeTab === 'schedule'
                ? 'border-[#d47455] text-[#1a1a1a]'
                : 'border-transparent text-[#666] hover:text-[#1a1a1a]'
            }`}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: activeTab === 'schedule' ? 600 : 400 }}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`pb-3 px-2 text-[15px] border-b-2 transition-all ${
              activeTab === 'assignments'
                ? 'border-[#d47455] text-[#1a1a1a]'
                : 'border-transparent text-[#666] hover:text-[#1a1a1a]'
            }`}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: activeTab === 'assignments' ? 600 : 400 }}
          >
            Assignments
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-[#e8e4db] rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-1 h-16 rounded-sm"
                      style={{ backgroundColor: course.color }}
                    ></div>
                    <div>
                      <h3 className="text-[18px] text-[#1a1a1a] mb-1 mt-0" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
                        {course.name}
                      </h3>
                      <p className="text-[13px] text-[#666] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {course.code}
                      </p>
                    </div>
                  </div>
                  <span className="text-[13px] text-[#666] bg-[#f5f5f5] px-3 py-1 rounded-full" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {course.credits} credits
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[13px] text-[#666]">
                    <User className="w-4 h-4" />
                    <span style={{ fontFamily: 'Arial, sans-serif' }}>{course.professor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#666]">
                    <Clock className="w-4 h-4" />
                    <span style={{ fontFamily: 'Arial, sans-serif' }}>{course.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#666]">
                    <MapPin className="w-4 h-4" />
                    <span style={{ fontFamily: 'Arial, sans-serif' }}>{course.location}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#e8e4db] flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-[#faf9f7] text-[#1a1a1a] rounded-lg text-[13px] hover:bg-[#f0ede3] transition-colors" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                    View Course
                  </button>
                  <button className="px-3 py-2 bg-[#faf9f7] text-[#1a1a1a] rounded-lg text-[13px] hover:bg-[#f0ede3] transition-colors" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Course Card */}
            <div className="bg-white border-2 border-dashed border-[#e8e4db] rounded-lg p-6 flex flex-col items-center justify-center min-h-[280px] hover:border-[#d47455] hover:bg-[#fef9f5] transition-all cursor-pointer">
              <Plus className="w-12 h-12 text-[#999] mb-3" />
              <p className="text-[14px] text-[#666] m-0" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                Add New Course
              </p>
              <p className="text-[12px] text-[#999] mt-1 m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                Manually add or upload syllabus
              </p>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-[20px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
                This Week
              </h2>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-[13px] text-[#666] hover:text-[#1a1a1a] hover:bg-[#faf9f7] rounded-lg transition-colors" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Week
                </button>
                <button className="px-3 py-1.5 text-[13px] text-[#666] hover:text-[#1a1a1a] hover:bg-[#faf9f7] rounded-lg transition-colors" style={{ fontFamily: 'Arial, sans-serif' }}>
                  Month
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {weekSchedule.map((day, index) => (
                <div key={index} className="bg-white border border-[#e8e4db] rounded-lg p-5">
                  <div className="flex items-start gap-6">
                    <div className="w-24 flex-shrink-0">
                      <div className="text-[15px] text-[#1a1a1a]" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
                        {day.day}
                      </div>
                      <div className="text-[13px] text-[#999]" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {day.date}
                      </div>
                    </div>
                    <div className="flex-1">
                      {day.classes.length > 0 ? (
                        <div className="space-y-2">
                          {day.classes.map((className, idx) => {
                            const course = courses.find(c => c.name === className);
                            return (
                              <div key={idx} className="flex items-center gap-3 p-3 bg-[#faf9f7] rounded-lg">
                                <div 
                                  className="w-1 h-10 rounded-sm"
                                  style={{ backgroundColor: course?.color || '#ccc' }}
                                ></div>
                                <div className="flex-1">
                                  <div className="text-[14px] text-[#1a1a1a]" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                                    {className}
                                  </div>
                                  <div className="text-[12px] text-[#666]" style={{ fontFamily: 'Arial, sans-serif' }}>
                                    {course?.schedule} • {course?.location}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[13px] text-[#999] italic" style={{ fontFamily: 'Arial, sans-serif' }}>
                          No classes scheduled
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-[20px] text-[#1a1a1a] m-0" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
                All Assignments
              </h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#d47455] text-white rounded-lg text-[13px] hover:bg-[#c06545] transition-colors" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                <Plus className="w-4 h-4" />
                New Assignment
              </button>
            </div>

            <div className="space-y-3">
              {assignments.map((assignment) => {
                const course = courses.find(c => c.id === assignment.courseId);
                return (
                  <div 
                    key={assignment.id}
                    className={`bg-white border border-[#e8e4db] rounded-lg p-5 hover:shadow-md transition-shadow ${
                      assignment.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-1 h-16 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: course?.color || '#ccc' }}
                      ></div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className={`text-[16px] text-[#1a1a1a] mb-1 mt-0 ${assignment.completed ? 'line-through' : ''}`} style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
                              {assignment.title}
                            </h3>
                            <div className="flex items-center gap-3 text-[13px] text-[#666]">
                              <span style={{ fontFamily: 'Arial, sans-serif' }}>{assignment.courseName}</span>
                              <span>•</span>
                              <span className="bg-[#f5f5f5] px-2 py-0.5 rounded" style={{ fontFamily: 'Arial, sans-serif' }}>
                                {assignment.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {assignment.completed && (
                              <CheckCircle className="w-5 h-5 text-[#4caf50]" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-[#999]">
                          <Calendar className="w-4 h-4" />
                          <span style={{ fontFamily: 'Arial, sans-serif' }}>Due: {assignment.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upload Syllabus Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-[24px] text-[#1a1a1a] mb-4 mt-0" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
              Upload Syllabus
            </h2>
            <p className="text-[14px] text-[#666] mb-6 mt-0" style={{ fontFamily: 'Arial, sans-serif' }}>
              Upload a PDF syllabus and we'll automatically extract course information and add it to your schedule.
            </p>

            <div className="border-2 border-dashed border-[#e8e4db] rounded-lg p-8 text-center mb-6 hover:border-[#d47455] hover:bg-[#fef9f5] transition-all cursor-pointer">
              <Upload className="w-12 h-12 text-[#999] mx-auto mb-3" />
              <p className="text-[14px] text-[#666] mb-1" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                Click to upload or drag and drop
              </p>
              <p className="text-[12px] text-[#999] m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
                PDF files only (max 10MB)
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 bg-[#faf9f7] text-[#1a1a1a] rounded-lg text-[14px] hover:bg-[#f0ede3] transition-colors"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-[#d47455] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-colors"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-[24px] text-[#1a1a1a] mb-4 mt-0" style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}>
              Edit Course Schedule
            </h2>
            <p className="text-[14px] text-[#666] mb-6 mt-0" style={{ fontFamily: 'Arial, sans-serif' }}>
              Add, remove, or modify your enrolled courses.
            </p>

            <div className="space-y-3 mb-6">
              {courses.map((course) => (
                <div key={course.id} className="bg-[#faf9f7] border border-[#e8e4db] rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-1 h-12 rounded-sm"
                      style={{ backgroundColor: course.color }}
                    ></div>
                    <div>
                      <div className="text-[14px] text-[#1a1a1a]" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                        {course.name}
                      </div>
                      <div className="text-[12px] text-[#666]" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {course.code} • {course.credits} credits
                      </div>
                    </div>
                  </div>
                  <button className="p-2 text-[#dd3a3a] hover:bg-white rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-[#faf9f7] text-[#1a1a1a] rounded-lg text-[14px] hover:bg-[#f0ede3] transition-colors"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-[#d47455] text-white rounded-lg text-[14px] hover:bg-[#c06545] transition-colors"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
