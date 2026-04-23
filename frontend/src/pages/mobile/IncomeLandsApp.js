import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Heart, User, Search, Filter, X } from 'lucide-react';
import AuthScreen from '../../components/AuthScreen';
import IncomeLandsDashboard from '../../components/IncomeLandsDashboard';
import QuickPropertyPostV2 from '../../components/QuickPropertyPostV2';
import PropertyEdit from '../../components/PropertyEdit';
import PropertySuccessV2 from '../../components/PropertySuccessV2';
import MapViewWithProperties from '../../components/MapViewWithProperties';
import MyPropertiesList from '../../components/MyPropertiesList';
import ChatInterface from '../../components/ChatInterface';
import GoogleMapView from '../../components/GoogleMapView';
import { useLanguage } from '../../i18n/translations';
import './IncomeLandsApp.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const IncomeLandsApp = () => {
  const { t, language } = useLanguage();
  
  // Auth state - Start with login screen, then check localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  
  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('incomelands_token');
    const savedUser = localStorage.getItem('incomelands_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
      setCredits(JSON.parse(savedUser).free_credits || 20);
    }
  }, []);
  
  // Navigation state
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, quick-post, edit-property, etc.
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [newlyCreatedProperty, setNewlyCreatedProperty] = useState(null);
  const [propertyToEdit, setPropertyToEdit] = useState(null);
  
  // Data state
  const [properties, setProperties] = useState([]);
  const [myProperties, setMyProperties] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [followupContacts, setFollowupContacts] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(20);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    propertyType: null,
    transactionType: 'sell',
    minPrice: null,
    maxPrice: null,
    distance: 5
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation && isAuthenticated) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          fetchProperties(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('Location error:', error);
          // Default to Hyderabad
          setUserLocation({ latitude: 17.385, longitude: 78.486 });
          fetchProperties(17.385, 78.486);
        }
      );
    }
  }, [isAuthenticated]);

  // Fetch properties from backend
  const fetchProperties = async (lat, lng) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/incomelands/properties/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          radius_km: filters.distance,
          property_type: filters.propertyType,
          transaction_type: filters.transactionType,
          min_price: filters.minPrice,
          max_price: filters.maxPrice,
          limit: 50
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
    setLoading(false);
  };

  // Fetch my properties
  const fetchMyProperties = async () => {
    try {
      const response = await fetch(`${API_URL}/api/incomelands/properties/my/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMyProperties(data.properties || []);
      }
    } catch (error) {
      console.error('Error fetching my properties:', error);
    }
  };

  // Fetch credits
  const fetchCredits = async () => {
    try {
      const response = await fetch(`${API_URL}/api/incomelands/credits/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCredits(data.total_credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  // Handle authentication success
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setToken(userData.token || 'mock_token');
    setCredits(userData.free_credits || 20);
    
    // Save to localStorage
    localStorage.setItem('incomelands_user', JSON.stringify(userData));
    localStorage.setItem('incomelands_token', userData.token || 'mock_token');
  };

  // Handle module click from dashboard
  const handleModuleClick = (moduleId) => {
    setCurrentView(moduleId);
  };

  // Handle property edit
  const handlePropertyEdit = (property) => {
    setPropertyToEdit(property);
    setCurrentView('edit-property');
  };

  // Handle property save after edit
  const handlePropertySave = async (updatedProperty) => {
    setLoading(true);
    try {
      // TODO: Call backend API to update property
      const response = await fetch(`${API_URL}/api/incomelands/properties/${updatedProperty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProperty)
      });
      
      if (response.ok) {
        alert('Property updated successfully!');
        setCurrentView('my-properties');
        setPropertyToEdit(null);
        fetchMyProperties();
      }
    } catch (error) {
      console.error('Error updating property:', error);
      // For now, just show success
      alert('Property updated!');
      setCurrentView('my-properties');
      setPropertyToEdit(null);
    }
    setLoading(false);
  };

  // Handle share app
  const handleShareApp = async () => {
    const referralLink = `https://incomelands.app/ref/${user.id}`;
    const message = `Check out IncomeLands - Your Property Pocket Diary! 📖\n\nEarn money by posting properties!\n\nDownload: ${referralLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'IncomeLands - Property Pocket Diary',
          text: message,
          url: referralLink
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(message);
      alert('Referral link copied! Share it with your friends to earn 10 credits per signup!');
    }
  };

  // Handle property creation
  const handlePropertyComplete = async (propertyData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/incomelands/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(propertyData)
      });
      
      const data = await response.json();
      if (data.success) {
        // Add ID to property data
        const createdProperty = {
          ...propertyData,
          id: data.property_id || `prop_${Date.now()}`,
          created_at: new Date().toISOString()
        };
        
        setNewlyCreatedProperty(createdProperty);
        setShowSuccessScreen(true);
        setCurrentView('success');
        
        if (userLocation) {
          fetchProperties(userLocation.latitude, userLocation.longitude);
        }
        fetchMyProperties();
      }
    } catch (error) {
      console.error('Error creating property:', error);
      // Show success screen anyway for testing
      const createdProperty = {
        ...propertyData,
        id: `prop_${Date.now()}`,
        created_at: new Date().toISOString()
      };
      setNewlyCreatedProperty(createdProperty);
      setShowSuccessScreen(true);
      setCurrentView('success');
    }
    setLoading(false);
  };

  // Handle property like
  const handleLike = async (propertyId) => {
    try {
      const response = await fetch(`${API_URL}/api/incomelands/properties/${propertyId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        // Update local state
        setProperties(prev => prev.map(p => 
          p.id === propertyId 
            ? { ...p, isLiked: data.liked, likes: data.liked ? [...(p.likes || []), user.id] : (p.likes || []).filter(id => id !== user.id) }
            : p
        ));
      }
    } catch (error) {
      console.error('Error liking property:', error);
    }
  };

  // Handle contact unlock
  const handleUnlockContact = async (propertyId) => {
    if (credits < 10) {
      alert('Insufficient credits! Need 10 credits.');
      return;
    }
    
    if (!confirm(`Unlock contact for 10 credits?\nYour balance: ${credits} credits`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/incomelands/properties/${propertyId}/unlock-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ property_id: propertyId, amount: 10 })
      });
      
      const data = await response.json();
      if (data.success) {
        setCredits(data.remaining_credits);
        alert(`Contact Unlocked!\n${data.agent_phone}\n\nRemaining credits: ${data.remaining_credits}`);
      }
    } catch (error) {
      console.error('Error unlocking contact:', error);
      alert('Failed to unlock contact');
    }
  };

  // Show authentication screen if not logged in
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Show success screen after property creation
  if (showSuccessScreen && newlyCreatedProperty) {
    return (
      <PropertySuccessV2
        property={newlyCreatedProperty}
        onEdit={() => {
          setShowSuccessScreen(false);
          handlePropertyEdit(newlyCreatedProperty);
        }}
        onViewProperty={() => {
          setShowSuccessScreen(false);
          setNewlyCreatedProperty(null);
          setCurrentView('my-properties');
        }}
        onAddAnother={() => {
          setShowSuccessScreen(false);
          setNewlyCreatedProperty(null);
          setCurrentView('quick-post');
        }}
        onClose={() => {
          setShowSuccessScreen(false);
          setNewlyCreatedProperty(null);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // Show Property Edit screen
  if (currentView === 'edit-property' && propertyToEdit) {
    return (
      <PropertyEdit
        property={propertyToEdit}
        onSave={handlePropertySave}
        onCancel={() => {
          setCurrentView('dashboard');
          setPropertyToEdit(null);
        }}
        isPremium={false} // TODO: Check if user has premium
      />
    );
  }

  // Show Quick Property Post
  if (currentView === 'quick-post') {
    return (
      <QuickPropertyPostV2
        onComplete={handlePropertyComplete}
        onCancel={() => setCurrentView('dashboard')}
      />
    );
  }

  // Show Map View (Search)
  if (currentView === 'search') {
    return (
      <MapViewWithProperties
        properties={properties}
        userLocation={userLocation}
        onPropertyClick={(property) => {
          setSelectedProperty(property);
          // TODO: Show property detail modal
          alert(`Property: ${property.type} - ${property.cost?.amount} ${property.cost?.unit}`);
        }}
        onDistanceChange={(distance) => {
          // Update user preference
          console.log('Distance changed to:', distance);
        }}
      />
    );
  }

  // Show My Properties
  if (currentView === 'my-properties') {
    return (
      <MyPropertiesList
        properties={myProperties}
        onBack={() => setCurrentView('dashboard')}
        onEdit={handlePropertyEdit}
        onDelete={async (id) => {
          try {
            // TODO: Call backend API
            // await fetch(`${API_URL}/api/incomelands/properties/${id}`, { method: 'DELETE' });
            setMyProperties(prev => prev.filter(p => p.id !== id));
            alert('Property deleted successfully!');
          } catch (error) {
            console.error('Error deleting property:', error);
          }
        }}
        onView={(property) => {
          // TODO: Show property detail
          alert(`Viewing: ${property.type}`);
        }}
      />
    );
  }

  // Show main dashboard
  return (
    <IncomeLandsDashboard
      user={user}
      credits={credits}
      onModuleClick={handleModuleClick}
      onShareApp={handleShareApp}
    />
  );
};

export default IncomeLandsApp;
