import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Search, Filter, Phone, Mail,
  MapPin, Home, CheckCircle, XCircle, Clock, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const PublicLayoutViewerEnhanced = ({ layout, project, onPlotSelect }) => {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showLegend, setShowLegend] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  const svgRef = useRef(null);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  
  // SVG Coordinate System - CRITICAL FIX for coordinate scaling bug
  const [svgDimensions, setSvgDimensions] = useState({ width: 1000, height: 1000 });
  
  const plots = layout?.plots || [];
  
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
              console.log('✅ PUBLIC VIEWER - SVG ViewBox detected:', w, 'x', h);
            } else {
              const w = parseFloat(svgEl.getAttribute('width')) || 1000;
              const h = parseFloat(svgEl.getAttribute('height')) || 1000;
              setSvgDimensions({ width: w, height: h });
              console.log('✅ PUBLIC VIEWER - SVG dimensions detected:', w, 'x', h);
            }
          }
        })
        .catch(err => {
          console.log('⚠️ PUBLIC VIEWER - Using default SVG dimensions', err);
        });
    }
  }, [layout?.svg_url]);
  
  // Zoom Controls
  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.5));
  const handleFullscreen = () => {
    if (svgRef.current?.parentElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        svgRef.current.parentElement.requestFullscreen();
      }
    }
  };
  
  // Filter Plots
  const filteredPlots = plots.filter(plot => {
    const matchesSearch = plot.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plot.block?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || plot.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  
  // Get Statistics
  const stats = {
    total: plots.length,
    available: plots.filter(p => p.status === 'available').length,
    booked: plots.filter(p => p.status === 'booked').length,
    sold: plots.filter(p => p.status === 'sold').length
  };
  
  // Plot Functions
  const getPlotPath = (coords) => {
    if (!coords || coords.length === 0) return '';
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      path += ` L ${coords[i].x} ${coords[i].y}`;
    }
    path += ' Z';
    return path;
  };
  
  const getPlotCenter = (coords) => {
    if (!coords || coords.length === 0) return { x: 0, y: 0 };
    const sumX = coords.reduce((sum, c) => sum + c.x, 0);
    const sumY = coords.reduce((sum, c) => sum + c.y, 0);
    return { x: sumX / coords.length, y: sumY / coords.length };
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return { fill: '#10b981', label: 'Available' };
      case 'booked': return { fill: '#f59e0b', label: 'Booked' };
      case 'sold': return { fill: '#ef4444', label: 'Sold' };
      case 'blocked': return { fill: '#6b7280', label: 'Blocked' };
      default: return { fill: '#10b981', label: 'Available' };
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle className="text-green-600" size={20} />;
      case 'booked': return <Clock className="text-orange-600" size={20} />;
      case 'sold': return <XCircle className="text-red-600" size={20} />;
      default: return <CheckCircle className="text-green-600" size={20} />;
    }
  };
  
  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
    if (onPlotSelect) {
      onPlotSelect(plot);
    }
  };
  
  const handleBookNow = (plot) => {
    setSelectedPlot(plot);
    setShowBookingForm(true);
  };
  
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!bookingForm.name || !bookingForm.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      // TODO: Submit booking enquiry to API
      console.log('Booking enquiry:', {
        plot: selectedPlot,
        ...bookingForm
      });
      
      toast.success(`Thank you ${bookingForm.name}! We'll contact you shortly about ${selectedPlot.display_name}.`);
      
      setShowBookingForm(false);
      setBookingForm({ name: '', phone: '', email: '', message: '' });
    } catch (error) {
      toast.error('Failed to submit enquiry. Please try again.');
    }
  };
  
  return (
    <div className="relative h-full bg-gray-900">
      {/* Top Control Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-lg">
        <div className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search plot number or block..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Filter */}
            <div className="flex gap-2">
              {['all', 'available', 'booked', 'sold'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="mt-3 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Available: <strong>{stats.available}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-gray-600">Booked: <strong>{stats.booked}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Sold: <strong>{stats.sold}</strong></span>
            </div>
            <div className="text-gray-600">Total: <strong>{stats.total}</strong></div>
          </div>
        </div>
      </div>
      
      {/* Zoom Controls */}
      <div className="absolute top-24 right-4 z-10 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded block w-full"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <div className="text-xs text-center font-medium">{Math.round(zoom * 100)}%</div>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded block w-full"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <div className="border-t pt-2">
          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-gray-100 rounded block w-full"
            title="Fullscreen"
          >
            <Maximize2 size={20} />
          </button>
        </div>
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Legend</h3>
            <button
              onClick={() => setShowLegend(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Available - Ready to book</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Booked - Under process</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Sold - Not available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span>Blocked - Temporarily unavailable</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-gray-600">
            Click on any plot to see details and book
          </div>
        </div>
      )}
      
      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Show Legend
        </button>
      )}
      
      {/* SVG Canvas */}
      <div className="absolute inset-0 top-24 overflow-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s'
          }}
        >
          {/* Background */}
          {layout?.svg_url && (
            <image href={layout.svg_url} x="0" y="0" width={svgDimensions.width} height={svgDimensions.height} opacity="0.2" preserveAspectRatio="xMidYMid meet" />
          )}
          
          {/* Plots */}
          {filteredPlots.map((plot) => {
            const center = getPlotCenter(plot.coordinates);
            const statusColor = getStatusColor(plot.status);
            const isSelected = selectedPlot?.id === plot.id;
            
            return (
              <g key={plot.id}>
                <path
                  d={getPlotPath(plot.coordinates)}
                  fill={statusColor.fill}
                  fillOpacity={isSelected ? 0.8 : 0.5}
                  stroke={isSelected ? '#3b82f6' : '#ffffff'}
                  strokeWidth={isSelected ? 4 : 2}
                  className="cursor-pointer hover:fill-opacity-70 transition"
                  onClick={() => handlePlotClick(plot)}
                />
                
                <text
                  x={center.x}
                  y={center.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none font-bold"
                  fontSize="16"
                  fill="#ffffff"
                  stroke="#000"
                  strokeWidth="0.5"
                >
                  {plot.display_name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Floating Plot Card */}
      {selectedPlot && !showBookingForm && (
        <div className="absolute bottom-4 right-4 z-20 bg-white rounded-xl shadow-2xl w-96 overflow-hidden border-2 border-blue-500">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold">{selectedPlot.display_name}</h3>
              <button
                onClick={() => setSelectedPlot(null)}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(selectedPlot.status)}
              <span className="text-sm">{getStatusColor(selectedPlot.status).label}</span>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Area</div>
                <div className="font-bold text-gray-900">{selectedPlot.area?.toFixed(0)} sq.ft</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Price</div>
                <div className="font-bold text-gray-900">₹{(selectedPlot.price || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            {selectedPlot.block && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Home size={16} />
                <span>Block {selectedPlot.block}</span>
              </div>
            )}
            
            {selectedPlot.facing && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} />
                <span>{selectedPlot.facing} Facing</span>
              </div>
            )}
            
            {selectedPlot.status === 'available' ? (
              <button
                onClick={() => handleBookNow(selectedPlot)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold flex items-center justify-center gap-2 transition"
              >
                Book Now
                <ArrowRight size={18} />
              </button>
            ) : (
              <div className="text-center py-3 text-gray-500 text-sm">
                This plot is currently {selectedPlot.status}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Booking Form Modal */}
      {showBookingForm && selectedPlot && (
        <div className="absolute inset-0 z-30 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <h3 className="text-2xl font-bold mb-2">Book {selectedPlot.display_name}</h3>
              <p className="text-blue-100 text-sm">Fill in your details and we'll contact you soon</p>
            </div>
            
            <form onSubmit={handleSubmitBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="10-digit mobile number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={bookingForm.message}
                  onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any specific requirements..."
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Plot:</span>
                    <strong>{selectedPlot.display_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Area:</span>
                    <strong>{selectedPlot.area?.toFixed(0)} sq.ft</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <strong>₹{(selectedPlot.price || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold"
                >
                  Submit Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLayoutViewerEnhanced;