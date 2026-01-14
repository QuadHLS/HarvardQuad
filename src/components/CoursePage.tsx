import { ArrowUp, MessageSquare, Bookmark, Pin, FileText, Calendar, Plus, ChevronLeft, ChevronDown, ChevronUp, MoreVertical, X } from 'lucide-react';
import { useState } from 'react';

interface CoursePageProps {
  courseId: string;
  onBack: () => void;
  previousView: 'dashboard' | 'messaging' | 'course';
}

export function CoursePage({ courseId, onBack, previousView }: CoursePageProps) {
  // Sample data - would come from a backend in production
  const courseData = {
    'contracts-101': {
      name: 'Contracts 101',
      professor: 'Prof. Kingsfield',
      schedule: 'Mon/Wed 8:15 AM - 10:00 AM',
      location: 'WCC 1015',
      description: 'Fundamental principles of contract law, including formation, interpretation, and enforcement of contractual obligations.',
      semester: 'Fall 2025'
    },
    'property-law': {
      name: 'Property Law',
      professor: 'Prof. Anderson',
      schedule: 'Tue/Thu 1:00 PM - 3:00 PM',
      location: 'WCC 1010',
      description: 'Survey of property law covering ownership rights, estates, and real property transactions.',
      semester: 'Fall 2025'
    },
    'legal-writing': {
      name: 'Legal Writing',
      professor: 'Prof. Martinez',
      schedule: 'Mon/Wed 5:00 PM - 7:30 PM',
      location: 'Pound 102',
      description: 'Development of legal analysis and writing skills through various assignments including memos and briefs.',
      semester: 'Fall 2025'
    }
  };

  const course = courseData[courseId as keyof typeof courseData] || courseData['contracts-101'];

  // Sample feed posts
  const posts = [
    {
      id: 1,
      author: 'Sarah Chen',
      avatar: 'SC',
      avatarColor: '#6ec9c4',
      time: '2h ago',
      upvotes: 24,
      title: 'Question about Hawkins v. McGee damages',
      content: 'Can someone clarify whether we should focus on expectation or reliance damages for this case? The reading seems to suggest both but I\'m not sure which is primary.',
      comments: 12,
      isPinned: false
    },
    {
      id: 2,
      author: 'Alex Rivera',
      avatar: 'AR',
      avatarColor: '#e87461',
      time: '5h ago',
      upvotes: 18,
      title: 'Study group forming for midterm',
      content: 'Looking to start a study group for the upcoming midterm. Planning to meet Tuesdays and Thursdays at 7pm in the library. DM me if interested!',
      comments: 8,
      isPinned: false
    },
    {
      id: 3,
      author: 'Prof. Kingsfield',
      avatar: 'PK',
      avatarColor: '#4a5568',
      time: '1d ago',
      upvotes: 45,
      title: 'Updated syllabus and reading for next week',
      content: 'I\'ve uploaded the revised syllabus with adjusted deadlines. Please review before our next class. Also note the additional reading from Farnsworth Chapter 4.',
      comments: 3,
      isPinned: true
    },
    {
      id: 4,
      author: 'Jamie Davis',
      avatar: 'JD',
      avatarColor: '#ffc857',
      time: '2d ago',
      upvotes: 31,
      title: 'Outline collaboration thread',
      content: 'Starting a collaborative outline for the course. If you want to contribute or have access, comment below with your email.',
      comments: 15,
      isPinned: false
    }
  ];

  // Sample pinned documents
  const documents = [
    {
      id: 1,
      title: 'Course Syllabus (Updated)',
      date: 'Dec 8, 2025',
      type: 'PDF',
      icon: FileText
    },
    {
      id: 2,
      title: 'Midterm Study Guide',
      date: 'Dec 5, 2025',
      type: 'PDF',
      icon: FileText
    },
    {
      id: 3,
      title: 'Case Brief Template',
      date: 'Nov 28, 2025',
      type: 'DOCX',
      icon: FileText
    },
    {
      id: 4,
      title: 'Office Hours Schedule',
      date: 'Nov 20, 2025',
      type: 'PDF',
      icon: Calendar
    },
    {
      id: 5,
      title: 'Exam Format & Expectations',
      date: 'Nov 15, 2025',
      type: 'PDF',
      icon: FileText
    }
  ];

  const [showDocuments, setShowDocuments] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);

  // Sample enrolled students
  const students = [
    { id: 1, name: 'Sarah Chen', avatar: 'SC', avatarColor: '#6ec9c4' },
    { id: 2, name: 'Alex Rivera', avatar: 'AR', avatarColor: '#e87461' },
    { id: 3, name: 'Jamie Davis', avatar: 'JD', avatarColor: '#ffc857' },
    { id: 4, name: 'Marcus Johnson', avatar: 'MJ', avatarColor: '#9b87f5' },
    { id: 5, name: 'Emily Wang', avatar: 'EW', avatarColor: '#f97583' },
    { id: 6, name: 'David Kim', avatar: 'DK', avatarColor: '#85e89d' },
    { id: 7, name: 'Lisa Anderson', avatar: 'LA', avatarColor: '#ffa8a8' },
    { id: 8, name: 'Ryan O\'Brien', avatar: 'RO', avatarColor: '#74c0fc' },
    { id: 9, name: 'Nina Patel', avatar: 'NP', avatarColor: '#ffd43b' },
    { id: 10, name: 'Chris Martinez', avatar: 'CM', avatarColor: '#a9e34b' }
  ];

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[#FBF9F5]" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Mobile View */}
      <div className="md:hidden h-full flex flex-col">
        {/* Mobile Header */}
        <div className="bg-[#F1EFE7] px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center -ml-2"
            >
              <ChevronLeft className="w-6 h-6 text-[#3d3d3a]" />
            </button>
            <h1 
              className="text-2xl flex-1"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
            >
              {course.name}
            </h1>
            <button
              onClick={() => setShowInfoMenu(true)}
              className="w-8 h-8 flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5 text-[#3d3d3a]" />
            </button>
          </div>
        </div>

        {/* Info Menu Overlay */}
        {showInfoMenu && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowInfoMenu(false)}
          />
        )}

        {/* Info Menu Slide-out Panel */}
        <div 
          className={`fixed top-0 right-0 h-full w-80 bg-white z-50 transition-transform duration-300 shadow-xl ${
            showInfoMenu ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full overflow-y-auto">
            {/* Menu Header */}
            <div className="bg-[#F1EFE7] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
              <h2 
                className="text-lg"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Course Info
              </h2>
              <button
                onClick={() => setShowInfoMenu(false)}
                className="w-8 h-8 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#3d3d3a]" />
              </button>
            </div>

            {/* Course Information Section */}
            <div className="px-4 py-4 border-b border-[#e7ded1]">
              <h3 
                className="text-base mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                About this Course
              </h3>
              <p 
                className="text-sm mb-4"
                style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', lineHeight: 1.5 }}
              >
                {course.description}
              </p>
              <div className="space-y-2.5 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Professor:</span>
                  <span className="text-[#3d3d3a]">{course.professor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Schedule:</span>
                  <span className="text-[#3d3d3a] text-right">{course.schedule}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Location:</span>
                  <span className="text-[#3d3d3a]">{course.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7b7b74]">Semester:</span>
                  <span className="text-[#3d3d3a]">{course.semester}</span>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="px-4 py-4 border-b border-[#e7ded1]">
              <h3 
                className="text-base mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Course Documents ({documents.length})
              </h3>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div 
                    key={doc.id}
                    className="bg-[#FBF9F5] rounded-xl p-3 active:bg-[#f5f3eb] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f0eee6] rounded-lg flex items-center justify-center flex-shrink-0">
                        <doc.icon size={18} className="text-[#7b7b74]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="text-sm mb-0.5 truncate"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                        >
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                            {doc.type}
                          </span>
                          <span className="text-xs text-[#7b7b74]">•</span>
                          <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                            {doc.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Students Section */}
            <div className="px-4 py-4">
              <h3 
                className="text-base mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Students ({students.length})
              </h3>
              <div className="space-y-2">
                {students.map(student => (
                  <div 
                    key={student.id}
                    className="bg-[#FBF9F5] rounded-xl p-3 active:bg-[#f5f3eb] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                        style={{ backgroundColor: student.avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                      >
                        {student.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div 
                          className="text-sm truncate"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                        >
                          {student.name}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Feed */}
        <div className="flex-1 overflow-y-auto bg-[#FBF9F5]">
          <div className="p-4 space-y-3">
            {posts.map(post => (
              <div 
                key={post.id} 
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Post Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ backgroundColor: post.avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                      >
                        {post.avatar}
                      </div>
                      <div>
                        <span 
                          className="text-sm block"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}
                        >
                          {post.author}
                        </span>
                        <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                          {post.time}
                        </span>
                      </div>
                    </div>
                    {post.isPinned && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: '#fff3e0' }}>
                        <Pin size={12} className="text-[#d97757]" />
                        <span className="text-xs" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#d97757' }}>
                          Pinned
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <h3 
                    className="text-base mb-2"
                    style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a', lineHeight: 1.3 }}
                  >
                    {post.title}
                  </h3>
                  
                  <p 
                    className="text-sm mb-3"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#3d3d3a', lineHeight: 1.5 }}
                  >
                    {post.content}
                  </p>
                </div>

                {/* Post Actions */}
                <div className="border-t border-[#f5f3eb] px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5 py-1 active:scale-95 transition-transform">
                      <ArrowUp size={18} className="text-[#7b7b74]" />
                      <span className="text-sm" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#3d3d3a' }}>
                        {post.upvotes}
                      </span>
                    </button>
                    <button className="flex items-center gap-1.5 py-1 active:scale-95 transition-transform">
                      <MessageSquare size={18} className="text-[#7b7b74]" />
                      <span className="text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}>
                        {post.comments}
                      </span>
                    </button>
                  </div>
                  <button className="p-1 active:scale-95 transition-transform">
                    <Bookmark size={18} className="text-[#7b7b74]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating New Post Button */}
        <button 
          className="fixed bottom-4 right-4 w-14 h-14 bg-[#d47455] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10"
        >
          <Plus size={24} className="text-white" />
        </button>
      </div>

      {/* Desktop View - Keep existing design */}
      <div className="hidden md:block h-full overflow-hidden flex flex-col"  style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Course Header */}
        <div className="bg-[#fefefc] border-b border-[#e7ded1] px-8 py-6">
          <button 
            onClick={onBack}
            className="text-[13px] text-[#8c867d] hover:text-[#3d3d3a] mb-4 bg-transparent border-0 cursor-pointer"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            ← Back to {previousView === 'dashboard' ? 'Home' : previousView === 'messaging' ? 'Messages' : 'Course'}
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 
                className="text-[32px] text-[#3d3d3a] mb-2"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, lineHeight: 1.2 }}
              >
                {course.name}
              </h1>
              <p 
                className="text-[16px] text-[#7b7b74] mb-3"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {course.professor} • {course.schedule}
              </p>
              <p 
                className="text-[14px] text-[#7b7b74] max-w-2xl"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {course.description}
              </p>
            </div>
            <div className="text-right">
              <div 
                className="text-[14px] text-[#7b7b74] mb-1"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {course.location}
              </div>
              <div 
                className="text-[13px] text-[#8c867d]"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {course.semester}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex bg-[#fefefc]">
          {/* Left Column - Feed */}
          <div className="flex-1 overflow-y-auto px-8 py-6 relative">
            <div className="max-w-3xl">
              {/* Feed Posts */}
              <div className="space-y-4 pt-6">
                {posts.map(post => (
                  <div 
                    key={post.id} 
                    className="bg-[#fefefc] border border-[#e7ded1] rounded-lg overflow-hidden hover:border-[#d9d2c5] transition-colors"
                  >
                    <div className="flex">
                      {/* Vote Section */}
                      <div className="w-12 bg-[#f8f6f0] flex flex-col items-center py-3 px-2">
                        <button className="text-[#8c867d] hover:text-[#d97757] bg-transparent border-0 cursor-pointer p-1">
                          <ArrowUp size={18} />
                        </button>
                        <span 
                          className="text-[13px] text-[#3d3d3a] my-1"
                          style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                        >
                          {post.upvotes}
                        </span>
                        <button className="text-[#8c867d] hover:text-[#d97757] bg-transparent border-0 cursor-pointer p-1 rotate-180">
                          <ArrowUp size={18} />
                        </button>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px]"
                              style={{ backgroundColor: post.avatarColor, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {post.avatar}
                            </div>
                            <span 
                              className="text-[13px] text-[#3d3d3a]"
                              style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                            >
                              {post.author}
                            </span>
                            <span className="text-[12px] text-[#8c867d]" style={{ fontFamily: 'Arial, sans-serif' }}>
                              • {post.time}
                            </span>
                          </div>
                          {post.isPinned && (
                            <div className="flex items-center gap-1 text-[#d97757]">
                              <Pin size={14} />
                              <span className="text-[11px]" style={{ fontFamily: 'Arial, sans-serif' }}>Pinned</span>
                            </div>
                          )}
                        </div>
                        
                        <h3 
                          className="text-[16px] text-[#3d3d3a] mb-2"
                          style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
                        >
                          {post.title}
                        </h3>
                        
                        <p 
                          className="text-[14px] text-[#3d3d3a] mb-3 leading-relaxed"
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          {post.content}
                        </p>

                        <div className="flex items-center gap-4">
                          <button className="flex items-center gap-1 text-[#8c867d] hover:text-[#3d3d3a] bg-transparent border-0 cursor-pointer">
                            <MessageSquare size={16} />
                            <span className="text-[12px]" style={{ fontFamily: 'Arial, sans-serif' }}>
                              {post.comments} {post.comments === 1 ? 'comment' : 'comments'}
                            </span>
                          </button>
                          <button className="flex items-center gap-1 text-[#8c867d] hover:text-[#3d3d3a] bg-transparent border-0 cursor-pointer">
                            <Bookmark size={16} />
                            <span className="text-[12px]" style={{ fontFamily: 'Arial, sans-serif' }}>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating New Post Button */}
            <button 
              className="fixed bottom-8 right-[calc(320px+2rem)] w-14 h-14 bg-[#DD8161] rounded-full flex items-center justify-center shadow-lg hover:bg-[#c7754f] transition-colors border-0 cursor-pointer z-10"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <Plus size={24} className="text-white" />
            </button>
          </div>

          {/* Right Column - Pinned Documents */}
          <div className="w-80 bg-[#fefefc] border-l border-[#e7ded1] overflow-y-auto px-6 py-6">
            <h2 
              className="text-[18px] text-[#3d3d3a] mb-4"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
            >
              Pinned Documents
            </h2>

            <div className="space-y-2">
              {documents.map(doc => (
                <div 
                  key={doc.id}
                  className="bg-white border border-[#e7ded1] rounded-lg p-3 hover:border-[#d9d2c5] hover:bg-[#fbf9f5] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#f0eee6] rounded flex items-center justify-center flex-shrink-0">
                      <doc.icon size={16} className="text-[#7b7b74]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-[13px] text-[#3d3d3a] mb-1 truncate"
                        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600 }}
                      >
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#8c867d]" style={{ fontFamily: 'Arial, sans-serif' }}>
                          {doc.type}
                        </span>
                        <span className="text-[11px] text-[#8c867d]">•</span>
                        <span className="text-[11px] text-[#8c867d]" style={{ fontFamily: 'Arial, sans-serif' }}>
                          {doc.date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Resources Section */}
            <div className="mt-8">
              <h3 
                className="text-[16px] text-[#3d3d3a] mb-3"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
              >
                Quick Links
              </h3>
              <div className="space-y-2">
                <a 
                  href="#" 
                  className="block text-[13px] text-[#8c867d] hover:text-[#3d3d3a] no-underline"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  → Course Website
                </a>
                <a 
                  href="#" 
                  className="block text-[13px] text-[#8c867d] hover:text-[#3d3d3a] no-underline"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  → Reading List
                </a>
                <a 
                  href="#" 
                  className="block text-[13px] text-[#8c867d] hover:text-[#3d3d3a] no-underline"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  → Assignment Portal
                </a>
                <a 
                  href="#" 
                  className="block text-[13px] text-[#8c867d] hover:text-[#3d3d3a] no-underline"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  → Submit Work
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}