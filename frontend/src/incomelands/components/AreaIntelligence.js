import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  Brain, Loader2, X, TrendingUp, MapPin, Building2, 
  CheckCircle, AlertCircle, Info
} from 'lucide-react';

const AreaIntelligence = ({ latitude, longitude, location, propertyType, trigger }) => {
  const { api } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [intelligence, setIntelligence] = useState(null);
  const [error, setError] = useState(null);

  const fetchIntelligence = async () => {
    if (!latitude || !longitude || !location) {
      setError('Location data not available');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('location', location);
      if (propertyType) formData.append('property_type', propertyType);
      
      const response = await api().post('/ai/area-intelligence', formData);
      
      if (response.data.success) {
        setIntelligence(response.data.intelligence);
      }
    } catch (err) {
      console.error('AI error:', err);
      setError('Failed to get area intelligence. Please try again.');
    }
    setLoading(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!intelligence) {
      fetchIntelligence();
    }
  };

  // Format markdown-like text
  const formatText = (text) => {
    if (!text) return null;
    
    // Split by lines and format
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bold headers
      if (line.startsWith('**') && line.includes('**')) {
        const clean = line.replace(/\*\*/g, '');
        return (
          <p key={i} className="font-semibold text-gray-900 mt-4 mb-1 first:mt-0">
            {clean}
          </p>
        );
      }
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <p key={i} className="text-sm text-gray-600 ml-4 mb-1">
            • {line.substring(2)}
          </p>
        );
      }
      // Regular text
      if (line.trim()) {
        return (
          <p key={i} className="text-sm text-gray-600 mb-2">
            {line}
          </p>
        );
      }
      return null;
    });
  };

  return (
    <>
      {/* Trigger Button */}
      {trigger ? (
        <div onClick={handleOpen}>{trigger}</div>
      ) : (
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl text-sm font-medium"
        >
          <Brain className="w-4 h-4" />
          AI Area Insights
        </button>
      )}

      {/* Intelligence Bottom Sheet */}
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] max-h-[85vh] overflow-hidden outline-none">
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Area Intelligence</h2>
                    <p className="text-xs text-gray-500">AI-powered insights</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              
              {/* Location */}
              <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 mb-4">
                <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Analyzing Location</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{location || 'Location not specified'}</p>
                </div>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-[60vh] px-4 pb-6">
              {loading ? (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-16 h-16 mx-auto mb-4"
                  >
                    <Brain className="w-16 h-16 text-purple-500" />
                  </motion.div>
                  <p className="text-gray-600 font-medium">Analyzing area data...</p>
                  <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-gray-900 font-medium">{error}</p>
                  <button
                    onClick={fetchIntelligence}
                    className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              ) : intelligence ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4"
                >
                  {formatText(intelligence)}
                  
                  {/* Disclaimer */}
                  <div className="flex items-start gap-2 bg-white/80 rounded-xl p-3 mt-4">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500">
                      AI-generated insights based on general area knowledge. 
                      Always verify with local sources and professional advisors.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default AreaIntelligence;
