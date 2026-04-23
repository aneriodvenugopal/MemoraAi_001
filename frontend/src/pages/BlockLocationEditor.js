import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { 
  MapPin, Building2, Save, Search, ChevronRight, CheckCircle2,
  AlertCircle, Layers, Map, Navigation, RefreshCw, X, ExternalLink,
  Globe, Crosshair, ArrowLeft, Info, Edit2, Eye, FileCheck, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

// Google Places Autocomplete Component
const GooglePlacesInput = ({ value, onChange, onSelect, placeholder, disabled }) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else {
      initAutocomplete();
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'in' }, // Restrict to India
      fields: ['formatted_address', 'geometry', 'name', 'place_id']
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const location = {
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          address: place.formatted_address || place.name,
          placeId: place.place_id
        };
        setLocalValue(location.address);
        onSelect?.(location);
      }
    });
  };

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder || "Search location..."}
        disabled={disabled}
        className="pr-10"
        data-testid="google-places-input"
      />
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </div>
  );
};

// Block Location Card Component
const BlockLocationCard = ({ block, projectId, onSave, isLoading }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState({
    latitude: block.latitude || '',
    longitude: block.longitude || '',
    google_address: block.google_address || ''
  });
  const [saving, setSaving] = useState(false);

  const handlePlaceSelect = (location) => {
    setLocalData({
      latitude: location.latitude,
      longitude: location.longitude,
      google_address: location.address
    });
  };

  const handleSave = async () => {
    if (!localData.latitude || !localData.longitude) {
      toast.error('Please select a valid location');
      return;
    }

    // Convert to proper floats
    const saveData = {
      latitude: parseFloat(localData.latitude),
      longitude: parseFloat(localData.longitude),
      google_address: localData.google_address || ''
    };

    if (isNaN(saveData.latitude) || isNaN(saveData.longitude)) {
      toast.error('Invalid latitude or longitude values');
      return;
    }

    setSaving(true);
    try {
      await onSave(block.block_name, saveData);
      setIsEditing(false);
      toast.success(`Location saved for Block ${block.block_name}`);
    } catch (error) {
      toast.error('Failed to save location');
    }
    setSaving(false);
  };

  const hasLocation = block.latitude && block.longitude;

  return (
    <Card className={`transition-all duration-200 ${isEditing ? 'ring-2 ring-blue-500' : ''}`} data-testid={`block-card-${block.block_name}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasLocation ? 'bg-green-100' : 'bg-slate-100'}`}>
              <Layers className={`w-5 h-5 ${hasLocation ? 'text-green-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <CardTitle className="text-base">Block {block.block_name}</CardTitle>
              <CardDescription className="text-xs">
                {hasLocation ? 'Location configured' : 'No location set'}
              </CardDescription>
            </div>
          </div>
          <Badge variant={hasLocation ? 'default' : 'outline'} className={hasLocation ? 'bg-green-100 text-green-700' : ''}>
            {hasLocation ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
            {hasLocation ? 'Set' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Search Location</Label>
              <GooglePlacesInput
                value={localData.google_address}
                onSelect={handlePlaceSelect}
                placeholder="Search for location in India..."
              />
              <p className="text-xs text-slate-500">
                Start typing to search. Select from suggestions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Latitude</Label>
                <Input
                  value={localData.latitude}
                  onChange={(e) => setLocalData(prev => ({ ...prev, latitude: e.target.value }))}
                  placeholder="17.385"
                  className="text-sm"
                  data-testid="latitude-input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Longitude</Label>
                <Input
                  value={localData.longitude}
                  onChange={(e) => setLocalData(prev => ({ ...prev, longitude: e.target.value }))}
                  placeholder="78.486"
                  className="text-sm"
                  data-testid="longitude-input"
                />
              </div>
            </div>

            {localData.latitude && localData.longitude && (
              <div className="rounded-lg overflow-hidden border border-slate-200">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${localData.latitude},${localData.longitude}&zoom=17`}
                  width="100%"
                  height="150"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  title={`Block ${block.block_name} Location Preview`}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1" data-testid="save-block-location-btn">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Location
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {hasLocation ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-600">
                  <MapPin className="w-4 h-4 inline mr-1 text-blue-600" />
                  {block.google_address || `${block.latitude}, ${block.longitude}`}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Lat: {typeof block.latitude === 'number' ? block.latitude.toFixed(6) : parseFloat(block.latitude).toFixed(6)}</span>
                  <span>•</span>
                  <span>Lng: {typeof block.longitude === 'number' ? block.longitude.toFixed(6) : parseFloat(block.longitude).toFixed(6)}</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${block.latitude},${block.longitude}&zoom=17`}
                    width="100%"
                    height="120"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    title={`Block ${block.block_name} Location`}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Map className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No location set for this block</p>
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setIsEditing(true)}
              data-testid="edit-block-location-btn"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {hasLocation ? 'Edit Location' : 'Set Location'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Main Block Location Editor Page
const BlockLocationEditor = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all projects
  useEffect(() => {
    fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
      
      // Auto-select first project if available
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
    setLoading(false);
  };

  // Fetch blocks for selected project
  useEffect(() => {
    if (selectedProject) {
      fetchBlockLocations(selectedProject.id);
    }
  }, [selectedProject, token]);

  const fetchBlockLocations = async (projectId) => {
    setBlocksLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/certified/projects/${projectId}/block-locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch block locations');
      const data = await response.json();
      setBlocks(data.blocks || []);
    } catch (error) {
      console.error('Error fetching block locations:', error);
      toast.error('Failed to load blocks');
      setBlocks([]);
    }
    setBlocksLoading(false);
  };

  const handleSaveBlockLocation = async (blockName, locationData) => {
    // Update local state optimistically
    setBlocks(prevBlocks => 
      prevBlocks.map(b => 
        b.block_name === blockName 
          ? { ...b, ...locationData }
          : b
      )
    );

    // Save to backend
    const response = await fetch(`${API_URL}/api/certified/projects/${selectedProject.id}/block-locations`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        project_id: selectedProject.id,
        block_locations: blocks.map(b => 
          b.block_name === blockName 
            ? { block_name: blockName, ...locationData }
            : { block_name: b.block_name, latitude: b.latitude, longitude: b.longitude, google_address: b.google_address }
        ).filter(b => b.latitude && b.longitude)
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save');
    }
  };

  const handleSaveAllLocations = async () => {
    const blocksWithLocations = blocks.filter(b => b.latitude && b.longitude);
    
    if (blocksWithLocations.length === 0) {
      toast.error('No blocks have locations to save');
      return;
    }

    setSavingAll(true);
    try {
      const response = await fetch(`${API_URL}/api/certified/projects/${selectedProject.id}/block-locations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: selectedProject.id,
          block_locations: blocksWithLocations.map(b => ({
            block_name: b.block_name,
            latitude: b.latitude,
            longitude: b.longitude,
            google_address: b.google_address
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to save');
      
      toast.success(`Saved locations for ${blocksWithLocations.length} blocks`);
    } catch (error) {
      toast.error('Failed to save all locations');
    }
    setSavingAll(false);
  };

  // Filter projects by search
  const filteredProjects = projects.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalBlocks = blocks.length;
  const blocksWithLocation = blocks.filter(b => b.latitude && b.longitude).length;
  const completionPercentage = totalBlocks > 0 ? Math.round((blocksWithLocation / totalBlocks) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="block-location-editor">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="text-slate-600"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Block Location Editor
                </h1>
                <p className="text-sm text-slate-500">
                  Configure precise GPS locations for property blocks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedProject && blocks.length > 0 && (
                <Button 
                  onClick={handleSaveAllLocations}
                  disabled={savingAll || blocksWithLocation === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="save-all-locations-btn"
                >
                  {savingAll ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save All Locations
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Project List */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Projects
                </CardTitle>
                <div className="relative">
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm"
                    data-testid="search-projects-input"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                  {filteredProjects.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No projects found
                    </div>
                  ) : (
                    filteredProjects.map(project => (
                      <div
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className={`px-4 py-3 cursor-pointer border-l-2 transition-all ${
                          selectedProject?.id === project.id 
                            ? 'bg-blue-50 border-blue-600' 
                            : 'border-transparent hover:bg-slate-50'
                        }`}
                        data-testid={`project-item-${project.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-900 truncate">{project.name}</p>
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {project.location || project.city || 'No location'}
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${
                            selectedProject?.id === project.id ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Blocks */}
          <div className="lg:col-span-3">
            {selectedProject ? (
              <>
                {/* Project Header Card */}
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{selectedProject.name}</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          {selectedProject.location}, {selectedProject.city}, {selectedProject.state}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/p/${selectedProject.id}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Public Page
                      </Button>
                    </div>

                    {/* Progress Stats */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">Total Blocks</p>
                        <p className="text-xl font-bold text-slate-900">{totalBlocks}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-600">Locations Set</p>
                        <p className="text-xl font-bold text-green-700">{blocksWithLocation}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600">Completion</p>
                        <p className="text-xl font-bold text-blue-700">{completionPercentage}%</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Blocks Grid */}
                {blocksLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Loading blocks...</p>
                  </div>
                ) : blocks.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Blocks Found</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      This project doesn't have any blocks/zones defined in properties yet.
                    </p>
                    <p className="text-xs text-slate-400">
                      Blocks are automatically detected from properties. Add properties with block/zone information first.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {blocks.map(block => (
                      <BlockLocationCard
                        key={block.block_name}
                        block={block}
                        projectId={selectedProject.id}
                        onSave={handleSaveBlockLocation}
                      />
                    ))}
                  </div>
                )}

                {/* Info Banner */}
                {blocks.length > 0 && (
                  <Card className="mt-6 bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Location Hierarchy</p>
                          <p className="text-blue-700">
                            On the certified property page, locations are resolved in this order:
                          </p>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-600">
                            <li><strong>Property-specific location</strong> - Highest priority</li>
                            <li><strong>Block location</strong> - What you're editing here</li>
                            <li><strong>Project location</strong> - Fallback option</li>
                          </ol>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-12 text-center">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Project</h3>
                <p className="text-sm text-slate-500">
                  Choose a project from the sidebar to configure block locations
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockLocationEditor;
