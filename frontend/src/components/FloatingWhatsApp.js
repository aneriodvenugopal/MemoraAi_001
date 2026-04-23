import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const FloatingWhatsApp = () => {
  const location = useLocation();
  
  // Check if on homepage
  const isHomePage = location.pathname === '/';
  
  // On homepage (no RealApex Assistant), position WhatsApp higher for visibility
  const positionClass = isHomePage ? 'bottom-28' : 'bottom-6';
  
  return (
    <a
      href="https://wa.me/919948303060"
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${positionClass} right-6 z-40 group`}
      title="Chat on WhatsApp"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-50"></div>
        <div className="relative w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
      </div>
    </a>
  );
};

export default FloatingWhatsApp;
