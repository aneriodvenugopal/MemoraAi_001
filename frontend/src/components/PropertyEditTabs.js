import React, { useState, useEffect } from 'react';
import { X, Save, Image, Youtube, MapPin, IndianRupee, FileText, Eye, Loader2, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PropertyEditTabs = ({ 
  property, 
  projectId,
  onSave, 
  onClose,
  propertyStatuses = [],
  propertyTypes = []
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Details
    property_number: '',
    block: '',
    area: '',
    unit: 'sq.yard',
    facing: '',
    floor: '',
    length: '',
    width: '',
    features: [],
    
    // Pricing
    price: '',
    price_per_sqft: '',
    contact_for_price: false,
    booking_amount: '',
    
    // Gallery - Images
    property_images: [],
    
    // Videos - YouTube
    property_videos: [],
    
    // Location
    latitude: '',
    longitude: '',
    google_address: '',
    
    // Status & Certification
    status_id: '',
    is_certified: false,
    certification_note: '',
    survey_number: '',
    registration_number: ''
  });

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');

  useEffect(() => {
    if (property) {
      setFormData({
        property_number: property.property_number || '',
        block: property.block || '',
        area: property.area?.toString() || '',
        unit: property.unit || 'sq.yard',
        facing: property.facing || '',
        floor: property.floor?.toString() || '',
        length: property.length?.toString() || '',
        width: property.width?.toString() || '',
        features: property.features || [],
        
        price: property.price?.toString() || '',
        price_per_sqft: property.price_per_sqft?.toString() || '',
        contact_for_price: property.contact_for_price || false,
        booking_amount: property.booking_amount?.toString() || '',
        
        // Handle both new property_images format and legacy images array
        property_images: (() => {
          let images = property.property_images?.length > 0 
            ? property.property_images 
            : (property.images || []).map((url, idx) => ({
                url: typeof url === 'string' ? url : url?.url || '',
                caption: '',
                is_cover: idx === 0,
                uploaded_at: new Date().toISOString()
              }));
          // Filter out entries with empty URLs
          return images.filter(img => {
            const url = typeof img === 'string' ? img : img?.url;
            return url && url.trim() !== '';
          });
        })(),
        property_videos: (property.property_videos || []).filter(v => {
          const url = typeof v === 'string' ? v : v?.url;
          return url && url.trim() !== '';
        }),
        
        latitude: property.latitude?.toString() || '',
        longitude: property.longitude?.toString() || '',
        google_address: property.google_address || '',
        
        status_id: property.status_id || '',
        is_certified: property.is_certified || false,
        certification_note: property.certification_note || '',
        survey_number: property.survey_number || '',
        registration_number: property.registration_number || ''
      });
    }
  }, [property]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        ...formData,
        area: parseFloat(formData.area) || 0,
        price: parseFloat(formData.price) || 0,
        price_per_sqft: parseFloat(formData.price_per_sqft) || 0,
        booking_amount: parseFloat(formData.booking_amount) || 0,
        floor: formData.floor ? parseInt(formData.floor) : null,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };
      
      await onSave(updateData);
      toast.success('Property updated successfully!');
    } catch (error) {
      toast.error('Failed to update property');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Image handling
  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    
    setUploadingImage(true);
    const newImages = [...formData.property_images];
    
    for (let file of files) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        
        const response = await fetch(`${API_URL}/api/files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formDataUpload
        });
        
        if (response.ok) {
          const data = await response.json();
          newImages.push({
            url: data.url || data.file_url,
            thumbnail_url: data.thumbnail_url,
            file_id: data.file_id,
            caption: '',
            is_cover: newImages.length === 0,
            uploaded_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setFormData(prev => ({ ...prev, property_images: newImages }));
    setUploadingImage(false);
    toast.success('Images uploaded successfully!');
  };

  const handleRemoveImage = (index) => {
    const newImages = formData.property_images.filter((_, i) => i !== index);
    // If removed image was cover, make first one cover
    const removedImg = formData.property_images[index];
    const wasCover = typeof removedImg === 'object' ? removedImg?.is_cover : index === 0;
    if (wasCover && newImages.length > 0) {
      if (typeof newImages[0] === 'object') {
        newImages[0].is_cover = true;
      } else {
        // Convert string to object
        newImages[0] = { url: newImages[0], is_cover: true, caption: '' };
      }
    }
    setFormData(prev => ({ ...prev, property_images: newImages }));
  };

  const handleSetCoverImage = (index) => {
    const newImages = formData.property_images.map((img, i) => {
      // Handle both string URLs and object format
      if (typeof img === 'string') {
        return { url: img, is_cover: i === index, caption: '' };
      }
      return { ...img, is_cover: i === index };
    });
    setFormData(prev => ({ ...prev, property_images: newImages }));
  };

  // Video handling
  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideo = () => {
    if (!newVideoUrl.trim()) return;
    
    const youtubeId = extractYouTubeId(newVideoUrl);
    if (!youtubeId) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }
    
    const newVideo = {
      url: newVideoUrl,
      youtube_id: youtubeId,
      title: '',
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
      is_youtube: true
    };
    
    setFormData(prev => ({
      ...prev,
      property_videos: [...prev.property_videos, newVideo]
    }));
    setNewVideoUrl('');
    toast.success('Video added!');
  };

  const handleRemoveVideo = (index) => {
    setFormData(prev => ({
      ...prev,
      property_videos: prev.property_videos.filter((_, i) => i !== index)
    }));
  };

  // Location handling
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
          toast.success('Location updated!');
        },
        (error) => {
          toast.error('Failed to get location');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  const facingOptions = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'];
  const unitOptions = ['sq.yard', 'sq.ft', 'sq.m', 'acres', 'guntas', 'cents'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">Edit Property</h2>
            <p className="text-blue-100 text-sm">{property?.property_number} - {property?.block || 'No Block'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs - Mirror Frontend Structure */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 gap-1 p-2 bg-gray-100 mx-4 mt-4 rounded-lg">
            <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-white">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2 data-[state=active]:bg-white">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Gallery</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2 data-[state=active]:bg-white">
              <Youtube className="w-4 h-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-2 data-[state=active]:bg-white">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Location</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2 data-[state=active]:bg-white">
              <IndianRupee className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Details Tab */}
            <TabsContent value="details" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Property Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plot/Property Number *</Label>
                    <Input
                      data-testid="property-number-input"
                      value={formData.property_number}
                      onChange={(e) => handleInputChange('property_number', e.target.value)}
                      placeholder="e.g., Plot 10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Block</Label>
                    <Input
                      data-testid="block-input"
                      value={formData.block}
                      onChange={(e) => handleInputChange('block', e.target.value)}
                      placeholder="e.g., A, B, C"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Area *</Label>
                    <div className="flex gap-2">
                      <Input
                        data-testid="area-input"
                        type="number"
                        value={formData.area}
                        onChange={(e) => handleInputChange('area', e.target.value)}
                        placeholder="Enter area"
                        className="flex-1"
                      />
                      <Select value={formData.unit} onValueChange={(v) => handleInputChange('unit', v)}>
                        <SelectTrigger className="w-32" data-testid="unit-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {unitOptions.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Facing</Label>
                    <Select value={formData.facing} onValueChange={(v) => handleInputChange('facing', v)}>
                      <SelectTrigger data-testid="facing-select">
                        <SelectValue placeholder="Select facing" />
                      </SelectTrigger>
                      <SelectContent>
                        {facingOptions.map(facing => (
                          <SelectItem key={facing} value={facing}>{facing}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Length (ft/m)</Label>
                    <Input
                      data-testid="length-input"
                      type="number"
                      value={formData.length}
                      onChange={(e) => handleInputChange('length', e.target.value)}
                      placeholder="Length"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Width (ft/m)</Label>
                    <Input
                      data-testid="width-input"
                      type="number"
                      value={formData.width}
                      onChange={(e) => handleInputChange('width', e.target.value)}
                      placeholder="Width"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Floor (for flats)</Label>
                    <Input
                      data-testid="floor-input"
                      type="number"
                      value={formData.floor}
                      onChange={(e) => handleInputChange('floor', e.target.value)}
                      placeholder="Floor number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status_id} onValueChange={(v) => handleInputChange('status_id', v)}>
                      <SelectTrigger data-testid="status-select">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyStatuses.map(status => (
                          <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Legal & Certification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Legal & Certification</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Survey Number</Label>
                    <Input
                      data-testid="survey-number-input"
                      value={formData.survey_number}
                      onChange={(e) => handleInputChange('survey_number', e.target.value)}
                      placeholder="Survey/Plot number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input
                      data-testid="registration-number-input"
                      value={formData.registration_number}
                      onChange={(e) => handleInputChange('registration_number', e.target.value)}
                      placeholder="Registration number"
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-4">
                    <Switch
                      data-testid="certified-switch"
                      checked={formData.is_certified}
                      onCheckedChange={(v) => handleInputChange('is_certified', v)}
                    />
                    <Label>Property is Certified/Verified</Label>
                  </div>

                  {formData.is_certified && (
                    <div className="col-span-2 space-y-2">
                      <Label>Certification Note</Label>
                      <Textarea
                        data-testid="certification-note-input"
                        value={formData.certification_note}
                        onChange={(e) => handleInputChange('certification_note', e.target.value)}
                        placeholder="Add certification details..."
                        rows={2}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Property Images</span>
                    <Badge variant="secondary">{formData.property_images.length} images</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Upload Button */}
                  <div className="mb-4">
                    <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        data-testid="image-upload-input"
                      />
                      {uploadingImage ? (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      ) : (
                        <>
                          <Plus className="w-6 h-6 text-gray-500" />
                          <span className="text-gray-600">Click to upload images</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Image Grid */}
                  {formData.property_images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {formData.property_images.map((img, index) => {
                        const imageUrl = typeof img === 'string' ? img : img?.url || '';
                        const isCover = typeof img === 'object' && img?.is_cover;
                        return (
                        <div key={index} className="relative group rounded-lg overflow-hidden border">
                          <img
                            src={imageUrl}
                            alt={`Property ${index + 1}`}
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="%23f3f4f6" width="200" height="150"/><text fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text></svg>';
                            }}
                          />
                          {isCover && (
                            <Badge className="absolute top-2 left-2 bg-green-500">Cover</Badge>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                            {!isCover && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSetCoverImage(index)}
                                data-testid={`set-cover-btn-${index}`}
                              >
                                Set Cover
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveImage(index)}
                              data-testid={`remove-image-btn-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No images uploaded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>YouTube Videos</span>
                    <Badge variant="secondary">{formData.property_videos.length} videos</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Add Video */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      data-testid="video-url-input"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder="Paste YouTube URL here..."
                      className="flex-1"
                    />
                    <Button onClick={handleAddVideo} data-testid="add-video-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Video
                    </Button>
                  </div>

                  {/* Video List */}
                  {formData.property_videos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {formData.property_videos.map((video, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border">
                          <img
                            src={video.thumbnail}
                            alt={`Video ${index + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                              <Youtube className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => window.open(video.url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveVideo(index)}
                              data-testid={`remove-video-btn-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Youtube className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No videos added yet</p>
                      <p className="text-sm">Add YouTube video URLs to showcase the property</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">GPS Coordinates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input
                        data-testid="latitude-input"
                        type="number"
                        step="0.000001"
                        value={formData.latitude}
                        onChange={(e) => handleInputChange('latitude', e.target.value)}
                        placeholder="e.g., 16.5062"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input
                        data-testid="longitude-input"
                        type="number"
                        step="0.000001"
                        value={formData.longitude}
                        onChange={(e) => handleInputChange('longitude', e.target.value)}
                        placeholder="e.g., 80.6480"
                      />
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={handleGetCurrentLocation}
                    data-testid="get-location-btn"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Get Current Location
                  </Button>

                  <div className="space-y-2">
                    <Label>Google Address</Label>
                    <Textarea
                      data-testid="google-address-input"
                      value={formData.google_address}
                      onChange={(e) => handleInputChange('google_address', e.target.value)}
                      placeholder="Full address (auto-filled or manual)"
                      rows={2}
                    />
                  </div>

                  {/* Map Preview */}
                  {formData.latitude && formData.longitude && (
                    <div className="rounded-lg overflow-hidden border">
                      <iframe
                        title="Property Location"
                        width="100%"
                        height="250"
                        frameBorder="0"
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${formData.latitude},${formData.longitude}&zoom=17`}
                        allowFullScreen
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Switch
                      data-testid="contact-for-price-switch"
                      checked={formData.contact_for_price}
                      onCheckedChange={(v) => handleInputChange('contact_for_price', v)}
                    />
                    <div>
                      <Label className="text-yellow-800 font-medium">Contact for Price</Label>
                      <p className="text-sm text-yellow-600">Hide price and show &quot;Contact for Price&quot; instead</p>
                    </div>
                  </div>

                  {!formData.contact_for_price && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Total Price (Rs.)</Label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input
                              data-testid="price-input"
                              type="number"
                              value={formData.price}
                              onChange={(e) => handleInputChange('price', e.target.value)}
                              placeholder="0"
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Price per Sq.Yard/Ft</Label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input
                              data-testid="price-per-sqft-input"
                              type="number"
                              value={formData.price_per_sqft}
                              onChange={(e) => handleInputChange('price_per_sqft', e.target.value)}
                              placeholder="0"
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Booking Amount (Token)</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <Input
                            data-testid="booking-amount-input"
                            type="number"
                            value={formData.booking_amount}
                            onChange={(e) => handleInputChange('booking_amount', e.target.value)}
                            placeholder="e.g., 50000"
                            className="pl-10"
                          />
                        </div>
                        <p className="text-sm text-gray-500">Amount required to block/book this property</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Price Display Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Customer View Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Total Price</p>
                    {formData.contact_for_price ? (
                      <p className="text-2xl font-bold text-green-600">Contact for Price</p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">
                        Rs. {parseFloat(formData.price || 0).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default PropertyEditTabs;
