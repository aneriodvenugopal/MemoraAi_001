import React from 'react';

const MemoraAILogo = ({ size = 'md', showCaption = true, showBrand = true, className = '' }) => {
  const sizes = {
    xs: { icon: 'h-6 w-6', text: 'text-sm', caption: 'text-[9px] font-semibold' },
    sm: { icon: 'h-8 w-8', text: 'text-lg', caption: 'text-[10px] font-semibold' },
    md: { icon: 'h-10 w-10', text: 'text-xl', caption: 'text-xs font-bold' },
    lg: { icon: 'h-14 w-14', text: 'text-2xl', caption: 'text-sm font-bold' },
    xl: { icon: 'h-20 w-20', text: 'text-3xl', caption: 'text-base font-bold' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="memoraai-logo">
      <div className={`${s.icon} relative flex-shrink-0`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="memoraGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="memoraGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="memoraGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          {/* Brain / Memory icon shape */}
          <circle cx="24" cy="24" r="22" fill="url(#memoraGrad1)" />
          {/* Neural network nodes */}
          <circle cx="16" cy="16" r="3" fill="white" opacity="0.95" />
          <circle cx="32" cy="16" r="3" fill="white" opacity="0.95" />
          <circle cx="24" cy="24" r="4" fill="white" opacity="1" />
          <circle cx="16" cy="32" r="3" fill="white" opacity="0.95" />
          <circle cx="32" cy="32" r="3" fill="white" opacity="0.95" />
          {/* Connections */}
          <line x1="16" y1="16" x2="24" y2="24" stroke="white" strokeWidth="1.5" opacity="0.6" />
          <line x1="32" y1="16" x2="24" y2="24" stroke="white" strokeWidth="1.5" opacity="0.6" />
          <line x1="16" y1="32" x2="24" y2="24" stroke="white" strokeWidth="1.5" opacity="0.6" />
          <line x1="32" y1="32" x2="24" y2="24" stroke="white" strokeWidth="1.5" opacity="0.6" />
          <line x1="16" y1="16" x2="32" y2="16" stroke="white" strokeWidth="1" opacity="0.3" />
          <line x1="16" y1="32" x2="32" y2="32" stroke="white" strokeWidth="1" opacity="0.3" />
          {/* Pulse ring */}
          <circle cx="24" cy="24" r="20" stroke="url(#memoraGrad2)" strokeWidth="1.5" fill="none" opacity="0.4" />
        </svg>
      </div>

      {(showBrand || showCaption) && (
        <div className="flex flex-col">
          {showBrand && (
            <span className={`${s.text} font-bold tracking-tight`}>
              <span className="text-indigo-600">Memora</span>
              <span className="text-purple-600">AI</span>
            </span>
          )}
          {showCaption && (
            <span className={`${s.caption} text-gray-500 tracking-wide`}>
              Multi-Category Business Automation
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MemoraAILogo;
