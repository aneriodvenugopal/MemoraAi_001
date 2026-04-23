import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGeoLocation } from '../context/LocationContext';
import { HelpButton } from '../components/DemoGuide';
import { useGooglePlacesAutocomplete } from '../components/GooglePlacesAutocomplete';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { ArrowLeft, SlidersHorizontal, MapPin, Grid3X3, X, Heart, Search, Loader2, Crosshair, Wallet, Phone, Eye, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Debounce hook for search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Property markers - larger and more visible
// Property markers with type icons
const createSaleMarker = (price, priceUnit, propertyType) => {
  const icon = propertyType === 'Land' ? '🌾' : propertyType === 'Plot' ? '📐' : '🏠';
  return L.divIcon({
    className: 'sale-marker',
    html: `<div style="
      display:flex;
      align-items:center;
      justify-content:center;
      gap:4px;
      min-width:70px;
      height:32px;
      padding:0 10px;
      background:linear-gradient(135deg, #FF9500, #FF6B00);
      border:2px solid white;
      border-radius:16px;
      box-shadow:0 3px 10px rgba(0,0,0,0.25);
      font-size:12px;
      font-weight:700;
      color:white;
      white-space:nowrap;
    "><span style="font-size:14px">${icon}</span>₹${price}${priceUnit === 'Crore' ? 'Cr' : 'L'}</div>`,
    iconSize: [70, 32], iconAnchor: [35, 16], popupAnchor: [0, -16]
  });
};

const createBuyMarker = (propertyType) => {
  const icon = propertyType === 'Land' ? '🌾' : propertyType === 'Plot' ? '📐' : '🔍';
  return L.divIcon({
    className: 'buy-marker',
    html: `<div style="
      display:flex;
      align-items:center;
      justify-content:center;
      gap:4px;
      min-width:80px;
      height:36px;
      padding:0 12px;
      background:linear-gradient(135deg, #0095F6, #0066CC);
      border:3px solid white;
      border-radius:18px;
      box-shadow:0 4px 12px rgba(0,149,246,0.4);
      font-size:12px;
      font-weight:700;
      color:white;
      white-space:nowrap;
    "><span style="font-size:14px">${icon}</span>WANTED</div>`,
    iconSize: [80, 36], iconAnchor: [40, 18], popupAnchor: [0, -18]
  });
};

const TYPES = ['All', 'Land', 'Plot', 'Apartment', 'House', 'Commercial'];
const RADIUS_OPTIONS = [5, 10, 20, 50];

const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 13); }, [center, map]);
  return null;
};

// Property Card - Instagram style
const PropertyCard = ({ property, isBuying, onFavorite, isFavorite }) => {
  const navigate = useNavigate();
  
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => !isBuying && navigate(`/agentapex/property/${property.id}`)}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100"
    >
      <div className="relative aspect-[4/3]">
        <img
          src={property.images?.[0] || 'https://images.pexels.com/photos/3030307/pexels-photo-3030307.jpeg?auto=compress&cs=tinysrgb&w=400'}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${isBuying ? 'bg-blue-500' : 'bg-amber-500'}`}>
            {isBuying ? 'WANTED' : 'FOR SALE'}
          </span>
        </div>
        {!isBuying && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite?.(property.id); }}
            className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
          </button>
        )}
      </div>
      <div className="p-3">
        <p className="text-lg font-bold text-gray-900">
          {'\u20B9'}{isBuying ? `${property.budget_min}-${property.budget_max}` : property.price} {property.price_unit || property.budget_unit}
        </p>
        <p className="text-sm text-gray-900 font-medium mt-0.5">{property.title || property.property_type}</p>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          {property.location || property.location_preference}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {property.property_id && (
            <span className="px-1.5 py-0.5 bg-gray-900 text-white rounded text-[10px] font-mono font-bold">{property.property_id}</span>
          )}
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{property.property_type}</span>
          <span className="text-xs text-gray-500">{isBuying ? (property.area_min || 'Any size') : `${property.area} ${property.area_unit}`}</span>
        </div>
      </div>
    </motion.div>
  );
};

const MapSearch = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { location: userLocation, loading: locationLoading, requestLocation, permissionStatus } = useGeoLocation();
  
  const [viewMode, setViewMode] = useState('map');
  const [listingMode, setListingMode] = useState('sell');
  const [properties, setProperties] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  
  // Search & Filters
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('All');
  const [maxPrice, setMaxPrice] = useState(500);
  const [radius, setRadius] = useState(10);
  const [searchCenter, setSearchCenter] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  
  // Wallet state
  const [wallet, setWallet] = useState({ points: 200 });
  const [viewedContacts, setViewedContacts] = useState([]);
  const [showContactModal, setShowContactModal] = useState(null); // { type, item }
  const [viewingContact, setViewingContact] = useState(false);
  const [contactDetails, setContactDetails] = useState(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { isReady: googlePlacesReady, search: googleSearch, getPlaceDetails } = useGooglePlacesAutocomplete();
  
  // Default to Hyderabad if no user location
  const DEFAULT_CENTER = [17.385, 78.4867];
  const mapCenter = searchCenter || (userLocation ? [userLocation.latitude, userLocation.longitude] : DEFAULT_CENTER);

  // Location search with Google Places - start from 2 chars
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchLocations(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

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
          ...r,
          name: r.fullDescription,
          query: query
        })));
      } else {
        // Fallback to Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, India&limit=8&addressdetails=1&countrycodes=in`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'MemoraAI/1.0' } }
        );
        const data = await response.json();
        setSearchResults(data.map(r => ({
          id: r.place_id,
          name: r.display_name,
          mainText: r.address?.village || r.address?.suburb || r.address?.town || r.address?.city || r.name || r.display_name.split(',')[0],
          secondaryText: [r.address?.state_district, r.address?.state].filter(Boolean).join(', '),
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          query: query
        })));
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Highlight matching text helper
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <strong key={i} className="text-gray-900 font-bold">{part}</strong>
        : part
    );
  };

  const selectLocation = async (result) => {
    if (result.place_id && googlePlacesReady) {
      // Google Places result - get details
      try {
        const details = await getPlaceDetails(result.place_id);
        setSearchCenter([details.latitude, details.longitude]);
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        toast.success(`Showing properties near ${result.mainText}`);
      } catch (err) {
        console.error('Error getting place details:', err);
      }
    } else if (result.lat && result.lon) {
      // Nominatim result with lat/lon
      setSearchCenter([result.lat, result.lon]);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      toast.success(`Showing properties near ${result.name?.split(',')[0] || result.mainText}`);
    }
  };

  // Fetch wallet and viewed contacts
  const fetchWallet = async () => {
    try {
      const [walletRes, contactsRes] = await Promise.all([
        api().get('/wallet'),
        api().get('/wallet/contacts')
      ]);
      setWallet(walletRes.data);
      setViewedContacts(contactsRes.data);
    } catch (e) { console.error('Wallet fetch error:', e); }
  };

  useEffect(() => { fetchWallet(); }, []);

  useEffect(() => { fetchData(); }, [selectedType, maxPrice, radius, searchCenter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const lat = searchCenter?.[0] || userLocation?.latitude;
      const lng = searchCenter?.[1] || userLocation?.longitude;
      const params = { latitude: lat, longitude: lng, radius_km: radius };
      if (selectedType !== 'All') params.property_type = selectedType;
      if (maxPrice) params.max_price = maxPrice;
      
      const [propsRes, reqsRes, favsRes] = await Promise.all([
        api().get('/properties', { params }),
        api().get('/requirements/all'),
        api().get('/favorites')
      ]);
      
      setProperties(propsRes.data);
      setRequirements(reqsRes.data);
      setFavorites(new Set(favsRes.data.map(p => p.id)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggleFavorite = async (id) => {
    try {
      if (favorites.has(id)) {
        await api().delete(`/favorites/${id}`);
        setFavorites(prev => { const n = new Set(prev); n.delete(id); return n; });
      } else {
        await api().post(`/favorites/${id}`);
        setFavorites(prev => new Set(prev).add(id));
      }
    } catch (e) { console.error(e); }
  };

  // View contact with wallet system
  const viewContact = async (itemId, itemType) => {
    setViewingContact(true);
    try {
      const formData = new FormData();
      formData.append('item_id', itemId);
      formData.append('item_type', itemType);
      
      const res = await api().post('/wallet/view-contact', formData);
      
      if (res.data.success) {
        setContactDetails(res.data.contact);
        setWallet(prev => ({ ...prev, points: res.data.points_remaining || prev.points }));
        if (!res.data.already_viewed) {
          toast.success(`Contact unlocked! ${res.data.points_remaining} points remaining`);
        }
      } else if (res.data.needs_payment) {
        toast.error('Add more points to view contacts');
        setContactDetails(null);
      }
    } catch (e) {
      console.error('View contact error:', e);
      toast.error('Failed to get contact');
    }
    setViewingContact(false);
  };

  // Check if contact already viewed
  const isContactViewed = (itemId) => {
    return viewedContacts.some(c => c.item_id === itemId);
  };

  const data = listingMode === 'sell' ? properties : requirements;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center shrink-0">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          
          {/* Search Bar */}
          <div 
            onClick={() => setShowSearch(true)}
            className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2 cursor-pointer"
          >
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500 text-sm truncate">
              {searchCenter ? 'Custom location' : 'Search...'}
            </span>
          </div>
          
          {/* Wallet Display */}
          <div className="flex items-center gap-1 px-3 py-2 bg-amber-50 rounded-full">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-700">{wallet.points}</span>
          </div>
          
          <HelpButton screen="map" />
          
          <button 
            onClick={() => setShowFilters(true)} 
            data-testid="filter-btn"
            className="w-10 h-10 flex items-center justify-center shrink-0"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-900" />
          </button>
        </div>
        
        {/* Mode Toggle - Instagram style segmented control */}
        <div className="flex gap-2 mt-3 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setListingMode('sell')}
            data-testid="mode-sell"
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              listingMode === 'sell' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            For Sale ({properties.length})
          </button>
          <button
            onClick={() => setListingMode('buy')}
            data-testid="mode-buy"
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              listingMode === 'buy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Wanted ({requirements.length})
          </button>
        </div>
      </header>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[1000] flex flex-col"
          >
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
                  <Search className="w-6 h-6 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search village, area, city..."
                    className="flex-1 bg-transparent border-none outline-none text-lg"
                    autoFocus
                  />
                  {searchLoading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                  {searchQuery && !searchLoading && (
                    <button onClick={() => setSearchQuery('')}>
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div>
                  {searchResults.map((result, idx) => (
                    <button
                      key={result.id}
                      onClick={() => selectLocation(result)}
                      className={`w-full px-4 py-4 flex items-start gap-4 text-left hover:bg-blue-50 active:bg-blue-100 ${
                        idx !== searchResults.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg text-gray-600">
                          {highlightMatch(result.mainText, searchQuery)}
                        </p>
                        <p className="text-base text-gray-400 mt-0.5">{result.secondaryText}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 && !searchLoading ? (
                <div className="p-8 text-center">
                  <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-lg text-gray-500">No locations found</p>
                  <p className="text-base text-gray-400 mt-1">Try different spelling</p>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-base font-bold text-gray-700 mb-4">Popular Areas</p>
                  <div className="flex flex-wrap gap-3">
                    {['Hyderabad', 'Bangalore', 'Mumbai', 'Chennai', 'Vijayawada', 'Guntur', 'Tirupati', 'Warangal'].map(city => (
                      <button
                        key={city}
                        onClick={() => setSearchQuery(city)}
                        className="px-5 py-3 bg-gray-100 rounded-full text-base font-medium text-gray-700"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => {
                      if (userLocation) {
                        setSearchCenter([userLocation.latitude, userLocation.longitude]);
                        setShowSearch(false);
                        toast.success('Using your current location');
                      } else {
                        requestLocation();
                      }
                    }}
                    className="w-full mt-6 py-4 bg-blue-500 text-white rounded-2xl flex items-center justify-center gap-3 text-lg font-bold"
                  >
                    <Crosshair className="w-6 h-6" />
                    Use My Location
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Toggle */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setViewMode('map')}
          data-testid="view-map"
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            viewMode === 'map' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500'
          }`}
        >
          <MapPin className="w-4 h-4" /> Map
        </button>
        <button
          onClick={() => setViewMode('list')}
          data-testid="view-list"
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            viewMode === 'list' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500'
          }`}
        >
          <Grid3X3 className="w-4 h-4" /> Grid
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {viewMode === 'map' ? (
          <div className="h-[calc(100vh-180px)]">
            <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapRecenter center={mapCenter} />
              
              {userLocation && (
                <>
                  <Marker position={[userLocation.latitude, userLocation.longitude]} icon={L.divIcon({
                    className: 'user-loc',
                    html: `<div style="
                      width:40px;
                      height:40px;
                      background:linear-gradient(135deg, #667eea, #764ba2);
                      border:3px solid white;
                      border-radius:50%;
                      box-shadow:0 3px 10px rgba(102,126,234,0.4);
                      display:flex;
                      align-items:center;
                      justify-content:center;
                    ">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>`,
                    iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20]
                  })}>
                    <Popup><span className="text-sm font-medium">You are here</span></Popup>
                  </Marker>
                </>
              )}
              
              {/* Radius Circle - centered on search location or user location */}
              {(searchCenter || userLocation) && (
                <Circle 
                  center={searchCenter || [userLocation.latitude, userLocation.longitude]} 
                  radius={radius * 1000} 
                  pathOptions={{ 
                    color: listingMode === 'sell' ? '#FF9500' : '#0095F6', 
                    fillOpacity: 0.06, 
                    weight: 2,
                    dashArray: '8, 6'
                  }} 
                />
              )}
              
              {listingMode === 'sell' && properties.filter(p => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0).map(p => (
                <Marker 
                  key={p.id} 
                  position={[p.latitude, p.longitude]} 
                  icon={createSaleMarker(p.price, p.price_unit, p.property_type)}
                  eventHandlers={{
                    click: () => {
                      setSelectedProperty(p);
                      setSelectedRequirement(null);
                    }
                  }}
                />
              ))}

              {listingMode === 'buy' && requirements.filter(r => r.latitude && r.longitude).map((r) => (
                <Marker 
                  key={r.id} 
                  position={[r.latitude, r.longitude]} 
                  icon={createBuyMarker(r.property_type)}
                  eventHandlers={{
                    click: () => {
                      setSelectedRequirement(r);
                      setSelectedProperty(null);
                    }
                  }}
                />
              ))}
            </MapContainer>
            
            {/* My Location Button */}
            <button
              onClick={() => {
                if (userLocation) {
                  setSearchCenter([userLocation.latitude, userLocation.longitude]);
                  toast.success('Centered on your location');
                } else {
                  requestLocation();
                  toast.info('Requesting location access...');
                }
              }}
              className="absolute top-4 right-4 z-[1000] w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200"
              data-testid="my-location-btn"
            >
              <Crosshair className={`w-5 h-5 ${userLocation ? 'text-blue-500' : 'text-gray-400'}`} />
            </button>

            {/* Radius Badge */}
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur rounded-full px-3 py-1.5 shadow-md border border-gray-200 flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${listingMode === 'sell' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <span className="text-xs font-semibold text-gray-700">{radius} km radius</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs font-medium text-gray-600">
                {listingMode === 'sell' ? properties.length : requirements.length} found
              </span>
            </div>
            
            {/* Floating Result Count */}
            <div className="absolute bottom-6 left-4 right-4 z-[1000]">
              <button
                onClick={() => setViewMode('list')}
                className={`w-full py-3.5 rounded-full font-semibold text-white shadow-lg ${
                  listingMode === 'sell' ? 'bg-amber-500' : 'bg-blue-500'
                }`}
              >
                View {data.length} {listingMode === 'sell' ? 'Properties' : 'Requirements'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 gap-3 pb-20">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-2xl skeleton" />
              ))
            ) : data.length === 0 ? (
              <div className="col-span-2 text-center py-16">
                <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">No properties found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              data.map(item => (
                <PropertyCard 
                  key={item.id} 
                  property={item} 
                  isBuying={listingMode === 'buy'}
                  isFavorite={favorites.has(item.id)}
                  onFavorite={toggleFavorite}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Filter Drawer - Instagram style bottom sheet */}
      <Drawer.Root open={showFilters} onOpenChange={setShowFilters}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] max-h-[85vh] outline-none">
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Filters</h2>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              
              {/* Property Type */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">Property Type</p>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedType(t)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedType === t 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Price Range */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">Max Price</p>
                  <p className="text-sm font-bold text-gray-900">₹{maxPrice} Lakhs</p>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
                />
              </div>
              
              {/* Radius */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">Search Radius</p>
                  <p className="text-sm font-bold text-blue-600">{radius} km</p>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 mb-3"
                  data-testid="radius-slider"
                />
                <div className="flex gap-2">
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      data-testid={`radius-${r}`}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        radius === r 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Apply Button */}
              <button
                onClick={() => { fetchData(); setShowFilters(false); }}
                className="w-full py-4 bg-gray-900 text-white font-semibold rounded-xl"
              >
                Apply Filters
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Property Details Bottom Sheet */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[1000] p-4 pb-8"
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <button 
              onClick={() => setSelectedProperty(null)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl">
                {selectedProperty.property_type === 'Land' ? '🌾' : '📐'}
              </div>
              <div className="flex-1">
                {selectedProperty.property_id && (
                  <span className="inline-block px-2 py-0.5 bg-gray-900 text-white text-[10px] font-mono font-bold rounded mb-1">
                    {selectedProperty.property_id}
                  </span>
                )}
                <p className="text-2xl font-bold text-gray-900">{'\u20B9'}{selectedProperty.price} {selectedProperty.price_unit}</p>
                <p className="text-gray-500 font-medium">{selectedProperty.property_type} - {selectedProperty.area} {selectedProperty.area_unit}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                {selectedProperty.location}
              </p>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSelectedProperty(null);
                  navigate(`/agentapex/property/${selectedProperty.id}`);
                }}
                className="py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg"
              >
                View Details
              </button>
              <button
                onClick={() => toggleFavorite(selectedProperty.id)}
                className={`py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
                  favorites.has(selectedProperty.id) 
                    ? 'bg-red-50 text-red-500 border border-red-200' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Heart className={`w-5 h-5 ${favorites.has(selectedProperty.id) ? 'fill-current' : ''}`} />
                {favorites.has(selectedProperty.id) ? 'Saved' : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Requirement Details Bottom Sheet - with Contact View */}
      <AnimatePresence>
        {selectedRequirement && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[1000] p-4 pb-8"
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <button 
              onClick={() => { setSelectedRequirement(null); setContactDetails(null); }}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-2xl">
                {selectedRequirement.property_type === 'Land' ? '🌾' : '📐'}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-blue-600">BUYER WANTED</p>
                <p className="text-sm text-gray-500">{selectedRequirement.property_type}</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600">Budget</p>
                <p className="text-base font-bold text-gray-900">₹{selectedRequirement.budget_min}-{selectedRequirement.budget_max} {selectedRequirement.budget_unit}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">Area</p>
                <p className="text-base font-bold text-gray-900">{selectedRequirement.area_min || '?'}-{selectedRequirement.area_max || '?'} {selectedRequirement.area_unit}</p>
              </div>
            </div>
            
            <div className="mt-2 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
              <p className="text-sm text-gray-700">{selectedRequirement.location_preference}</p>
            </div>
            
            {/* Contact Section */}
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
              {contactDetails ? (
                <div className="text-center">
                  <p className="text-xs text-green-600 font-medium mb-2">BUYER CONTACT</p>
                  <p className="text-lg font-bold text-gray-900">{contactDetails.name}</p>
                  <a href={`tel:${contactDetails.phone}`} className="inline-flex items-center gap-2 mt-2 px-6 py-3 bg-green-500 text-white rounded-full font-bold">
                    <Phone className="w-5 h-5" />
                    {contactDetails.phone}
                  </a>
                </div>
              ) : isContactViewed(selectedRequirement.id) ? (
                <button
                  onClick={() => viewContact(selectedRequirement.id, 'requirement')}
                  disabled={viewingContact}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {viewingContact ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                  View Contact (Already Paid)
                </button>
              ) : (
                <button
                  onClick={() => viewContact(selectedRequirement.id, 'requirement')}
                  disabled={viewingContact}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {viewingContact ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      View Contact (-10 pts)
                    </>
                  )}
                </button>
              )}
              
              <p className="text-xs text-center text-gray-500 mt-2">
                Wallet: {wallet.points} points • {viewedContacts.length}/20 free contacts used
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapSearch;
