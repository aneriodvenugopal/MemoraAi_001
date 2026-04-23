import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Phone, MessageCircle, Plus, Filter, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

const WorkforceMap = () => {
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [skillTypes, setSkillTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize Google Maps
  useEffect(() => {
    if (!window.google && GOOGLE_MAPS_KEY) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleServices;
      document.head.appendChild(script);
    } else if (window.google) {
      initializeGoogleServices();
    }
  }, []);

  const initializeGoogleServices = () => {
    // Initialize autocomplete for location search
    if (searchInputRef.current && window.google) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          types: ['(cities)'],
          componentRestrictions: { country: 'in' }
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.geometry) {
          setSearchLocation(place.formatted_address || place.name);
          setUserLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
          
          // Center map on selected location
          if (googleMapRef.current) {
            googleMapRef.current.setCenter({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            });
            googleMapRef.current.setZoom(12);
          }
        }
      });
    }
  };

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied, using default location (Hyderabad)');
          setUserLocation({ lat: 17.385, lng: 78.486 });
        }
      );
    } else {
      setUserLocation({ lat: 17.385, lng: 78.486 });
    }
  }, []);

  // Fetch skill types and cities
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [skillsRes, citiesRes, statsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/workforce/skills`),
          axios.get(`${BACKEND_URL}/api/workforce/cities`),
          axios.get(`${BACKEND_URL}/api/workforce/stats`)
        ]);
        
        setSkillTypes(skillsRes.data);
        setCities(citiesRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };
    
    fetchDropdownData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!window.google || !mapRef.current || !userLocation) return;

    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: userLocation,
        zoom: 12,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add user location marker
      new window.google.maps.Marker({
        position: userLocation,
        map: googleMapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        title: 'Your Location'
      });
    }
  }, [userLocation]);

  // Auto-search on mount
  useEffect(() => {
    if (userLocation) {
      handleSearch();
    }
  }, [userLocation]);

  // Search workers
  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (selectedSkill) params.append('skill_type', selectedSkill);
      if (selectedCity) params.append('city', selectedCity);
      if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
        params.append('radius_km', '50');
      }
      params.append('limit', '100');
      
      const response = await axios.get(`${BACKEND_URL}/api/workforce/search?${params.toString()}`);
      console.log('Workers fetched:', response.data);
      setWorkers(response.data);
      setFilteredWorkers(response.data);
      
      // Update map markers
      updateMapMarkers(response.data);
    } catch (error) {
      console.error('Error searching workers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update map markers
  const updateMapMarkers = (workersList) => {
    if (!googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (workersList.length === 0) {
      console.log('No workers to display on map');
      return;
    }

    console.log('Adding markers for workers:', workersList.length);

    // Add new markers
    workersList.forEach(worker => {
      // Handle both location formats: worker.location.lat or worker.lat
      const lat = worker.location?.lat || worker.lat;
      const lng = worker.location?.lng || worker.lng;
      const city = worker.location?.city || worker.city;

      if (!lat || !lng) {
        console.warn('Worker missing coordinates:', worker);
        return;
      }

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: getSkillColor(worker.skill_type),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        title: `${worker.name} - ${worker.skill_type}`
      });

      // Info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${worker.name}</h3>
            <p style="color: #0066cc; margin-bottom: 4px;">${worker.skill_type}</p>
            <p style="font-size: 12px; color: #666;">${city || ''}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker);
        setSelectedWorker(worker);
        googleMapRef.current.panTo({ lat, lng });
      });

      markersRef.current.push(marker);
    });

    console.log('Markers added:', markersRef.current.length);

    // Fit bounds to show all markers
    if (workersList.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      workersList.forEach(worker => {
        const lat = worker.location?.lat || worker.lat;
        const lng = worker.location?.lng || worker.lng;
        if (lat && lng) {
          bounds.extend({ lat, lng });
        }
      });
      if (!bounds.isEmpty()) {
        googleMapRef.current.fitBounds(bounds);
      }
    }
  };

  // Get color based on skill type
  const getSkillColor = (skillType) => {
    const colors = {
      'Carpenter': '#8B4513',
      'Electrician': '#FFD700',
      'Mason': '#808080',
      'Painter': '#FF69B4',
      'Plumber': '#4169E1',
      'Welder': '#FF4500'
    };
    return colors[skillType] || '#10B981';
  };

  // Filter workers by search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = workers.filter(worker =>
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.skill_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.location.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWorkers(filtered);
      updateMapMarkers(filtered);
    } else {
      setFilteredWorkers(workers);
      updateMapMarkers(workers);
    }
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Construction Workforce Map</h1>
              <p className="text-sm text-gray-600">Find skilled construction workers near you</p>
            </div>
            
            {stats && (
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total_approved_workers}</div>
                  <div className="text-gray-600">Workers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{skillTypes.length}</div>
                  <div className="text-gray-600">Skills</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{cities.length}</div>
                  <div className="text-gray-600">Cities</div>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar with Google Places Autocomplete */}
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search location (city, area)..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Skills</option>
              {skillTypes.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search'}
            </button>

            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Worker
            </button>
          </div>
          
          {/* Name/Skill Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by worker name or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Map and Results */}
      <div className="flex h-[calc(100vh-240px)]">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Results Panel */}
        <div className="w-96 bg-white border-l overflow-y-auto">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">
              {filteredWorkers.length} Workers Found
            </h2>
          </div>

          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Searching workers...</p>
              </div>
            ) : filteredWorkers.map(worker => {
              const lat = worker.location?.lat || worker.lat;
              const lng = worker.location?.lng || worker.lng;
              const city = worker.location?.city || worker.city;
              const state = worker.location?.state || worker.state;
              
              return (
              <div
                key={worker.id}
                onClick={() => {
                  setSelectedWorker(worker);
                  if (googleMapRef.current && lat && lng) {
                    googleMapRef.current.panTo({ lat, lng });
                    googleMapRef.current.setZoom(14);
                  }
                }}
                className={`p-4 cursor-pointer hover:bg-blue-50 transition ${
                  selectedWorker?.id === worker.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{worker.name}</h3>
                    <p className="text-sm text-blue-600">{worker.skill_type}</p>
                  </div>
                  {worker.distance_km && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {worker.distance_km} km
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{city}, {state}</span>
                  </div>
                  
                  {worker.experience_years && (
                    <p>Experience: {worker.experience_years} years</p>
                  )}
                  
                  {worker.work_type && (
                    <p>Work Type: {worker.work_type}</p>
                  )}
                  
                  {worker.daily_rate && (
                    <p className="text-green-600 font-medium">₹{worker.daily_rate}/day</p>
                  )}
                  
                  {worker.source && worker.source !== 'user_submitted' && (
                    <p className="text-xs text-blue-600 font-medium">📱 Found on: {worker.source}</p>
                  )}
                  
                  {worker.description && (
                    <p className="text-xs text-gray-500 mt-1">{worker.description}</p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <a
                    href={`tel:${worker.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                  <a
                    href={`https://wa.me/91${worker.whatsapp || worker.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
            )})}
          </div>

          {filteredWorkers.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">No workers found in this area.</p>
              <p className="text-sm">Try adjusting your search filters or location.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Worker Modal */}
      {showAddForm && (
        <AddWorkerModal
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            handleSearch();
          }}
        />
      )}
    </div>
  );
};

// Add Worker Modal Component
const AddWorkerModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    skill_type: '',
    phone: '',
    whatsapp: '',
    city: '',
    state: '',
    experience_years: '',
    work_type: '',
    daily_rate: '',
    description: ''
  });
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [skillTypes, setSkillTypes] = useState([]);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
      );
    }

    // Fetch skill types
    axios.get(`${BACKEND_URL}/api/workforce/skills`)
      .then(res => setSkillTypes(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
        location: {
          lat: location?.lat || 17.385,
          lng: location?.lng || 78.486,
          city: formData.city,
          state: formData.state
        }
      };

      await axios.post(`${BACKEND_URL}/api/workforce/add`, payload);
      alert('Worker submitted successfully! It will be visible after admin approval.');
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to add worker. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Add Skilled Worker</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Type *</label>
                <select
                  required
                  value={formData.skill_type}
                  onChange={(e) => setFormData({ ...formData, skill_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Skill</option>
                  {skillTypes.map(skill => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  pattern="[0-9]{10}"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                <select
                  value={formData.work_type}
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="Daily">Daily</option>
                  <option value="Contract">Contract</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of expertise..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
              <p>Your submission will be reviewed by our admin team before being visible on the map.</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkforceMap;
