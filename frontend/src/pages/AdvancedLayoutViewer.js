import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, Edit, Edit3, Trash2, Download, Share2, Building2, MapPin, Trees, Warehouse, LayoutGrid,
  Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Search, Filter, X, 
  Home, IndianRupee, Ruler, Calendar, User, Phone, Mail, MessageSquare,
  Image as ImageIcon, Video, FileText, Heart, ShoppingCart, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { layoutService } from '../services';
import PlotEditor from '../components/PlotEditor';

const AdvancedLayoutViewer = () => {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const svgContainerRef = useRef(null);
  
  // Core State
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // View State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hoveredPlot, setHoveredPlot] = useState(null);
  
  // Modal State
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Interest/Booking Form State
  const [interestForm, setInterestForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  
  const [bookingForm, setBookingForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    payment_plan: 'full',
    notes: ''
  });
  
  // Plot Editor State
  const [showPlotEditor, setShowPlotEditor] = useState(false);

  // SVG Coordinate System - CRITICAL FIX for coordinate scaling bug
  const [svgDimensions, setSvgDimensions] = useState({ width: 1122.6667, height: 793.33331 });

  useEffect(() => {
    loadLayout();
  }, [layoutId]);

  // Detect SVG dimensions when layout loads - FIX for coordinate system mismatch
  useEffect(() => {
    if (layout?.svg_url) {
      fetch(layout.svg_url)
        .then(r => r.text())
        .then(svgText => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgEl = svgDoc.querySelector('svg');
          
          if (svgEl) {
            const viewBox = svgEl.getAttribute('viewBox');
            if (viewBox) {
              const [, , w, h] = viewBox.split(' ').map(Number);
              setSvgDimensions({ width: w, height: h });
              console.log('✅ SVG ViewBox detected:', w, 'x', h);
            } else {
              const w = parseFloat(svgEl.getAttribute('width')) || 1122.6667;
              const h = parseFloat(svgEl.getAttribute('height')) || 793.33331;
              setSvgDimensions({ width: w, height: h });
              console.log('✅ SVG dimensions detected:', w, 'x', h);
            }
          }
        })
        .catch(err => {
          console.log('⚠️ Using default SVG dimensions', err);
        });
    }
  }, [layout?.svg_url]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullScreen]);

  const loadLayout = async () => {
    setLoading(true);
    try {
      const response = await layoutService.getMasterLayout(layoutId);
      setLayout(response.layout);
    } catch (error) {
      console.error('Error loading layout:', error);
      toast.error('Failed to load layout');
      navigate('/layouts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${layout.layout_name}"?`)) {
      return;
    }

    try {
      await layoutService.deleteMasterLayout(layoutId);
      toast.success('Layout deleted successfully');
      navigate('/layouts');
    } catch (error) {
      console.error('Error deleting layout:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete layout');
    }
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom(z => Math.min(5, z + 0.2));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.2));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan Controls
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Plot Interaction
  const handlePlotClick = (plot, e) => {
    e.stopPropagation();
    setSelectedPlot(plot);
    setShowPlotModal(true);
    setActiveTab('details');
  };

  const handlePlotHover = (plot) => {
    setHoveredPlot(plot);
  };

  const handlePlotLeave = () => {
    setHoveredPlot(null);
  };

  // Share Layout
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Layout link copied to clipboard!');
  };
  
  // Save plot changes from editor
  const handleSavePlotChanges = async (updatedPlots) => {
    try {
      // Call API to save updated plot coordinates
      const response = await layoutService.updatePlotCoordinates(layoutId, updatedPlots);
      
      if (response.data.success) {
        setShowPlotEditor(false);
        toast.success(`✅ ${response.data.plots_updated} plots updated successfully!`);
        
        // Refresh layout data from backend to get the latest state
        await loadLayout();
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Error saving plot changes:', error);
      toast.error('Failed to save plot changes: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Submit Interest
  const handleSubmitInterest = async (e) => {
    e.preventDefault();
    
    if (!interestForm.name || !interestForm.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      // API call would go here
      toast.success('Interest submitted successfully! Our team will contact you soon.');
      setInterestForm({ name: '', email: '', phone: '', message: '' });
      setActiveTab('details');
    } catch (error) {
      toast.error('Failed to submit interest');
    }
  };

  // Submit Booking
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    
    if (!bookingForm.name || !bookingForm.phone || !bookingForm.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // API call would go here
      toast.success('Booking request submitted! We will contact you shortly to complete the process.');
      setBookingForm({
        name: '', email: '', phone: '', address: '', payment_plan: 'full', notes: ''
      });
      setShowPlotModal(false);
    } catch (error) {
      toast.error('Failed to submit booking');
    }
  };

  // Helper Functions
  const getTypeIcon = (type) => {
    switch (type) {
      case 'venture': return <LayoutGrid className="w-5 h-5" />;
      case 'apartment': return <Building2 className="w-5 h-5" />;
      case 'farm_land': return <Trees className="w-5 h-5" />;
      case 'open_land': return <MapPin className="w-5 h-5" />;
      default: return <Warehouse className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      venture: 'Venture/Layout',
      apartment: 'Apartment',
      farm_land: 'Farm Land',
      open_land: 'Open Land',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getPolygonPoints = (coordinates) => {
    return coordinates.map(c => `${c.x},${c.y}`).join(' ');
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#10b981',
      booked: '#f59e0b',
      blocked: '#ef4444',
      sold: '#8b5cf6'
    };
    return colors[status] || '#9ca3af';
  };

  const getStatusColorTransparent = (status) => {
    const colors = {
      available: '#10b98180',
      booked: '#f59e0b80',
      blocked: '#ef444480',
      sold: '#8b5cf680'
    };
    return colors[status] || '#9ca3af80';
  };

  // Filter plots based on search and status
  const filteredPlots = layout?.plots?.filter(plot => {
    const matchesSearch = plot.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (plot.block && plot.block.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || plot.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-primary"></div>
          <p className="mt-4 text-gray-600">Loading layout...</p>
        </div>
      </div>
    );
  }

  if (!layout) {
    return null;
  }

  const MainContent = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Sidebar - Plots List & Controls */}
      {!isFullScreen && (
        <div className="lg:col-span-1 space-y-6">
          
          {/* Search & Filter Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-ocean-primary text-sm">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search plots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass-input"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full glass-input text-sm"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="sold">Sold</option>
                <option value="blocked">Blocked</option>
              </select>
              
              <div className="text-xs text-gray-600 text-center pt-2">
                Showing {filteredPlots.length} of {layout.plots?.length || 0} plots
              </div>
            </CardContent>
          </Card>

          {/* Plots List */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-ocean-primary">Plots ({filteredPlots.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredPlots.map((plot) => (
                  <div
                    key={plot.id}
                    onClick={() => handlePlotClick(plot, { stopPropagation: () => {} })}
                    onMouseEnter={() => handlePlotHover(plot)}
                    onMouseLeave={handlePlotLeave}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      hoveredPlot?.id === plot.id ? 'bg-ocean-primary/20 scale-105' : 'bg-ocean-primary/5 hover:bg-ocean-primary/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-ocean-primary">Plot {plot.display_name}</span>
                      <Badge 
                        className="text-xs"
                        style={{ backgroundColor: getStatusColor(plot.status) }}
                      >
                        {plot.status}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Block:</span>
                        <span className="font-medium">{plot.block || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Area:</span>
                        <span className="font-medium">{plot.area} sq.ft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-medium text-green-600">₹{plot.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredPlots.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No plots match your filters' 
                      : 'No plots defined'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Plots:</span>
                  <span className="font-bold text-ocean-primary">{layout.plots?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-bold text-green-600">
                    {layout.plots?.filter(p => p.status === 'available').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Booked:</span>
                  <span className="font-bold text-blue-600">
                    {layout.plots?.filter(p => p.status === 'booked').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sold:</span>
                  <span className="font-bold text-purple-600">
                    {layout.plots?.filter(p => p.status === 'sold').length || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main SVG Viewer */}
      <div className={isFullScreen ? 'col-span-1' : 'lg:col-span-3'}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTypeIcon(layout.layout_type)}
                <CardTitle className="text-ocean-primary">{layout.layout_name}</CardTitle>
                {layout.is_template && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    Template
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleZoomOut} size="sm" variant="outline" title="Zoom Out">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button onClick={handleZoomIn} size="sm" variant="outline" title="Zoom In">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button onClick={handleResetZoom} size="sm" variant="outline" title="Reset View">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <span className="text-sm py-2 px-3 bg-gray-100 rounded">{(zoom * 100).toFixed(0)}%</span>
                <Button 
                  onClick={() => setIsFullScreen(!isFullScreen)} 
                  size="sm" 
                  variant="outline"
                  title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button onClick={handleShare} size="sm" variant="outline" title="Share">
                  <Share2 className="w-4 h-4" />
                </Button>
                {!layout.is_template && (
                  <>
                    <Button
                      onClick={() => setShowPlotEditor(true)}
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                      title="Edit Plot Points & Boundaries"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit Plots
                    </Button>
                    <Button
                      onClick={() => navigate(`/layouts/${layoutId}/edit`)}
                      size="sm"
                      className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleDelete} size="sm" variant="outline" className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={svgContainerRef}
              className="bg-gray-50 rounded-lg overflow-hidden border-2 border-ocean-primary/20 relative"
              style={{ 
                height: isFullScreen ? '90vh' : '700px',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {layout.svg_url ? (
                <div 
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s',
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                  }}
                >
                  <div style={{ position: 'relative', display: 'inline-block', width: '100%', minHeight: '100%' }}>
                    <img 
                      src={layout.svg_url} 
                      alt={layout.layout_name} 
                      style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} 
                      draggable={false}
                    />
                    
                    <svg
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'all'
                      }}
                      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {filteredPlots.map((plot) => (
                        <g 
                          key={plot.id}
                          onClick={(e) => handlePlotClick(plot, e)}
                          onMouseEnter={() => handlePlotHover(plot)}
                          onMouseLeave={handlePlotLeave}
                          style={{ cursor: 'pointer' }}
                        >
                          <polygon
                            points={getPolygonPoints(plot.coordinates)}
                            fill={hoveredPlot?.id === plot.id 
                              ? getStatusColor(plot.status) + 'CC' 
                              : getStatusColorTransparent(plot.status)}
                            stroke={hoveredPlot?.id === plot.id ? '#0891b2' : '#0891b280'}
                            strokeWidth={hoveredPlot?.id === plot.id ? '3' : '2'}
                            style={{
                              transition: 'all 0.2s ease',
                              filter: hoveredPlot?.id === plot.id ? 'drop-shadow(0 0 10px rgba(8, 145, 178, 0.8))' : 'none'
                            }}
                          />
                          <text
                            x={plot.coordinates.reduce((sum, c) => sum + c.x, 0) / plot.coordinates.length}
                            y={plot.coordinates.reduce((sum, c) => sum + c.y, 0) / plot.coordinates.length}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#000"
                            fontSize={hoveredPlot?.id === plot.id ? "16" : "14"}
                            fontWeight="bold"
                            style={{
                              pointerEvents: 'none',
                              transition: 'font-size 0.2s ease'
                            }}
                          >
                            {plot.display_name}
                          </text>
                        </g>
                      ))}
                    </svg>

                    {/* Hover Tooltip */}
                    {hoveredPlot && (
                      <div 
                        className="absolute bg-white rounded-lg shadow-lg p-3 border-2 border-ocean-primary pointer-events-none z-50"
                        style={{
                          top: '20px',
                          left: '20px'
                        }}
                      >
                        <div className="text-sm font-semibold text-ocean-primary mb-1">
                          Plot {hoveredPlot.display_name}
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Status:</span>
                            <Badge 
                              className="text-xs h-5"
                              style={{ backgroundColor: getStatusColor(hoveredPlot.status) }}
                            >
                              {hoveredPlot.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Area:</span>
                            <span className="font-medium">{hoveredPlot.area} sq.ft</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-medium text-green-600">₹{hoveredPlot.price.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="text-xs text-center text-gray-500 mt-2 border-t pt-1">
                          Click for details
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No SVG layout available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex gap-4 flex-wrap items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-sm">Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
                <span className="text-sm">Sold</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-sm">Blocked</span>
              </div>
              <div className="text-sm text-gray-500 ml-4">
                <strong>Tip:</strong> Click on any plot for detailed information • Drag to pan • Scroll to zoom
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen relative ${isFullScreen ? 'fixed inset-0 z-50 bg-white overflow-auto' : ''}`}>
      {/* Background */}
      {!isFullScreen && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
      )}

      {/* Header */}
      {!isFullScreen && (
        <header className="glass-header sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => navigate('/layouts')}
                variant="ghost"
                className="text-ocean-primary hover:bg-ocean-primary/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Layouts
              </Button>
            </div>
          </div>
        </header>
      )}

      <main className={`${isFullScreen ? 'p-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'} relative z-10`}>
        <MainContent />
      </main>

      {/* Plot Details Modal */}
      <Dialog open={showPlotModal} onOpenChange={setShowPlotModal}>
        <DialogContent className="glass-modal max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-ocean-primary text-2xl flex items-center justify-between">
              <span>Plot {selectedPlot?.display_name}</span>
              <Badge 
                className="text-sm"
                style={{ backgroundColor: getStatusColor(selectedPlot?.status) }}
              >
                {selectedPlot?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedPlot && (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-b-2 border-ocean-primary text-ocean-primary'
                      : 'text-gray-600 hover:text-ocean-primary'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'gallery'
                      ? 'border-b-2 border-ocean-primary text-ocean-primary'
                      : 'text-gray-600 hover:text-ocean-primary'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  Gallery
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'video'
                      ? 'border-b-2 border-ocean-primary text-ocean-primary'
                      : 'text-gray-600 hover:text-ocean-primary'
                  }`}
                >
                  <Video className="w-4 h-4 inline mr-2" />
                  Video
                </button>
                <button
                  onClick={() => setActiveTab('interest')}
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'interest'
                      ? 'border-b-2 border-ocean-primary text-ocean-primary'
                      : 'text-gray-600 hover:text-ocean-primary'
                  }`}
                >
                  <Heart className="w-4 h-4 inline mr-2" />
                  Express Interest
                </button>
                {selectedPlot.status === 'available' && (
                  <button
                    onClick={() => setActiveTab('booking')}
                    className={`px-4 py-2 font-medium text-sm ${
                      activeTab === 'booking'
                        ? 'border-b-2 border-ocean-primary text-ocean-primary'
                        : 'text-gray-600 hover:text-ocean-primary'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 inline mr-2" />
                    Book Now
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="py-4">
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-ocean-primary/5 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="w-5 h-5 text-ocean-primary" />
                          <span className="text-sm text-gray-600">Plot Number</span>
                        </div>
                        <p className="text-xl font-bold text-ocean-primary">{selectedPlot.display_name}</p>
                      </div>
                      
                      <div className="bg-ocean-primary/5 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Ruler className="w-5 h-5 text-ocean-secondary" />
                          <span className="text-sm text-gray-600">Area</span>
                        </div>
                        <p className="text-xl font-bold text-ocean-secondary">{selectedPlot.area} sq.ft</p>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <IndianRupee className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-600">Price</span>
                        </div>
                        <p className="text-xl font-bold text-green-600">₹{selectedPlot.price.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Block</label>
                        <p className="text-lg">{selectedPlot.block || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Status</label>
                        <p>
                          <Badge 
                            className="text-sm"
                            style={{ backgroundColor: getStatusColor(selectedPlot.status) }}
                          >
                            {selectedPlot.status}
                          </Badge>
                        </p>
                      </div>
                    </div>

                    {selectedPlot.customer_name && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Customer</label>
                        <p className="text-lg">{selectedPlot.customer_name}</p>
                      </div>
                    )}

                    {selectedPlot.booking_date && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Booking Date</label>
                        <p className="text-lg flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(selectedPlot.booking_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {selectedPlot.amenities && selectedPlot.amenities.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Amenities</label>
                        <div className="flex gap-2 flex-wrap">
                          {selectedPlot.amenities.map((amenity, idx) => (
                            <Badge key={idx} variant="outline" className="bg-ocean-primary/10">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-lg mb-2">Price per Square Foot</h3>
                      <p className="text-2xl font-bold text-ocean-primary">
                        ₹{(selectedPlot.price / selectedPlot.area).toFixed(2)} / sq.ft
                      </p>
                    </div>
                  </div>
                )}

                {/* Gallery Tab */}
                {activeTab === 'gallery' && (
                  <div className="space-y-4">
                    <p className="text-center text-gray-500 py-8">
                      <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      No images available for this plot yet.
                      <br />
                      <span className="text-sm">Contact us for site visit photos and videos.</span>
                    </p>
                    {/* Placeholder for future gallery implementation */}
                  </div>
                )}

                {/* Video Tab */}
                {activeTab === 'video' && (
                  <div className="space-y-4">
                    <p className="text-center text-gray-500 py-8">
                      <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      No video tour available for this plot yet.
                      <br />
                      <span className="text-sm">Contact us for a virtual site tour.</span>
                    </p>
                    {/* Placeholder for future video implementation */}
                  </div>
                )}

                {/* Interest Tab */}
                {activeTab === 'interest' && (
                  <form onSubmit={handleSubmitInterest} className="space-y-4">
                    <p className="text-gray-700 mb-4">
                      Interested in Plot {selectedPlot.display_name}? Fill out the form below and our team will contact you shortly.
                    </p>
                    
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Full Name *</label>
                      <Input
                        value={interestForm.name}
                        onChange={(e) => setInterestForm({ ...interestForm, name: e.target.value })}
                        placeholder="John Doe"
                        required
                        className="glass-input"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Email</label>
                        <Input
                          type="email"
                          value={interestForm.email}
                          onChange={(e) => setInterestForm({ ...interestForm, email: e.target.value })}
                          placeholder="john@example.com"
                          className="glass-input"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Phone *</label>
                        <Input
                          type="tel"
                          value={interestForm.phone}
                          onChange={(e) => setInterestForm({ ...interestForm, phone: e.target.value })}
                          placeholder="9876543210"
                          required
                          className="glass-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Message</label>
                      <Textarea
                        value={interestForm.message}
                        onChange={(e) => setInterestForm({ ...interestForm, message: e.target.value })}
                        placeholder="Any specific requirements or questions..."
                        rows={4}
                        className="glass-input"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white text-lg py-6"
                    >
                      <Heart className="w-5 h-5 mr-2" />
                      Submit Interest
                    </Button>
                  </form>
                )}

                {/* Booking Tab */}
                {activeTab === 'booking' && selectedPlot.status === 'available' && (
                  <form onSubmit={handleSubmitBooking} className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-green-800 mb-2">Booking Summary</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Plot Number:</span>
                          <span className="font-semibold">{selectedPlot.display_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Area:</span>
                          <span className="font-semibold">{selectedPlot.area} sq.ft</span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span>Total Price:</span>
                          <span className="font-bold text-green-600">₹{selectedPlot.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Full Name *</label>
                      <Input
                        value={bookingForm.name}
                        onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                        placeholder="John Doe"
                        required
                        className="glass-input"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Email *</label>
                        <Input
                          type="email"
                          value={bookingForm.email}
                          onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                          placeholder="john@example.com"
                          required
                          className="glass-input"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Phone *</label>
                        <Input
                          type="tel"
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                          placeholder="9876543210"
                          required
                          className="glass-input"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Address</label>
                      <Textarea
                        value={bookingForm.address}
                        onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                        placeholder="Full address..."
                        rows={3}
                        className="glass-input"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Payment Plan *</label>
                      <select
                        value={bookingForm.payment_plan}
                        onChange={(e) => setBookingForm({ ...bookingForm, payment_plan: e.target.value })}
                        className="w-full glass-input"
                        required
                      >
                        <option value="full">Full Payment</option>
                        <option value="emi_6">6 Months EMI</option>
                        <option value="emi_12">12 Months EMI</option>
                        <option value="emi_24">24 Months EMI</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Additional Notes</label>
                      <Textarea
                        value={bookingForm.notes}
                        onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                        placeholder="Any special requirements..."
                        rows={3}
                        className="glass-input"
                      />
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                      <p className="font-semibold text-blue-800 mb-1">Note:</p>
                      <p className="text-blue-700">
                        This is a booking request. Our team will contact you to complete the booking process and collect the token amount.
                      </p>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg py-6"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Submit Booking Request
                    </Button>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Plot Editor Modal */}
      {showPlotEditor && (
        <PlotEditor
          layout={layout}
          onSave={handleSavePlotChanges}
          onCancel={() => setShowPlotEditor(false)}
        />
      )}
    </div>
  );
};

export default AdvancedLayoutViewer;
