import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import FileUploader, { FileGallery } from '../components/FileUploader';
import { 
  ArrowLeft, MapPin, Image, Video, Save, Trash2, Plus, Upload,
  CheckCircle2, AlertCircle, ExternalLink, Eye, Search, Loader2,
  Link as LinkIcon, X, Shield, Map, Navigation
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

const PropertyCertifiedSettings = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState(null);
  const [project, setProject] = useState(null);
  
  // Location state
  const [locationData, setLocationData] = useState({
    latitude: '',
    longitude: '',
    google_address: '',
    usePropertyLocation: false
  });
  
  // Media state
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  useEffect(() => {
    fetchPropertyData();
    fetchUploadedFiles();
  }, [propertyId, token]);

  const fetchPropertyData = async () => {
    try {
      // Fetch property details
      const propRes = await fetch(`${API_URL}/api/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!propRes.ok) throw new Error('Property not found');
      const propData = await propRes.json();
      setProperty(propData);

      // Set location data
      setLocationData({
        latitude: propData.latitude || '',
        longitude: propData.longitude || '',
        google_address: propData.google_address || '',
        usePropertyLocation: !!(propData.latitude && propData.longitude)
      });

      // Set media data
      setImages(propData.property_images || []);
      setVideos(propData.property_videos || []);

      // Fetch project for context
      if (propData.project_id) {
        const projRes = await fetch(`${API_URL}/api/projects/${propData.project_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (projRes.ok) {
          const projData = await projRes.json();
          setProject(projData);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load property');
    }
    setLoading(false);
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/files/property/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.images || []);
      }
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };

  const handleFileUploadComplete = (fileData) => {
    // Add uploaded file to local state
    if (Array.isArray(fileData)) {
      setUploadedFiles(prev => [...fileData, ...prev]);
    } else {
      setUploadedFiles(prev => [fileData, ...prev]);
    }
    toast.success('File uploaded successfully');
  };

  const handleDeleteFile = async (fileId) => {
    try {
      const response = await fetch(`${API_URL}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId && f.file_id !== fileId));
        toast.success('File deleted');
      }
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleSaveLocation = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/certified/property/${propertyId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: locationData.usePropertyLocation ? parseFloat(locationData.latitude) : null,
          longitude: locationData.usePropertyLocation ? parseFloat(locationData.longitude) : null,
          google_address: locationData.usePropertyLocation ? locationData.google_address : null
        })
      });

      if (!response.ok) throw new Error('Failed to save');
      toast.success('Location saved successfully');
    } catch (error) {
      toast.error('Failed to save location');
    }
    setSaving(false);
  };

  const handleSaveMedia = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/certified/property/${propertyId}/media`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          property_images: images,
          property_videos: videos
        })
      });

      if (!response.ok) throw new Error('Failed to save');
      toast.success('Media saved successfully');
    } catch (error) {
      toast.error('Failed to save media');
    }
    setSaving(false);
  };

  const handleCertifyProperty = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/certified/property/${propertyId}/certify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to certify');
      toast.success('Property certified successfully!');
      fetchPropertyData();
    } catch (error) {
      toast.error('Failed to certify property');
    }
    setSaving(false);
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setImages([...images, { url: newImageUrl, is_cover: images.length === 0 }]);
    setNewImageUrl('');
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    // Make first image the cover if removed image was cover
    if (images[index]?.is_cover && newImages.length > 0) {
      newImages[0].is_cover = true;
    }
    setImages(newImages);
  };

  const setCoverImage = (index) => {
    setImages(images.map((img, i) => ({ ...img, is_cover: i === index })));
  };

  const addVideo = () => {
    if (!newVideoUrl.trim()) return;
    setVideos([...videos, { 
      url: newVideoUrl, 
      title: newVideoTitle || `Video ${videos.length + 1}`,
      is_youtube: newVideoUrl.includes('youtube') || newVideoUrl.includes('youtu.be')
    }]);
    setNewVideoUrl('');
    setNewVideoTitle('');
  };

  const removeVideo = (index) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  // Google Places autocomplete
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!window.google?.maps?.places || !addressInputRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'in' }
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        setLocationData(prev => ({
          ...prev,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          google_address: place.formatted_address || place.name
        }));
      }
    });
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Property not found</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="property-certified-settings">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h1 className="font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Certified Property Settings
                </h1>
                <p className="text-sm text-slate-500">
                  Plot {property.property_number} • {project?.name || 'Unknown Project'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => window.open(`/property/${propertyId}/certified`, '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
              {!property.is_certified ? (
                <Button onClick={handleCertifyProperty} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Certify Property
                </Button>
              ) : (
                <Badge className="bg-green-100 text-green-700 px-3 py-1.5">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Certified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="location" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="location" className="data-[state=active]:bg-blue-50">
              <MapPin className="w-4 h-4 mr-2" /> Location
            </TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-blue-50">
              <Image className="w-4 h-4 mr-2" /> Images ({images.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-blue-50">
              <Video className="w-4 h-4 mr-2" /> Videos ({videos.length})
            </TabsTrigger>
          </TabsList>

          {/* Location Tab */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Property Location
                </CardTitle>
                <CardDescription>
                  Set a specific GPS location for this property. If not set, the block or project location will be used.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Location Hierarchy Info */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-2">Location Hierarchy</p>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Badge variant="outline" className="bg-white">1. Property</Badge>
                    <span>→</span>
                    <Badge variant="outline" className="bg-white">2. Block</Badge>
                    <span>→</span>
                    <Badge variant="outline" className="bg-white">3. Project</Badge>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Property-specific location takes highest priority on the certified page.
                  </p>
                </div>

                {/* Toggle for property-specific location */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Use Property-Specific Location</Label>
                    <p className="text-sm text-slate-500">Enable to set GPS coordinates for this specific property</p>
                  </div>
                  <Switch
                    checked={locationData.usePropertyLocation}
                    onCheckedChange={(checked) => setLocationData(prev => ({ ...prev, usePropertyLocation: checked }))}
                  />
                </div>

                {locationData.usePropertyLocation && (
                  <>
                    {/* Address Search */}
                    <div className="space-y-2">
                      <Label>Search Location</Label>
                      <div className="relative">
                        <Input
                          ref={addressInputRef}
                          value={locationData.google_address}
                          onChange={(e) => setLocationData(prev => ({ ...prev, google_address: e.target.value }))}
                          placeholder="Search address or place..."
                          className="pr-10"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500">Start typing to search. Select from suggestions to auto-fill coordinates.</p>
                    </div>

                    {/* Lat/Long inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Latitude</Label>
                        <Input
                          type="number"
                          step="any"
                          value={locationData.latitude}
                          onChange={(e) => setLocationData(prev => ({ ...prev, latitude: e.target.value }))}
                          placeholder="17.385044"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Longitude</Label>
                        <Input
                          type="number"
                          step="any"
                          value={locationData.longitude}
                          onChange={(e) => setLocationData(prev => ({ ...prev, longitude: e.target.value }))}
                          placeholder="78.486671"
                        />
                      </div>
                    </div>

                    {/* Map Preview */}
                    {locationData.latitude && locationData.longitude && (
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="rounded-lg overflow-hidden border border-slate-200">
                          <iframe
                            src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${locationData.latitude},${locationData.longitude}&zoom=17`}
                            width="100%"
                            height="250"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            title="Location Preview"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Current fallback info */}
                {!locationData.usePropertyLocation && (
                  <div className="bg-slate-50 rounded-lg p-4 border">
                    <p className="text-sm font-medium text-slate-700 mb-2">Current Fallback Location:</p>
                    {property.block && project?.block_locations?.find(b => b.block_name === property.block)?.latitude ? (
                      <p className="text-sm text-slate-600">
                        Block {property.block} location will be used.
                      </p>
                    ) : project?.latitude ? (
                      <p className="text-sm text-slate-600">
                        Project location ({project.location}) will be used.
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600">
                        No fallback location available. Consider setting one.
                      </p>
                    )}
                  </div>
                )}

                <Button onClick={handleSaveLocation} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Location
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-blue-600" />
                  Property Images
                </CardTitle>
                <CardDescription>
                  Upload property-specific images or add via URL. If none are added, project images will be shown.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Upload Images</Label>
                  <FileUploader
                    context="property_media"
                    relatedId={propertyId}
                    accept="image/*"
                    multiple={true}
                    maxFiles={10}
                    onUploadComplete={handleFileUploadComplete}
                  />
                </div>

                {/* Uploaded Files Gallery */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Uploaded Images ({uploadedFiles.length})</Label>
                    <FileGallery 
                      files={uploadedFiles} 
                      onDelete={handleDeleteFile}
                      columns={4}
                    />
                  </div>
                )}

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Or add via URL</span>
                  </div>
                </div>

                {/* Add Image URL */}
                <div className="flex gap-2">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Paste image URL..."
                    className="flex-1"
                  />
                  <Button onClick={addImage} disabled={!newImageUrl.trim()}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>

                {/* URL-based Image Grid */}
                {images.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">URL Images ({images.length})</Label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img src={img.url} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                          {img.is_cover && (
                            <Badge className="absolute top-2 left-2 bg-blue-600 text-xs">Cover</Badge>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!img.is_cover && (
                              <Button size="sm" variant="secondary" onClick={() => setCoverImage(idx)}>
                                Set Cover
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => removeImage(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {images.length === 0 && uploadedFiles.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No property images added</p>
                    <p className="text-sm text-slate-400">Project images will be used as fallback</p>
                  </div>
                )}

                <Button onClick={handleSaveMedia} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save URL Images
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-600" />
                  Property Videos
                </CardTitle>
                <CardDescription>
                  Add YouTube links or video URLs. If none are added, project videos will be shown.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Video */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder="YouTube or video URL..."
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newVideoTitle}
                      onChange={(e) => setNewVideoTitle(e.target.value)}
                      placeholder="Video title (optional)"
                      className="flex-1"
                    />
                    <Button onClick={addVideo} disabled={!newVideoUrl.trim()}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Video List */}
                {videos.length > 0 ? (
                  <div className="space-y-4">
                    {videos.map((video, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
                        <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                          <Video className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{video.title}</p>
                          <p className="text-sm text-slate-500 truncate">{video.url}</p>
                          {video.is_youtube && (
                            <Badge variant="outline" className="mt-1 text-xs">YouTube</Badge>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeVideo(idx)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No property videos added</p>
                    <p className="text-sm text-slate-400">Project videos will be used as fallback</p>
                  </div>
                )}

                <Button onClick={handleSaveMedia} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Videos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PropertyCertifiedSettings;
