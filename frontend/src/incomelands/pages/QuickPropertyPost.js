import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, MapPin, Check, Loader2, Mic, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STEPS = [
  { step: 0, question: "What type of property do you want to post?", field: "property_type", options: ["Land", "Plot"] },
  { step: 1, question: "What's the total price?", field: "price", type: "number", suffix: ["Lakhs", "Crore"] },
  { step: 2, question: "What's the property size?", field: "area", type: "number", suffix_land: ["Acres", "Guntas", "Hectare"], suffix_plot: ["Sq.Ft", "Sq.Yards"] },
  { step: 3, question: "Is the price negotiable?", field: "negotiable", options: ["Yes", "No"] },
  { step: 4, question: "Where is the property located?", field: "location", type: "map" }
];

// Map recenter helper
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 14); }, [center, map]);
  return null;
};

const LocationPicker = ({ onSelect, initialPosition }) => {
  const [pos, setPos] = useState(initialPosition);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const MapClick = () => { 
    useMapEvents({ click: (e) => setPos([e.latlng.lat, e.latlng.lng]) }); 
    return null; 
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      const newPos = [position.coords.latitude, position.coords.longitude];
      setPos(newPos);
      toast.success('Location updated!');
    } catch (err) {
      toast.error('Could not get location. Please enable GPS.');
    }
    setGettingLocation(false);
  };

  const confirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos[0]}&lon=${pos[1]}`);
      const data = await res.json();
      onSelect({ 
        latitude: pos[0], 
        longitude: pos[1], 
        address: data.display_name, 
        city: data.address?.city || data.address?.town, 
        state: data.address?.state, 
        postal_code: data.address?.postcode 
      });
    } catch { 
      onSelect({ 
        latitude: pos[0], 
        longitude: pos[1], 
        address: `${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}` 
      }); 
    }
    setLoading(false);
  };

  return (
    <div className="relative h-72 rounded-2xl overflow-hidden border border-gray-200">
      <MapContainer center={pos} zoom={14} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={pos} />
        <MapClick />
        <MapRecenter center={pos} />
      </MapContainer>
      
      {/* Get current location button */}
      <button
        onClick={getCurrentLocation}
        disabled={gettingLocation}
        className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center z-[1000]"
      >
        {gettingLocation ? (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        ) : (
          <Navigation className="w-5 h-5 text-blue-500" />
        )}
      </button>
      
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent">
        <p className="text-xs text-gray-500 text-center mb-2">Tap on map or use GPS to select location</p>
        <button 
          onClick={confirm} 
          disabled={loading}
          data-testid="confirm-location-btn" 
          className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <MapPin className="w-5 h-5" /> Confirm Location
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Chat Bubble
const Bubble = ({ text, isUser, isTyping }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }} 
    animate={{ opacity: 1, y: 0 }} 
    className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
  >
    <div className={`max-w-[85%] rounded-3xl px-4 py-3 ${
      isUser 
        ? 'bg-blue-500 text-white rounded-br-lg' 
        : 'bg-gray-100 text-gray-900 rounded-bl-lg'
    }`}>
      {isTyping ? (
        <div className="flex gap-1 py-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      ) : (
        <p className="text-sm">{text}</p>
      )}
    </div>
  </motion.div>
);

const QuickPropertyPost = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { location: userLoc, requestLocation, permissionStatus } = useLocation();
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState('');
  const [suffix, setSuffix] = useState('');
  const [data, setData] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, typing]);

  // Request location on mount
  useEffect(() => {
    if (permissionStatus === 'prompt') {
      requestLocation();
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => { 
        setTyping(false); 
        setMessages([{ text: STEPS[0].question, isUser: false }]); 
      }, 600);
    }, 300);
  }, []);

  const getStep = () => {
    const s = STEPS[step];
    if (step === 2 && data.property_type) {
      return { ...s, suffix: data.property_type === 'Land' ? s.suffix_land : s.suffix_plot };
    }
    return s;
  };

  const send = (answer) => {
    const s = getStep();
    setMessages(prev => [...prev, { text: answer, isUser: true }]);
    const newData = { ...data, [s.field]: answer };
    setData(newData);
    const next = step + 1;
    
    if (next >= STEPS.length) { 
      setDone(true); 
      return; 
    }
    
    if (STEPS[next].type === 'map') {
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => { 
          setTyping(false); 
          setMessages(prev => [...prev, { text: STEPS[next].question, isUser: false }]); 
          setShowMap(true); 
          setStep(next); 
        }, 600);
      }, 400);
    } else {
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => { 
          setTyping(false); 
          setMessages(prev => [...prev, { text: STEPS[next].question, isUser: false }]); 
          setStep(next); 
        }, 600);
      }, 400);
    }
  };

  const onLocation = (loc) => {
    setShowMap(false);
    setMessages(prev => [...prev, { text: `📍 ${loc.address}`, isUser: true }]);
    setData(prev => ({ 
      ...prev, 
      location: loc.address, 
      latitude: loc.latitude, 
      longitude: loc.longitude, 
      city: loc.city, 
      state: loc.state, 
      postal_code: loc.postal_code 
    }));
    setDone(true);
  };

  const finalize = async () => {
    setLoading(true);
    try {
      const [price, priceUnit] = (data.price || '0 Lakhs').split(' ');
      const [area, ...areaUnitArr] = (data.area || '0 Sq.Ft').split(' ');
      await api().post('/properties', {
        property_type: data.property_type || 'Land',
        price: parseFloat(price) || 0,
        price_unit: priceUnit || 'Lakhs',
        area: parseFloat(area) || 0,
        area_unit: areaUnitArr.join(' ') || 'Sq.Ft',
        location: data.location || '',
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        negotiable: data.negotiable === 'Yes'
      });
      navigate('/my-properties', { state: { success: true } });
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to post property'); 
    }
    setLoading(false);
  };

  const s = getStep();

  // Get initial map position from user location
  const getInitialPosition = () => {
    if (userLoc?.latitude && userLoc?.longitude) {
      return [userLoc.latitude, userLoc.longitude];
    }
    return [17.385, 78.4867]; // Fallback to Hyderabad
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">New Post</h1>
          </div>
          <button 
            onClick={() => navigate('/post/voice')}
            data-testid="voice-post-btn"
            className="w-10 h-10 flex items-center justify-center bg-red-50 rounded-full"
          >
            <Mic className="w-5 h-5 text-red-500" />
          </button>
        </div>
        {/* Progress */}
        <div className="mt-3 h-1 bg-gray-100 rounded-full">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300" 
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} 
          />
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <AnimatePresence>
          {messages.map((m, i) => (
            <Bubble key={i} text={m.text} isUser={m.isUser} />
          ))}
          {typing && <Bubble isTyping />}
        </AnimatePresence>
        
        {showMap && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-4"
          >
            <LocationPicker 
              initialPosition={getInitialPosition()} 
              onSelect={onLocation} 
            />
          </motion.div>
        )}
        
        {done && !showMap && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="mt-6 bg-gray-50 rounded-2xl p-6 text-center"
          >
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-white" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Ready to Post!</p>
            <p className="text-sm text-gray-500 mb-6">
              {data.property_type} • ₹{data.price} • {data.area}
            </p>
            <button 
              onClick={finalize} 
              disabled={loading} 
              data-testid="finalize-btn" 
              className="w-full py-3.5 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Post Property'
              )}
            </button>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      {!done && !showMap && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-bottom">
          {s.options ? (
            <div className="flex gap-3">
              {s.options.map(o => (
                <button 
                  key={o} 
                  onClick={() => send(o)} 
                  data-testid={`option-${o.toLowerCase()}`} 
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-200 text-gray-900 rounded-xl font-semibold transition-colors"
                >
                  {o}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="flex-1 flex gap-2 bg-gray-100 rounded-full px-4 py-2">
                <input 
                  type={s.type === 'number' ? 'number' : 'text'} 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Type a message..." 
                  data-testid="chat-input" 
                  className="flex-1 bg-transparent border-none outline-none text-sm" 
                  onKeyDown={(e) => e.key === 'Enter' && input && send(suffix ? `${input} ${suffix}` : input)} 
                />
                {s.suffix && (
                  <select 
                    value={suffix} 
                    onChange={(e) => setSuffix(e.target.value)} 
                    data-testid="suffix-select" 
                    className="bg-transparent border-none outline-none text-sm text-gray-500"
                  >
                    <option value="">Unit</option>
                    {s.suffix.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
              </div>
              <button 
                onClick={() => { 
                  if (input) { 
                    send(suffix ? `${input} ${suffix}` : input); 
                    setInput(''); 
                    setSuffix(''); 
                  } 
                }} 
                disabled={!input} 
                data-testid="send-btn" 
                className="w-10 h-10 bg-blue-500 disabled:bg-gray-200 rounded-full flex items-center justify-center"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickPropertyPost;
