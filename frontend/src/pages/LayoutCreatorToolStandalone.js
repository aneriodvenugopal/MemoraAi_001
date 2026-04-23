import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Save, Trash2, Undo, ArrowLeft, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { toast } from 'sonner';
import { layoutService } from '../services';

const LayoutCreatorToolStandalone = () => {
  const navigate = useNavigate();
  
  // State
  const [layoutName, setLayoutName] = useState('');
  const [layoutType, setLayoutType] = useState('venture');
  const [svgFile, setSvgFile] = useState(null);
  const [svgUrl, setSvgUrl] = useState(null);
  const [svgFileInfo, setSvgFileInfo] = useState(null);
  const [plots, setPlots] = useState([]);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [svgDimensions, setSvgDimensions] = useState({ width: 1122.6667, height: 793.33331, minX: 0, minY: 0 });
  
  // Plot form data
  const [plotForm, setPlotForm] = useState({
    display_name: '',
    block: 'A',
    price: '',
    area: '',
    status: 'available',
    amenities: []
  });
  
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Calculate viewBox based on plot coordinates
  useEffect(() => {
    if (plots && plots.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      plots.forEach(plot => {
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
        const padding = 100;
        const width = maxX - minX + (padding * 2);
        const height = maxY - minY + (padding * 2);
        
        if (width > svgDimensions.width || height > svgDimensions.height) {
          setSvgDimensions({ 
            width, 
            height,
            minX: minX - padding,
            minY: minY - padding
          });
        }
      }
    }
  }, [plots]);

  // Handle SVG file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'image/svg+xml') {
      toast.error('Please upload a valid SVG file');
      return;
    }
    
    setSvgFile(file);
    const url = URL.createObjectURL(file);
    setSvgUrl(url);
    
    // Upload to server
    setUploading(true);
    try {
      const uploadResult = await layoutService.uploadSVG(file);
      setSvgFileInfo(uploadResult);
      toast.success('SVG uploaded successfully!');
    } catch (error) {
      console.error('SVG upload error:', error);
      toast.error('Failed to upload SVG file');
    } finally {
      setUploading(false);
    }
  };

  // Handle click on SVG to add plot point
  const handleSvgClick = (e) => {
    if (!svgUrl) {
      toast.error('Please upload SVG first');
      return;
    }

    // Don't add points if form is open
    if (showPlotForm) {
      return;
    }

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    
    // Calculate coordinates relative to viewBox
    const x = ((e.clientX - rect.left) / rect.width) * viewBox.width;
    const y = ((e.clientY - rect.top) / rect.height) * viewBox.height;
    
    const newPoints = [...currentPoints, { x: Math.round(x), y: Math.round(y) }];
    setCurrentPoints(newPoints);
    
    // Show toast for guidance
    if (newPoints.length === 1) {
      toast.info('Keep clicking to mark all corners. Click "Finish Marking" when done.');
    }
  };

  // Finish marking and open form
  const finishMarking = () => {
    if (currentPoints.length < 3) {
      toast.error('Please mark at least 3 points to form a plot');
      return;
    }
    setShowPlotForm(true);
  };

  // Save current plot
  const savePlot = () => {
    if (!plotForm.display_name || !plotForm.area || !plotForm.price) {
      toast.error('Please fill all required fields');
      return;
    }

    const newPlot = {
      id: `plot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      display_name: plotForm.display_name,
      block: plotForm.block,
      coordinates: currentPoints,
      price: parseFloat(plotForm.price),
      area: parseFloat(plotForm.area),
      status: plotForm.status,
      amenities: plotForm.amenities
    };

    setPlots([...plots, newPlot]);
    
    // Reset
    setCurrentPoints([]);
    setShowPlotForm(false);
    setPlotForm({
      display_name: '',
      block: 'A',
      price: '',
      area: '',
      status: 'available',
      amenities: []
    });
    
    toast.success(`Plot ${newPlot.display_name} added!`);
  };

  // Cancel current plot
  const cancelPlot = () => {
    setCurrentPoints([]);
    setShowPlotForm(false);
  };

  // Delete plot
  const deletePlot = (plotId) => {
    setPlots(plots.filter(p => p.id !== plotId));
    toast.success('Plot deleted');
  };

  // Undo last point
  const undoLastPoint = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };

  // Clear all points and start over
  const clearPoints = () => {
    setCurrentPoints([]);
    toast.info('Points cleared. Start marking again.');
  };

  // Handle point click for editing (right-click or ctrl+click to remove)
  const handlePointClick = (e, pointIndex) => {
    e.stopPropagation();
    
    // Remove point on click
    const newPoints = currentPoints.filter((_, idx) => idx !== pointIndex);
    setCurrentPoints(newPoints);
    toast.success(`Point ${pointIndex + 1} removed`);
  };

  // Save layout to database
  const saveLayout = async () => {
    if (!layoutName.trim()) {
      toast.error('Please enter layout name');
      return;
    }
    
    if (plots.length === 0) {
      toast.error('Please add at least one plot');
      return;
    }

    if (!svgFileInfo) {
      toast.error('Please upload SVG file');
      return;
    }

    setSaving(true);

    try {
      // Create master layout
      const layoutData = {
        layout_name: layoutName,
        layout_type: layoutType,
        svg_url: svgFileInfo.file_url,
        svg_content: null,
        plots: plots,
        metadata: {
          created_by: 'layout_creator_tool',
          total_plots: plots.length,
          original_filename: svgFileInfo.original_filename,
          file_id: svgFileInfo.file_id,
          version: '2.0'
        },
        is_template: false
      };

      const result = await layoutService.createMasterLayout(layoutData);
      
      toast.success(`Layout "${layoutName}" saved with ${plots.length} plots!`);
      
      // Navigate to layouts library
      setTimeout(() => {
        navigate('/layouts');
      }, 1500);
      
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error(error.response?.data?.detail || 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const getPolygonPoints = (coordinates) => {
    return coordinates.map(c => `${c.x},${c.y}`).join(' ');
  };

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
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
            <h1 className="text-xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
              Layout Creator Tool
            </h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Instructions Card */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-ocean-primary">📝 How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Enter layout name and select type (Venture, Apartment, Open Land, Farm Land)</li>
              <li>Upload your layout SVG file</li>
              <li>Click on corners of each plot (minimum 3 points, maximum unlimited)</li>
              <li>Click <strong>"Finish Marking"</strong> button when all corners are marked</li>
              <li>Fill plot details in the form that appears</li>
              <li>Click "Add Plot" and repeat for all plots</li>
              <li>Click "Save Layout" when done - Layout will be added to your library</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> You can mark plots with any number of points (3, 4, 5, 6, or more) to create triangular, rectangular, pentagonal, hexagonal, or complex shapes!
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Layout Info Section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary">1. Layout Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Layout Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g., Green Valley Phase 1"
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    className="glass-input"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-semibold mb-1 block">Layout Type *</label>
                  <select
                    value={layoutType}
                    onChange={(e) => setLayoutType(e.target.value)}
                    className="w-full glass-input"
                  >
                    <option value="venture">Venture/Layout</option>
                    <option value="apartment">Apartment</option>
                    <option value="open_land">Open Land</option>
                    <option value="farm_land">Farm Land</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </CardContent>
            </Card>
            
            {/* Upload Section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary">2. Upload SVG</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : (svgFile ? 'Change SVG' : 'Upload SVG')}
                </Button>
                
                {svgFile && (
                  <p className="text-xs text-green-600">✓ {svgFile.name} uploaded</p>
                )}
              </CardContent>
            </Card>

            {/* Current Drawing */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary">3. Mark Plots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Points marked: <span className="font-bold text-ocean-primary">{currentPoints.length}</span>
                  <span className="text-xs text-gray-500 ml-2">(min 3 points)</span>
                </p>
                
                {currentPoints.length > 0 && (
                  <div className="space-y-2">
                    <Button
                      onClick={undoLastPoint}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Undo className="w-4 h-4 mr-2" />
                      Undo Last Point
                    </Button>
                    
                    <Button
                      onClick={clearPoints}
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All Points
                    </Button>
                    
                    {currentPoints.length >= 3 && (
                      <Button
                        onClick={finishMarking}
                        size="sm"
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Finish Marking ({currentPoints.length} points)
                      </Button>
                    )}
                  </div>
                )}
                
                {currentPoints.length > 0 && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    💡 Click on any marked point to remove it
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plots List */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary flex items-center justify-between">
                  <span>Plots Added ({plots.length})</span>
                  <Badge className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white">
                    {plots.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {plots.map((plot) => (
                    <div key={plot.id} className="flex items-center justify-between p-2 bg-ocean-primary/5 rounded">
                      <span className="text-sm font-medium">Plot {plot.display_name}</span>
                      <Button
                        onClick={() => deletePlot(plot.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {plots.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No plots added yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Layout */}
            <Button
              onClick={saveLayout}
              disabled={saving || plots.length === 0 || !layoutName.trim() || !svgFileInfo}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg py-6"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save to Library ({plots.length} plots)
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - SVG Canvas */}
          <div className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-ocean-primary">Layout Canvas</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => setZoom(z => Math.min(3, z + 0.2))} size="sm" variant="outline">
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} size="sm" variant="outline">
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm py-2 px-3 bg-gray-100 rounded">{(zoom * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg overflow-auto border-2 border-ocean-primary/20" style={{ height: '700px' }}>
                  {svgUrl ? (
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        width: 'fit-content'
                      }}
                    >
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={svgUrl} alt="Layout" style={{ display: 'block', maxWidth: '100%' }} />
                        
                        <svg
                          ref={svgRef}
                          onClick={handleSvgClick}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            cursor: 'crosshair'
                          }}
                          viewBox={`${svgDimensions.minX} ${svgDimensions.minY} ${svgDimensions.width} ${svgDimensions.height}`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {/* Show saved plots */}
                          {plots.map((plot) => (
                            <polygon
                              key={plot.id}
                              points={getPolygonPoints(plot.coordinates)}
                              fill={plot.status === 'available' ? '#10b98180' : '#f59e0b80'}
                              stroke="#0891b2"
                              strokeWidth="2"
                            />
                          ))}
                          
                          {/* Show current drawing */}
                          {currentPoints.length > 0 && (
                            <>
                              {/* Polygon preview */}
                              {currentPoints.length >= 3 && (
                                <polygon
                                  points={getPolygonPoints(currentPoints)}
                                  fill="#ef444430"
                                  stroke="#ef4444"
                                  strokeWidth="2"
                                  strokeDasharray="5,5"
                                />
                              )}
                              
                              {/* Lines connecting points */}
                              {currentPoints.length >= 2 && currentPoints.length < 3 && (
                                <polyline
                                  points={getPolygonPoints(currentPoints)}
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="2"
                                  strokeDasharray="5,5"
                                />
                              )}
                              
                              {/* Point markers (clickable to remove) */}
                              {currentPoints.map((point, idx) => (
                                <g key={idx}>
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="8"
                                    fill="#ef4444"
                                    stroke="#fff"
                                    strokeWidth="2"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => handlePointClick(e, idx)}
                                    onMouseEnter={(e) => e.target.setAttribute('r', '10')}
                                    onMouseLeave={(e) => e.target.setAttribute('r', '8')}
                                  />
                                  <text
                                    x={point.x}
                                    y={point.y - 15}
                                    fill="#ef4444"
                                    fontSize="12"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {idx + 1}
                                  </text>
                                </g>
                              ))}
                            </>
                          )}
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Upload SVG to start marking plots</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Plot Details Form Dialog */}
      <Dialog open={showPlotForm} onOpenChange={setShowPlotForm}>
        <DialogContent className="glass-modal max-w-md">
          <DialogHeader>
            <DialogTitle className="text-ocean-primary">Plot Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Plot Number/Name *</label>
              <Input
                value={plotForm.display_name}
                onChange={(e) => setPlotForm({ ...plotForm, display_name: e.target.value })}
                placeholder="e.g., A-1, 1, Plot 1"
                className="glass-input"
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold">Block</label>
              <Input
                value={plotForm.block}
                onChange={(e) => setPlotForm({ ...plotForm, block: e.target.value })}
                placeholder="e.g., A, B, C"
                className="glass-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Area (sq.ft) *</label>
                <Input
                  type="number"
                  value={plotForm.area}
                  onChange={(e) => setPlotForm({ ...plotForm, area: e.target.value })}
                  placeholder="1200"
                  className="glass-input"
                />
              </div>
              
              <div>
                <label className="text-sm font-semibold">Price (₹) *</label>
                <Input
                  type="number"
                  value={plotForm.price}
                  onChange={(e) => setPlotForm({ ...plotForm, price: e.target.value })}
                  placeholder="2500000"
                  className="glass-input"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold">Status</label>
              <select
                value={plotForm.status}
                onChange={(e) => setPlotForm({ ...plotForm, status: e.target.value })}
                className="w-full glass-input"
              >
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="blocked">Blocked</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={cancelPlot} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={savePlot} className="flex-1 bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white">
                <Check className="w-4 h-4 mr-2" />
                Add Plot
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LayoutCreatorToolStandalone;
