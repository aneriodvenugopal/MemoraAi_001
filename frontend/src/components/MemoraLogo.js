import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { logoUrl, iconUrl, fetchBrandingVersion } from '../utils/branding';

/**
 * Brand Logo for MemoraAI.
 * Renders the official platform logo via the backend `/api/branding/logo`
 * endpoint with cache-busting so admin uploads reflect everywhere instantly.
 */
export default function MemoraLogo({
  variant = "compact",
  size = "md",
  asLink = true,
  to = "/",
  className = "",
}) {
  const sizes = { xs: 28, sm: 36, md: 44, lg: 56, xl: 80 };
  const heightPx = sizes[size] || sizes.md;

  // Refresh once on mount and listen for cross-tab uploads
  const [v, setV] = useState(0);
  useEffect(() => {
    fetchBrandingVersion().then(() => setV((x) => x + 1));
    const onBump = () => setV((x) => x + 1);
    window.addEventListener("memora:branding-version", onBump);
    return () => window.removeEventListener("memora:branding-version", onBump);
  }, []);

  const src = variant === "icon" ? iconUrl() : logoUrl();
  const alt = variant === "full"
    ? "MemoraAI — Your WhatsApp. Now Smarter."
    : "MemoraAI";
  const h = variant === "full" ? heightPx * 1.5 : heightPx;
  const testid = variant === "icon" ? "memora-logo-icon"
    : variant === "full" ? "memora-logo-full" : "memora-logo-compact";

  const img = (
    <img
      key={v}
      src={src}
      alt={alt}
      height={h}
      style={{ height: h, width: "auto", maxWidth: "100%" }}
      className="object-contain"
      data-testid={testid}
    />
  );

  const wrap = <span className={`inline-flex items-center ${className}`}>{img}</span>;
  if (asLink) {
    return <Link to={to} className="inline-flex items-center" data-testid="memora-logo-link">{wrap}</Link>;
  }
  return wrap;
}
