import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn, ZoomOut, Search, X, Menu, Info, CheckCircle, 
  XCircle, Clock, Phone, Mail, MapPin, Home, Layers
} from 'lucide-react';
import { toast } from 'sonner';

const FullscreenLayoutViewer = ({ layout, project, onPlotSelect }) => {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  const svgRef = useRef(null);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  
  // SVG Coordinate System - Dynamic viewBox detection
  const [svgDimensions, setSvgDimensions] = useState({ width: 1000, height: 1000 });
  
  const plots = layout?.plots || [];
  
  // Detect SVG dimensions when layout loads
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
              console.log('✅ FULLSCREEN VIEWER - SVG ViewBox detected:', w, 'x', h);
            } else {
              const w = parseFloat(svgEl.getAttribute('width')) || 1000;
              const h = parseFloat(svgEl.getAttribute('height')) || 1000;
              setSvgDimensions({ width: w, height: h });
              console.log('✅ FULLSCREEN VIEWER - SVG dimensions detected:', w, 'x', h);
            }
          }
        })
        .catch(err => {
          console.log('⚠️ FULLSCREEN VIEWER - Using default SVG dimensions', err);
        });
    }
  }, [layout?.svg_url]);

  const getPlotColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return { fill: '#10b981', label: 'Available' };
      case 'booked': return { fill: '#f59e0b', label: 'Booked' };
      case 'sold': return { fill: '#ef4444', label: 'Sold' };
      default: return { fill: '#10b981', label: 'Available' };
    }
  };

  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
    setShowSidebar(true);
    if (onPlotSelect) onPlotSelect(plot);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const filteredPlots = plots.filter(plot => {
    const matchesSearch = plot.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || plot.status?.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const availableCount = plots.filter(p => p.status?.toLowerCase() === 'available').length;
  const bookedCount = plots.filter(p => p.status?.toLowerCase() === 'booked').length;
  const soldCount = plots.filter(p => p.status?.toLowerCase() === 'sold').length;

  const handleBooking = async () => {
    if (!bookingForm.name || !bookingForm.phone) {
      toast.error('Please fill required fields');
      return;
    }
    toast.success('Booking request submitted!');
    setShowBookingForm(false);
    setBookingForm({ name: '', phone: '', email: '', message: '' });
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col">
      {/* Top Bar - Minimal */}
      <div className="bg-white shadow-md px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-bold text-lg text-gray-900">{layout?.layout_name}</h1>
            {project?.name && (
              <p className="text-xs text-gray-600">{project.name}</p>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Menu size={20} />
            <span className="hidden md:inline text-sm">Menu</span>
          </button>
        </div>
      </div>

      {/* Main Layout Area - FULLSCREEN */}
      <div className="flex-1 relative overflow-hidden">
        {/* SVG Canvas - Takes full available space */}
        <div className="absolute inset-0">
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
            {/* Background SVG */}
            {layout?.svg_url && (
              <image 
                href={layout.svg_url} 
                x="0" 
                y="0" 
                width={svgDimensions.width} 
                height={svgDimensions.height} 
                opacity="0.3" 
                preserveAspectRatio="xMidYMid meet" 
              />
            )}

            {/* Plot Overlays */}
            {filteredPlots.map((plot) => {
              const coords = plot.coordinates || [];
              if (coords.length < 3) return null;

              const pathData = coords.map((c, i) => 
                `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`
              ).join(' ') + ' Z';

              const isSelected = selectedPlot?.id === plot.id;
              const { fill } = getPlotColor(plot.status);

              return (
                <g key={plot.id}>
                  <path
                    d={pathData}
                    fill={fill}
                    fillOpacity={isSelected ? 0.8 : 0.4}
                    stroke={isSelected ? '#1e40af' : '#ffffff'}
                    strokeWidth={isSelected ? 4 : 2}
                    className="cursor-pointer hover:fill-opacity-70 transition-all"
                    onClick={() => handlePlotClick(plot)}
                  />
                  {/* Plot Label */}
                  <text
                    x={coords.reduce((sum, c) => sum + c.x, 0) / coords.length}
                    y={coords.reduce((sum, c) => sum + c.y, 0) / coords.length}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000"
                    fontSize={Math.max(12, svgDimensions.width / 100)}
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {plot.display_name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating Controls - Bottom Left */}
        <div className="absolute bottom-6 left-6 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
        </div>

        {/* Stats Overlay - Bottom Right */}
        <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-lg p-4">
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="font-semibold">{availableCount}</span>
              <span className="text-gray-600 hidden sm:inline">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="font-semibold">{bookedCount}</span>
              <span className="text-gray-600 hidden sm:inline">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="font-semibold">{soldCount}</span>
              <span className="text-gray-600 hidden sm:inline">Sold</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding Sidebar Overlay */}
      {showSidebar && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setShowSidebar(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-40 overflow-y-auto animate-slide-in-right">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="font-bold text-lg">Layout Details</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search plots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('available')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'available' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Available
                </button>
              </div>

              {/* Selected Plot Info */}
              {selectedPlot && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="font-bold text-lg mb-3">Plot {selectedPlot.display_name}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-semibold ${
                        selectedPlot.status?.toLowerCase() === 'available' ? 'text-green-600' :
                        selectedPlot.status?.toLowerCase() === 'booked' ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {selectedPlot.status || 'Available'}
                      </span>
                    </div>
                    
                    {selectedPlot.area && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Area:</span>
                        <span className="font-semibold">{selectedPlot.area} sq.ft</span>
                      </div>
                    )}
                    
                    {selectedPlot.price && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-semibold text-blue-600">₹{selectedPlot.price.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {selectedPlot.status?.toLowerCase() === 'available' && (
                    <button
                      onClick={() => setShowBookingForm(true)}
                      className="w-full mt-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                    >
                      Book This Plot
                    </button>
                  )}
                </div>
              )}

              {/* Project Info */}
              {project && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Info size={18} />
                    Project Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">{project.name}</p>
                    {project.website && (
                      <a href={project.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Visit Website
                      </a>
                    )}
                    {project.contact_email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={16} />
                        {project.contact_email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Book Plot {selectedPlot?.display_name}</h2>
              <button onClick={() => setShowBookingForm(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your Name *"
                value={bookingForm.name}
                onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={bookingForm.phone}
                onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email (Optional)"
                value={bookingForm.email}
                onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Message (Optional)"
                value={bookingForm.message}
                onChange={(e) => setBookingForm({...bookingForm, message: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleBooking}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Submit Booking Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullscreenLayoutViewer;
