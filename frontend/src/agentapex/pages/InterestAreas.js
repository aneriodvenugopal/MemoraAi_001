import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGooglePlacesAutocomplete } from '../components/GooglePlacesAutocomplete';
import { motion } from 'framer-motion';
import { Drawer } from 'vaul';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  ArrowLeft, Plus, MapPin, Bell, BellOff, Trash2, 
  Search, Navigation, Sliders, X
} from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RADIUS_OPTIONS = [2, 5, 10, 20];
const PROPERTY_TYPES = ['Land', 'Plot'];

// Debounce hook
const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

// Map click handler
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
};

const InterestAreas = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    latitude: null,
    longitude: null,
    radius_km: 5,
    property_types: ['Land', 'Plot'],
    min_price: '',
    max_price: '',
    notifications_enabled: true
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { isReady: googlePlacesReady, search: googleSearch, getPlaceDetails } = useGooglePlacesAutocomplete();

  useEffect(() => { fetchAreas(); }, []);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchLocations(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const fetchAreas = async () => {
    try {
      const res = await api().get('/interest-areas');
      setAreas(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const searchLocations = async (query) => {
    try {
      let results = [];
      
      // Try Google Places first
      if (googlePlacesReady) {
        results = await googleSearch(query);
      }
      
      // If Google returned results, use them
      if (results.length > 0) {
        setSearchResults(results.map(r => ({
          id: r.place_id,
          place_id: r.place_id,
          name: r.fullDescription,
          mainText: r.mainText
        })));
      } else {
        // Fallback to Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`,
          { headers: { 'Accept': 'application/json' } }
        );
        const data = await response.json();
        setSearchResults(data.map(r => ({
          id: r.place_id,
          name: r.display_name,
          mainText: r.display_name.split(',')[0],
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon)
        })));
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const selectSearchResult = async (result) => {
    if (result.place_id && googlePlacesReady) {
      try {
        const details = await getPlaceDetails(result.place_id);
        setFormData({
          ...formData,
          name: result.mainText || details.formatted_address?.split(',')[0],
          latitude: details.latitude,
          longitude: details.longitude
        });
        setSearchQuery('');
        setSearchResults([]);
      } catch (err) {
        console.error('Error getting place details:', err);
      }
    } else {
      setFormData({
        ...formData,
        name: result.mainText || result.name?.split(',')[0],
        latitude: result.lat,
        longitude: result.lon
      });
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleMapClick = useCallback((location) => {
    setFormData(prev => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng
    }));
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      latitude: null,
      longitude: null,
      radius_km: 5,
      property_types: ['Land', 'Plot'],
      min_price: '',
      max_price: '',
      notifications_enabled: true
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddArea = async () => {
    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error('Please select a location');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        min_price: formData.min_price ? Number(formData.min_price) : null,
        max_price: formData.max_price ? Number(formData.max_price) : null
      };
      const res = await api().post('/interest-areas', payload);
      setAreas(prev => [res.data, ...prev]);
      setShowAdd(false);
      resetForm();
      toast.success('Interest area saved!');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || 'Failed to save');
    }
  };

  const toggleNotifications = async (areaId, enabled) => {
    try {
      await api().put(`/interest-areas/${areaId}?notifications_enabled=${!enabled}`);
      setAreas(prev => prev.map(a => 
        a.id === areaId ? { ...a, notifications_enabled: !enabled } : a
      ));
      toast.success(enabled ? 'Notifications off' : 'Notifications on');
    } catch (e) { toast.error('Failed to update'); }
  };

  const deleteArea = async (areaId) => {
    if (!window.confirm('Delete this interest area?')) return;
    try {
      await api().delete(`/interest-areas/${areaId}`);
      setAreas(prev => prev.filter(a => a.id !== areaId));
      toast.success('Deleted!');
    } catch (e) { toast.error('Failed to delete'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Interest Areas</h1>
              <p className="text-xs text-gray-500">{areas.length}/10 areas saved</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Saved Areas List */}
            {areas.map((area, i) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 truncate">{area.name}</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleNotifications(area.id, area.notifications_enabled)}
                          className={`p-2 rounded-lg transition-colors ${
                            area.notifications_enabled 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {area.notifications_enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteArea(area.id)}
                          className="p-2 bg-red-50 text-red-500 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {area.radius_km} km • {area.property_types?.join(', ')}
                    </p>
                    {(area.min_price || area.max_price) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        ₹{area.min_price || 0}L - ₹{area.max_price || '∞'}L
                      </p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => navigate(`/agentapex/search?lat=${area.latitude}&lng=${area.longitude}&radius=${area.radius_km}`)}
                  className="w-full mt-3 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-center gap-1.5"
                >
                  <Search className="w-4 h-4" /> View Properties
                </button>
              </motion.div>
            ))}
            
            {/* Empty state or Add more */}
            {areas.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-gray-900 font-semibold">No interest areas yet</p>
                <p className="text-gray-500 text-sm mt-1">Save locations to get property alerts</p>
              </div>
            ) : areas.length < 10 && (
              <p className="text-center text-gray-400 text-sm py-2">
                You can add {10 - areas.length} more area(s)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      {areas.length < 10 && (
        <button
          onClick={() => setShowAdd(true)}
          data-testid="add-area-btn"
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center z-40"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Add Interest Area Sheet */}
      <Drawer.Root open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[1002] outline-none max-h-[85vh] flex flex-col">
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Interest Area</h2>
                <button onClick={() => setShowAdd(false)} className="p-2">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* Location Search */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search Location</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search area, city..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => selectSearchResult(result)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                      >
                        <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{result.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Map */}
              <div className="h-40 rounded-xl overflow-hidden mb-4 border border-gray-200">
                <MapContainer
                  center={formData.latitude ? [formData.latitude, formData.longitude] : [17.385, 78.4867]}
                  zoom={formData.latitude ? 13 : 10}
                  className="h-full w-full"
                  zoomControl={false}
                  key={formData.latitude ? `${formData.latitude}-${formData.longitude}` : 'default'}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClickHandler onLocationSelect={handleMapClick} />
                  {formData.latitude && (
                    <>
                      <Marker position={[formData.latitude, formData.longitude]} />
                      <Circle
                        center={[formData.latitude, formData.longitude]}
                        radius={formData.radius_km * 1000}
                        pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.15 }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
              
              {formData.latitude && (
                <div className="flex items-center gap-2 mb-4 p-2 bg-green-50 rounded-xl">
                  <Navigation className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Location selected</span>
                </div>
              )}
              
              {/* Area Name */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Area Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Madhapur, Banjara Hills"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
              </div>
              
              {/* Radius */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search Radius</label>
                <div className="grid grid-cols-4 gap-2">
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setFormData({ ...formData, radius_km: r })}
                      className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                        formData.radius_km === r 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Property Types */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Property Types</label>
                <div className="flex gap-2">
                  {PROPERTY_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const types = formData.property_types.includes(type)
                          ? formData.property_types.filter(t => t !== type)
                          : [...formData.property_types, type];
                        if (types.length > 0) setFormData({ ...formData, property_types: types });
                      }}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                        formData.property_types.includes(type)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Price Range */}
              <div className="mb-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Min (Lakhs)</label>
                  <input
                    type="number"
                    value={formData.min_price}
                    onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Max (Lakhs)</label>
                  <input
                    type="number"
                    value={formData.max_price}
                    onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                    placeholder="No limit"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
            
            {/* Sticky Footer with Button */}
            <div className="p-4 pt-2 border-t border-gray-100 bg-white">
              <button
                onClick={handleAddArea}
                disabled={!formData.name || !formData.latitude}
                className="w-full py-4 bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Bell className="w-5 h-5" />
                Save & Get Alerts
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};

export default InterestAreas;
