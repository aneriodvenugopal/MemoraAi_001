import React from 'react';

// Creative R Logo Component - Represents a building/skyscraper forming the letter R
const RealApexLogo = ({ size = 'md', showCaption = true, showBrand = true, className = '' }) => {
  const sizes = {
    xs: { icon: 'h-6 w-6', text: 'text-sm', caption: 'text-[9px] font-semibold' },
    sm: { icon: 'h-8 w-8', text: 'text-lg', caption: 'text-[10px] font-semibold' },
    md: { icon: 'h-10 w-10', text: 'text-xl', caption: 'text-xs font-bold' },
    lg: { icon: 'h-14 w-14', text: 'text-2xl', caption: 'text-sm font-bold' },
    xl: { icon: 'h-20 w-20', text: 'text-3xl', caption: 'text-base font-bold' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Creative R Icon - Building/Skyscraper Style */}
      <div className={`${s.icon} relative flex-shrink-0`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Background gradient */}
          <defs>
            <linearGradient id="rGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="rGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          
          {/* Main R shape as building */}
          {/* Vertical pillar of R */}
          <rect x="8" y="6" width="10" height="36" rx="2" fill="url(#rGradient)" />
          
          {/* Top curve of R - Building top */}
          <path 
            d="M18 6 H32 C38 6 42 10 42 16 C42 22 38 26 32 26 H18 V6Z" 
            fill="url(#rGradientLight)" 
          />
          
          {/* Diagonal leg of R */}
          <path 
            d="M24 26 L40 42 H30 L18 30 V26 H24Z" 
            fill="url(#rGradient)" 
          />
          
          {/* Building windows on vertical pillar */}
          <rect x="11" y="10" width="4" height="3" rx="0.5" fill="white" opacity="0.9" />
          <rect x="11" y="16" width="4" height="3" rx="0.5" fill="white" opacity="0.9" />
          <rect x="11" y="22" width="4" height="3" rx="0.5" fill="white" opacity="0.9" />
          <rect x="11" y="28" width="4" height="3" rx="0.5" fill="white" opacity="0.7" />
          <rect x="11" y="34" width="4" height="3" rx="0.5" fill="white" opacity="0.5" />
          
          {/* Windows on top curve */}
          <rect x="22" y="10" width="4" height="3" rx="0.5" fill="white" opacity="0.9" />
          <rect x="29" y="10" width="4" height="3" rx="0.5" fill="white" opacity="0.9" />
          <rect x="22" y="16" width="4" height="3" rx="0.5" fill="white" opacity="0.7" />
          <rect x="29" y="14" width="4" height="3" rx="0.5" fill="white" opacity="0.6" />
          
          {/* Accent line at top */}
          <rect x="8" y="4" width="10" height="2" rx="1" fill="#1E40AF" />
        </svg>
      </div>

      {/* Brand Name and Caption */}
      {(showBrand || showCaption) && (
        <div className="flex flex-col">
          {showBrand && (
            <span className={`${s.text} font-bold tracking-tight`}>
              <span className="text-gray-700">Real</span>
              <span className="text-blue-600">Apex</span>
            </span>
          )}
          {showCaption && (
            <span className={`${s.caption} text-gray-600 tracking-wide`}>
              Infrastructure for Real Estate Operations
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RealApexLogo;
