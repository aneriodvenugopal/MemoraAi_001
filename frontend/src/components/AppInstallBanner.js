import React from 'react';
import { Smartphone, Download, Apple } from 'lucide-react';

const AppInstallBanner = () => {
  
  const handleInstallClick = (appName) => {
    // Trigger PWA install
    const event = new CustomEvent('trigger-pwa-install', { detail: { app: appName } });
    window.dispatchEvent(event);
  };

  return (
    <section className="py-12 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Smartphone size={18} />
              Install Our Apps
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Get Faster Access with Our Mobile Apps
            </h2>
            <p className="text-lg text-gray-600">
              Install on your device for instant access, offline support, and push notifications
            </p>
          </div>

          {/* App Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* RealApex App */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 overflow-hidden transform hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white p-2 rounded-xl">
                    <img 
                      src="/realapex-logo.png" 
                      alt="RealApex" 
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%233B82F6" width="100" height="100"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">RE</text></svg>';
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">RealApex</h3>
                    <p className="text-sm text-blue-100">Complete ERP for Real Estate</p>
                  </div>
                </div>
                <p className="text-sm text-blue-50">
                  Manage properties, leads, payments, commissions & team from anywhere
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-gray-700">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span>Work offline with sync</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span>Real-time notifications</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span>Instant access from home screen</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span>Fast & lightweight</span>
                  </div>
                </div>

                {/* Install Buttons */}
                <div className="space-y-3">
                  {/* Android/Chrome */}
                  <button
                    onClick={() => handleInstallClick('RealApex')}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group"
                  >
                    <Download size={24} className="group-hover:animate-bounce" />
                    <span>Install for Android / Desktop</span>
                  </button>

                  {/* iOS */}
                  <button
                    onClick={() => handleInstallClick('RealApex')}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group"
                  >
                    <Apple size={24} className="group-hover:animate-bounce" />
                    <span>Install for iOS / iPhone</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Free • No app store needed • Installs instantly
                </p>
              </div>
            </div>

            {/* Incomelands App */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 overflow-hidden transform hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white p-2 rounded-xl">
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                      IL
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Incomelands</h3>
                    <p className="text-sm text-green-100">Resale Marketplace Platform</p>
                  </div>
                </div>
                <p className="text-sm text-green-50">
                  Buy & sell properties with verified listings and secure transactions
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-gray-700">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span>Browse offline</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span>Save favorite properties</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span>Get instant alerts</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span>Lightning fast search</span>
                  </div>
                </div>

                {/* Install Buttons */}
                <div className="space-y-3">
                  {/* Android/Chrome */}
                  <button
                    onClick={() => handleInstallClick('Incomelands')}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group"
                  >
                    <Download size={24} className="group-hover:animate-bounce" />
                    <span>Install for Android / Desktop</span>
                  </button>

                  {/* iOS */}
                  <button
                    onClick={() => handleInstallClick('Incomelands')}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group"
                  >
                    <Apple size={24} className="group-hover:animate-bounce" />
                    <span>Install for iOS / iPhone</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Free • No app store needed • Installs instantly
                </p>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-8 bg-blue-100 border border-blue-300 rounded-xl p-4 text-center">
            <p className="text-sm text-blue-800 font-medium">
              💡 <strong>Pro Tip:</strong> Install both apps for the complete experience! 
              RealApex for business management, Incomelands for resale marketplace.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppInstallBanner;
