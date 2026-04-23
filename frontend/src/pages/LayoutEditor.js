import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Save, Trash2, Undo, ArrowLeft, ZoomIn, ZoomOut, Check, Edit2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { layoutService } from '../services';

const LayoutEditor = ({ mode = 'edit' }) => {
  // mode can be: 'edit', 'view', 'display'
  // edit: Full editing capabilities (default)
  // view: View only, no editing
  // display: Frontend display for customers (minimal controls)
  
  const { layoutId } = useParams();
  const navigate = useNavigate();
  
  const isEditMode = mode === 'edit';
  const isViewMode = mode === 'view';
  const isDisplayMode = mode === 'display';
  
  // State
  const [layoutName, setLayoutName] = useState('');
  const [layoutType, setLayoutType] = useState('venture');
  const [originalLayout, setOriginalLayout] = useState(null);
  const [svgFile, setSvgFile] = useState(null);
  const [svgUrl, setSvgUrl] = useState(null);
  const [svgFileInfo, setSvgFileInfo] = useState(null);
  const [fileType, setFileType] = useState('svg'); // svg, pdf, png, jpg
  const [plots, setPlots] = useState([]);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingPlotId, setEditingPlotId] = useState(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 1122.6667, height: 793.33331 });
  
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

  useEffect(() => {
    loadLayout();
  }, [layoutId]);

  // Extract SVG dimensions when URL changes
  useEffect(() => {
    if (svgUrl) {
      const img = new Image();
      img.onload = () => {
        // Try to read actual SVG dimensions
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
                setSvgDimensions({ width, height });
                console.log('📐 SVG ViewBox detected:', { width, height });
              } else {
                const width = svgElement.getAttribute('width');
                const height = svgElement.getAttribute('height');
                if (width && height) {
                  setSvgDimensions({ 
                    width: parseFloat(width), 
                    height: parseFloat(height) 
                  });
                  console.log('📐 SVG Dimensions detected:', { width, height });
                }
              }
            }
          })
          .catch(err => {
            console.warn('Could not read SVG dimensions:', err);
          });
      };
      img.src = svgUrl;
    }
  }, [svgUrl]);

  const loadLayout = async () => {
    setLoading(true);
    try {
      const response = await layoutService.getMasterLayout(layoutId);
      const layout = response.layout;
      
      console.log('📊 Layout loaded:', layout);
      console.log('📍 Plots loaded:', layout.plots);
      console.log('📐 Each plot coordinates:');
      layout.plots?.forEach((plot, idx) => {
        console.log(`  Plot ${idx + 1} (${plot.display_name}):`, plot.coordinates);
      });
      
      setOriginalLayout(layout);
      setLayoutName(layout.layout_name);
      setLayoutType(layout.layout_type);
      setPlots(layout.plots || []);
      
      if (layout.svg_url) {
        setSvgUrl(layout.svg_url);
        setSvgFileInfo({ file_url: layout.svg_url });
        
        // Detect file type from URL
        const url = layout.svg_url.toLowerCase();
        if (url.includes('.pdf')) {
          setFileType('pdf');
        } else if (url.includes('.png')) {
          setFileType('png');
        } else if (url.includes('.jpg') || url.includes('.jpeg')) {
          setFileType('jpg');
        } else {
          setFileType('svg');
        }
      }
      
      if (layout.plots && layout.plots.length > 0) {
        toast.success(`Layout loaded with ${layout.plots.length} plots`);
      } else {
        toast.warning('Layout has no plots yet');
      }
      
    } catch (error) {
      console.error('Error loading layout:', error);
      toast.error('Failed to load layout');
      navigate('/layouts');
    } finally {
      setLoading(false);
    }
  };

  // Handle SVG file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Determine file type
    let uploadedFileType = 'svg';
    if (file.type === 'application/pdf') {
      uploadedFileType = 'pdf';
    } else if (file.type.startsWith('image/')) {
      if (file.type === 'image/svg+xml') {
        uploadedFileType = 'svg';
      } else if (file.type === 'image/png') {
        uploadedFileType = 'png';
      } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        uploadedFileType = 'jpg';
      }
    }
    
    setFileType(uploadedFileType);
    setSvgFile(file);
    const url = URL.createObjectURL(file);
    setSvgUrl(url);
    
    // Upload to server
    setUploading(true);
    try {
      const uploadResult = await layoutService.uploadSVG(file);
      setSvgFileInfo(uploadResult);
      
      const fileTypeLabel = uploadedFileType.toUpperCase();
      toast.success(`${fileTypeLabel} file uploaded successfully!`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
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

  // Edit existing plot
  // Edit plot details only (name, price, area, status)
  const handleEditPlotDetails = (plot) => {
    setEditingPlotId(plot.id);
    setPlotForm({
      display_name: plot.display_name,
      block: plot.block || 'A',
      price: plot.price.toString(),
      area: plot.area.toString(),
      status: plot.status,
      amenities: plot.amenities || []
    });
    setCurrentPoints(plot.coordinates); // Keep existing points
    setShowPlotForm(true);
  };

  // Re-mark plot points (change boundaries)
  const handleRermarkPlotPoints = (plot) => {
    setEditingPlotId(plot.id);
    setPlotForm({
      display_name: plot.display_name,
      block: plot.block || 'A',
      price: plot.price.toString(),
      area: plot.area.toString(),
      status: plot.status,
      amenities: plot.amenities || []
    });
    setCurrentPoints([]); // Clear points to re-mark
    toast.info('Click on SVG to re-mark plot boundaries');
  };

  // Save current plot
  // Add or update plot with auto-save
  const savePlot = async () => {
    if (!plotForm.display_name || !plotForm.area || !plotForm.price) {
      toast.error('Please fill all required fields');
      return;
    }

    const plotData = {
      id: editingPlotId || `plot-${Date.now()}`,
      coordinates: currentPoints,
      ...plotForm,
      area: parseFloat(plotForm.area),
      price: parseFloat(plotForm.price)
    };

    let updatedPlots;
    if (editingPlotId) {
      // Update existing plot
      updatedPlots = plots.map(p => p.id === editingPlotId ? plotData : p);
      setPlots(updatedPlots);
      toast.success('Plot updated');
    } else {
      // Add new plot
      updatedPlots = [...plots, plotData];
      setPlots(updatedPlots);
      toast.success('Plot added');
    }
    
    // Auto-save to database immediately
    try {
      const layoutData = {
        layout_name: layoutName,
        layout_type: layoutType,
        svg_url: svgFileInfo.file_url,
        plots: updatedPlots,
        metadata: {
          ...originalLayout.metadata,
          updated_by: 'layout_editor',
          last_updated: new Date().toISOString()
        }
      };

      await layoutService.updateMasterLayout(layoutId, layoutData);
      toast.success('✅ Auto-saved to database');
      console.log('✅ Plot auto-saved to database');
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Failed to auto-save. Click "Update Layout" to retry.');
    }
    
    // Reset
    setCurrentPoints([]);
    setShowPlotForm(false);
    setEditingPlotId(null);
    setPlotForm({
      display_name: '',
      block: 'A',
      price: '',
      area: '',
      status: 'available',
      amenities: []
    });
  };

  // Cancel current plot
  const cancelPlot = () => {
    setCurrentPoints([]);
    setShowPlotForm(false);
    setEditingPlotId(null);
    setPlotForm({
      display_name: '',
      block: 'A',
      price: '',
      area: '',
      status: 'available',
      amenities: []
    });
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

  // Handle point click for editing (click to remove)
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
      // Update master layout
      const layoutData = {
        layout_name: layoutName,
        layout_type: layoutType,
        svg_url: svgFileInfo.file_url,
        plots: plots,
        metadata: {
          ...originalLayout.metadata,
          updated_by: 'layout_editor',
          last_updated: new Date().toISOString()
        }
      };

      await layoutService.updateMasterLayout(layoutId, layoutData);
      
      toast.success(`Layout "${layoutName}" updated successfully!`);
      
      // Navigate back to view
      setTimeout(() => {
        navigate(`/layouts/${layoutId}/view`);
      }, 1500);
      
    } catch (error) {
      console.error('Error updating layout:', error);
      toast.error(error.response?.data?.detail || 'Failed to update layout');
    } finally {
      setSaving(false);
    }
  };

  const getPolygonPoints = (coordinates) => {
    return coordinates.map(c => `${c.x},${c.y}`).join(' ');
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#10b98180',
      booked: '#f59e0b80',
      blocked: '#ef444480',
      sold: '#8b5cf680'
    };
    return colors[status] || '#9ca3af80';
  };

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
              onClick={() => navigate(`/layouts/${layoutId}/view`)}
              variant="ghost"
              className="text-ocean-primary hover:bg-ocean-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
              {isEditMode ? 'Edit Layout' : isViewMode ? 'View Layout' : 'Layout'} - {layoutName}
            </h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Layout Info Section - Show only in edit mode */}
            {isEditMode && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-ocean-primary">Layout Info</CardTitle>
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
            )}
            
            {/* Upload Section - Edit mode only */}
            {isEditMode && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-ocean-primary">Change Layout File (Optional)</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">Accepts: SVG, PDF, PNG, JPG</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,.pdf,.png,.jpg,.jpeg,image/svg+xml,application/pdf,image/png,image/jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Layout (SVG, PDF, PNG, JPG)'}
                  </Button>
                  
                  {svgFile && (
                    <p className="text-xs text-green-600">✓ {svgFile.name} uploaded</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Current Drawing - Edit mode only */}
            {isEditMode && (
              <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary">Add New Plot</CardTitle>
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
                    
                    {currentPoints.length >= 3 && !editingPlotId && (
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
            )}

            {/* Debug Info - Edit mode only */}
            {isEditMode && plots.length > 0 && (
              <Card className="glass-card bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-green-800">
                    ✅ <strong>{plots.length} plots loaded</strong> from database
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    SVG ViewBox: {svgDimensions.width} x {svgDimensions.height}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Help Section - Edit Mode Only */}
            {isEditMode && plots.length > 0 && (
              <Card className="glass-card bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">📝 Plot Actions Explained:</p>
                  <div className="space-y-1 text-xs text-blue-800">
                    <p>• <strong>Details</strong> (🔵): Edit name, price, area, status</p>
                    <p>• <strong>Points</strong> (🟣): Re-mark plot boundaries on map</p>
                    <p>• <strong>Delete</strong> (🔴): Remove plot permanently</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Plots List */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary flex items-center justify-between">
                  <span>Plots ({plots.length})</span>
                  <Badge className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white">
                    {plots.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {plots.map((plot) => (
                    <div key={plot.id} className="flex items-start justify-between p-3 bg-white rounded-lg border hover:border-ocean-primary transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{plot.display_name}</p>
                        <p className="text-xs text-gray-600">{plot.area} sq.ft | ₹{plot.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">Status: <span className="capitalize">{plot.status}</span> | {plot.coordinates.length} points</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          onClick={() => handleEditPlotDetails(plot)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:bg-blue-50 text-xs justify-start"
                          title="Edit plot details (name, price, area)"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        <Button
                          onClick={() => handleRermarkPlotPoints(plot)}
                          variant="ghost"
                          size="sm"
                          className="text-purple-600 hover:bg-purple-50 text-xs justify-start"
                          title="Re-mark plot boundaries"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Points
                        </Button>
                        <Button
                          onClick={() => deletePlot(plot.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-50 text-xs justify-start"
                          title="Delete plot"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
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

            {/* Save Layout - Edit mode only */}
            {isEditMode && (
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
                    Update Layout ({plots.length} plots)
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Right Panel - SVG Canvas */}
          <div className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-ocean-primary">Layout Canvas</CardTitle>
                    {fileType && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
                          File type: <span className="font-semibold uppercase">{fileType}</span>
                        </p>
                        {fileType === 'pdf' && (
                          <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                            <p className="text-xs text-blue-800">
                              ⚠️ PDF viewing: If PDF doesn't display, <a href={svgUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">open in new tab</a>
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              💡 For plot drawing, please upload SVG, PNG, or JPG format
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        {/* Render based on file type */}
                        {fileType === 'pdf' ? (
                          <div className="w-full h-[800px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <div className="text-center p-8">
                              <div className="mb-6">
                                <svg className="w-20 h-20 mx-auto text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                  <path d="M8 10a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                </svg>
                              </div>
                              <h3 className="text-xl font-bold text-gray-800 mb-2">PDF Layout</h3>
                              <p className="text-gray-600 mb-6">
                                Plots are displayed on canvas.<br />
                                Click button below to view original PDF.
                              </p>
                              <a 
                                href={svgUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-block px-6 py-3 bg-ocean-primary text-white rounded-lg hover:bg-ocean-secondary transition"
                              >
                                📄 Open PDF in New Tab
                              </a>
                            </div>
                          </div>
                        ) : (
                          <img src={svgUrl} alt="Layout" style={{ display: 'block', maxWidth: '100%' }} />
                        )}
                        
                        {/* SVG overlay - ALWAYS show for plotting (but disable click for PDF) */}
                        <svg
                          ref={svgRef}
                          onClick={isEditMode && fileType !== 'pdf' ? handleSvgClick : undefined}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            cursor: isEditMode && fileType !== 'pdf' ? 'crosshair' : 'default',
                            pointerEvents: fileType === 'pdf' ? 'none' : 'auto'
                          }}
                          viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {/* Show saved plots */}
                          {plots.length > 0 && console.log('🎨 Rendering plots:', plots.length, 'plots')}
                          {plots.map((plot, index) => {
                            const polygonPoints = getPolygonPoints(plot.coordinates);
                            const centerX = plot.coordinates.reduce((sum, c) => sum + c.x, 0) / plot.coordinates.length;
                            const centerY = plot.coordinates.reduce((sum, c) => sum + c.y, 0) / plot.coordinates.length;
                            
                            console.log(`🔷 Plot ${index + 1}:`, {
                              name: plot.display_name,
                              points: plot.coordinates.length,
                              coordinates: plot.coordinates,
                              polygonPoints: polygonPoints,
                              center: { x: centerX, y: centerY }
                            });
                            
                            return (
                              <g 
                                key={plot.id} 
                                onClick={isEditMode ? () => handleEditPlotDetails(plot) : undefined} 
                                style={{ cursor: isEditMode ? 'pointer' : 'default' }}
                              >
                                <polygon
                                  points={polygonPoints}
                                  fill={getStatusColor(plot.status)}
                                  stroke="#0891b2"
                                  strokeWidth="3"
                                  strokeDasharray="5,5"
                                />
                                <text
                                  x={centerX}
                                  y={centerY}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="#000"
                                  fontSize="16"
                                  fontWeight="bold"
                                  pointerEvents="none"
                                  stroke="#fff"
                                  strokeWidth="3"
                                  paintOrder="stroke"
                                >
                                  {plot.display_name}
                                </text>
                              </g>
                            );
                          })}
                          
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
                        <p className="text-gray-500">Layout file not available</p>
                        <p className="text-xs text-gray-400 mt-2">Upload SVG, PDF, PNG, or JPG file</p>
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
            <DialogTitle className="text-ocean-primary">
              {editingPlotId ? 'Edit Plot Details' : 'Add New Plot'} ({currentPoints.length} points)
            </DialogTitle>
            {editingPlotId && currentPoints.length === 0 && (
              <p className="text-sm text-purple-600 mt-2">
                💜 Re-marking boundaries: Click on SVG to mark new points, then save
              </p>
            )}
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
                {editingPlotId ? 'Update Plot' : 'Add Plot'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LayoutEditor;
