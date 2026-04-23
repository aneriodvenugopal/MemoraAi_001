import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MapPin, Building2, Home, Phone, Mail, User, MessageSquare,
  Check, Clock, AlertCircle, ZoomIn, ZoomOut, Maximize2, Minimize2,
  IndianRupee, Share2, ImageIcon, Video, Heart, CreditCard, X,
  ChevronLeft, ChevronRight, Play, Calendar, FileText, Navigation, ExternalLink, Map
} from 'lucide-react';
import { toast } from 'sonner';

const PublicLayoutView = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [svgUrl, setSvgUrl] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [svgDimensions, setSvgDimensions] = useState({ width: 1200, height: 800 });
  const [playingVideoIndex, setPlayingVideoIndex] = useState(null); // For video player
  const containerRef = useRef(null);
  
  // Interest form state
  const [interestForm, setInterestForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [submittingInterest, setSubmittingInterest] = useState(false);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    id_proof: '',
    payment_method: 'upi'
  });
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useEffect(() => {
    fetchPublicLayout();
    
    // Auto-refresh every 10 seconds to reflect plot status changes in real-time
    const pollInterval = setInterval(() => {
      fetchPublicLayout(true); // Silent refresh (no loading state)
    }, 10000);
    
    return () => clearInterval(pollInterval);
  }, [projectId]);

  // Calculate viewBox based on plot coordinates - this ensures plots align correctly
  useEffect(() => {
    if (layout?.plots && layout.plots.length > 0) {
      // Calculate bounding box from all plot coordinates
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      layout.plots.forEach(plot => {
        if (plot.coordinates && Array.isArray(plot.coordinates)) {
          plot.coordinates.forEach(coord => {
            if (typeof coord.x === 'number' && typeof coord.y === 'number') {
              minX = Math.min(minX, coord.x);
              minY = Math.min(minY, coord.y);
              maxX = Math.max(maxX, coord.x);
              maxY = Math.max(maxY, coord.y);
            }
          });
        }
      });
      
      if (minX !== Infinity && maxX !== -Infinity) {
        // Add padding around the plots
        const padding = 100;
        const width = maxX - minX + (padding * 2);
        const height = maxY - minY + (padding * 2);
        
        // Store both dimensions and offset for viewBox
        // Only update if we haven't extracted from SVG yet
        setSvgDimensions(prev => {
          if (prev.fromSvg) return prev; // Don't override SVG-based dimensions
          return { 
            width, 
            height,
            minX: minX - padding,
            minY: minY - padding
          };
        });
        console.log('📐 Public View: ViewBox calculated from plots:', { 
          minX: minX - padding, 
          minY: minY - padding, 
          width, 
          height 
        });
      }
    }
  }, [layout]);

  // Extract SVG viewBox from the actual SVG file - this is the KEY fix
  // The overlay must match the original SVG's coordinate system
  useEffect(() => {
    if (svgUrl) {
      fetch(svgUrl)
        .then(res => res.text())
        .then(svgText => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgElement = svgDoc.querySelector('svg');
          
          if (svgElement) {
            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
              const [x, y, width, height] = viewBox.split(' ').map(Number);
              setSvgDimensions({ 
                width, 
                height,
                minX: x,
                minY: y,
                fromSvg: true // Flag to indicate this came from SVG file
              });
              console.log('📐 Public View: ViewBox extracted from SVG file:', { x, y, width, height });
            }
          }
        })
        .catch(err => console.warn('Could not read SVG dimensions:', err));
    }
  }, [svgUrl]);

  const fetchPublicLayout = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/layouts/public/projects/${projectId}/layout`
      );
      
      if (response.data) {
        setLayout(response.data.layout);
        setProject(response.data.project);
        
        if (response.data.layout?.svg_url) {
          let fullSvgUrl = response.data.layout.svg_url;
          
          // Handle relative URLs
          if (fullSvgUrl.startsWith('/')) {
            fullSvgUrl = `${process.env.REACT_APP_BACKEND_URL}${fullSvgUrl}`;
          } else {
            // If the URL points to a different domain, replace with current backend
            // This handles cases where the database has old domain references
            try {
              const urlObj = new URL(fullSvgUrl);
              const currentBackend = new URL(process.env.REACT_APP_BACKEND_URL);
              if (urlObj.hostname !== currentBackend.hostname) {
                // Replace the domain with current backend domain
                fullSvgUrl = `${process.env.REACT_APP_BACKEND_URL}${urlObj.pathname}`;
                console.log('📷 Corrected SVG URL domain:', fullSvgUrl);
              }
            } catch (e) {
              // If URL parsing fails, use as-is
              console.warn('Could not parse SVG URL:', e);
            }
          }
          
          setSvgUrl(fullSvgUrl);
        }
      }
    } catch (err) {
      console.error('Error loading public layout:', err);
      if (!silent) setError('Layout not found or not available for public viewing');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getPolygonPoints = (coordinates) => {
    return coordinates.map(c => `${c.x},${c.y}`).join(' ');
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'rgba(34, 197, 94, 0.5)',  // Green
      booked: 'rgba(251, 191, 36, 0.5)',    // Yellow
      blocked: 'rgba(249, 115, 22, 0.5)',   // Orange
      sold: 'rgba(239, 68, 68, 0.4)'        // Red
    };
    return colors[status] || colors.available;
  };
  
  // Extract plot number from display_name (e.g., "Plot 1" -> "1")
  const getPlotLabel = (displayName) => {
    if (!displayName) return '';
    const match = displayName.match(/Plot\s*(\d+)/i);
    return match ? match[1] : displayName;
  };

  const getStatusBadge = (status) => {
    const config = {
      available: { color: 'bg-green-500', icon: Check, label: 'Available' },
      booked: { color: 'bg-blue-500', icon: Clock, label: 'Booked' },
      blocked: { color: 'bg-orange-500', icon: AlertCircle, label: 'Blocked' },
      sold: { color: 'bg-red-500', icon: AlertCircle, label: 'Sold' }
    };
    const { color, icon: Icon, label } = config[status] || config.available;
    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
    setShowPlotModal(true);
    setActiveTab('details');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for Price';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  const handleInterestSubmit = async (e) => {
    e.preventDefault();
    setSubmittingInterest(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Thank you for your interest! Our team will contact you soon.');
    setInterestForm({ name: '', phone: '', email: '', message: '' });
    setSubmittingInterest(false);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmittingBooking(true);
    
    // Simulate API call - In real implementation, integrate with payment gateway
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Booking request submitted! Redirecting to payment...');
    setSubmittingBooking(false);
    
    // Here you would redirect to payment gateway
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading layout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-white flex items-center justify-center">
        <Card className="max-w-md bg-white border border-gray-200 shadow-lg">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Layout Not Available</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plots = layout?.plots || [];
  const availablePlots = plots.filter(p => p.status === 'available');
  const bookedPlots = plots.filter(p => p.status === 'booked');
  const blockedPlots = plots.filter(p => p.status === 'blocked');
  const soldPlots = plots.filter(p => p.status === 'sold');

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-white overflow-hidden">
      {/* Top Bar - Minimal transparent design */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200/50">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold text-gray-900">{project?.name || 'Project Layout'}</h1>
              {project?.location && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {project.location}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-200/50">
              <Button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-700 hover:bg-gray-100">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-gray-700 text-xs px-1 min-w-[40px] text-center">{(zoom * 100).toFixed(0)}%</span>
              <Button onClick={() => setZoom(z => Math.min(3, z + 0.2))} size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-700 hover:bg-gray-100">
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            
            <Button onClick={toggleFullScreen} size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gray-100 rounded-lg shadow-sm border border-gray-200/50">
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            <Button onClick={handleShare} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 rounded-lg shadow-sm">
              <Share2 className="w-3 h-3 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout Area - Full Screen with proper scroll support */}
      <div className="absolute inset-0 pt-14 pb-16 overflow-auto">
        <div 
          className="flex items-center justify-center"
          style={{ 
            minWidth: `${Math.max(100, zoom * 100)}%`,
            minHeight: `${Math.max(100, zoom * 100)}%`,
            padding: `${zoom > 1 ? (zoom - 1) * 50 : 0}vh ${zoom > 1 ? (zoom - 1) * 50 : 0}vw`
          }}
        >
          <div
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            {svgUrl ? (
              <div style={{ position: 'relative', display: 'inline-block' }} className="shadow-2xl rounded-xl overflow-hidden border-4 border-white/20">
                <img src={svgUrl} alt="Layout" style={{ display: 'block', maxWidth: 'none' }} />
                
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'all'
                  }}
                  viewBox={`${svgDimensions.minX || 0} ${svgDimensions.minY || 0} ${svgDimensions.width} ${svgDimensions.height}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {plots.map((plot) => (
                    <g 
                      key={plot.id} 
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlotClick(plot);
                      }}
                    >
                      <polygon
                        points={getPolygonPoints(plot.coordinates)}
                        fill={getStatusColor(plot.status)}
                        stroke={selectedPlot?.id === plot.id ? '#06b6d4' : '#64748b'}
                        strokeWidth={selectedPlot?.id === plot.id ? '4' : '2'}
                        style={{ cursor: 'pointer' }}
                      />
                      {/* Plot number label - just the number inside the plot */}
                      <text
                        x={plot.coordinates.reduce((sum, c) => sum + c.x, 0) / plot.coordinates.length}
                        y={plot.coordinates.reduce((sum, c) => sum + c.y, 0) / plot.coordinates.length}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1e293b"
                        fontSize="11"
                        fontWeight="bold"
                        style={{ textShadow: '0 0 3px white, 0 0 3px white', pointerEvents: 'none' }}
                      >
                        {getPlotLabel(plot.display_name)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="text-center">
                <Building2 className="w-24 h-24 mx-auto text-gray-400 mb-4" />
                <p className="text-xl text-gray-600">No layout available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar - With labels */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-lg border border-gray-200/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700 text-sm"><span className="font-bold text-green-600">{availablePlots.length}</span> Available</span>
          </div>
          <div className="w-px h-5 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700 text-sm"><span className="font-bold text-blue-600">{bookedPlots.length}</span> Booked</span>
          </div>
          <div className="w-px h-5 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-700 text-sm"><span className="font-bold text-orange-600">{blockedPlots.length}</span> Blocked</span>
          </div>
          <div className="w-px h-5 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700 text-sm"><span className="font-bold text-red-600">{soldPlots.length}</span> Sold</span>
          </div>
        </div>
      </div>

      {/* Plot Details Modal - Mobile Responsive */}
      <Dialog open={showPlotModal} onOpenChange={setShowPlotModal}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden p-0 bg-white sm:w-full"  style={{ maxWidth: 'min(95vw, 48rem)' }}>
          {selectedPlot && (
            <>
              {/* Modal Header - Mobile Responsive */}
              <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">{selectedPlot.display_name}</h2>
                    <p className="text-cyan-100 text-sm sm:text-base">{project?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(selectedPlot.status)}
                  </div>
                </div>
              </div>

              {/* Tabs - Mobile Responsive with horizontal scroll */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-gray-50 overflow-x-auto flex-nowrap">
                  <TabsTrigger value="details" className="py-2 sm:py-3 px-3 sm:px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-600 whitespace-nowrap text-xs sm:text-sm">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="py-2 sm:py-3 px-3 sm:px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-600 whitespace-nowrap text-xs sm:text-sm">
                    <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Gallery
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="py-2 sm:py-3 px-3 sm:px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-600 whitespace-nowrap text-xs sm:text-sm">
                    <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Videos
                  </TabsTrigger>
                  <TabsTrigger value="location" className="py-2 sm:py-3 px-3 sm:px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-600 whitespace-nowrap text-xs sm:text-sm">
                    <Map className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Location
                  </TabsTrigger>
                  <TabsTrigger value="interest" className="py-2 sm:py-3 px-3 sm:px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-600 whitespace-nowrap text-xs sm:text-sm">
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Interest
                  </TabsTrigger>
                  {selectedPlot.status === 'available' && (
                    <TabsTrigger value="booking" className="py-2 sm:py-3 px-3 sm:px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-600 data-[state=active]:text-cyan-600 whitespace-nowrap text-xs sm:text-sm">
                      <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Book
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="p-4 sm:p-6 max-h-[50vh] overflow-y-auto">
                  {/* Details Tab - Mobile Responsive */}
                  <TabsContent value="details" className="mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 border-b pb-2 text-sm sm:text-base">Property Information</h3>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Plot Number</p>
                            <p className="font-bold text-base sm:text-lg">{selectedPlot.display_name}</p>
                          </div>
                          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Block</p>
                            <p className="font-bold text-base sm:text-lg">{selectedPlot.block || 'A'}</p>
                          </div>
                          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Area</p>
                            <p className="font-bold text-base sm:text-lg">{selectedPlot.area || 'N/A'} <span className="text-xs sm:text-sm font-normal">{selectedPlot.unit || 'sq.yard'}</span></p>
                          </div>
                          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Facing</p>
                            <p className="font-bold text-base sm:text-lg">{selectedPlot.facing || 'East'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 border-b pb-2 text-sm sm:text-base">Pricing</h3>
                        <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                          <p className="text-xs sm:text-sm text-green-700 mb-1">Total Price</p>
                          <p className="text-2xl sm:text-3xl font-bold text-green-700">{formatPrice(selectedPlot.price)}</p>
                          {selectedPlot.area && selectedPlot.price > 0 && (
                            <p className="text-xs sm:text-sm text-green-600 mt-2">
                              ₹{Math.round(selectedPlot.price / selectedPlot.area).toLocaleString()} per {selectedPlot.unit || 'sq.yard'}
                            </p>
                          )}
                        </div>
                        
                        {selectedPlot.status === 'available' && (
                          <Button 
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 h-10 sm:h-12 text-sm sm:text-lg"
                            onClick={() => setActiveTab('booking')}
                          >
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Book Now
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Amenities */}
                    {selectedPlot.amenities && selectedPlot.amenities.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedPlot.amenities.map((amenity, idx) => (
                            <Badge key={idx} variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Gallery Tab - Enhanced with better image handling */}
                  <TabsContent value="gallery" className="mt-0">
                    {(() => {
                      // Collect all available images from different sources
                      // Check multiple possible field names for images
                      const plotImages = selectedPlot.property_images || selectedPlot.images || selectedPlot.gallery || [];
                      const projectImages = project?.property_images || project?.images || project?.gallery || [];
                      
                      // Filter out empty/invalid URLs
                      const validPlotImages = plotImages.filter(img => {
                        const url = typeof img === 'string' ? img : img?.url;
                        return url && url.trim() !== '' && !url.includes('undefined');
                      });
                      const validProjectImages = projectImages.filter(img => {
                        const url = typeof img === 'string' ? img : img?.url;
                        return url && url.trim() !== '' && !url.includes('undefined');
                      });
                      
                      const hasImages = validPlotImages.length > 0 || validProjectImages.length > 0;
                      
                      return hasImages ? (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {/* Plot specific images */}
                        {validPlotImages.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Plot Images ({validPlotImages.length})
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                              {validPlotImages.map((image, idx) => {
                                const imgUrl = typeof image === 'string' ? image : (image?.url || '');
                                const isCover = typeof image === 'object' && image?.is_cover;
                                return (
                                <div 
                                  key={idx} 
                                  className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square cursor-pointer hover:scale-105 transition-transform shadow-sm"
                                  onClick={() => window.open(imgUrl, '_blank')}
                                >
                                  <img 
                                    src={imgUrl} 
                                    alt={`Plot ${selectedPlot.display_name || selectedPlot.property_number} - ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%23e5e7eb" width="200" height="200"/><text fill="%236b7280" font-family="sans-serif" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em">No Preview</text></svg>';
                                    }}
                                  />
                                  {isCover && (
                                    <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full font-medium">Cover</span>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                    <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Project/Layout images */}
                        {validProjectImages.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              Project Gallery ({validProjectImages.length})
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                              {validProjectImages.map((image, idx) => {
                                const imgUrl = typeof image === 'string' ? image : (image?.url || '');
                                return (
                                <div 
                                  key={idx} 
                                  className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square cursor-pointer hover:scale-105 transition-transform shadow-sm"
                                  onClick={() => window.open(imgUrl, '_blank')}
                                >
                                  <img 
                                    src={imgUrl} 
                                    alt={`${project.name} - ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%23e5e7eb" width="200" height="200"/><text fill="%236b7280" font-family="sans-serif" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em">No Preview</text></svg>';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                    <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Images Available</h3>
                        <p className="text-gray-500">Gallery images will be added soon</p>
                      </div>
                    );
                    })()}
                  </TabsContent>

                  {/* Videos Tab - Improved UI with thumbnails */}
                  <TabsContent value="videos" className="mt-0">
                    {(() => {
                      // Collect videos from multiple sources
                      let videos = selectedPlot.property_videos || selectedPlot.videos || [];
                      
                      // Also check for single video_url or youtube_url fields
                      if (selectedPlot.video_url && !videos.some(v => (typeof v === 'string' ? v : v?.url) === selectedPlot.video_url)) {
                        videos = [...videos, { url: selectedPlot.video_url }];
                      }
                      if (selectedPlot.youtube_url && !videos.some(v => (typeof v === 'string' ? v : v?.url) === selectedPlot.youtube_url)) {
                        videos = [...videos, { url: selectedPlot.youtube_url }];
                      }
                      
                      // Filter valid videos
                      const validVideos = videos.filter(v => {
                        const url = typeof v === 'string' ? v : v?.url;
                        return url && url.trim() !== '';
                      });
                      
                      // Extract YouTube ID from URL
                      const getYouTubeId = (url) => {
                        if (!url) return null;
                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                        const match = url.match(regExp);
                        return (match && match[2].length === 11) ? match[2] : null;
                      };
                      
                      return validVideos.length > 0 ? (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {/* Currently playing video */}
                        {playingVideoIndex !== null && (
                          <div className="relative rounded-lg overflow-hidden bg-gray-900 w-full" style={{ aspectRatio: '16/9', maxHeight: '250px' }}>
                            {(() => {
                              const video = validVideos[playingVideoIndex];
                              const videoUrl = typeof video === 'string' ? video : (video?.url || '');
                              const youtubeId = video?.youtube_id || getYouTubeId(videoUrl);
                              
                              return youtubeId ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0&autoplay=1`}
                                  title={`Property Video ${playingVideoIndex + 1}`}
                                  className="w-full h-full"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              ) : (
                                <video 
                                  src={videoUrl} 
                                  controls 
                                  autoPlay
                                  className="w-full h-full object-contain"
                                  poster={video?.thumbnail}
                                />
                              );
                            })()}
                            <button
                              onClick={() => setPlayingVideoIndex(null)}
                              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        {/* Video thumbnails grid */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <Video className="w-4 h-4" />
                            Videos ({validVideos.length})
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {validVideos.map((video, idx) => {
                              const videoUrl = typeof video === 'string' ? video : (video?.url || '');
                              const youtubeId = video?.youtube_id || getYouTubeId(videoUrl);
                              const thumbnail = youtubeId 
                                ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
                                : (video?.thumbnail || '');
                              const isPlaying = playingVideoIndex === idx;
                              
                              return (
                              <div 
                                key={idx} 
                                className={`relative rounded-lg overflow-hidden bg-gray-900 cursor-pointer group ${isPlaying ? 'ring-2 ring-blue-500' : ''}`}
                                style={{ aspectRatio: '16/9' }}
                                onClick={() => setPlayingVideoIndex(idx)}
                              >
                                {thumbnail ? (
                                  <img 
                                    src={thumbnail}
                                    alt={`Video ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <Video className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                                  </div>
                                )}
                                
                                {/* Play button overlay */}
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${isPlaying ? 'bg-blue-500' : 'bg-red-600'} shadow-lg`}>
                                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" fill="white" />
                                  </div>
                                </div>
                                
                                {/* Video number badge */}
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                                  {idx + 1}
                                </span>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-12">
                        <Video className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No Videos Available</h3>
                        <p className="text-gray-500 text-sm">Property videos will be added soon</p>
                      </div>
                    );
                    })()}
                  </TabsContent>

                  {/* Location Tab with Embedded Google Maps */}
                  <TabsContent value="location" className="mt-0">
                    <div className="space-y-4">
                      {/* Project Location Info */}
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">{project?.name}</p>
                          <p className="text-sm text-gray-600">
                            {project?.location && `${project.location}, `}
                            {project?.city && `${project.city}, `}
                            {project?.state}
                          </p>
                        </div>
                      </div>

                      {/* Clickable Map Area - Opens Directions */}
                      <div 
                        className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100 cursor-pointer relative group"
                        onClick={() => {
                          const lat = selectedPlot?.latitude || project?.latitude;
                          const lng = selectedPlot?.longitude || project?.longitude;
                          if (lat && lng) {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                            window.open(url, '_blank');
                          } else if (project?.google_maps_url) {
                            window.open(project.google_maps_url, '_blank');
                          }
                        }}
                      >
                        {/* Overlay hint on hover */}
                        <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                          <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-600">Click for Directions</span>
                          </div>
                        </div>
                        
                        {(selectedPlot?.latitude && selectedPlot?.longitude) || (project?.latitude && project?.longitude) ? (
                          <iframe
                            src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${selectedPlot?.longitude || project?.longitude}!3d${selectedPlot?.latitude || project?.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM${selectedPlot?.latitude || project?.latitude}!5e0!3m2!1sen!2sin!4v1609459200000!5m2!1sen!2sin`}
                            width="100%"
                            height="300"
                            style={{ border: 0, pointerEvents: 'none' }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Property Location"
                          />
                        ) : project?.google_maps_url ? (
                          <iframe
                            src={project.google_maps_url.replace('/maps/', '/maps/embed/')}
                            width="100%"
                            height="300"
                            style={{ border: 0, pointerEvents: 'none' }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Property Location"
                          />
                        ) : (
                          <div className="h-[300px] flex flex-col items-center justify-center">
                            <Map className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-500">Map location not available</p>
                            <p className="text-sm text-gray-400 mt-1">Contact us for directions</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        {((selectedPlot?.latitude && selectedPlot?.longitude) || (project?.latitude && project?.longitude)) || project?.google_maps_url ? (
                          <>
                            <Button 
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                const lat = selectedPlot?.latitude || project?.latitude;
                                const lng = selectedPlot?.longitude || project?.longitude;
                                const url = project?.google_maps_url || 
                                  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                                window.open(url, '_blank');
                              }}
                            >
                              <Navigation className="w-4 h-4 mr-2" />
                              Get Directions
                            </Button>
                            <Button 
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                const url = project?.google_maps_url || 
                                  `https://www.google.com/maps/@${project.latitude},${project.longitude},17z`;
                                window.open(url, '_blank');
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open in Google Maps
                            </Button>
                          </>
                        ) : (
                          <Button 
                            className="w-full"
                            onClick={() => setActiveTab('interest')}
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Contact for Location Details
                          </Button>
                        )}
                      </div>

                      {/* Nearby Landmarks */}
                      {project?.landmarks && project.landmarks.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Nearby Landmarks</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {project.landmarks.map((landmark, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-700">{landmark}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Show Interest Tab */}
                  <TabsContent value="interest" className="mt-0">
                    <div className="max-w-md mx-auto">
                      <div className="text-center mb-6">
                        <Heart className="w-12 h-12 mx-auto text-pink-500 mb-2" />
                        <h3 className="text-lg font-semibold">Interested in this property?</h3>
                        <p className="text-gray-500 text-sm">Fill the form below and we&apos;ll contact you</p>
                      </div>
                      
                      <form onSubmit={handleInterestSubmit} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Full Name *</label>
                          <Input
                            value={interestForm.name}
                            onChange={(e) => setInterestForm({...interestForm, name: e.target.value})}
                            placeholder="Enter your name"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Phone *</label>
                            <Input
                              value={interestForm.phone}
                              onChange={(e) => setInterestForm({...interestForm, phone: e.target.value})}
                              placeholder="+91 98765 43210"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <Input
                              type="email"
                              value={interestForm.email}
                              onChange={(e) => setInterestForm({...interestForm, email: e.target.value})}
                              placeholder="email@example.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Message</label>
                          <textarea
                            value={interestForm.message}
                            onChange={(e) => setInterestForm({...interestForm, message: e.target.value})}
                            placeholder="Any specific questions or requirements..."
                            className="w-full px-3 py-2 border rounded-lg resize-none h-24"
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                          disabled={submittingInterest}
                        >
                          {submittingInterest ? 'Submitting...' : 'Submit Interest'}
                        </Button>
                      </form>
                    </div>
                  </TabsContent>

                  {/* Booking Tab */}
                  {selectedPlot.status === 'available' && (
                    <TabsContent value="booking" className="mt-0">
                      <div className="max-w-lg mx-auto">
                        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 mb-6 border border-cyan-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-cyan-700">Booking Amount</p>
                              <p className="text-2xl font-bold text-cyan-800">₹50,000</p>
                              <p className="text-xs text-cyan-600">Token amount to reserve this plot</p>
                            </div>
                            <CreditCard className="w-12 h-12 text-cyan-500" />
                          </div>
                        </div>
                        
                        <form onSubmit={handleBookingSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Full Name *</label>
                              <Input
                                value={bookingForm.name}
                                onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})}
                                placeholder="Enter your name"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Phone *</label>
                              <Input
                                value={bookingForm.phone}
                                onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                                placeholder="+91 98765 43210"
                                required
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700">Email *</label>
                            <Input
                              type="email"
                              value={bookingForm.email}
                              onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                              placeholder="email@example.com"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700">Address</label>
                            <Input
                              value={bookingForm.address}
                              onChange={(e) => setBookingForm({...bookingForm, address: e.target.value})}
                              placeholder="Your current address"
                            />
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700">Payment Method</label>
                            <div className="grid grid-cols-3 gap-3 mt-2">
                              {['upi', 'card', 'netbanking'].map((method) => (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => setBookingForm({...bookingForm, payment_method: method})}
                                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                                    bookingForm.payment_method === method 
                                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700' 
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <p className="font-medium capitalize">{method === 'upi' ? 'UPI' : method === 'netbanking' ? 'Net Banking' : 'Card'}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t">
                            <Button 
                              type="submit" 
                              className="w-full h-12 text-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                              disabled={submittingBooking}
                            >
                              {submittingBooking ? 'Processing...' : 'Pay ₹50,000 & Book'}
                            </Button>
                            <p className="text-xs text-center text-gray-500 mt-2">
                              Secure payment powered by Stripe/Razorpay
                            </p>
                          </div>
                        </form>
                      </div>
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicLayoutView;
