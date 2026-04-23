import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation2, Layers } from 'lucide-react';
import './GoogleMapView.css';

const GoogleMapView = ({ 
  myProperties = [], 
  projects = [], 
  requirements = [], 
  userLocation,
  onMarkerClick 
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [mapType, setMapType] = useState('roadmap'); // roadmap, satellite, hybrid

  const [mapError, setMapError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load Google Maps Script
    if (!window.google) {
      const script = document.createElement('script');
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
      
      if (apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
        setMapError('API key not configured');
        setIsLoading(false);
        return;
      }
      
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      // Success callback
      window.initGoogleMaps = () => {
        setIsLoading(false);
        initializeMap();
      };
      
      // Error callback
      script.onerror = () => {
        setMapError('Failed to load Google Maps. Please check your internet connection.');
        setIsLoading(false);
      };
      
      // Handle Google Maps API errors
      window.gm_authFailure = () => {
        setMapError('Google Maps authentication failed. Please check API key and billing settings.');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    } else {
      setIsLoading(false);
      initializeMap();
    }
  }, []);

  useEffect(() => {
    if (map) {
      updateMarkers();
    }
  }, [map, myProperties, projects, requirements, userLocation]);

  const initializeMap = () => {
    if (!mapRef.current) return;

    const defaultCenter = userLocation 
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : { lat: 17.385, lng: 78.486 }; // Hyderabad

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultCenter,
      mapTypeId: mapType,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    setMap(mapInstance);
  };

  const updateMarkers = () => {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers = [];

    // Add user location marker
    if (userLocation && window.google) {
      const userMarker = new window.google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'మీ లొకేషన్',
        zIndex: 1000
      });
      newMarkers.push(userMarker);
    }

    // Add my properties (Green markers)
    myProperties.forEach((property, index) => {
      if (property.latitude && property.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: property.latitude, lng: property.longitude },
          map: map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                <path fill="#4CAF50" d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 40),
          },
          title: property.title,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; max-width: 200px;">
              <h4 style="margin: 0 0 8px; font-size: 14px; color: #333;">${property.title}</h4>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>ధర:</strong> ₹${(property.price / 100000).toFixed(1)}L
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>ఏరియా:</strong> ${property.area} sq.ft
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                ${property.location}
              </p>
              <button onclick="window.viewPropertyDetail('${property.id}')" 
                      style="margin-top: 8px; padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                వివరాలు చూడండి
              </button>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          onMarkerClick && onMarkerClick({ ...property, type: 'property' });
        });

        newMarkers.push(marker);
      }
    });

    // Add RealApex projects (Blue markers)
    projects.forEach((project) => {
      if (project.latitude && project.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: project.latitude, lng: project.longitude },
          map: map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                <path fill="#2196F3" d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 40),
          },
          title: project.name,
        });

        const commission = project.price_range?.min ? (project.price_range.min * 0.01) : 0;

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; max-width: 220px;">
              <div style="background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; display: inline-block; margin-bottom: 8px;">
                RealApex PROJECT
              </div>
              <h4 style="margin: 0 0 8px; font-size: 14px; color: #333;">${project.name}</h4>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>ధర:</strong> ₹${(project.price_range?.min / 100000).toFixed(1)}L నుండి
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>Available:</strong> ${project.available_properties} plots
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                ${project.city}, ${project.state}
              </p>
              ${project.distance_km ? `
                <p style="margin: 4px 0; font-size: 11px; color: #999;">
                  📍 ${project.distance_km.toFixed(1)} km దూరంలో
                </p>
              ` : ''}
              <div style="margin-top: 8px; padding: 8px; background: #FFF3E0; border-radius: 4px;">
                <p style="margin: 0; font-size: 11px; color: #F57C00; font-weight: 600;">
                  💰 సంభావ్య Commission: ₹${(commission / 1000).toFixed(1)}K
                </p>
              </div>
              <button onclick="window.viewPropertyDetail('${project.id}')" 
                      style="margin-top: 8px; width: 100%; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                లీడ్ Submit చేయండి
              </button>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          onMarkerClick && onMarkerClick({ ...project, type: 'project' });
        });

        newMarkers.push(marker);
      }
    });

    // Add buyer requirements (Orange markers)
    requirements.forEach((req) => {
      if (req.latitude && req.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: req.latitude, lng: req.longitude },
          map: map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                <path fill="#FF6B35" d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 40),
          },
          title: 'కావాలి - ' + req.property_type,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; max-width: 220px;">
              <div style="background: #FF6B35; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; display: inline-block; margin-bottom: 8px;">
                కొనుగోలుదారు అవసరం
              </div>
              <h4 style="margin: 0 0 8px; font-size: 14px; color: #333;">${req.property_type}</h4>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>బడ్జెట్:</strong> ₹${(req.budget_min / 100000).toFixed(1)}L - ₹${(req.budget_max / 100000).toFixed(1)}L
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>లొకేషన్:</strong> ${req.preferred_locations.join(', ')}
              </p>
              ${req.min_area ? `
                <p style="margin: 4px 0; font-size: 12px; color: #666;">
                  <strong>ఏరియా:</strong> ${req.min_area} - ${req.max_area} sq.ft
                </p>
              ` : ''}
              <div style="margin-top: 8px; padding: 8px; background: #FFF3E0; border-radius: 4px;">
                <p style="margin: 0; font-size: 11px; color: #F57C00; font-weight: 600;">
                  🔒 కాంటాక్ట్ చూడండి: ₹10
                </p>
              </div>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          onMarkerClick && onMarkerClick({ ...req, type: 'requirement' });
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    // Fit bounds to show all markers
    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      map.fitBounds(bounds);
      
      // Don't zoom in too much if only one marker
      const listener = window.google.maps.event.addListener(map, "idle", function() { 
        if (map.getZoom() > 16) map.setZoom(16); 
        window.google.maps.event.removeListener(listener); 
      });
    }
  };

  const changeMapType = (type) => {
    setMapType(type);
    if (map) {
      map.setMapTypeId(type);
    }
  };

  const centerOnUser = () => {
    if (userLocation && map) {
      map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
      map.setZoom(15);
    }
  };

  return (
    <div className="google-map-container">
      {/* Error Display */}
      {mapError && (
        <div className="map-error" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <h3 style={{ color: '#d32f2f', marginBottom: '12px' }}>Google Maps Error</h3>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>{mapError}</p>
            
            {mapError.includes('authentication') || mapError.includes('billing') ? (
              <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px', textAlign: 'left', fontSize: '13px' }}>
                <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#f57c00' }}>⚠️ Action Required:</p>
                <ol style={{ margin: '8px 0', paddingLeft: '20px', color: '#666' }}>
                  <li>Go to Google Cloud Console</li>
                  <li>Enable <strong>Billing</strong> for your project</li>
                  <li>Add domain to API restrictions</li>
                  <li>Refresh this page</li>
                </ol>
                <a 
                  href="https://console.cloud.google.com/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: '#2196F3',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  Open Google Cloud Console →
                </a>
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                  Don't worry: Free tier includes ₹5.7L credits/month!
                </p>
              </div>
            ) : (
              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 24px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="map-controls">
        <button className="map-control-btn" onClick={centerOnUser} title="మీ లొకేషన్">
          <Navigation2 size={20} />
        </button>
        <button className="map-control-btn" onClick={() => changeMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')} title="Map Type">
          <Layers size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-marker" style={{ background: '#4CAF50' }}></div>
          <span>నా ప్రాపర్టీలు ({myProperties.length})</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker" style={{ background: '#2196F3' }}></div>
          <span>Projects ({projects.length})</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker" style={{ background: '#FF6B35' }}></div>
          <span>కావాలి ({requirements.length})</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="google-map" />

      {/* Loading State */}
      {isLoading && !mapError && (
        <div className="map-loading">
          <MapPin size={48} color="#666" className="map-loading-icon" />
          <p>Loading map...</p>
        </div>
      )}
    </div>
  );
};

export default GoogleMapView;
