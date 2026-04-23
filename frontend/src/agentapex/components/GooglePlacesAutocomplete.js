import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Highlight matching text
const HighlightText = ({ text, query }) => {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-blue-600 font-semibold">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

/**
 * Google Places Autocomplete Component
 * 
 * Props:
 * - onSelect: (location) => void - Called when user selects a location
 *   Returns: { place_id, location_text, latitude, longitude, formatted_address, city, state, postal_code }
 * - onClose: () => void - Called when user closes the search (for fullscreen mode)
 * - mode: 'inline' | 'fullscreen' - Display mode
 * - placeholder: string - Input placeholder
 * - initialValue: string - Initial value for the input
 * - className: string - Additional classes for the container
 */
export const GooglePlacesAutocomplete = ({
  onSelect,
  onClose,
  mode = 'inline',
  placeholder = 'Search location...',
  initialValue = '',
  className = ''
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const containerRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Initialize Google Places with robust polling
  useEffect(() => {
    let attempts = 0;
    let intervalId = null;

    const initGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        
        // Create a dummy map for PlacesService
        const mapDiv = document.createElement('div');
        mapDiv.style.display = 'none';
        document.body.appendChild(mapDiv);
        const map = new window.google.maps.Map(mapDiv, {
          center: { lat: 17.385, lng: 78.4867 },
          zoom: 10
        });
        placesServiceRef.current = new window.google.maps.places.PlacesService(map);
        if (intervalId) clearInterval(intervalId);
        return true;
      }
      return false;
    };

    if (!initGooglePlaces()) {
      intervalId = setInterval(() => {
        attempts++;
        if (initGooglePlaces() || attempts >= 20) {
          clearInterval(intervalId);
        }
      }, 500);
    }

    if (mode === 'fullscreen') {
      inputRef.current?.focus();
    }

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [mode]);

  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchPlaces(debouncedQuery);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery]);

  // Click outside to close (inline mode)
  useEffect(() => {
    if (mode !== 'inline') return;
    
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mode]);

  const searchPlaces = async (searchQuery) => {
    if (!autocompleteServiceRef.current) {
      console.warn('Google Places not initialized');
      return;
    }

    setLoading(true);
    
    // Safety timeout if callback never fires (domain restriction)
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      setResults([]);
    }, 2000);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: searchQuery,
        componentRestrictions: { country: 'in' },
        types: ['geocode']
      },
      (predictions, status) => {
        clearTimeout(safetyTimeout);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setResults(predictions.map(p => ({
            place_id: p.place_id,
            mainText: p.structured_formatting?.main_text || p.description.split(',')[0],
            secondaryText: p.structured_formatting?.secondary_text || p.description.split(',').slice(1).join(','),
            fullDescription: p.description
          })));
          setShowResults(true);
        } else {
          setResults([]);
        }
        setLoading(false);
      }
    );
  };

  const handleSelectPlace = useCallback((result) => {
    if (!placesServiceRef.current) {
      toast.error('Google Places not initialized');
      return;
    }

    setLoading(true);
    placesServiceRef.current.getDetails(
      {
        placeId: result.place_id,
        fields: ['geometry', 'formatted_address', 'address_components', 'name', 'place_id']
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          // Extract city, state, postal_code from address components
          let city = '', state = '', postal_code = '';
          place.address_components?.forEach(comp => {
            if (comp.types.includes('locality')) city = comp.long_name;
            if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
            if (comp.types.includes('postal_code')) postal_code = comp.long_name;
          });

          const locationData = {
            place_id: result.place_id,
            location_text: result.mainText,
            latitude: lat,
            longitude: lng,
            formatted_address: place.formatted_address,
            city,
            state,
            postal_code
          };

          onSelect(locationData);
          setQuery(result.mainText);
          setShowResults(false);
          setResults([]);
        } else {
          toast.error('Failed to get location details');
        }
        setLoading(false);
      }
    );
  }, [onSelect]);

  // Popular areas for quick selection
  const popularAreas = ['Hyderabad', 'Vijayawada', 'Guntur', 'Tirupati', 'Warangal', 'Bangalore', 'Chennai'];

  // Fullscreen mode UI
  if (mode === 'fullscreen') {
    return (
      <div className="fixed inset-0 bg-white z-[2000] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100"
            data-testid="close-location-search"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-3">
            <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none text-lg"
              data-testid="location-search-input"
            />
            {loading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin ml-2" />}
            {query && !loading && (
              <button onClick={() => setQuery('')} className="ml-2">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {results.length > 0 ? (
            <div>
              {results.map((result, idx) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectPlace(result)}
                  className={`w-full px-4 py-4 flex items-start gap-4 text-left hover:bg-blue-50 active:bg-blue-100 ${
                    idx !== results.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                  data-testid={`location-result-${idx}`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg text-gray-800">
                      <HighlightText text={result.mainText} query={query} />
                    </p>
                    <p className="text-base text-gray-500 mt-0.5 truncate">{result.secondaryText}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="p-8 text-center">
              <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-lg text-gray-500">No locations found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm font-semibold text-gray-600 mb-4">Popular Areas</p>
              <div className="flex flex-wrap gap-3">
                {popularAreas.map(area => (
                  <button
                    key={area}
                    onClick={() => setQuery(area)}
                    className="px-5 py-3 bg-gray-100 rounded-full text-base font-medium text-gray-700 hover:bg-gray-200"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline mode UI
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="location-search-input"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
        )}
        {query && !loading && (
          <button 
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50">
          {results.map((result, idx) => (
            <button
              key={result.place_id}
              onClick={() => handleSelectPlace(result)}
              className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-blue-50 ${
                idx !== results.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  <HighlightText text={result.mainText} query={query} />
                </p>
                <p className="text-xs text-gray-500 truncate">{result.secondaryText}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Google Places Autocomplete Hook
 * For use when you need more control over the UI
 */
export const useGooglePlacesAutocomplete = () => {
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let attempts = 0;
    let intervalId = null;

    const init = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        const mapDiv = document.createElement('div');
        mapDiv.style.display = 'none';
        document.body.appendChild(mapDiv);
        const map = new window.google.maps.Map(mapDiv, {
          center: { lat: 17.385, lng: 78.4867 },
          zoom: 10
        });
        placesServiceRef.current = new window.google.maps.places.PlacesService(map);
        setIsReady(true);
        if (intervalId) clearInterval(intervalId);
        return true;
      }
      return false;
    };

    if (!init()) {
      intervalId = setInterval(() => {
        attempts++;
        if (init() || attempts >= 20) {
          clearInterval(intervalId);
        }
      }, 500);
    }

    return () => { if (intervalId) clearInterval(intervalId); };
  }, []);

  const search = useCallback((query) => {
    return new Promise((resolve) => {
      if (!autocompleteServiceRef.current) {
        resolve([]);
        return;
      }

      // Safety timeout - resolve empty if callback never fires
      const timeout = setTimeout(() => resolve([]), 2000);

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' },
          types: ['geocode']
        },
        (predictions, status) => {
          clearTimeout(timeout);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions.map(p => ({
              place_id: p.place_id,
              mainText: p.structured_formatting?.main_text || p.description.split(',')[0],
              secondaryText: p.structured_formatting?.secondary_text || '',
              fullDescription: p.description
            })));
          } else {
            resolve([]);
          }
        }
      );
    });
  }, []);

  const getPlaceDetails = useCallback((placeId) => {
    return new Promise((resolve, reject) => {
      if (!placesServiceRef.current) {
        reject(new Error('Places service not initialized'));
        return;
      }

      placesServiceRef.current.getDetails(
        {
          placeId,
          fields: ['geometry', 'formatted_address', 'address_components', 'name', 'place_id']
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            let city = '', state = '', postal_code = '';
            place.address_components?.forEach(comp => {
              if (comp.types.includes('locality')) city = comp.long_name;
              if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
              if (comp.types.includes('postal_code')) postal_code = comp.long_name;
            });

            resolve({
              place_id: placeId,
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
              formatted_address: place.formatted_address,
              city,
              state,
              postal_code
            });
          } else {
            reject(new Error('Failed to get place details'));
          }
        }
      );
    });
  }, []);

  return { isReady, search, getPlaceDetails };
};

export default GooglePlacesAutocomplete;
