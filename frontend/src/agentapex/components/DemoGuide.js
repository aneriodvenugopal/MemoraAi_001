import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, HelpCircle, Sparkles } from 'lucide-react';

// Demo Guide Context
const DemoGuideContext = createContext(null);

export const useDemoGuide = () => useContext(DemoGuideContext);

// Demo steps for different screens
const DEMO_STEPS = {
  dashboard: [
    {
      id: 'welcome',
      title: 'Welcome to AgentApex! 🎉',
      description: 'Your complete real estate assistant. Let me show you how to use the app.',
      position: 'center',
      highlight: null
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      description: 'Post property, search on map, view your properties - all in one tap!',
      position: 'top',
      highlight: '[data-testid="quick-actions"]'
    },
    {
      id: 'post-property',
      title: 'Post Property',
      description: 'List your land or plot for sale in just 2 minutes. Simple chat-style questions!',
      position: 'bottom',
      highlight: '[data-testid="post-property-btn"]'
    },
    {
      id: 'map-search',
      title: 'Map Search',
      description: 'Find properties near you on the map. See what others are looking for too!',
      position: 'bottom',
      highlight: '[data-testid="map-search-btn"]'
    },
    {
      id: 'bottom-nav',
      title: 'Navigation',
      description: 'Home, Search, Post, Favorites, Profile - easily switch between screens.',
      position: 'top',
      highlight: 'nav'
    }
  ],
  post: [
    {
      id: 'post-welcome',
      title: 'Post Property - Easy! 📝',
      description: 'Answer simple questions one by one. Like chatting with a friend!',
      position: 'center',
      highlight: null
    },
    {
      id: 'post-type',
      title: 'Select Property Type',
      description: 'Tap "Plot" or "Land" to start. Buttons appear right after each question.',
      position: 'bottom',
      highlight: null
    },
    {
      id: 'post-facing',
      title: 'Direction & Details',
      description: 'Select facing direction (East, West, etc.) and if it\'s a corner plot.',
      position: 'center',
      highlight: null
    },
    {
      id: 'post-price',
      title: 'Enter Price',
      description: 'First select "Lakhs" or "Crores", then type the number. Easy!',
      position: 'center',
      highlight: null
    },
    {
      id: 'post-location',
      title: 'Set Location',
      description: 'Search for location or use GPS. Then tap "Confirm This Location".',
      position: 'center',
      highlight: null
    },
    {
      id: 'post-final',
      title: 'Post Property',
      description: 'Review details and tap the big green "POST PROPERTY" button!',
      position: 'center',
      highlight: null
    }
  ],
  map: [
    {
      id: 'map-welcome',
      title: 'Map Search 🗺️',
      description: 'Find properties and requirements near any location!',
      position: 'center',
      highlight: null
    },
    {
      id: 'map-search',
      title: 'Search Location',
      description: 'Tap here to search any area, village, or city. Google-style suggestions!',
      position: 'bottom',
      highlight: null
    },
    {
      id: 'map-toggle',
      title: 'For Sale / Wanted',
      description: '"For Sale" shows properties. "Wanted" shows what buyers are looking for.',
      position: 'bottom',
      highlight: null
    },
    {
      id: 'map-markers',
      title: 'Map Markers',
      description: 'Orange markers = For Sale. Blue markers = Wanted. Tap to see details!',
      position: 'center',
      highlight: null
    },
    {
      id: 'map-filters',
      title: 'Filters',
      description: 'Tap filter icon to set property type, price range, and search radius.',
      position: 'bottom',
      highlight: null
    }
  ],
  requirements: [
    {
      id: 'req-welcome',
      title: 'Post Requirements 📋',
      description: 'Tell agents what you\'re looking for. They\'ll find matching properties!',
      position: 'center',
      highlight: null
    },
    {
      id: 'req-add',
      title: 'Add Requirement',
      description: 'Tap + button to post what kind of property you need.',
      position: 'bottom',
      highlight: null
    },
    {
      id: 'req-details',
      title: 'Enter Details',
      description: 'Property type, budget, size, location preference, facing - all options!',
      position: 'center',
      highlight: null
    },
    {
      id: 'req-map',
      title: 'Visible on Map',
      description: 'Your requirement shows on map so sellers can find you!',
      position: 'center',
      highlight: null
    }
  ],
  myProperties: [
    {
      id: 'props-welcome',
      title: 'My Properties 🏠',
      description: 'All your posted properties in one place.',
      position: 'center',
      highlight: null
    },
    {
      id: 'props-edit',
      title: 'Edit Property',
      description: 'Tap any property to edit details, change price, or mark as sold.',
      position: 'center',
      highlight: null
    },
    {
      id: 'props-status',
      title: 'Status',
      description: 'Green = Active, visible to buyers. Gray = Inactive/Sold.',
      position: 'center',
      highlight: null
    }
  ]
};

// Demo Guide Overlay Component
const DemoGuideOverlay = ({ screen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = DEMO_STEPS[screen] || [];
  
  if (steps.length === 0) return null;
  
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  
  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSkip = () => {
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={handleSkip} />
      
      {/* Content Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative z-10 mx-4 w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header with Progress */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-white font-semibold text-sm">Demo Guide</span>
            </div>
            <button onClick={handleSkip} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress Dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
          <p className="text-base text-gray-600 leading-relaxed">{step.description}</p>
        </div>
        
        {/* Actions */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="text-gray-400 text-sm font-medium hover:text-gray-600"
          >
            Skip
          </button>
          
          {/* Navigation */}
          <div className="flex items-center gap-3">
            {/* Previous */}
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            {/* Next / Done */}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-blue-500 text-white font-semibold rounded-full flex items-center gap-2 hover:bg-blue-600"
            >
              {isLast ? 'Got it!' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Step Counter */}
        <div className="absolute bottom-6 left-6">
          <span className="text-xs text-gray-400">{currentStep + 1} / {steps.length}</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Help Button Component - Shows on all screens
export const HelpButton = ({ screen, className = '' }) => {
  const { startDemo } = useDemoGuide();
  
  return (
    <button
      onClick={() => startDemo(screen)}
      className={`w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors ${className}`}
      data-testid="help-btn"
      title="Show Demo Guide"
    >
      <HelpCircle className="w-5 h-5 text-blue-500" />
    </button>
  );
};

// Demo Guide Provider
export const DemoGuideProvider = ({ children }) => {
  const [activeDemo, setActiveDemo] = useState(null);
  const [seenDemos, setSeenDemos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('agentapex_seen_demos') || '{}');
    } catch {
      return {};
    }
  });

  const startDemo = (screen) => {
    setActiveDemo(screen);
  };

  const closeDemo = () => {
    setActiveDemo(null);
  };

  const completeDemo = () => {
    if (activeDemo) {
      const newSeen = { ...seenDemos, [activeDemo]: true };
      setSeenDemos(newSeen);
      localStorage.setItem('agentapex_seen_demos', JSON.stringify(newSeen));
    }
    setActiveDemo(null);
  };

  const hasSeenDemo = (screen) => {
    return seenDemos[screen] === true;
  };

  const resetDemos = () => {
    setSeenDemos({});
    localStorage.removeItem('agentapex_seen_demos');
  };

  // Auto-show demo for new users on dashboard
  useEffect(() => {
    const isNewUser = !localStorage.getItem('agentapex_seen_demos');
    if (isNewUser) {
      // Will be triggered by Dashboard component
    }
  }, []);

  return (
    <DemoGuideContext.Provider value={{ 
      startDemo, 
      closeDemo, 
      hasSeenDemo, 
      resetDemos,
      activeDemo 
    }}>
      {children}
      
      <AnimatePresence>
        {activeDemo && (
          <DemoGuideOverlay
            screen={activeDemo}
            onClose={closeDemo}
            onComplete={completeDemo}
          />
        )}
      </AnimatePresence>
    </DemoGuideContext.Provider>
  );
};

export default DemoGuideProvider;
