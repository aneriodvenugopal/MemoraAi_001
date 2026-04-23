import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Filter, List as ListIcon, X, Maximize2 } from 'lucide-react';
import { DISTANCE_OPTIONS } from '../config/propertyConfig';
import './MapViewWithProperties.css';

const MapViewWithProperties = ({ properties, userLocation, onPropertyClick, onDistanceChange }) => {
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [selectedDistance, setSelectedDistance] = useState(5); // Default 5km
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);

  useEffect(() => {
    // Filter properties by distance
    if (userLocation && properties) {
      const filtered = properties.filter(property => {
        if (!property.location?.latitude || !property.location?.longitude) return false;
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          property.location.latitude,
          property.location.longitude
        );
        return distance <= selectedDistance;
      });
      setFilteredProperties(filtered);
    }
  }, [properties, userLocation, selectedDistance]);

  useEffect(() => {
    if (viewMode === 'map' && userLocation) {
      initializeMap();
    }
  }, [viewMode, userLocation, filteredProperties]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value) => {
    return (value * Math.PI) / 180;
  };

  const initializeMap = () => {
    if (!window.google || !mapRef.current) return;

    // Initialize map
    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom: getZoomLevel(selectedDistance),
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Clear existing circle
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // Draw radius circle
    circleRef.current = new window.google.maps.Circle({
      strokeColor: '#1E88E5',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#1E88E5',
      fillOpacity: 0.15,
      map: googleMapRef.current,
      center: { lat: userLocation.latitude, lng: userLocation.longitude },
      radius: selectedDistance * 1000 // Convert km to meters
    });

    // Add user location marker
    const userMarker = new window.google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: googleMapRef.current,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4CAF50',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });
    markersRef.current.push(userMarker);

    // Add property markers
    filteredProperties.forEach((property, index) => {
      if (property.location?.latitude && property.location?.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: property.location.latitude, lng: property.location.longitude },
          map: googleMapRef.current,
          title: property.type || 'Property',
          icon: {
            url: getMarkerIcon(property.type),
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });

        marker.addListener('click', () => {
          onPropertyClick(property);
        });

        markersRef.current.push(marker);
      }
    });
  };

  const getMarkerIcon = (propertyType) => {
    // Return data URL for custom marker
    const colors = {
      land: '#8BC34A',
      plot: '#FF9800',
      flat: '#2196F3',
      independent_house: '#9C27B0',
      villa: '#E91E63',
      default: '#757575'
    };
    const color = colors[propertyType] || colors.default;
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="16" y="20" text-anchor="middle" font-size="16" fill="white">📍</text>
      </svg>
    `)}`;
  };

  const getZoomLevel = (distance) => {
    if (distance <= 1) return 15;
    if (distance <= 5) return 13;
    if (distance <= 10) return 12;
    if (distance <= 25) return 11;
    return 10;
  };

  const handleDistanceChange = (distance) => {
    setSelectedDistance(distance);
    if (onDistanceChange) onDistanceChange(distance);
    if (googleMapRef.current && userLocation) {
      googleMapRef.current.setZoom(getZoomLevel(distance));
    }
  };

  const formatCost = (cost) => {
    if (!cost) return 'N/A';
    return `₹${cost.amount} ${cost.unit}`;
  };

  const formatSize = (size) => {
    if (!size) return 'N/A';
    return `${size.value} ${size.unit.replace('_', ' ').toUpperCase()}`;
  };

  return (
    <div className="map-view-container">
      {/* Header */}
      <div className="map-view-header">
        <h2>Properties Near You</h2>
        <div className="header-actions">
          <button
            className={`view-toggle ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            <MapPin size={18} />
          </button>
          <button
            className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <ListIcon size={18} />
          </button>
          <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Distance Filter */}
      {showFilters && (
        <div className="distance-filter">
          <div className="filter-header">
            <h3>Distance Range</h3>
            <button onClick={() => setShowFilters(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="distance-options">
            {DISTANCE_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={`distance-chip ${selectedDistance === option.value ? 'active' : ''}`}
                onClick={() => handleDistanceChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Count */}
      <div className="property-count">
        {filteredProperties.length} properties within {selectedDistance}km
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div ref={mapRef} className="google-map" style={{ width: '100%', height: '500px' }} />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="properties-list">
          {filteredProperties.length === 0 ? (
            <div className="empty-state">
              <MapPin size={48} color="#BDBDBD" />
              <p>No properties found in this range</p>
              <button onClick={() => handleDistanceChange(selectedDistance * 2)}>
                Increase range to {selectedDistance * 2}km
              </button>
            </div>
          ) : (
            filteredProperties.map((property) => (
              <div
                key={property.id}
                className="property-card-list"
                onClick={() => onPropertyClick(property)}
              >
                <div className="property-icon">
                  {property.type === 'land' && '🏞️'}
                  {property.type === 'plot' && '📐'}
                  {property.type === 'flat' && '🏢'}
                  {property.type === 'independent_house' && '🏡'}
                  {property.type === 'villa' && '🏰'}
                </div>
                <div className="property-info">
                  <h4>{property.type?.replace('_', ' ').toUpperCase()}</h4>
                  <div className="property-details">
                    <span>{formatCost(property.cost)}</span>
                    <span>•</span>
                    <span>{formatSize(property.size)}</span>
                  </div>
                  <div className="property-location">
                    📍 {property.location?.address || 'Location not set'}
                  </div>
                </div>
                <div className="property-distance">
                  {calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    property.location.latitude,
                    property.location.longitude
                  ).toFixed(1)}km
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MapViewWithProperties;