import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGeoLocation } from '../context/LocationContext';
import { HelpButton } from '../components/DemoGuide';
import { GooglePlacesAutocomplete } from '../components/GooglePlacesAutocomplete';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Check, Loader2, Mic, Navigation, CheckCircle2, Building2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Steps configuration
const STEPS = [
  { 
    id: 'property_type',
    question: "What type of property?", 
    type: 'buttons',
    options: [
      { value: 'Plot', label: 'Plot' },
      { value: 'Land', label: 'Land' }
    ]
  },
  { 
    id: 'facing',
    question: "Which direction facing?", 
    type: 'buttons',
    options: [
      { value: 'East', label: 'East' },
      { value: 'West', label: 'West' },
      { value: 'North', label: 'North' },
      { value: 'South', label: 'South' },
      { value: 'North-East', label: 'N-East' },
      { value: 'North-West', label: 'N-West' },
      { value: 'South-East', label: 'S-East' },
      { value: 'South-West', label: 'S-West' }
    ],
    showFor: ['Plot', 'Land']
  },
  { 
    id: 'is_corner',
    question: "Is it a corner property?", 
    type: 'buttons',
    options: [
      { value: 'Yes', label: 'Yes' },
      { value: 'No', label: 'No' }
    ],
    showFor: ['Plot', 'Land']
  },
  { 
    id: 'price',
    question: "What's the total price?", 
    type: 'number_with_unit',
    placeholder: "Enter price",
    units: ['Lakhs', 'Crores']
  },
  { 
    id: 'area',
    question: "What's the property size?", 
    type: 'number_with_unit',
    placeholder: "Enter size",
    units_land: ['Acres', 'Guntas', 'Cents'],
    units_plot: ['Sq.Yards', 'Sq.Ft']
  },
  { 
    id: 'negotiable',
    question: "Is price negotiable?", 
    type: 'buttons',
    options: [
      { value: 'Yes', label: 'Yes' },
      { value: 'No', label: 'No' }
    ]
  },
  { 
    id: 'location',
    question: "Where is property located?", 
    type: 'location'
  }
];

// Map recenter helper
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 14); }, [center, map]);
  return null;
};

// Highlight matching text in search results
const HighlightText = ({ text, query }) => {
  if (!query) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <strong key={i} className="text-gray-900 font-bold">{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

// Location Picker with Map - Inline in chat
const LocationPickerInline = ({ onPositionChange, initialPosition, onSearchClick }) => {
  const [pos, setPos] = useState(initialPosition);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const MapClick = () => { 
    useMapEvents({ click: (e) => {
      const newPos = [e.latlng.lat, e.latlng.lng];
      setPos(newPos);
      onPositionChange(newPos);
    }}); 
    return null; 
  };

  // Notify parent of initial position
  useEffect(() => {
    if (pos) onPositionChange(pos);
  }, []);

  // Update when initialPosition changes (e.g., from search)
  useEffect(() => {
    if (initialPosition && (initialPosition[0] !== pos[0] || initialPosition[1] !== pos[1])) {
      setPos(initialPosition);
    }
  }, [initialPosition]);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 20000, maximumAge: 0
        });
      });
      const newPos = [position.coords.latitude, position.coords.longitude];
      setPos(newPos);
      onPositionChange(newPos);
      toast.success('Location updated!');
    } catch (err) {
      toast.error('Could not get location');
    }
    setGettingLocation(false);
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Search Button */}
      <button
        onClick={onSearchClick}
        className="w-full py-3 bg-gray-100 rounded-xl flex items-center justify-center gap-2 text-base"
      >
        <Search className="w-5 h-5 text-gray-500" />
        <span className="text-gray-600">Search location...</span>
      </button>

      {/* Map */}
      <div className="relative h-48 rounded-xl overflow-hidden border border-gray-200">
        <MapContainer center={pos} zoom={14} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={pos} />
          <MapClick />
          <MapRecenter center={pos} />
        </MapContainer>
        
        <button
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          className="absolute top-2 right-2 bg-white rounded-full shadow p-2 z-[1000]"
        >
          {gettingLocation ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 text-blue-500" />
          )}
        </button>
      </div>
    </div>
  );
};

// Success Screen
const SuccessScreen = ({ data, onViewProperties, onPostAnother }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 bg-gradient-to-b from-green-500 to-green-600 flex flex-col items-center justify-center p-6 z-50"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", damping: 15, delay: 0.2 }}
      className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg"
    >
      <CheckCircle2 className="w-14 h-14 text-green-500" />
    </motion.div>
    
    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="text-2xl font-bold text-white mb-2">Property Posted!</motion.h1>
    
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
      className="text-green-100 text-center mb-8">Your property is now visible to buyers</motion.p>
    
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
      className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{data.property_type}</p>
          <p className="text-sm text-gray-500">{data.location?.split(',')[0] || 'Location set'}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Price</p>
          <p className="font-bold text-gray-900">{data.price}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Size</p>
          <p className="font-bold text-gray-900">{data.area}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Facing</p>
          <p className="font-bold text-gray-900">{data.facing || '-'}</p>
        </div>
      </div>
    </motion.div>
    
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
      className="w-full max-w-sm space-y-3">
      <button onClick={onViewProperties} className="w-full py-4 bg-white text-green-600 font-bold rounded-xl shadow-lg">
        View My Properties
      </button>
      <button onClick={onPostAnother} className="w-full py-4 border-2 border-white text-white font-bold rounded-xl">
        Post Another
      </button>
    </motion.div>
  </motion.div>
);

// Main Component
const QuickPropertyPost = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { location: userLoc, requestLocation, permissionStatus } = useGeoLocation();
  const [chatItems, setChatItems] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({});
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mapPosition, setMapPosition] = useState(null);
  
  // For number input
  const [inputValue, setInputValue] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  
  const endRef = useRef(null);

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatItems, typing, waitingForInput]);

  useEffect(() => {
    if (permissionStatus === 'prompt') requestLocation();
  }, []);

  // Initial question - with guard to prevent double render
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => { 
        setTyping(false);
        addQuestion(0);
      }, 400);
    }, 200);
  }, []);

  const getNextStepIndex = (fromIndex, currentData) => {
    let next = fromIndex + 1;
    while (next < STEPS.length) {
      const step = STEPS[next];
      if (step.showFor) {
        if (step.showFor.includes(currentData.property_type)) {
          return next;
        }
        next++;
      } else {
        return next;
      }
    }
    return next;
  };

  const getStepConfig = (stepIndex) => {
    const step = STEPS[stepIndex];
    if (step?.id === 'area' && data.property_type) {
      return { ...step, units: data.property_type === 'Land' ? step.units_land : step.units_plot };
    }
    return step;
  };

  const addQuestion = (stepIndex) => {
    const step = STEPS[stepIndex];
    setChatItems(prev => [...prev, { type: 'question', text: step.question, stepIndex }]);
    setCurrentStep(stepIndex);
    
    if (step.type === 'number_with_unit') {
      setWaitingForInput(true);
      setInputValue('');
      setSelectedUnit('');
    }
  };

  const addAnswer = (answer) => {
    setChatItems(prev => [...prev, { type: 'answer', text: answer }]);
  };

  const handleButtonClick = (value) => {
    const step = getStepConfig(currentStep);
    addAnswer(value);
    
    const newData = { ...data, [step.id]: value };
    setData(newData);
    
    const nextIndex = getNextStepIndex(currentStep, newData);
    
    if (nextIndex >= STEPS.length) {
      setDone(true);
      return;
    }
    
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => { 
        setTyping(false);
        addQuestion(nextIndex);
      }, 300);
    }, 150);
  };

  const handleNumberSubmit = () => {
    if (!inputValue) {
      toast.error('Please enter a value');
      return;
    }
    if (!selectedUnit) {
      toast.error('Please select a unit');
      return;
    }
    
    setWaitingForInput(false);
    const answer = `${inputValue} ${selectedUnit}`;
    handleButtonClick(answer);
  };

  const handleLocationSelect = (loc) => {
    // No longer used - location is tracked via mapPosition
  };

  const handlePositionChange = (pos) => {
    setMapPosition(pos);
  };

  const handleSearchSelect = (result) => {
    setShowSearch(false);
    // Use Google Places result format
    setMapPosition([result.latitude, result.longitude]);
    setData(prev => ({
      ...prev,
      location: result.formatted_address || result.location_text,
      place_id: result.place_id,
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.city,
      state: result.state,
      postal_code: result.postal_code
    }));
    toast.success(`Set to ${result.location_text}`);
  };

  const finalize = async () => {
    setLoading(true);
    
    // Reverse geocode if we have map position but no location text
    let locationData = {
      location: data.location || '',
      latitude: data.latitude || (mapPosition ? mapPosition[0] : 0),
      longitude: data.longitude || (mapPosition ? mapPosition[1] : 0),
      city: data.city || '',
      state: data.state || '',
      postal_code: data.postal_code || '',
      place_id: data.place_id || ''
    };

    const lat = locationData.latitude;
    const lng = locationData.longitude;

    if (lat && lng && !locationData.location) {
      try {
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, 3000);
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              clearTimeout(timeout);
              if (status === 'OK' && results[0]) {
                results[0].address_components?.forEach(comp => {
                  if (comp.types.includes('locality')) locationData.city = comp.long_name;
                  if (comp.types.includes('administrative_area_level_1')) locationData.state = comp.long_name;
                  if (comp.types.includes('postal_code')) locationData.postal_code = comp.long_name;
                });
                locationData.location = results[0].formatted_address;
              }
              resolve();
            });
          });
        }
        
        if (!locationData.location) {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`);
          if (res.ok) {
            const geoData = await res.json();
            if (geoData?.display_name) {
              locationData.location = geoData.display_name;
              locationData.city = geoData.address?.city || geoData.address?.town || geoData.address?.village || '';
              locationData.state = geoData.address?.state || '';
              locationData.postal_code = geoData.address?.postcode || '';
            }
          }
        }
      } catch (err) {
        console.log('Reverse geocode failed:', err);
        locationData.location = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    }

    try {
      const [price, priceUnit] = (data.price || '0 Lakhs').split(' ');
      const [area, ...areaUnitArr] = (data.area || '0 Sq.Ft').split(' ');
      
      await api().post('/properties', {
        property_type: data.property_type || 'Land',
        price: parseFloat(price) || 0,
        price_unit: priceUnit || 'Lakhs',
        area: parseFloat(area) || 0,
        area_unit: areaUnitArr.join(' ') || 'Sq.Ft',
        location: locationData.location,
        location_text: locationData.location?.split(',')[0] || '',
        place_id: locationData.place_id,
        city: locationData.city,
        state: locationData.state,
        postal_code: locationData.postal_code,
        latitude: locationData.latitude || 0,
        longitude: locationData.longitude || 0,
        negotiable: data.negotiable === 'Yes',
        facing: data.facing || '',
        is_corner: data.is_corner === 'Yes'
      });
      
      setShowSuccess(true);
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to post property'); 
    }
    setLoading(false);
  };

  const handlePostAnother = () => {
    setShowSuccess(false);
    setChatItems([]);
    setCurrentStep(0);
    setData({});
    setDone(false);
    setInputValue('');
    setSelectedUnit('');
    setWaitingForInput(false);
    setMapPosition(null);
    
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => { 
        setTyping(false);
        addQuestion(0);
      }, 400);
    }, 200);
  };

  const step = getStepConfig(currentStep);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const getInitialPosition = () => {
    if (mapPosition) return mapPosition;
    if (userLoc?.latitude && userLoc?.longitude) return [userLoc.latitude, userLoc.longitude];
    return [17.385, 78.4867];
  };

  return (
    <>
      {showSuccess && (
        <SuccessScreen 
          data={data}
          onViewProperties={() => navigate('/agentapex/my-properties')}
          onPostAnother={handlePostAnother}
        />
      )}
      
      {showSearch && (
        <GooglePlacesAutocomplete
          mode="fullscreen"
          onSelect={handleSearchSelect}
          onClose={() => setShowSearch(false)}
          placeholder="Search village, area, city..."
        />
      )}
      
      <div className="agentapex-page-container">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex-1">Post Property</h1>
            <HelpButton screen="post" />
            <button onClick={() => navigate('/agentapex/post/voice')}
              className="w-10 h-10 flex items-center justify-center bg-red-50 rounded-full">
              <Mic className="w-5 h-5 text-red-500" />
            </button>
          </div>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </header>

        {/* Chat Area - Questions and Answers inline */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
          <AnimatePresence>
            {chatItems.map((item, i) => {
              if (item.type === 'question') {
                const stepConfig = getStepConfig(item.stepIndex);
                const isCurrentStep = item.stepIndex === currentStep && !done;
                const showButtons = isCurrentStep && stepConfig.type === 'buttons';
                const showNumberInput = isCurrentStep && stepConfig.type === 'number_with_unit' && waitingForInput;
                const showLocation = isCurrentStep && stepConfig.type === 'location';
                
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                    {/* Question Bubble */}
                    <div className="flex justify-start mb-2">
                      <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                        <p className="text-base">{item.text}</p>
                      </div>
                    </div>
                    
                    {/* Inline Buttons - immediately after question - BETTER UI */}
                    {showButtons && (
                      <div className="flex flex-wrap gap-3 ml-2 mt-1">
                        {stepConfig.options.map(opt => (
                          <motion.button 
                            key={opt.value} 
                            whileTap={{ scale: 0.92 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleButtonClick(opt.value)}
                            className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/30 active:shadow-md transition-all"
                          >
                            {opt.label}
                          </motion.button>
                        ))}
                      </div>
                    )}
                    
                    {/* Inline Number Input */}
                    {showNumberInput && (
                      <div className="ml-2 mt-2 space-y-3">
                        {/* Unit Buttons */}
                        <div className="flex flex-wrap gap-2">
                          {stepConfig.units.map(unit => (
                            <button
                              key={unit}
                              onClick={() => setSelectedUnit(unit)}
                              className={`px-4 py-2 rounded-full font-semibold text-sm ${
                                selectedUnit === unit 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {unit}
                            </button>
                          ))}
                        </div>
                        
                        {/* Input + Submit */}
                        <div className="flex gap-2">
                          <input 
                            type="tel"
                            inputMode="decimal"
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder={stepConfig.placeholder}
                            className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-lg font-semibold focus:border-blue-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleNumberSubmit()}
                          />
                          <button 
                            onClick={handleNumberSubmit}
                            disabled={!inputValue || !selectedUnit}
                            className="px-5 py-3 bg-blue-500 disabled:bg-gray-300 rounded-xl"
                          >
                            <Check className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Location Picker Inline */}
                    {showLocation && (
                      <div className="ml-2">
                        <LocationPickerInline 
                          initialPosition={getInitialPosition()} 
                          onPositionChange={handlePositionChange}
                          onSearchClick={() => setShowSearch(true)}
                        />
                        
                        {/* POST PROPERTY button directly below map */}
                        <button 
                          onClick={finalize} 
                          disabled={loading}
                          data-testid="post-property-btn"
                          className="w-full mt-4 py-5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl text-xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                        >
                          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <><CheckCircle2 className="w-6 h-6" /> POST PROPERTY</>
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              } else {
                // Answer bubble
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    className="flex justify-end mb-4">
                    <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]">
                      <p className="text-base">{item.text}</p>
                    </div>
                  </motion.div>
                );
              }
            })}
            
            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          
          <div ref={endRef} />
        </div>
      </div>
    </>
  );
};

export default QuickPropertyPost;
