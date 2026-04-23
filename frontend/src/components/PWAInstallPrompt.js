import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Apple } from 'lucide-react';

function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
  useEffect(() => {
    // Detect device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }
    
    // Android: Listen for install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show banner after 5 seconds
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const dismissedDate = dismissed ? new Date(dismissed) : null;
        const now = new Date();
        
        // Show if never dismissed or dismissed more than 7 days ago
        if (!dismissedDate || (now - dismissedDate) > 7 * 24 * 60 * 60 * 1000) {
          setShowBanner(true);
        }
      }, 5000);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // iOS: Show manual instructions after 5 seconds
    if (isIOSDevice && !window.navigator.standalone) {
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShowBanner(true);
        }
      }, 5000);
    }
    
    // Listen for custom event from footer button
    const handleTriggerInstall = () => {
      if (isIOSDevice) {
        setShowIOSInstructions(true);
        setShowBanner(true);
      } else if (deferredPrompt) {
        handleInstallAndroid();
      } else {
        // Show banner if install prompt not available yet
        setShowBanner(true);
      }
    };
    
    window.addEventListener('trigger-pwa-install', handleTriggerInstall);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('trigger-pwa-install', handleTriggerInstall);
    };
  }, [deferredPrompt]);
  
  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    
    // Show install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User installed PWA');
      
      // Track installation
      try {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/analytics/pwa-install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'android' })
        });
      } catch (error) {
        console.error('Failed to track installation');
      }
    }
    
    setDeferredPrompt(null);
    setShowBanner(false);
  };
  
  const handleShowIOSInstructions = () => {
    setShowIOSInstructions(true);
  };
  
  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    
    // Remember dismissal for 7 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem('pwa-install-dismissed', expiryDate.toISOString());
  };
  
  if (isInstalled) return null;
  
  return (
    <>
      {/* Bottom Banner */}
      {showBanner && !showIOSInstructions && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-cyan-600 shadow-2xl z-50 animate-slide-up">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white p-2 rounded-lg">
                  <img src="/realapex-logo.png" alt="RealApex" className="w-12 h-12 object-contain" />
                </div>
                <div className="text-white">
                  <h3 className="font-bold text-lg">Install RealApex App</h3>
                  <p className="text-sm opacity-90">
                    ⚡ Instant access • 📱 Works offline • 🔔 Get notifications
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isAndroid && deferredPrompt && (
                  <button
                    onClick={handleInstallAndroid}
                    className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold flex items-center space-x-2 hover:bg-gray-100 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    <span>Install Now</span>
                  </button>
                )}
                
                {isIOS && (
                  <button
                    onClick={handleShowIOSInstructions}
                    className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold flex items-center space-x-2 hover:bg-gray-100 transition-all"
                  >
                    <Apple className="w-5 h-5" />
                    <span>Install on iPhone</span>
                  </button>
                )}
                
                {!isAndroid && !isIOS && (
                  <button
                    onClick={handleShowIOSInstructions}
                    className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold flex items-center space-x-2 hover:bg-gray-100 transition-all"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>How to Install</span>
                  </button>
                )}
                
                <button
                  onClick={handleDismiss}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* iOS Installation Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Apple className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Install on iPhone/iPad
              </h2>
              <p className="text-gray-600">
                Follow these simple steps to install RealApex app
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Tap the Share button</p>
                  <p className="text-sm text-gray-600">Look for the <strong>📤 Share</strong> icon at the bottom of Safari browser</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Scroll and find "Add to Home Screen"</p>
                  <p className="text-sm text-gray-600">Scroll down in the share menu and tap <strong>Add to Home Screen</strong></p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Tap "Add"</p>
                  <p className="text-sm text-gray-600">Confirm by tapping <strong>Add</strong> in the top right corner</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Done!</p>
                  <p className="text-sm text-gray-600">RealApex app icon will appear on your home screen</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> Once installed, open the app from your home screen for the best experience!
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

export default PWAInstallPrompt;
