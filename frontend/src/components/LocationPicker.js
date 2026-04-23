import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Navigation, AlertCircle } from 'lucide-react';
import './LocationPicker.css';

const LocationPicker = ({ onLocationSelect, initialLocation = null }) => {
  const [query, setQuery] = useState(initialLocation?.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 17.385, lng: 78.486 }); // Default: Hyderabad
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(null);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteService = useRef(null);
  const geocoder = useRef(null);
  const debounceTimer = useRef(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });

  useEffect(() => {
    // Load Google Maps if not already loaded
    if (!window.google) {
      loadGoogleMaps();
    } else {
      initializeGoogleServices();
    }
  }, []);

  const loadGoogleMaps = () => {
    setIsLoadingMaps(true);
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setGoogleMapsError('Google Maps API key not configured');
      setIsLoadingMaps(false);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;

    window.initGoogleMapsCallback = () => {
      setIsLoadingMaps(false);
      setIsGoogleMapsLoaded(true);
      initializeGoogleServices();
    };

    script.onerror = () => {
      setIsLoadingMaps(false);
      setGoogleMapsError('Failed to load Google Maps. Please check your internet connection.');
    };

    window.gm_authFailure = () => {
      setIsLoadingMaps(false);
      setGoogleMapsError('Google Maps authentication failed. Billing may not be enabled.');
    };

    document.head.appendChild(script);
  };

  const initializeGoogleServices = () => {
    if (window.google) {
      try {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        geocoder.current = new window.google.maps.Geocoder();
        setIsGoogleMapsLoaded(true);
        setGoogleMapsError(null);
      } catch (error) {
        setGoogleMapsError('Failed to initialize Google Maps services');
        console.error('Google Maps initialization error:', error);
      }
    }
  };

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounce API calls
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (autocompleteService.current) {
        autocompleteService.current.getPlacePredictions(
          {
            input: value,
            componentRestrictions: { country: 'in' },
            types: ['geocode']
          },
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setSuggestions(predictions);
            } else {
              setSuggestions([]);
            }
          }
        );
      }
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.description);
    setSuggestions([]);

    // Geocode the selected place
    if (geocoder.current) {
      geocoder.current.geocode(
        { placeId: suggestion.place_id },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            const locationData = {
              address: suggestion.description,
              latitude: location.lat(),
              longitude: location.lng(),
              placeId: suggestion.place_id
            };
            
            setSelectedLocation(locationData);
            setMapCenter({ lat: location.lat(), lng: location.lng() });
            setShowMap(true);
          }
        }
      );
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setMapCenter({ lat, lng });
          setShowMap(true);

          // Reverse geocode to get address
          if (geocoder.current) {
            geocoder.current.geocode(
              { location: { lat, lng } },
              (results, status) => {
                if (status === 'OK' && results[0]) {
                  const locationData = {
                    address: results[0].formatted_address,
                    latitude: lat,
                    longitude: lng,
                    placeId: results[0].place_id
                  };
                  setQuery(results[0].formatted_address);
                  setSelectedLocation(locationData);
                }
              }
            );
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please enable location permissions.');
        }
      );
    }
  };

  const initializeMap = () => {
    if (!window.google || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: 15,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    const marker = new window.google.maps.Marker({
      position: mapCenter,
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP
    });

    markerRef.current = marker;

    // Update location when marker is dragged
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      const lat = position.lat();
      const lng = position.lng();

      // Reverse geocode new position
      if (geocoder.current) {
        geocoder.current.geocode(
          { location: { lat, lng } },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              const locationData = {
                address: results[0].formatted_address,
                latitude: lat,
                longitude: lng,
                placeId: results[0].place_id
              };
              setQuery(results[0].formatted_address);
              setSelectedLocation(locationData);
            }
          }
        );
      }
    });
  };

  useEffect(() => {
    if (showMap && window.google) {
      setTimeout(initializeMap, 100);
    }
  }, [showMap, mapCenter]);

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
    }
  };

  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Invalid coordinates range');
      return;
    }

    setMapCenter({ lat, lng });
    setShowMap(true);
    setShowManualEntry(false);

    // Reverse geocode if possible
    if (geocoder.current) {
      geocoder.current.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            const locationData = {
              address: results[0].formatted_address,
              latitude: lat,
              longitude: lng,
              placeId: results[0].place_id
            };
            setQuery(results[0].formatted_address);
            setSelectedLocation(locationData);
          } else {
            // Fallback without address
            const locationData = {
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              latitude: lat,
              longitude: lng,
              placeId: null
            };
            setQuery(locationData.address);
            setSelectedLocation(locationData);
          }
        }
      );
    } else {
      const locationData = {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng,
        placeId: null
      };
      setQuery(locationData.address);
      setSelectedLocation(locationData);
    }
  };

  return (
    <div className="location-picker">
      {/* Google Maps Error Display */}
      {googleMapsError && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <AlertCircle size={18} color="#f57c00" style={{ marginRight: '8px' }} />
            <strong style={{ color: '#f57c00' }}>Google Maps Error</strong>
          </div>
          <p style={{ margin: '4px 0', color: '#666' }}>{googleMapsError}</p>
          {googleMapsError.includes('Billing') || googleMapsError.includes('authentication') ? (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              <p><strong>Action Required:</strong></p>
              <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Go to <a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3' }}>Google Cloud Console</a></li>
                <li>Enable Billing for your project</li>
                <li>Enable Places API & Maps JavaScript API</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          ) : null}
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showManualEntry ? 'Hide Manual Entry' : 'Enter Coordinates Manually'}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoadingMaps && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
          <p>Loading Google Maps...</p>
        </div>
      )}

      {/* Manual Coordinates Entry */}
      {showManualEntry && (
        <div style={{
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Enter Coordinates Manually</h4>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="number"
              step="0.000001"
              placeholder="Latitude (e.g., 17.385)"
              value={manualCoords.lat}
              onChange={(e) => setManualCoords(prev => ({ ...prev, lat: e.target.value }))}
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
            <input
              type="number"
              step="0.000001"
              placeholder="Longitude (e.g., 78.486)"
              value={manualCoords.lng}
              onChange={(e) => setManualCoords(prev => ({ ...prev, lng: e.target.value }))}
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
          <button
            onClick={handleManualLocationSubmit}
            style={{
              width: '100%',
              padding: '8px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Set Location
          </button>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#666' }}>
            💡 Tip: You can get coordinates from Google Maps by right-clicking on a location
          </p>
        </div>
      )}

      <div className="location-search">
        <div className="search-input-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search location..."
            className="location-input"
            disabled={!isGoogleMapsLoaded || isLoadingMaps}
          />
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="current-location-btn"
            title="Use current location"
            disabled={isLoadingMaps}
          >
            <Navigation size={18} />
          </button>
        </div>

        {!isGoogleMapsLoaded && !googleMapsError && !isLoadingMaps && (
          <div style={{ padding: '8px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
            Search will be available once Google Maps loads
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="location-suggestions">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.place_id}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <MapPin size={16} />
                <div className="suggestion-text">
                  <div className="suggestion-main">{suggestion.structured_formatting.main_text}</div>
                  <div className="suggestion-secondary">{suggestion.structured_formatting.secondary_text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showMap && (
        <div className="location-map-container">
          <div className="map-instruction">
            📍 Drag the pin to adjust exact location
          </div>
          <div ref={mapRef} className="location-map" />
          <button
            type="button"
            onClick={handleConfirmLocation}
            className="confirm-location-btn"
          >
            ✓ Confirm Location
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
