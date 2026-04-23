import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LocationContext = createContext(null);

export const useGeoLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useGeoLocation must be used within LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  // Check permission status
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      });
    }
  }, []);

  // Request location
  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocation(loc);
        localStorage.setItem('userLocation', JSON.stringify(loc));
        setLoading(false);
        setPermissionStatus('granted');
      },
      (err) => {
        console.error('Location error:', err);
        setError(err.message);
        setPermissionStatus(err.code === 1 ? 'denied' : 'prompt');
        
        // Try to get saved location
        const saved = localStorage.getItem('userLocation');
        if (saved) {
          setLocation(JSON.parse(saved));
        }
        setLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 // Always get fresh location
      }
    );
  }, []);

  // Initial load - try saved location first, then request fresh
  useEffect(() => {
    const saved = localStorage.getItem('userLocation');
    if (saved) {
      try {
        setLocation(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved location:', e);
        localStorage.removeItem('userLocation');
      }
    }
    
    // Auto-request location on first load (if permission granted or not yet asked)
    // This triggers the browser permission prompt for new users
    if (permissionStatus === 'granted' || permissionStatus === 'prompt') {
      requestLocation();
    } else {
      setLoading(false);
    }
  }, [permissionStatus, requestLocation]);

  const updateLocation = (lat, lng) => {
    const loc = { latitude: lat, longitude: lng };
    setLocation(loc);
    localStorage.setItem('userLocation', JSON.stringify(loc));
  };

  const clearLocation = () => {
    setLocation(null);
    localStorage.removeItem('userLocation');
  };

  return (
    <LocationContext.Provider value={{ 
      location, 
      loading, 
      error, 
      permissionStatus,
      updateLocation, 
      requestLocation,
      clearLocation
    }}>
      {children}
    </LocationContext.Provider>
  );
};
