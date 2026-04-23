/**
 * Project Public Landing Page
 * Individual public-facing page for each project
 * Accessible at /p/{project_id}
 * 
 * Features:
 * - Hero section with project overview
 * - Property gallery with availability status
 * - Amenities showcase
 * - Location map
 * - Price range
 * - Contact/Inquiry form
 * - Developer/Tenant info
 * - SEO optimized with structured data
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Building2, MapPin, Phone, Mail, Globe, Users, Home, Loader2,
  CheckCircle, ArrowRight, Star, Calendar, Clock, IndianRupee,
  ChevronRight, AlertCircle, Bed, Bath, Square, Car, Trees,
  Shield, Dumbbell, Waves, Coffee, Wifi, Camera, Share2,
  Heart, Download, Eye, Grid, List, Filter, X, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { SEOHead, generateProjectStructuredData, generateBreadcrumbStructuredData } from '../components/SEOHead';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format currency helper
const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

// Property Card Component
const PropertyCard = ({ property, onClick }) => {
  const statusColors = {
    available: 'bg-green-500',
    booked: 'bg-blue-500',
    reserved: 'bg-yellow-500',
    sold: 'bg-red-500'
  };
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
        {property.image_url ? (
          <img 
            src={property.image_url} 
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-12 h-12 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className={`${statusColors[property.status] || statusColors.available} text-white text-xs`}>
            {property.status || 'Available'}
          </Badge>
        </div>
        {property.facing && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs bg-white/90">
              {property.facing} Facing
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {property.name || property.property_number || property.plot_number || `Unit ${property.unit_number}`}
        </h4>
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
          {property.area && (
            <span className="flex items-center gap-1">
              <Square className="w-3 h-3" />
              {property.area} {property.area_unit || 'sq.ft'}
            </span>
          )}
          {property.bedrooms && (
            <span className="flex items-center gap-1">
              <Bed className="w-3 h-3" />
              {property.bedrooms} BHK
            </span>
          )}
        </div>
        {property.price && (
          <p className="mt-3 text-lg font-bold text-green-600">
            {formatCurrency(property.price)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Amenity Icon Component
const AmenityIcon = ({ amenity }) => {
  const iconMap = {
    'gym': Dumbbell,
    'swimming_pool': Waves,
    'pool': Waves,
    'parking': Car,
    'security': Shield,
    'garden': Trees,
    'clubhouse': Coffee,
    'wifi': Wifi,
    'cctv': Camera,
    'playground': Users,
    'default': CheckCircle
  };
  
  const normalizedAmenity = amenity.toLowerCase().replace(/\s+/g, '_');
  const Icon = iconMap[normalizedAmenity] || iconMap.default;
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <span className="font-medium text-gray-700 capitalize">{amenity.replace(/_/g, ' ')}</span>
    </div>
  );
};

const ProjectPublicPage = () => {
  const { projectId } = useParams();
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  // Inquiry form state
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/public/project/${projectId}`);
      
      if (!response.ok) {
        throw new Error('Project not found');
      }
      
      const data = await response.json();
      setProjectData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryForm.name || !inquiryForm.email || !inquiryForm.message) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/public/contact-inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inquiryForm,
          project_id: projectId,
          tenant_id: projectData?.tenant?.id,
          subject: `Project Inquiry: ${projectData?.project?.name}`
        })
      });

      if (response.ok) {
        toast.success('Thank you! We\'ll contact you soon about this project.');
        setInquiryForm({ name: '', email: '', phone: '', message: '' });
      } else {
        toast.error('Failed to submit. Please try again.');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: projectData?.project?.name,
        text: projectData?.project?.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  // Filter properties by status
  const getFilteredProperties = () => {
    const properties = projectData?.properties || [];
    if (statusFilter === 'all') return properties;
    return properties.filter(p => p.status === statusFilter);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <SEOHead title="Loading Project | RealApex" />
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <SEOHead title="Project Not Found | RealApex" noindex={true} />
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or has been removed.</p>
            <Link to="/">
              <Button>Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = projectData?.project || {};
  const tenant = projectData?.tenant || {};
  const properties = getFilteredProperties();
  const stats = projectData?.statistics || {};
  const priceRange = projectData?.price_range || {};
  const amenities = project.amenities || [];

  // Generate SEO structured data
  const projectStructuredData = projectData ? generateProjectStructuredData(
    project,
    tenant,
    projectData.properties || [],
    priceRange
  ) : null;

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: tenant.company_name || 'Developer', url: `/t/${tenant.id}` },
    { name: project.name || 'Project', url: `/p/${projectId}` }
  ]);

  // Format price for SEO
  const formatPriceForSEO = (price) => {
    if (!price) return '';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-white" data-testid="project-public-page">
      {/* SEO Meta Tags */}
      <SEOHead
        title={`${project.name} | ${tenant.company_name || 'Real Estate Project'} | ${project.city || 'India'}`}
        description={`${project.description || project.name} - ${stats.available || 0} units available starting from ${formatPriceForSEO(priceRange.min)}. Located at ${project.location || project.city}. ${project.amenities?.slice(0, 3).join(', ') || 'Premium amenities'}. RERA: ${project.rera_number || 'Registered'}`}
        keywords={`${project.name}, ${tenant.company_name}, ${project.city}, ${project.state}, real estate, property, ${project.project_type || 'residential'}, ${project.amenities?.join(', ') || ''}, buy property India`}
        image={project.banner_url || project.image_url}
        url={`/p/${projectId}`}
        type="product"
        structuredData={[projectStructuredData, breadcrumbData]}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.company_name} className="h-10 w-auto" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">{tenant.company_name}</h1>
                <p className="text-xs text-gray-500">{project.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="w-5 h-5" />
              </Button>
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`}>
                  <Button variant="outline" className="hidden md:flex">
                    <Phone className="w-4 h-4 mr-2" />
                    {tenant.phone}
                  </Button>
                </a>
              )}
              <Button 
                onClick={() => document.getElementById('inquiry').scrollIntoView({ behavior: 'smooth' })}
              >
                Enquire Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="h-[50vh] min-h-[400px] bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 relative overflow-hidden">
          {project.banner_url ? (
            <img 
              src={project.banner_url} 
              alt={project.name}
              className="w-full h-full object-cover opacity-40"
            />
          ) : (
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoLTR2LTJoNHYtNGgydjRoNHYyaC00djR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          )}
          
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="max-w-3xl">
                <Badge className="mb-4 bg-white/20 text-white border-white/30">
                  {project.project_type || project.category || 'Real Estate Project'}
                </Badge>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                  {project.name}
                </h1>
                
                {(project.location || project.city) && (
                  <div className="flex items-center gap-2 text-white/90 text-lg mb-6">
                    <MapPin className="w-5 h-5" />
                    <span>{project.location || `${project.city}, ${project.state}`}</span>
                  </div>
                )}
                
                <p className="text-xl text-white/80 mb-8 line-clamp-2">
                  {project.description || 'Premium development with world-class amenities'}
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <Button 
                    size="lg" 
                    className="bg-white text-blue-900 hover:bg-gray-100"
                    onClick={() => document.getElementById('properties').scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    View Properties
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-white text-white hover:bg-white/20"
                    onClick={() => document.getElementById('inquiry').scrollIntoView({ behavior: 'smooth' })}
                  >
                    Schedule Visit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Price & Stats Bar */}
        <div className="bg-white shadow-lg -mt-16 relative z-10 mx-4 lg:mx-auto max-w-5xl rounded-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            <div className="p-4 md:p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Starting Price</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">
                {formatCurrency(priceRange.min)}
              </p>
            </div>
            <div className="p-4 md:p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Units</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">
                {stats.total_properties || 0}
              </p>
            </div>
            <div className="p-4 md:p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Available</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600">
                {stats.available || 0}
              </p>
            </div>
            <div className="p-4 md:p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <Badge className={`text-sm ${
                project.status === 'completed' ? 'bg-green-100 text-green-800' :
                project.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {project.status || 'Ongoing'}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Availability Progress */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Availability Status</span>
            <span className="text-sm text-gray-500">
              {stats.available || 0} of {stats.total_properties || 0} available
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500 transition-all duration-500" 
              style={{ width: `${((stats.available || 0) / (stats.total_properties || 1)) * 100}%` }}
              title="Available"
            />
            <div 
              className="bg-yellow-500 transition-all duration-500" 
              style={{ width: `${((stats.reserved || 0) / (stats.total_properties || 1)) * 100}%` }}
              title="Reserved"
            />
            <div 
              className="bg-blue-500 transition-all duration-500" 
              style={{ width: `${((stats.booked || 0) / (stats.total_properties || 1)) * 100}%` }}
              title="Booked"
            />
            <div 
              className="bg-red-500 transition-all duration-500" 
              style={{ width: `${((stats.sold || 0) / (stats.total_properties || 1)) * 100}%` }}
              title="Sold"
            />
          </div>
          <div className="flex justify-center gap-6 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Available ({stats.available || 0})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> Reserved ({stats.reserved || 0})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Booked ({stats.booked || 0})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Sold ({stats.sold || 0})</span>
          </div>
        </div>
      </section>

      {/* Main Content Tabs */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="properties" id="properties">Properties</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* About Project */}
                  <Card>
                    <CardHeader>
                      <CardTitle>About {project.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 leading-relaxed">
                        {project.description || project.full_description || 
                         `${project.name} is a premium development offering exceptional living spaces with modern amenities. Located in ${project.location || project.city}, this project features ${stats.total_properties || 0} carefully designed units perfect for families and investors alike.`}
                      </p>
                      
                      {project.highlights && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-3">Project Highlights</h4>
                          <ul className="space-y-2">
                            {(Array.isArray(project.highlights) ? project.highlights : []).map((highlight, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-600">{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Location */}
                  {(project.location || project.address || project.city) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-blue-500" />
                          Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">
                          {project.address || project.location || `${project.city}, ${project.state}`}
                        </p>
                        
                        {project.nearby_landmarks && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Nearby Landmarks</h4>
                            <div className="flex flex-wrap gap-2">
                              {(Array.isArray(project.nearby_landmarks) ? project.nearby_landmarks : []).map((landmark, i) => (
                                <Badge key={i} variant="secondary">{landmark}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Placeholder for map */}
                        <div className="mt-4 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <MapPin className="w-12 h-12 mx-auto mb-2" />
                            <p>Map view available on request</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type</span>
                        <span className="font-medium">{project.project_type || project.category || 'Residential'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Units</span>
                        <span className="font-medium">{stats.total_properties || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Available</span>
                        <span className="font-medium text-green-600">{stats.available || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price Range</span>
                        <span className="font-medium">
                          {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
                        </span>
                      </div>
                      {project.possession_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Possession</span>
                          <span className="font-medium">{project.possession_date}</span>
                        </div>
                      )}
                      {project.rera_number && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">RERA No.</span>
                          <span className="font-medium text-xs">{project.rera_number}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Developer Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Developer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-4">
                        {tenant.logo_url ? (
                          <img src={tenant.logo_url} alt={tenant.company_name} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900">{tenant.company_name}</h4>
                          <p className="text-sm text-gray-500">{tenant.tagline || 'Real Estate Developer'}</p>
                        </div>
                      </div>
                      
                      {tenant.id && (
                        <Link to={`/t/${tenant.id}`}>
                          <Button variant="outline" className="w-full">
                            View All Projects
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({projectData?.properties?.length || 0})
                  </Button>
                  <Button 
                    variant={statusFilter === 'available' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('available')}
                    className={statusFilter === 'available' ? 'bg-green-600' : ''}
                  >
                    Available ({stats.available || 0})
                  </Button>
                  <Button 
                    variant={statusFilter === 'booked' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter('booked')}
                    className={statusFilter === 'booked' ? 'bg-blue-600' : ''}
                  >
                    Booked ({stats.booked || 0})
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? 'default' : 'ghost'} 
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Properties Grid/List */}
              {properties.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No properties match your filter.</p>
                  <Button variant="link" onClick={() => setStatusFilter('all')}>
                    View all properties
                  </Button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {properties.map((property) => (
                    <PropertyCard 
                      key={property.id} 
                      property={property}
                      onClick={() => setSelectedProperty(property)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {properties.map((property) => (
                    <Card 
                      key={property.id}
                      className="hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedProperty(property)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                          {property.image_url ? (
                            <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {property.name || property.property_number || property.plot_number || `Unit ${property.unit_number}`}
                              </h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                {property.area && <span>{property.area} {property.area_unit || 'sq.ft'}</span>}
                                {property.bedrooms && <span>{property.bedrooms} BHK</span>}
                                {property.facing && <span>{property.facing} Facing</span>}
                              </div>
                            </div>
                            <Badge className={`${
                              property.status === 'available' ? 'bg-green-100 text-green-800' :
                              property.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                              property.status === 'sold' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {property.status || 'Available'}
                            </Badge>
                          </div>
                          {property.price && (
                            <p className="mt-2 text-lg font-bold text-green-600">{formatCurrency(property.price)}</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Amenities Tab */}
            <TabsContent value="amenities">
              {amenities.length === 0 ? (
                <div className="text-center py-12">
                  <Trees className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Amenities information will be updated soon.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {amenities.map((amenity, i) => (
                    <AmenityIcon key={i} amenity={amenity} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Inquiry Section */}
      <section id="inquiry" className="py-16 bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="text-white">
              <Badge className="mb-4 bg-white/20 text-white border-white/30">Get in Touch</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Interested in {project.name}?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Schedule a site visit or get more information about available units. Our team will contact you within 24 hours.
              </p>
              
              <div className="space-y-4">
                {tenant.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-200">Call Us</div>
                      <a href={`tel:${tenant.phone}`} className="font-medium hover:underline">{tenant.phone}</a>
                    </div>
                  </div>
                )}
                
                {tenant.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-200">Email</div>
                      <a href={`mailto:${tenant.email}`} className="font-medium hover:underline">{tenant.email}</a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inquiry Form */}
            <Card className="border-0 shadow-2xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Request Information</h3>
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name *</label>
                    <Input 
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      placeholder="Your name"
                      className="mt-1"
                      required
                      data-testid="inquiry-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email *</label>
                      <Input 
                        type="email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                        placeholder="you@email.com"
                        className="mt-1"
                        required
                        data-testid="inquiry-email"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <Input 
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="mt-1"
                        data-testid="inquiry-phone"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Message *</label>
                    <Textarea 
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      placeholder="I'm interested in learning more about this project..."
                      className="mt-1"
                      rows={4}
                      required
                      data-testid="inquiry-message"
                    />
                  </div>
                  <Button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800"
                    disabled={submitting}
                    data-testid="submit-inquiry-btn"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Inquiry
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.company_name} className="h-8 w-auto brightness-0 invert" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <span className="font-semibold">{tenant.company_name}</span>
            </div>
            
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {tenant.company_name}. All rights reserved.
            </p>
            
            <div className="mt-4 md:mt-0">
              <span className="text-gray-400 text-sm">Powered by </span>
              <Link to="/saas" className="text-blue-400 hover:text-blue-300">RealApex</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{selectedProperty.name || selectedProperty.plot_number}</CardTitle>
                <p className="text-gray-500">{project.name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedProperty(null)}>
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProperty.image_url && (
                <img 
                  src={selectedProperty.image_url} 
                  alt={selectedProperty.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={`mt-1 ${
                    selectedProperty.status === 'available' ? 'bg-green-100 text-green-800' :
                    selectedProperty.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedProperty.status || 'Available'}
                  </Badge>
                </div>
                {selectedProperty.price && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedProperty.price)}</p>
                  </div>
                )}
                {selectedProperty.area && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Area</p>
                    <p className="font-medium">{selectedProperty.area} {selectedProperty.area_unit || 'sq.ft'}</p>
                  </div>
                )}
                {selectedProperty.facing && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Facing</p>
                    <p className="font-medium">{selectedProperty.facing}</p>
                  </div>
                )}
                {selectedProperty.bedrooms && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Configuration</p>
                    <p className="font-medium">{selectedProperty.bedrooms} BHK</p>
                  </div>
                )}
                {selectedProperty.floor && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Floor</p>
                    <p className="font-medium">{selectedProperty.floor}</p>
                  </div>
                )}
              </div>

              {selectedProperty.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedProperty.description}</p>
                </div>
              )}

              <Button 
                className="w-full"
                onClick={() => {
                  setSelectedProperty(null);
                  document.getElementById('inquiry').scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Enquire About This Property
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProjectPublicPage;
