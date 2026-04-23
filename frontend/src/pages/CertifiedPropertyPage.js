import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  MapPin, Building2, Home, Phone, Mail, Globe, CheckCircle2, 
  Share2, Download, Calendar, Ruler, Compass, IndianRupee,
  ImageIcon, Video, FileText, Shield, ExternalLink, Navigation,
  ChevronLeft, ChevronRight, X, Play, Map, Award, Clock
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CertifiedPropertyPage = () => {
  const { propertyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    fetchCertifiedData();
  }, [propertyId]);

  const fetchCertifiedData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/certified/property/${propertyId}`);
      if (!response.ok) throw new Error('Property not found');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load property details');
    }
    setLoading(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.meta?.page_title || 'Certified Property',
          url: url
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Contact for price';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCompanyLogo = () => {
    if (data?.company?.logo) {
      return (
        <img 
          src={data.company.logo} 
          alt={data.company.name} 
          className="h-10 w-auto object-contain"
        />
      );
    }
    
    // Fallback to initials
    const initials = data?.company?.initials || 'RE';
    const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-emerald-600', 'bg-sky-600'];
    const colorIndex = initials.charCodeAt(0) % colors.length;
    
    return (
      <div className={`h-10 w-10 ${colors[colorIndex]} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
        {initials}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading certified property...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Property Not Found</h1>
          <p className="text-slate-600">This certified property page is not available.</p>
        </div>
      </div>
    );
  }

  const { property, project, location, media, company } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="certified-property-page">
      {/* Watermark Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center">
        <div className="text-[200px] font-black text-slate-900 transform -rotate-45 whitespace-nowrap">
          {company.name} • {property.property_number}
        </div>
      </div>

      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getCompanyLogo()}
            <div>
              <h1 className="font-bold text-slate-900 text-sm">{company.name}</h1>
              <p className="text-xs text-slate-500">Certified Property Document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" /> Share
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Certificate Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              {property.is_certified ? (
                <Badge className="bg-green-500 text-white border-0 px-3 py-1">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Verified & Certified
                </Badge>
              ) : (
                <Badge className="bg-sky-500 text-white border-0 px-3 py-1">
                  <Clock className="w-4 h-4 mr-1" /> Verification Pending
                </Badge>
              )}
              <Badge variant="outline" className="border-white/30 text-white">
                ID: {property.id?.slice(0, 8)}
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Plot {property.property_number}
              {property.block && <span className="text-blue-200"> • Block {property.block}</span>}
            </h1>
            
            <p className="text-blue-100 text-lg mb-4">
              {project?.name || 'Property'}
              {project?.location && ` • ${project.location}`}
            </p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
              {property.certified_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Certified: {formatDate(property.certified_at)}
                </div>
              )}
              {property.updated_at && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Updated: {formatDate(property.updated_at)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-600" />
                  Property Details
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Plot Number</p>
                    <p className="font-semibold text-slate-900">{property.property_number}</p>
                  </div>
                  {property.block && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Block / Zone</p>
                      <p className="font-semibold text-slate-900">{property.block}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Area</p>
                    <p className="font-semibold text-slate-900">
                      {property.area} {property.unit}
                    </p>
                  </div>
                  {property.facing && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Facing</p>
                      <p className="font-semibold text-slate-900 flex items-center gap-1">
                        <Compass className="w-4 h-4 text-blue-600" />
                        {property.facing}
                      </p>
                    </div>
                  )}
                  {property.length && property.width && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Dimensions</p>
                      <p className="font-semibold text-slate-900 flex items-center gap-1">
                        <Ruler className="w-4 h-4 text-blue-600" />
                        {property.length} × {property.width} ft
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Status</p>
                    <Badge className={
                      property.status === 'available' ? 'bg-green-100 text-green-700' :
                      property.status === 'sold' ? 'bg-red-100 text-red-700' :
                      'bg-sky-100 text-sky-700'
                    }>
                      {property.status?.charAt(0).toUpperCase() + property.status?.slice(1) || 'Available'}
                    </Badge>
                  </div>
                </div>

                {property.features && property.features.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-3">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {property.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="bg-slate-50">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-700 mb-1">Property Price</p>
                  <p className="text-3xl font-bold text-emerald-800">
                    {formatCurrency(property.price)}
                  </p>
                  {property.price_per_sqft && (
                    <p className="text-sm text-emerald-600 mt-1">
                      {formatCurrency(property.price_per_sqft)} per {property.unit}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-emerald-100 rounded-full">
                  <IndianRupee className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Verified Location
                  {location.source && (
                    <Badge variant="outline" className="text-xs ml-2">
                      Source: {location.source}
                    </Badge>
                  )}
                </h2>
              </div>
              <div className="p-6">
                {location.google_address && (
                  <p className="text-slate-700 mb-4">{location.google_address}</p>
                )}
                
                {location.latitude && location.longitude ? (
                  <>
                    <div className="rounded-lg overflow-hidden border border-slate-200 mb-4">
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_GOOGLE_MAPS_KEY || 'AIzaSyA0_bXgS462aA-eas28mt7uWlNFiv0NagY'}&q=${location.latitude},${location.longitude}&zoom=16`}
                        width="100%"
                        height="250"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Property Location"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Get Directions
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://www.google.com/maps/@${location.latitude},${location.longitude},17z`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in Maps
                      </Button>
                    </div>
                    
                    <p className="text-xs text-slate-400 mt-4">
                      Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Exact location will be shared upon inquiry</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {project?.location && `${project.location}, `}
                      {project?.city && `${project.city}, `}
                      {project?.state}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Media Gallery */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <Tabs defaultValue="images" className="w-full">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="images" className="data-[state=active]:bg-white">
                      <ImageIcon className="w-4 h-4 mr-2" /> Images ({media.images?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="videos" className="data-[state=active]:bg-white">
                      <Video className="w-4 h-4 mr-2" /> Videos ({media.videos?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="p-6">
                  <TabsContent value="images" className="mt-0">
                    {media.images && media.images.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {media.images.map((img, idx) => (
                          <div 
                            key={idx} 
                            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer hover:opacity-90 transition"
                            onClick={() => {
                              setSelectedImage(img.url || img);
                              setShowImageModal(true);
                            }}
                          >
                            <img 
                              src={img.url || img} 
                              alt={`Property ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {img.is_cover && (
                              <Badge className="absolute top-2 left-2 bg-blue-600 text-xs">Cover</Badge>
                            )}
                            {img.source === 'project' && (
                              <Badge className="absolute bottom-2 left-2 bg-slate-600 text-xs">Project</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No images available</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="videos" className="mt-0">
                    {media.videos && media.videos.length > 0 ? (
                      <div className="space-y-4">
                        {media.videos.map((video, idx) => (
                          <div key={idx} className="relative">
                            {video.is_youtube || video.url?.includes('youtube') ? (
                              <div className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                                <iframe
                                  src={video.url.replace('watch?v=', 'embed/')}
                                  className="w-full h-full"
                                  allowFullScreen
                                  title={video.title || `Video ${idx + 1}`}
                                />
                              </div>
                            ) : (
                              <video 
                                src={video.url} 
                                controls 
                                className="w-full rounded-lg"
                                poster={video.thumbnail}
                              />
                            )}
                            {video.title && (
                              <p className="text-sm text-slate-600 mt-2">{video.title}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No videos available</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Legal Info (if available) */}
            {(property.survey_number || property.registration_number || property.approval_number || project?.rera_number) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Legal & Approvals
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {property.survey_number && (
                      <div>
                        <p className="text-sm text-slate-500">Survey Number</p>
                        <p className="font-medium text-slate-900">{property.survey_number}</p>
                      </div>
                    )}
                    {property.registration_number && (
                      <div>
                        <p className="text-sm text-slate-500">Registration Number</p>
                        <p className="font-medium text-slate-900">{property.registration_number}</p>
                      </div>
                    )}
                    {property.approval_number && (
                      <div>
                        <p className="text-sm text-slate-500">Approval Number</p>
                        <p className="font-medium text-slate-900">{property.approval_number}</p>
                      </div>
                    )}
                    {project?.rera_number && (
                      <div>
                        <p className="text-sm text-slate-500">RERA Number</p>
                        <p className="font-medium text-slate-900">{project.rera_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Project Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Project Info
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Project Name</p>
                  <p className="font-semibold text-slate-900">{project?.name || 'N/A'}</p>
                </div>
                {project?.project_type && (
                  <div>
                    <p className="text-sm text-slate-500">Type</p>
                    <p className="font-medium text-slate-900">{project.project_type}</p>
                  </div>
                )}
                {project?.total_area && (
                  <div>
                    <p className="text-sm text-slate-500">Total Area</p>
                    <p className="font-medium text-slate-900">{project.total_area}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="font-medium text-slate-900">
                    {project?.location && `${project.location}, `}
                    {project?.city && `${project.city}, `}
                    {project?.state}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
              <h3 className="font-bold text-lg mb-4">Contact Us</h3>
              <div className="space-y-3">
                {company.contact_phone && (
                  <a 
                    href={`tel:${company.contact_phone}`}
                    className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{company.contact_phone}</span>
                  </a>
                )}
                {company.contact_email && (
                  <a 
                    href={`mailto:${company.contact_email}?subject=Inquiry: Plot ${property.property_number}`}
                    className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
                  >
                    <Mail className="w-5 h-5" />
                    <span className="text-sm break-all">{company.contact_email}</span>
                  </a>
                )}
                {company.website && (
                  <a 
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
                  >
                    <Globe className="w-5 h-5" />
                    <span>Visit Website</span>
                  </a>
                )}
              </div>
            </div>

            {/* Layout Preview */}
            {media.layout_image && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="font-bold text-slate-900 text-sm">Layout Plan</h2>
                </div>
                <div className="p-4">
                  <img 
                    src={media.layout_image} 
                    alt="Layout Plan"
                    className="w-full rounded-lg cursor-pointer hover:opacity-90 transition"
                    onClick={() => {
                      setSelectedImage(media.layout_image);
                      setShowImageModal(true);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trust Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-slate-700">Certified Property Document</span>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            This property information is officially published and certified by <strong>{company.name}</strong>. 
            The details shown here are verified and maintained by the property developer.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            Property ID: {property.id} • Generated on {formatDate(data.meta?.generated_at)}
          </p>
        </footer>
      </main>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button 
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
            onClick={() => setShowImageModal(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage} 
            alt="Property"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default CertifiedPropertyPage;
