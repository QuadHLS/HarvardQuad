import { useState } from 'react';

export function MessagingIconButton({ 
  icon: Icon, 
  label, 
  onClick,
  size = 18
}: { 
  icon: any; 
  label: string; 
  onClick?: () => void;
  size?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="relative">
      <button 
        className="p-2 hover:bg-[#f5f5f5] rounded cursor-pointer border-0 bg-transparent"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Icon size={size} className="text-[#999]" />
      </button>
      
      {/* Tooltip */}
      {isHovered && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-4 py-2 bg-[#3d3d3a] text-white rounded-full whitespace-nowrap text-sm pointer-events-none z-50"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
