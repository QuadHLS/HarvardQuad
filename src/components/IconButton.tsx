import { useState } from 'react';

export function IconButton({ 
  icon: Icon, 
  label, 
  onClick, 
  hasNotification,
  className = "",
  tooltipPosition = "bottom"
}: { 
  icon: any; 
  label: string; 
  onClick?: () => void;
  hasNotification?: boolean;
  className?: string;
  tooltipPosition?: "bottom" | "right";
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="relative">
      <button 
        className={`p-2 hover:bg-[#e8e5dc] rounded-xl transition-colors relative group ${className}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Icon className="w-5 h-5 text-[#3d3d3a]" />
        {hasNotification && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#dd3a3a] rounded-full"></span>
        )}
      </button>
      
      {/* Tooltip */}
      {isHovered && (
        <div 
          className={`absolute ${
            tooltipPosition === "right" 
              ? "left-full ml-2 top-1/2 -translate-y-1/2" 
              : "left-1/2 -translate-x-1/2 top-full mt-2"
          } px-3 py-1.5 bg-[#3d3d3a] text-white rounded-full whitespace-nowrap text-xs pointer-events-none z-50`}
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {label}
        </div>
      )}
    </div>
  );
}