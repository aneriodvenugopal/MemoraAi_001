import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGooglePlacesAutocomplete } from '../components/GooglePlacesAutocomplete';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ClipboardList, MapPin, Search, X, Loader2, Check, Home, Building2, Trees, Store, Compass } from 'lucide-react';
import { toast } from 'sonner';

const TYPES = [
  { id: 'Land', icon: Trees, label: 'Land' },
  { id: 'Plot', icon: MapPin, label: 'Plot' },
  { id: 'Apartment', icon: Building2, label: 'Flat' },
  { id: 'House', icon: Home, label: 'House' },
  { id: 'Commercial', icon: Store, label: 'Shop' }
];

const FACINGS = ['East', 'West', 'North', 'South', 'N-East', 'N-West', 'S-East', 'S-West'];
const AREA_UNITS = ['Sq.Yards', 'Sq.Ft', 'Acres', 'Guntas', 'Cents'];

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const Requirements = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ 
    property_type: 'Land', 
    budget_min: '', 
    budget_max: '', 
    budget_unit: 'Lakhs', 
    location_preference: '', 
    description: '',
    latitude: null,
    longitude: null,
    area_min: '',
    area_max: '',
    area_unit: 'Sq.Yards',
    facing: '',
    is_corner_plot: false
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { isReady: googlePlacesReady, search: googleSearch, getPlaceDetails } = useGooglePlacesAutocomplete();

  useEffect(() => { fetchRequirements(); }, []);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchLocations(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const fetchRequirements = async () => {
    try { 
      const res = await api().get('/requirements'); 
      setRequirements(res.data); 
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const searchLocations = async (query) => {
    setSearchLoading(true);
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
          mainText: r.mainText,
          secondaryText: r.secondaryText
        })));
        setShowSearchResults(true);
      } else {
        // Fallback to Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, India&limit=6&addressdetails=1&countrycodes=in`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'MemoraAI/1.0' } }
        );
        const data = await response.json();
        setSearchResults(data.map(r => ({
          id: r.place_id,
          name: r.display_name,
          mainText: r.address?.village || r.address?.suburb || r.address?.town || r.address?.city || r.name || r.display_name.split(',')[0],
          secondaryText: [r.address?.state_district, r.address?.state].filter(Boolean).join(', '),
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon)
        })));
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error('Location search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectLocation = async (result) => {
    if (result.place_id && googlePlacesReady) {
      try {
        const details = await getPlaceDetails(result.place_id);
        setForm({
          ...form,
          location_preference: result.mainText || details.formatted_address?.split(',')[0],
          latitude: details.latitude,
          longitude: details.longitude
        });
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);
        toast.success('Location selected!');
      } catch (err) {
        console.error('Error getting place details:', err);
        toast.error('Failed to get location details');
      }
    } else {
      setForm({
        ...form,
        location_preference: result.mainText || result.name?.split(',')[0],
        latitude: result.lat,
        longitude: result.lon
      });
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      toast.success('Location selected!');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.location_preference) {
      toast.error('Please select a location');
      return;
    }
    try {
      const payload = {
        ...form,
        budget_min: parseFloat(form.budget_min) || 0,
        budget_max: parseFloat(form.budget_max) || 0,
        area_min: parseFloat(form.area_min) || null,
        area_max: parseFloat(form.area_max) || null
      };
      const res = await api().post('/requirements', payload);
      setRequirements(prev => [res.data, ...prev]);
      setShowModal(false);
      resetForm();
      toast.success('Requirement posted!');
    } catch (e) { 
      toast.error('Failed to post requirement');
    }
  };

  const resetForm = () => {
    setForm({ 
      property_type: 'Land', budget_min: '', budget_max: '', budget_unit: 'Lakhs', 
      location_preference: '', description: '', latitude: null, longitude: null,
      area_min: '', area_max: '', area_unit: 'Sq.Yards', facing: '', is_corner_plot: false
    });
  };

  const showPlotOptions = ['Plot', 'Land'].includes(form.property_type);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">My Requirements</h1>
              <p className="text-xs text-gray-500">{requirements.length} posted</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      {/* List */}
      <div className="p-4 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />)
        ) : requirements.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-lg font-bold text-gray-900">No Requirements</p>
            <p className="text-sm text-gray-500 mt-1">Tell agents what you need</p>
            <button onClick={() => setShowModal(true)} className="mt-6 px-8 py-3 bg-blue-500 text-white font-bold rounded-xl">
              + Post Requirement
            </button>
          </div>
        ) : (
          requirements.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} 
              className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-600 font-bold">{r.property_type}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {r.status === 'active' ? 'Active' : r.status}
                </span>
              </div>
              <p className="text-xl font-black text-gray-900">₹{r.budget_min} - ₹{r.budget_max} {r.budget_unit}</p>
              {r.area_min && r.area_max && (
                <p className="text-sm text-gray-600 mt-0.5">{r.area_min} - {r.area_max} {r.area_unit}</p>
              )}
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4 text-blue-500" />{r.location_preference}
              </p>
              {r.facing && <span className="text-xs text-gray-500">Facing: {r.facing}</span>}
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="w-full max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl">
              <div className="p-5 pb-8">
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <h2 className="text-xl font-black text-gray-900 mb-6">Post Requirement</h2>
                
                <form onSubmit={handleAdd} className="space-y-5">
                  {/* Property Type */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Property Type</p>
                    <div className="grid grid-cols-5 gap-2">
                      {TYPES.map(t => {
                        const Icon = t.icon;
                        return (
                          <button key={t.id} type="button" 
                            onClick={() => setForm({ ...form, property_type: t.id, facing: '', is_corner_plot: false })} 
                            className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                              form.property_type === t.id ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600'
                            }`}>
                            <Icon className="w-5 h-5 mb-0.5" />
                            <span className="text-xs font-bold">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Facing - Only for Plot/Land */}
                  {showPlotOptions && (
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-2">Preferred Facing</p>
                      <div className="flex flex-wrap gap-2">
                        {FACINGS.map(f => (
                          <button key={f} type="button" 
                            onClick={() => setForm({ ...form, facing: form.facing === f ? '' : f })} 
                            className={`px-3 py-2 rounded-lg text-sm font-bold ${
                              form.facing === f ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Corner Plot */}
                  {showPlotOptions && (
                    <button type="button" onClick={() => setForm({ ...form, is_corner_plot: !form.is_corner_plot })}
                      className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 ${
                        form.is_corner_plot ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        form.is_corner_plot ? 'bg-white border-white' : 'border-gray-400'
                      }`}>
                        {form.is_corner_plot && <Check className="w-3 h-3 text-amber-500" />}
                      </div>
                      <span className="font-bold">Corner Plot Preferred</span>
                    </button>
                  )}
                  
                  {/* Budget - Units first, then Min/Max in one row */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Budget Range</p>
                    <div className="flex gap-2 mb-3">
                      {['Lakhs', 'Crores'].map(u => (
                        <button key={u} type="button" onClick={() => setForm({ ...form, budget_unit: u })} 
                          className={`flex-1 py-3 rounded-xl font-bold ${
                            form.budget_unit === u ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {u}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Min ({form.budget_unit})</label>
                        <input type="number" inputMode="numeric" value={form.budget_min} 
                          onChange={(e) => setForm({ ...form, budget_min: e.target.value })} 
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold focus:border-blue-500 outline-none" 
                          placeholder="20" required />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Max ({form.budget_unit})</label>
                        <input type="number" inputMode="numeric" value={form.budget_max} 
                          onChange={(e) => setForm({ ...form, budget_max: e.target.value })} 
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold focus:border-blue-500 outline-none" 
                          placeholder="50" required />
                      </div>
                    </div>
                  </div>
                  
                  {/* Area - Units first, then Min/Max in one row */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Area Size</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {AREA_UNITS.map(u => (
                        <button key={u} type="button" onClick={() => setForm({ ...form, area_unit: u })} 
                          className={`px-3 py-2 rounded-lg text-sm font-bold ${
                            form.area_unit === u ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {u}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Min ({form.area_unit})</label>
                        <input type="number" inputMode="numeric" value={form.area_min} 
                          onChange={(e) => setForm({ ...form, area_min: e.target.value })} 
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold focus:border-blue-500 outline-none" 
                          placeholder="100" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Max ({form.area_unit})</label>
                        <input type="number" inputMode="numeric" value={form.area_max} 
                          onChange={(e) => setForm({ ...form, area_max: e.target.value })} 
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold focus:border-blue-500 outline-none" 
                          placeholder="500" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Location */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Location *</p>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input ref={searchInputRef} type="text" 
                        value={searchQuery || form.location_preference}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (!e.target.value) setForm({ ...form, location_preference: '', latitude: null, longitude: null });
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="Search village, area, city..."
                        className="w-full pl-12 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none" />
                      {searchLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />}
                      {form.location_preference && !searchLoading && (
                        <button type="button" onClick={() => { setForm({ ...form, location_preference: '', latitude: null, longitude: null }); setSearchQuery(''); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2">
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
                      )}
                    </div>
                    
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="mt-2 bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
                        {searchResults.map((result, idx) => (
                          <button key={result.id} type="button" onClick={() => selectLocation(result)}
                            className={`w-full px-4 py-3 text-left hover:bg-blue-50 flex items-start gap-3 ${idx !== searchResults.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <MapPin className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-gray-900">{result.mainText}</p>
                              <p className="text-sm text-gray-500">{result.secondaryText}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {form.latitude && form.longitude && (
                      <div className="mt-2 p-2 bg-green-50 rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-700 font-medium">Location selected - will show on map</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Description */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Notes (Optional)</p>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} 
                      rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 outline-none"
                      placeholder="Any specific requirements..." />
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} 
                      className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-blue-500 text-white rounded-xl font-bold shadow-lg">
                      Post Requirement
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Requirements;
