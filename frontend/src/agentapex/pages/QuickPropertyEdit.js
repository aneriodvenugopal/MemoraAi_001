import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGeoLocation } from '../context/LocationContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  ArrowLeft, Send, MapPin, Check, Loader2, Image, X, Camera, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Chat message bubble
const Bubble = ({ text, isUser, isTyping, options, onOptionSelect, images }) => (
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
        <>
          <p className="text-sm">{text}</p>
          {images && images.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  </motion.div>
);

const EDIT_STEPS = [
  { field: 'property_type', question: "Update property type?", options: ['Land', 'Plot', 'Keep Current'] },
  { field: 'price', question: "Update price? Current: ₹{price} {price_unit}", type: 'number', suffix: ['Lakhs', 'Crore', 'Keep Current'] },
  { field: 'area', question: "Update area? Current: {area} {area_unit}", type: 'number', suffix_land: ['Acres', 'Guntas', 'Hectare', 'Keep Current'], suffix_plot: ['Sq.Ft', 'Sq.Yards', 'Keep Current'] },
  { field: 'negotiable', question: "Is price negotiable?", options: ['Yes', 'No', 'Keep Current'] },
  { field: 'description', question: "Update description?", type: 'text' },
  { field: 'images', question: "Add/remove images?", type: 'images' },
  { field: 'location', question: "Update location?", type: 'map' }
];

const QuickPropertyEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { api } = useAuth();
  const { location: userLoc } = useGeoLocation();
  const fileInputRef = useRef(null);
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState('');
  const [suffix, setSuffix] = useState('');
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [updates, setUpdates] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const endRef = useRef(null);

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, typing]);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const res = await api().get(`/properties/${id}`);
      setProperty(res.data);
      // Start conversation
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          const q = getQuestion(EDIT_STEPS[0], res.data);
          setMessages([{ text: q, isUser: false }]);
        }, 600);
      }, 300);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load property');
      navigate(-1);
    }
    setLoading(false);
  };

  const getQuestion = (step, prop) => {
    let q = step.question;
    q = q.replace('{price}', prop.price || '0');
    q = q.replace('{price_unit}', prop.price_unit || 'Lakhs');
    q = q.replace('{area}', prop.area || '0');
    q = q.replace('{area_unit}', prop.area_unit || 'Sq.Ft');
    return q;
  };

  const getStepConfig = () => {
    const s = EDIT_STEPS[step];
    if (step === 2 && property?.property_type) {
      return { ...s, suffix: property.property_type === 'Land' ? s.suffix_land : s.suffix_plot };
    }
    return s;
  };

  const handleAnswer = (answer) => {
    const s = getStepConfig();
    setMessages(prev => [...prev, { text: answer, isUser: true }]);
    
    // Track updates
    if (answer !== 'Keep Current' && answer !== '') {
      const update = {};
      if (s.field === 'price') {
        const [val, unit] = answer.split(' ');
        if (unit !== 'Keep Current') {
          update.price = parseFloat(val);
          update.price_unit = unit;
        }
      } else if (s.field === 'area') {
        const parts = answer.split(' ');
        if (parts[parts.length - 1] !== 'Current') {
          update.area = parseFloat(parts[0]);
          update.area_unit = parts.slice(1).join(' ');
        }
      } else if (s.field === 'negotiable') {
        update.negotiable = answer === 'Yes';
      } else if (s.field !== 'images' && s.field !== 'location') {
        update[s.field] = answer;
      }
      setUpdates(prev => ({ ...prev, ...update }));
    }
    
    const next = step + 1;
    if (next >= EDIT_STEPS.length) {
      setDone(true);
      return;
    }
    
    // Special handling for images and map
    if (EDIT_STEPS[next].type === 'images') {
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setMessages(prev => [...prev, { 
            text: "Here are your current images. You can add more or remove existing ones.", 
            isUser: false,
            images: property?.images || []
          }]);
          setStep(next);
        }, 600);
      }, 400);
    } else if (EDIT_STEPS[next].type === 'map') {
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setMessages(prev => [...prev, { text: getQuestion(EDIT_STEPS[next], property), isUser: false }]);
          setShowMap(true);
          setStep(next);
        }, 600);
      }, 400);
    } else {
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setMessages(prev => [...prev, { text: getQuestion(EDIT_STEPS[next], property), isUser: false }]);
          setStep(next);
        }, 600);
      }, 400);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingImage(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await api().post(`/properties/${id}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.success) {
          setSelectedImages(prev => [...prev, res.data.url]);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to upload image');
      }
    }
    setUploadingImage(false);
  };

  const handleLocationSelect = (loc) => {
    setMessages(prev => [...prev, { text: `📍 ${loc.address}`, isUser: true }]);
    setUpdates(prev => ({
      ...prev,
      location: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude
    }));
    setShowMap(false);
    setDone(true);
  };

  const handleSave = async () => {
    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save');
      navigate(-1);
      return;
    }
    
    setSaving(true);
    try {
      await api().put(`/properties/${id}`, updates);
      toast.success('Property updated successfully!');
      navigate('/agentapex/my-properties');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update property');
    }
    setSaving(false);
  };

  const LocationPicker = ({ onSelect }) => {
    const [pos, setPos] = useState([
      property?.latitude || userLoc?.latitude || 17.385, 
      property?.longitude || userLoc?.longitude || 78.4867
    ]);
    const [loading, setLoading] = useState(false);
    
    const MapClick = () => { 
      useMapEvents({ click: (e) => setPos([e.latlng.lat, e.latlng.lng]) }); 
      return null; 
    };

    const confirm = async () => {
      setLoading(true);
      try {
        // Use Google Geocoding API for reverse geocoding
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: pos[0], lng: pos[1] } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              onSelect({ latitude: pos[0], longitude: pos[1], address: results[0].formatted_address });
            } else {
              onSelect({ latitude: pos[0], longitude: pos[1], address: `${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}` });
            }
            setLoading(false);
          });
        } else {
          // Fallback to Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos[0]}&lon=${pos[1]}`);
          const data = await res.json();
          onSelect({ latitude: pos[0], longitude: pos[1], address: data.display_name });
          setLoading(false);
        }
      } catch { 
        onSelect({ latitude: pos[0], longitude: pos[1], address: `${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}` }); 
        setLoading(false);
      }
    };

    return (
      <div className="h-72 rounded-xl overflow-hidden relative">
        <MapContainer center={pos} zoom={14} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={pos} />
          <MapClick />
        </MapContainer>
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent">
          <button 
            onClick={confirm} 
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><MapPin className="w-5 h-5" /> Confirm</>}
          </button>
        </div>
      </div>
    );
  };

  const s = getStepConfig();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Edit Property</h1>
          </div>
        </div>
        {/* Progress */}
        <div className="mt-3 h-1 bg-gray-100 rounded-full">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300" 
            style={{ width: `${((step + 1) / EDIT_STEPS.length) * 100}%` }} 
          />
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <AnimatePresence>
          {messages.map((m, i) => (
            <Bubble key={i} text={m.text} isUser={m.isUser} images={m.images} />
          ))}
          {typing && <Bubble isTyping />}
        </AnimatePresence>
        
        {showMap && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <LocationPicker onSelect={handleLocationSelect} />
          </motion.div>
        )}
        
        {/* Image upload section */}
        {EDIT_STEPS[step]?.type === 'images' && !done && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[...(property?.images || []), ...selectedImages].map((img, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${img}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center"
              >
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                ) : (
                  <Plus className="w-8 h-8 text-gray-400" />
                )}
              </button>
            </div>
            <button
              onClick={() => handleAnswer('Images updated')}
              className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl"
            >
              Continue
            </button>
          </motion.div>
        )}
        
        {done && !showMap && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 bg-gray-50 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-white" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Ready to Save!</p>
            <p className="text-sm text-gray-500 mb-6">
              {Object.keys(updates).length} field(s) will be updated
            </p>
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="w-full py-3.5 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      {!done && !showMap && EDIT_STEPS[step]?.type !== 'images' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-bottom">
          {s.options ? (
            <div className="flex gap-2 flex-wrap">
              {s.options.map(o => (
                <button 
                  key={o} 
                  onClick={() => handleAnswer(o)} 
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium transition-colors text-sm"
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
                  placeholder="Type or skip..." 
                  className="flex-1 bg-transparent border-none outline-none text-sm" 
                  onKeyDown={(e) => e.key === 'Enter' && (input ? handleAnswer(suffix ? `${input} ${suffix}` : input) : handleAnswer('Keep Current'))} 
                />
                {s.suffix && (
                  <select 
                    value={suffix} 
                    onChange={(e) => setSuffix(e.target.value)} 
                    className="bg-transparent border-none outline-none text-sm text-gray-500"
                  >
                    <option value="">Unit</option>
                    {s.suffix.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
              </div>
              <button 
                onClick={() => input ? handleAnswer(suffix ? `${input} ${suffix}` : input) : handleAnswer('Keep Current')} 
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
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

export default QuickPropertyEdit;
