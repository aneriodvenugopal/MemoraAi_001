import React from 'react';

/**
 * Login-screen / hero-area logo for MemoraAI.
 * Renders the official PNG logo (mark + wordmark + tagline baked-in).
 */
const MemoraAILogo = ({ size = 'md', className = '' }) => {
  const heights = { xs: 32, sm: 40, md: 56, lg: 80, xl: 110 };
  const h = heights[size] || heights.md;
  return (
    <span className={`inline-flex items-center ${className}`} data-testid="memoraai-logo">
      <img
        src="/memoraai-logo.png"
        alt="MemoraAI — Your WhatsApp. Now Smarter."
        height={h}
        style={{ height: h, width: 'auto', maxWidth: '100%' }}
        className="object-contain"
      />
    </span>
  );
};

export default MemoraAILogo;
