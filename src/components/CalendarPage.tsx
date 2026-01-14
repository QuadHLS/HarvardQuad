import { ChevronLeft, ChevronRight, Clock, MapPin, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMonthExpanded, setIsMonthExpanded] = useState(true);
  const today = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Generate all days in the current month
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i);
    monthDays.push({
      day: i,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date
    });
  }

  // Generate calendar grid with empty cells for previous month days
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ day: null, date: null });
  }
  
  // Add all days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i);
    calendarDays.push({
      day: i,
      date: date
    });
  }

  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };

  const isSelectedDay = (day: number) => {
    return day === selectedDate.getDate() && 
           currentMonth === selectedDate.getMonth() && 
           currentYear === selectedDate.getFullYear();
  };

  // Get current week days (Sunday to Saturday)
  const getCurrentWeekDays = () => {
    const curr = new Date(selectedDate);
    const first = curr.getDate() - curr.getDay(); // First day is Sunday
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(curr.setDate(first + i));
      week.push({
        day: date.getDate(),
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: new Date(date),
        month: date.getMonth()
      });
    }
    return week;
  };

  const weekDays = getCurrentWeekDays();

  // Events/Classes for the selected day (mock data)
  const getEventsForDay = (date: Date) => {
    // For demo purposes, showing events for today
    const dayOfWeek = date.getDay();
    
    // Monday and Wednesday - Contracts and Legal Writing
    if (dayOfWeek === 1 || dayOfWeek === 3) {
      return [
        { 
          id: 1, 
          name: 'Contracts', 
          time: '8:15 - 10:00 AM',
          startHour: 8.25,
          duration: 1.75,
          location: 'WCC 1015', 
          color: '#d47455' 
        },
        { 
          id: 3, 
          name: 'Legal Writing', 
          time: '5:00 - 7:30 PM',
          startHour: 17,
          duration: 2.5,
          location: 'Pound 102', 
          color: '#7b9fb8' 
        }
      ];
    }
    
    // Tuesday and Thursday - Property
    if (dayOfWeek === 2 || dayOfWeek === 4) {
      return [
        { 
          id: 2, 
          name: 'Property', 
          time: '1:00 - 3:00 PM',
          startHour: 13,
          duration: 2,
          location: 'WCC 1010', 
          color: '#8c9e8c' 
        }
      ];
    }
    
    return [];
  };

  const todaysEvents = getEventsForDay(selectedDate);

  // Generate hours (6 AM to 10 PM for better visibility)
  const hours = [];
  for (let i = 6; i <= 22; i++) {
    hours.push({
      hour: i,
      label: i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : i === 0 ? '12 AM' : `${i} AM`
    });
  }

  return (
    <div className="h-full bg-[#FBF9F5]">
      {/* Mobile View */}
      <div className="md:hidden h-full flex flex-col">
        {/* Header with Month Navigation */}
        <div className="px-4 pt-6 pb-3 border-b border-[#f5f3eb] bg-[#FBF9F5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 
                className="text-2xl"
                style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
              >
                {monthNames[currentMonth]}
              </h1>
              <button
                onClick={() => setIsMonthExpanded(!isMonthExpanded)}
                className="w-6 h-6 flex items-center justify-center transition-transform"
                style={{ transform: isMonthExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <ChevronDown className="w-4 h-4" style={{ color: '#7b7b74' }} />
              </button>
            </div>

            {isMonthExpanded && (
              <div className="flex gap-1">
                <button 
                  onClick={previousMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" style={{ color: '#7b7b74' }} />
                </button>
                <button 
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white active:scale-95 transition-all"
                >
                  <ChevronRight className="w-4 h-4" style={{ color: '#7b7b74' }} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar View - Collapsible */}
        {isMonthExpanded ? (
          /* Full Month Grid */
          <div className="py-1 border-b border-[#f5f3eb] bg-[#FBF9F5]">
            <div className="px-4">
              {/* Day Labels */}
              <div className="grid grid-cols-7">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center py-0.5">
                    <span 
                      className="text-[9px]"
                      style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#7b7b74' }}
                    >
                      {day}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calendar Grid - Circles for today and selected */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {calendarDays.map((dayObj, index) => (
                  <div key={index} className="flex items-center justify-center" style={{ height: '28px' }}>
                    {dayObj.day ? (
                      <button
                        onClick={() => setSelectedDate(dayObj.date)}
                        className="w-6 h-6 flex items-center justify-center transition-all active:scale-95 rounded-full relative"
                      >
                        {/* Circle for today (outline) */}
                        {isToday(dayObj.day) && !isSelectedDay(dayObj.day) && (
                          <div 
                            className="absolute inset-0 rounded-full border-2"
                            style={{ borderColor: '#d47455' }}
                          />
                        )}
                        
                        {/* Circle for selected (filled) */}
                        {isSelectedDay(dayObj.day) && (
                          <div 
                            className="absolute inset-0 rounded-full"
                            style={{ backgroundColor: '#d47455' }}
                          />
                        )}
                        
                        <span 
                          className="text-xs relative z-10"
                          style={{ 
                            fontFamily: 'Arial, sans-serif',
                            fontWeight: isSelectedDay(dayObj.day) || isToday(dayObj.day) ? 600 : 400,
                            color: isSelectedDay(dayObj.day) 
                              ? '#fff' 
                              : isToday(dayObj.day)
                              ? '#d47455'
                              : '#3d3d3a'
                          }}
                        >
                          {dayObj.day}
                        </span>
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Week Ribbon */
          <div className="py-1.5 border-b border-[#f5f3eb] bg-[#FBF9F5]">
            <div className="flex gap-0.5 px-4">
              {weekDays.map((dayObj, index) => {
                const isSelectedWeekDay = 
                  dayObj.day === selectedDate.getDate() && 
                  dayObj.month === selectedDate.getMonth();
                const isTodayWeekDay = 
                  dayObj.day === today.getDate() && 
                  dayObj.month === today.getMonth();
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(dayObj.date)}
                    className={`flex-1 rounded-lg py-1.5 px-1 transition-all ${
                      isSelectedWeekDay
                        ? 'bg-[#d47455]'
                        : 'hover:bg-[#f5f3eb]'
                    }`}
                  >
                    <div className="text-center">
                      <div 
                        className="text-[8px] mb-0.5"
                        style={{ 
                          fontFamily: 'Arial, sans-serif',
                          fontWeight: 600,
                          color: isSelectedWeekDay ? '#fff' : '#7b7b74'
                        }}
                      >
                        {dayObj.dayOfWeek.toUpperCase()}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ 
                          fontFamily: 'Arial, sans-serif',
                          fontWeight: isSelectedWeekDay || isTodayWeekDay ? 600 : 400,
                          color: isSelectedWeekDay 
                            ? '#fff' 
                            : isTodayWeekDay
                            ? '#d47455'
                            : '#3d3d3a'
                        }}
                      >
                        {dayObj.day}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline View */}
        <div className="flex-1 overflow-y-auto bg-[#FBF9F5]">
          <div className="relative px-4 pb-6 pt-4">
            {/* Hours Grid */}
            {hours.map((hourObj, index) => (
              <div key={hourObj.hour} className="flex relative" style={{ height: '60px' }}>
                {/* Hour Label */}
                <div className="w-16 flex-shrink-0 pr-3 pt-0">
                  <span 
                    className="text-xs"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#c7bcaa' }}
                  >
                    {hourObj.label}
                  </span>
                </div>
                
                {/* Grid Line */}
                <div className="flex-1 border-t border-[#f5f3eb] relative">
                  {/* Check if there are events at this hour */}
                </div>
              </div>
            ))}

            {/* Events Overlay */}
            <div className="absolute left-[84px] right-5 top-0" style={{ height: `${hours.length * 60}px` }}>
              {todaysEvents.map((event) => {
                const topPosition = (event.startHour - 6) * 60;
                const height = event.duration * 60;
                
                return (
                  <div
                    key={event.id}
                    className="absolute left-0 right-0 rounded-xl p-3 shadow-sm border-l-4"
                    style={{
                      top: `${topPosition}px`,
                      height: `${height}px`,
                      backgroundColor: `${event.color}15`,
                      borderLeftColor: event.color,
                      minHeight: '48px'
                    }}
                  >
                    <h3 
                      className="text-sm mb-1"
                      style={{ 
                        fontFamily: 'Lora, serif', 
                        fontWeight: 600, 
                        color: '#3d3d3a',
                        lineHeight: '1.2'
                      }}
                    >
                      {event.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3 h-3" style={{ color: '#7b7b74' }} />
                      <span 
                        className="text-xs"
                        style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                      >
                        {event.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" style={{ color: '#7b7b74' }} />
                      <span 
                        className="text-xs"
                        style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                      >
                        {event.location}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View - Keep existing */}
      <div className="hidden md:block p-12">
        <h1 
          className="text-[56px] text-[#3d3d3a] mb-8"
          style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}
        >
          Schedule
        </h1>
        
        <div className="grid grid-cols-[1fr_300px] gap-8">
          {/* Main Calendar */}
          <div className="bg-white rounded-[20px] p-8">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-[32px] text-[#3d3d3a]"
                style={{ fontFamily: 'Lora, serif', fontWeight: 400 }}
              >
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={previousMonth}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f5f3eb] transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" style={{ color: '#7b7b74' }} />
                </button>
                <button 
                  onClick={nextMonth}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f5f3eb] transition-colors"
                >
                  <ChevronRight className="w-6 h-6" style={{ color: '#7b7b74' }} />
                </button>
              </div>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-4 mb-4">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                <div key={day} className="text-center">
                  <span 
                    className="text-[14px]"
                    style={{ fontFamily: 'Arial, sans-serif', fontWeight: 600, color: '#7b7b74' }}
                  >
                    {day}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-4">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {/* Days of the month */}
              {monthDays.map((dayObj) => (
                <div key={dayObj.day} className="aspect-square flex items-center justify-center">
                  <div 
                    className={`w-12 h-12 flex items-center justify-center rounded-full ${
                      isToday(dayObj.day)
                        ? 'bg-[#d47455]'
                        : 'hover:bg-[#f5f3eb]'
                    } transition-colors cursor-pointer`}
                  >
                    <span 
                      className="text-[16px]"
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        fontWeight: isToday(dayObj.day) ? 600 : 400,
                        color: isToday(dayObj.day) ? '#fff' : '#3d3d3a'
                      }}
                    >
                      {dayObj.day}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Classes Sidebar */}
          <div>
            <h3 
              className="text-[24px] text-[#3d3d3a] mb-4"
              style={{ fontFamily: 'Lora, serif', fontWeight: 600 }}
            >
              Today's Classes
            </h3>
            <div className="space-y-4">
              {getEventsForDay(today).map((classItem) => (
                <div key={classItem.id} className="bg-white rounded-[16px] p-5">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-1 h-20 rounded-full flex-shrink-0"
                      style={{ backgroundColor: classItem.color }}
                    />
                    <div className="flex-1">
                      <h4 
                        className="text-[18px] mb-2"
                        style={{ fontFamily: 'Lora, serif', fontWeight: 600, color: '#3d3d3a' }}
                      >
                        {classItem.name}
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" style={{ color: '#7b7b74' }} />
                        <span 
                          className="text-[14px]"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                        >
                          {classItem.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" style={{ color: '#7b7b74' }} />
                        <span 
                          className="text-[14px]"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#7b7b74' }}
                        >
                          {classItem.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
