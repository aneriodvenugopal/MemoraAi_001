/**
 * ClickableListRow - Enhanced list row with hover effects
 * Reusable component for consistent list item styling across all pages
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';

const ClickableListRow = ({ 
  children, 
  onClick, 
  className = '',
  showArrow = true,
  selected = false,
  disabled = false,
  variant = 'default' // default, compact, card
}) => {
  const baseClasses = `
    relative flex items-center justify-between
    transition-all duration-200 ease-in-out
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const variantClasses = {
    default: `
      p-4 border rounded-lg bg-white
      ${selected 
        ? 'border-blue-500 bg-blue-50 shadow-md' 
        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md'
      }
      ${!disabled && 'hover:-translate-y-0.5 active:translate-y-0'}
    `,
    compact: `
      p-3 border-b border-gray-100 bg-white
      ${selected 
        ? 'bg-blue-50 border-l-4 border-l-blue-500' 
        : 'hover:bg-gray-50 hover:border-l-4 hover:border-l-blue-300'
      }
    `,
    card: `
      p-5 border rounded-xl bg-white shadow-sm
      ${selected 
        ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg' 
        : 'border-gray-200 hover:border-blue-400 hover:shadow-lg hover:ring-1 hover:ring-blue-100'
      }
      ${!disabled && 'hover:-translate-y-1 active:translate-y-0'}
    `
  };

  return (
    <div
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${className}
        group
      `}
      onClick={disabled ? undefined : onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick && !disabled) {
          e.preventDefault();
          onClick(e);
        }
      }}
    >
      <div className="flex-1 min-w-0">
        {children}
      </div>
      
      {showArrow && onClick && !disabled && (
        <ChevronRight 
          className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all ml-2 flex-shrink-0" 
        />
      )}
    </div>
  );
};

export default ClickableListRow;
