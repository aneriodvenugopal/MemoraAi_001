import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Brand Logo for MemoraAI.
 * Renders the official PNG logo (mark + wordmark + tagline baked-in).
 *
 * Variants:
 *  - "compact": full logo image at standard sizes (default)
 *  - "icon"   : small square logo (uses memoraai-icon.png)
 *  - "full"   : large, hero-sized image
 *
 * `tone` is currently unused but reserved for future text-only fallback.
 */
export default function MemoraLogo({
  variant = "compact",
  size = "md",
  asLink = true,
  to = "/",
  className = "",
  showTagline = false, // unused — kept for backwards-compat
}) {
  const sizes = {
    xs: 28,
    sm: 36,
    md: 44,
    lg: 56,
    xl: 80,
  };
  const heightPx = sizes[size] || sizes.md;

  let img;
  if (variant === "icon") {
    img = (
      <img
        src="/memoraai-icon.png"
        alt="MemoraAI"
        height={heightPx}
        style={{ height: heightPx, width: "auto" }}
        className="object-contain"
        data-testid="memora-logo-icon"
      />
    );
  } else if (variant === "full") {
    img = (
      <img
        src="/memoraai-logo.png"
        alt="MemoraAI — Your WhatsApp. Now Smarter."
        height={heightPx * 1.5}
        style={{ height: heightPx * 1.5, width: "auto", maxWidth: "100%" }}
        className="object-contain"
        data-testid="memora-logo-full"
      />
    );
  } else {
    // compact = full image at smaller height
    img = (
      <img
        src="/memoraai-logo.png"
        alt="MemoraAI"
        height={heightPx}
        style={{ height: heightPx, width: "auto", maxWidth: "100%" }}
        className="object-contain"
        data-testid="memora-logo-compact"
      />
    );
  }

  const wrap = <span className={`inline-flex items-center ${className}`}>{img}</span>;
  if (asLink) {
    return <Link to={to} className="inline-flex items-center" data-testid="memora-logo-link">{wrap}</Link>;
  }
  return wrap;
}
