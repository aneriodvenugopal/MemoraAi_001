/**
 * ClickableStatCard - Enhanced stat card with click navigation and hover effects
 * Used across all pages for consistent statistics display
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:border-blue-400 hover:shadow-blue-100'
  },
  green: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    hover: 'hover:border-green-400 hover:shadow-green-100'
  },
  purple: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    hover: 'hover:border-purple-400 hover:shadow-purple-100'
  },
  orange: {
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    hover: 'hover:border-orange-400 hover:shadow-orange-100'
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    hover: 'hover:border-red-400 hover:shadow-red-100'
  },
  cyan: {
    bg: 'bg-cyan-500',
    bgLight: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    hover: 'hover:border-cyan-400 hover:shadow-cyan-100'
  },
  yellow: {
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-200',
    hover: 'hover:border-yellow-400 hover:shadow-yellow-100'
  },
  gray: {
    bg: 'bg-gray-500',
    bgLight: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    hover: 'hover:border-gray-400 hover:shadow-gray-100'
  },
  indigo: {
    bg: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    hover: 'hover:border-indigo-400 hover:shadow-indigo-100'
  },
  pink: {
    bg: 'bg-pink-500',
    bgLight: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200',
    hover: 'hover:border-pink-400 hover:shadow-pink-100'
  }
};

const ClickableStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  navigateTo,
  onClick,
  subtitle,
  trend,
  trendUp,
  className = ''
}) => {
  const navigate = useNavigate();
  const colors = COLOR_CLASSES[color] || COLOR_CLASSES.blue;
  
  const isClickable = navigateTo || onClick;
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (navigateTo) {
      navigate(navigateTo);
    }
  };

  return (
    <Card 
      className={`
        relative overflow-hidden transition-all duration-300 border-2
        ${colors.border} ${colors.hover}
        ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 group' : ''}
        ${className}
      `}
      onClick={isClickable ? handleClick : undefined}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Background gradient effect */}
      <div className={`absolute inset-0 ${colors.bgLight} opacity-50`} />
      
      <CardContent className="relative pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium ${colors.text} uppercase tracking-wide`}>
              {title}
            </p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{value}</p>
            
            {/* Subtitle or trend */}
            {(subtitle || trend) && (
              <div className="mt-1 flex items-center gap-2">
                {trend && (
                  <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    {trendUp ? '↑' : '↓'} {trend}
                  </span>
                )}
                {subtitle && (
                  <span className="text-xs text-gray-500">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          
          <div className={`p-3 rounded-xl ${colors.bg} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        {/* Click indicator */}
        {isClickable && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className={`w-4 h-4 ${colors.text}`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClickableStatCard;
