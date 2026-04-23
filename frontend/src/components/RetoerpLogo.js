import React from 'react';

/**
 * RealApex Logo Component
 * 
 * Usage:
 * <RealApexLogo variant="full" size="md" />
 * <RealApexLogo variant="icon" size="sm" />
 * <RealApexLogo variant="white" size="lg" />
 */

const RealApexLogo = ({ 
  variant = 'full', // 'full', 'icon', 'white'
  size = 'md', // 'sm', 'md', 'lg', 'xl'
  className = '' 
}) => {
  // Size mappings
  const sizes = {
    sm: { width: 40, height: 40 },
    md: { width: 60, height: 60 },
    lg: { width: 100, height: 100 },
    xl: { width: 150, height: 150 }
  };

  const fullSizes = {
    sm: { width: 200, height: 50 },
    md: { width: 300, height: 75 },
    lg: { width: 400, height: 100 },
    xl: { width: 500, height: 125 }
  };

  // Get logo path based on variant
  const getLogoPath = () => {
    switch (variant) {
      case 'icon':
        return '/realapex-logo.png';
      case 'white':
        return '/realapex-logo.png'; // Same logo, can be styled with CSS filter
      case 'full':
      default:
        return '/realapex-logo.png';
    }
  };

  // Get dimensions based on variant and size
  const getDimensions = () => {
    if (variant === 'icon') {
      return sizes[size];
    }
    return fullSizes[size];
  };

  const dimensions = getDimensions();
  const logoPath = getLogoPath();

  return (
    <img
      src={logoPath}
      alt="RealApex - Real Estate Automation SaaS"
      width={dimensions.width}
      height={dimensions.height}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default RealApexLogo;

// Export individual logo components for convenience
export const RealApexIconLogo = (props) => <RealApexLogo variant="icon" {...props} />;
export const RealApexFullLogo = (props) => <RealApexLogo variant="full" {...props} />;
export const RealApexWhiteLogo = (props) => <RealApexLogo variant="white" {...props} />;
