import React, { useEffect, useState } from 'react';
import { logoUrl, fetchBrandingVersion } from '../utils/branding';

/**
 * Login-screen / hero-area logo for MemoraAI.
 * Resolves the URL through `/api/branding/logo` so admin uploads reflect
 * immediately across the entire app + production.
 */
const MemoraAILogo = ({ size = 'md', className = '' }) => {
  const heights = { xs: 32, sm: 40, md: 56, lg: 80, xl: 110 };
  const h = heights[size] || heights.md;

  const [v, setV] = useState(0);
  useEffect(() => {
    fetchBrandingVersion().then(() => setV((x) => x + 1));
    const onBump = () => setV((x) => x + 1);
    window.addEventListener('memora:branding-version', onBump);
    return () => window.removeEventListener('memora:branding-version', onBump);
  }, []);

  return (
    <span className={`inline-flex items-center ${className}`} data-testid="memoraai-logo">
      <img
        key={v}
        src={logoUrl()}
        alt="MemoraAI — Your WhatsApp. Now Smarter."
        height={h}
        style={{ height: h, width: 'auto', maxWidth: '100%' }}
        className="object-contain"
      />
    </span>
  );
};

export default MemoraAILogo;
