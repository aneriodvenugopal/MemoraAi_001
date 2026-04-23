import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGeoLocation } from '../context/LocationContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  ArrowLeft, Mic, Square, Play, Pause, Send, 
  MapPin, Check, Loader2, Volume2, RefreshCw, X
} from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const VoicePropertyPost = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { location: userLoc, requestLocation, permissionStatus } = useGeoLocation();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  // Transcription & form state
  const [transcribing, setTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Property form data
  const [propertyData, setPropertyData] = useState({
    property_type: 'Land',
    price: '',
    price_unit: 'Lakhs',
    area: '',
    area_unit: 'Acres',
    negotiable: true,
    description: '',
    location: '',
    latitude: 0,
    longitude: 0
  });
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Request location on mount
  useEffect(() => {
    if (permissionStatus === 'prompt') {
      requestLocation();
    }
  }, []);

  // Timer for recording
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Microphone error:', err);
      toast.error('Could not access microphone. Please allow permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscribedText('');
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await api().post('/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setTranscribedText(response.data.text);
        setPropertyData(prev => ({ ...prev, description: response.data.text }));
        setShowForm(true);
        toast.success('Voice transcribed successfully!');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      toast.error('Failed to transcribe. Try again or type manually.');
      setShowForm(true);
    }
    setTranscribing(false);
  };

  const LocationPicker = ({ onSelect }) => {
    const [pos, setPos] = useState([
      userLoc?.latitude || 17.385, 
      userLoc?.longitude || 78.4867
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
              // Extract city from address components
              let city = '';
              results[0].address_components?.forEach(comp => {
                if (comp.types.includes('locality')) city = comp.long_name;
              });
              onSelect({ 
                latitude: pos[0], 
                longitude: pos[1], 
                address: results[0].formatted_address,
                city: city
              });
            } else {
              onSelect({ latitude: pos[0], longitude: pos[1], address: `${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}` });
            }
            setLoading(false);
          });
        } else {
          // Fallback to Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos[0]}&lon=${pos[1]}`);
          const data = await res.json();
          onSelect({ 
            latitude: pos[0], 
            longitude: pos[1], 
            address: data.display_name,
            city: data.address?.city || data.address?.town
          });
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
          <p className="text-xs text-gray-500 text-center mb-2">Tap on map to select location</p>
          <button 
            onClick={confirm} 
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><MapPin className="w-5 h-5" /> Confirm Location</>}
          </button>
        </div>
      </div>
    );
  };

  const handleLocationSelect = (loc) => {
    setPropertyData(prev => ({
      ...prev,
      location: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude
    }));
    setShowMap(false);
  };

  const handleSubmit = async () => {
    if (!propertyData.price || !propertyData.area || !propertyData.location) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await api().post('/properties', {
        ...propertyData,
        price: parseFloat(propertyData.price),
        area: parseFloat(propertyData.area)
      });
      toast.success('Property posted successfully!');
      navigate('/agentapex/my-properties');
    } catch (err) {
      console.error(err);
      toast.error('Failed to post property');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Voice Post</h1>
        </div>
      </header>

      <div className="p-4">
        {!showForm ? (
          // Recording UI
          <div className="text-center py-8">
            {/* Waveform visualization placeholder */}
            <div className="mb-8">
              <motion.div 
                animate={isRecording && !isPaused ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${
                  isRecording ? 'bg-red-100' : 'bg-gray-100'
                }`}
              >
                {isRecording ? (
                  <Volume2 className="w-16 h-16 text-red-500" />
                ) : (
                  <Mic className="w-16 h-16 text-gray-400" />
                )}
              </motion.div>
            </div>

            {/* Timer */}
            <p className="text-4xl font-mono font-bold text-gray-900 mb-2">
              {formatTime(recordingTime)}
            </p>
            <p className="text-gray-500 mb-8">
              {isRecording ? 'Recording...' : audioUrl ? 'Recording complete' : 'Tap to start recording'}
            </p>

            {/* Instructions */}
            {!isRecording && !audioUrl && (
              <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
                <p className="text-sm font-medium text-gray-900 mb-2">Say something like:</p>
                <p className="text-sm text-gray-600 italic">
                  "I want to sell 2 acres of agricultural land in Shadnagar for 50 lakhs. 
                  The price is negotiable. It has road access and is near the upcoming metro station."
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {!isRecording && !audioUrl && (
                <button
                  onClick={startRecording}
                  className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Mic className="w-10 h-10 text-white" />
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Square className="w-8 h-8 text-white" />
                </button>
              )}

              {audioUrl && !isRecording && (
                <div className="flex gap-4">
                  <button
                    onClick={resetRecording}
                    className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center"
                  >
                    <RefreshCw className="w-6 h-6 text-gray-600" />
                  </button>
                  
                  <button
                    onClick={() => audioRef.current?.play()}
                    className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center"
                  >
                    <Play className="w-6 h-6 text-gray-600" />
                  </button>
                  
                  <button
                    onClick={transcribeAudio}
                    disabled={transcribing}
                    className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    {transcribing ? (
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    ) : (
                      <Send className="w-10 h-10 text-white" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Skip to manual entry */}
            <button
              onClick={() => setShowForm(true)}
              className="mt-8 text-blue-500 text-sm font-medium"
            >
              Skip and type manually
            </button>

            {/* Hidden audio player */}
            {audioUrl && <audio ref={audioRef} src={audioUrl} />}
          </div>
        ) : (
          // Property Form
          <div className="space-y-4">
            {transcribedText && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-blue-600 font-medium mb-1">Transcribed:</p>
                <p className="text-sm text-gray-700">{transcribedText}</p>
              </div>
            )}

            {/* Property Type */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">Property Type</label>
              <div className="flex gap-2">
                {['Land', 'Plot'].map(type => (
                  <button
                    key={type}
                    onClick={() => setPropertyData(prev => ({ ...prev, property_type: type }))}
                    className={`flex-1 py-3 rounded-xl font-medium ${
                      propertyData.property_type === type 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">Total Price *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={propertyData.price}
                  onChange={(e) => setPropertyData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Enter price"
                  className="flex-1"
                />
                <select
                  value={propertyData.price_unit}
                  onChange={(e) => setPropertyData(prev => ({ ...prev, price_unit: e.target.value }))}
                  className="w-28"
                >
                  <option value="Lakhs">Lakhs</option>
                  <option value="Crore">Crore</option>
                </select>
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">Property Area *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={propertyData.area}
                  onChange={(e) => setPropertyData(prev => ({ ...prev, area: e.target.value }))}
                  placeholder="Enter area"
                  className="flex-1"
                />
                <select
                  value={propertyData.area_unit}
                  onChange={(e) => setPropertyData(prev => ({ ...prev, area_unit: e.target.value }))}
                  className="w-28"
                >
                  {propertyData.property_type === 'Land' ? (
                    <>
                      <option value="Acres">Acres</option>
                      <option value="Guntas">Guntas</option>
                      <option value="Hectare">Hectare</option>
                    </>
                  ) : (
                    <>
                      <option value="Sq.Ft">Sq.Ft</option>
                      <option value="Sq.Yards">Sq.Yards</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Negotiable */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">Is price negotiable?</label>
              <div className="flex gap-2">
                {[true, false].map(val => (
                  <button
                    key={val.toString()}
                    onClick={() => setPropertyData(prev => ({ ...prev, negotiable: val }))}
                    className={`flex-1 py-3 rounded-xl font-medium ${
                      propertyData.negotiable === val 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">Description</label>
              <textarea
                value={propertyData.description}
                onChange={(e) => setPropertyData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your property..."
                rows={3}
                className="w-full resize-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">Location *</label>
              {propertyData.location ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-gray-700 flex-1 truncate">{propertyData.location}</p>
                  <button onClick={() => setShowMap(true)} className="text-blue-500 text-sm font-medium">
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMap(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-500"
                >
                  <MapPin className="w-5 h-5" />
                  Select Location
                </button>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mt-4"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Post Property
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Location Picker Bottom Sheet */}
      <Drawer.Root open={showMap} onOpenChange={setShowMap}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] h-[85vh] outline-none">
            <div className="p-4 h-full flex flex-col">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Select Location</h2>
                <button onClick={() => setShowMap(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="flex-1">
                <LocationPicker onSelect={handleLocationSelect} />
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};

export default VoicePropertyPost;
