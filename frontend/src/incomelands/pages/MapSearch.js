import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { ArrowLeft, SlidersHorizontal, MapPin, Grid3X3, X, Heart, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Simple markers
const createSaleMarker = () => L.divIcon({
  className: 'sale-marker',
  html: `<div style="width:14px;height:14px;background:#FF9500;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.2)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -7]
});

const createBuyMarker = () => L.divIcon({
  className: 'buy-marker',
  html: `<div style="width:14px;height:14px;background:#0095F6;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.2)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -7]
});

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
      onClick={() => !isBuying && navigate(`/property/${property.id}`)}
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
          ₹{isBuying ? `${property.budget_min}-${property.budget_max}` : property.price} {property.price_unit || property.budget_unit}
        </p>
        <p className="text-sm text-gray-900 font-medium mt-0.5">{property.title || property.property_type}</p>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          {property.location || property.location_preference}
        </p>
        <div className="flex items-center gap-2 mt-2">
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
  const { location: userLocation } = useLocation();
  
  const [viewMode, setViewMode] = useState('map');
  const [listingMode, setListingMode] = useState('sell');
  const [properties, setProperties] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('All');
  const [maxPrice, setMaxPrice] = useState(500);
  const [radius, setRadius] = useState(10);
  
  const mapCenter = [userLocation?.latitude || 17.385, userLocation?.longitude || 78.4867];

  useEffect(() => { fetchData(); }, [selectedType, maxPrice, radius]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { latitude: userLocation?.latitude, longitude: userLocation?.longitude, radius_km: radius };
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

  const data = listingMode === 'sell' ? properties : requirements;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-gray-900">Search</h1>
          <button 
            onClick={() => setShowFilters(true)} 
            data-testid="filter-btn"
            className="w-10 h-10 flex items-center justify-center"
          >
            <SlidersHorizontal className="w-6 h-6 text-gray-900" />
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
                    html: '<div style="width:12px;height:12px;background:#0095F6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px rgba(0,149,246,0.3)"></div>',
                    iconSize: [12, 12], iconAnchor: [6, 6]
                  })}>
                    <Popup><span className="text-sm font-medium">You are here</span></Popup>
                  </Marker>
                  <Circle 
                    center={[userLocation.latitude, userLocation.longitude]} 
                    radius={radius * 1000} 
                    pathOptions={{ 
                      color: listingMode === 'sell' ? '#FF9500' : '#0095F6', 
                      fillOpacity: 0.05, 
                      weight: 2,
                      dashArray: '5, 5'
                    }} 
                  />
                </>
              )}
              
              {listingMode === 'sell' && properties.map(p => (
                <Marker key={p.id} position={[p.latitude, p.longitude]} icon={createSaleMarker()}>
                  <Popup>
                    <div className="min-w-[160px]">
                      <p className="font-bold text-amber-600">₹{p.price} {p.price_unit}</p>
                      <p className="text-gray-600 text-sm">{p.property_type}</p>
                      <p className="text-gray-400 text-xs">{p.area} {p.area_unit}</p>
                      <button 
                        onClick={() => navigate(`/property/${p.id}`)} 
                        className="mt-2 w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {listingMode === 'buy' && requirements.map((r, i) => (
                <Marker 
                  key={r.id} 
                  position={[mapCenter[0] + (Math.random() - 0.5) * 0.08, mapCenter[1] + (Math.random() - 0.5) * 0.08]} 
                  icon={createBuyMarker()}
                >
                  <Popup>
                    <div className="min-w-[160px]">
                      <p className="font-bold text-blue-600">₹{r.budget_min}-{r.budget_max} {r.budget_unit}</p>
                      <p className="text-gray-600 text-sm">{r.property_type}</p>
                      <p className="text-gray-400 text-xs">{r.location_preference}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            
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
                <p className="text-sm font-semibold text-gray-900 mb-3">Search Radius</p>
                <div className="flex gap-2">
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        radius === r 
                          ? 'bg-gray-900 text-white' 
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
    </div>
  );
};

export default MapSearch;
