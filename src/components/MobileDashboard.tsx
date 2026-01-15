import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

interface MobileDashboardProps {
  greeting: string;
  formattedDate: string;
  time: string;
  ampm: string;
  isPastFivePM: boolean;
  handleCourseClick: (courseId: string) => void;
  userName?: string;
}

export function MobileDashboard({
  greeting,
  formattedDate,
  time,
  ampm,
  isPastFivePM,
  handleCourseClick,
  userName = 'User'
}: MobileDashboardProps) {
  const [isDueSoonExpanded, setIsDueSoonExpanded] = useState(true);

  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto">
      {/* Elegant Header */}
      <div className="px-5 pt-8 pb-6">
        <h1 
          className="text-4xl"
          style={{ fontFamily: 'Lora, serif', fontWeight: 500, color: '#3d3d3a' }}
        >
          {greeting}, {userName}
        </h1>
      </div>

      {/* Today's Schedule */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="text-xl"
            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
          >
            {formattedDate}
          </h2>
          <span 
            className="text-xs px-2.5 py-1 rounded-full"
            style={{ 
              fontFamily: 'Arial, sans-serif',
              fontWeight: 600,
              backgroundColor: '#fef3ef',
              color: '#d47455'
            }}
          >
            3 classes
          </span>
        </div>
        <div className="space-y-2.5">
          <div 
            className="bg-white rounded-2xl p-4 active:scale-[0.98] transition-all shadow-sm border border-[#f5f3eb]"
            onClick={() => handleCourseClick('contracts-101')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-1 h-10 rounded-full"
                    style={{ backgroundColor: '#d47455' }}
                  />
                  <div>
                    <h3 
                      className="text-base"
                      style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                    >
                      Contracts
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                    >
                      8:15 - 10:00 AM
                    </p>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-gray-300 flex-shrink-0" size={20} />
            </div>
          </div>

          <div 
            className="bg-white rounded-2xl p-4 active:scale-[0.98] transition-all shadow-sm border border-[#f5f3eb]"
            onClick={() => handleCourseClick('property-law')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-1 h-10 rounded-full"
                    style={{ backgroundColor: '#8c9e8c' }}
                  />
                  <div>
                    <h3 
                      className="text-base"
                      style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                    >
                      Property
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                    >
                      1:00 - 3:00 PM
                    </p>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-gray-300 flex-shrink-0" size={20} />
            </div>
          </div>

          <div 
            className="bg-white rounded-2xl p-4 active:scale-[0.98] transition-all shadow-sm border border-[#f5f3eb]"
            onClick={() => handleCourseClick('legal-writing')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-1 h-10 rounded-full"
                    style={{ backgroundColor: '#7b9fb8' }}
                  />
                  <div>
                    <h3 
                      className="text-base"
                      style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                    >
                      Legal Writing
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                    >
                      5:00 - 7:30 PM
                    </p>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-gray-300 flex-shrink-0" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Due Soon - Collapsible */}
      <div className="px-5 mb-6">
        <button 
          onClick={() => setIsDueSoonExpanded(!isDueSoonExpanded)}
          className="w-full flex items-center justify-between mb-4"
        >
          <h2 
            className="text-xl"
            style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
          >
            Due Soon
          </h2>
          <div className="flex items-center gap-2">
            <span 
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ 
                fontFamily: 'Arial, sans-serif',
                fontWeight: 600,
                backgroundColor: '#fef3ef',
                color: '#d47455'
              }}
            >
              3 tasks
            </span>
            <ChevronDown 
              className="transition-transform"
              style={{ 
                color: '#7b7b74',
                transform: isDueSoonExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
              }}
              size={20}
            />
          </div>
        </button>
        
        {isDueSoonExpanded && (
          <div className="space-y-2.5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#f5f3eb]">
              <h3 
                className="text-base mb-1.5"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Case Brief: Hawkins v. McGee
              </h3>
              <p 
                className="text-sm mb-2.5"
                style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
              >
                Contracts
              </p>
              <div className="flex items-center justify-between">
                <span 
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 600,
                    backgroundColor: '#fef3ef',
                    color: '#d47455'
                  }}
                >
                  Due Tomorrow
                </span>
                <span 
                  className="text-xs"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#c7bcaa' }}
                >
                  9:00 AM
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#f5f3eb]">
              <h3 
                className="text-base mb-1.5"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Memo Draft 1
              </h3>
              <p 
                className="text-sm mb-2.5"
                style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
              >
                Legal Writing
              </p>
              <div className="flex items-center justify-between">
                <span 
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 600,
                    backgroundColor: '#f5f7f5',
                    color: '#7b7b74'
                  }}
                >
                  Due Friday
                </span>
                <span 
                  className="text-xs"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#c7bcaa' }}
                >
                  5:00 PM
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#f5f3eb]">
              <h3 
                className="text-base mb-1.5"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                Property Outline - Chapter 3
              </h3>
              <p 
                className="text-sm mb-2.5"
                style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
              >
                Property
              </p>
              <div className="flex items-center justify-between">
                <span 
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 600,
                    backgroundColor: '#f5f7f5',
                    color: '#7b7b74'
                  }}
                >
                  Due Sunday
                </span>
                <span 
                  className="text-xs"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#c7bcaa' }}
                >
                  11:59 PM
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}