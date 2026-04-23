import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ImpersonationBanner() {
  const { isImpersonating, getImpersonationMeta, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating || !isImpersonating()) return null;
  const meta = getImpersonationMeta() || {};

  const handleExit = async () => {
    await stopImpersonation();
    navigate('/saas-admin', { replace: true });
    // Force hard refresh so all cached API calls re-fire with the admin token
    window.location.reload();
  };

  return (
    <div
      className="sticky top-0 z-[60] bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-4 py-2 flex items-center justify-between gap-3 shadow-md"
      data-testid="impersonation-banner"
    >
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate">
          Acting on behalf of <strong className="font-bold">{meta.tenant_name || 'business'}</strong>
          <span className="hidden sm:inline"> &middot; every action is logged for audit</span>
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold flex-shrink-0 transition-colors"
        data-testid="exit-impersonation-btn"
      >
        <LogOut className="w-3 h-3" /> Exit
      </button>
    </div>
  );
}
