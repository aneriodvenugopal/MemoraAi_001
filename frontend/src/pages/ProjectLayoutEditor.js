import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, Save, Undo, Trash2, Check, Edit2, MapPin, 
  ArrowLeft, Layers, Home, ZoomIn, ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { layoutService } from '../services';
import axios from 'axios';
import PageInfoModal from '../components/PageInfoModal';

/**
 * ProjectLayoutEditor - Integrated layout editor for project-specific layouts
 * 
 * Features:
 * - Project-context aware
 * - Auto-save plots
 * - Variable points support (3+)
 * - Edit details vs re-mark points
 * - Clean UI/UX with zoom
 */

const ProjectLayoutEditor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  
  // State
  const [project, setProject] = useState(null);
  const [layoutName, setLayoutName] = useState('');
  const [svgFile, setSvgFile] = useState(null);
  const [svgUrl, setSvgUrl] = useState(null);
  const [svgFileInfo, setSvgFileInfo] = useState(null);
  const [plots, setPlots] = useState([]);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingPlotId, setEditingPlotId] = useState(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 1122.6667, height: 793.33331 });
  
  const [plotForm, setPlotForm] = useState({
    display_name: '',
    block: 'A',
    price: '',
    area: '',
    unit: 'sq.yard',  // Default unit
    status: 'available',
    amenities: []
  });
  
  // Quick Draw Mode - Draw plots first, fill details later
  const [quickDrawMode, setQuickDrawMode] = useState(true);
  const [nextPlotNumber, setNextPlotNumber] = useState(1);

  useEffect(() => {
    loadProjectAndLayout();
  }, [projectId]);

  // Calculate viewBox based on plot coordinates OR SVG dimensions
  // Priority: 1. Plot coordinates (if they exist and are larger), 2. SVG viewBox
  useEffect(() => {
    // First try to calculate from existing plots
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
        
        // Only update if plot bounds are larger than current dimensions
        if (width > svgDimensions.width || height > svgDimensions.height) {
          setSvgDimensions({ 
            width, 
            height,
            minX: minX - padding,
            minY: minY - padding
          });
          console.log('📐 Editor: ViewBox calculated from plots:', { 
            minX: minX - padding, 
            minY: minY - padding, 
            width, 
            height 
          });
        }
      }
    }
  }, [plots]);

  // Extract SVG dimensions when URL changes (fallback if no plots or small plots)
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
              // Only set from SVG if we don't have plot-based dimensions already
              if (!svgDimensions.minX) {
                setSvgDimensions(prev => ({ 
                  ...prev, 
                  width: prev.width || width, 
                  height: prev.height || height 
                }));
                console.log('📐 SVG ViewBox detected:', { width, height });
              }
            }
          }
        })
        .catch(err => console.warn('Could not read SVG dimensions:', err));
    }
  }, [svgUrl]);

  const loadProjectAndLayout = async () => {
    setLoading(true);
    try {
      // Load project details
      const projectRes = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // Project API returns data directly (not wrapped in {success, project})
      const projectData = projectRes.data.project || projectRes.data;
      if (projectData && projectData.id) {
        setProject(projectData);
        
        // Load project layout
        const layoutRes = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/layouts/projects/${projectId}/layout`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        
        if (layoutRes.data.success && layoutRes.data.layout) {
          const layout = layoutRes.data.layout;
          console.log('📊 Project layout loaded:', layout);
          
          setLayoutName(layout.layout_name || projectData.name);
          setPlots(layout.plots || []);
          
          // Set next plot number based on existing plots
          if (layout.plots && layout.plots.length > 0) {
            const maxPlotNum = layout.plots.reduce((max, p) => {
              const match = p.display_name?.match(/Plot\s*(\d+)/i);
              return match ? Math.max(max, parseInt(match[1])) : max;
            }, 0);
            setNextPlotNumber(maxPlotNum + 1);
          }
          
          if (layout.svg_url) {
            // Make sure SVG URL is absolute (prefix with backend URL if relative)
            let fullSvgUrl = layout.svg_url;
            if (layout.svg_url.startsWith('/')) {
              fullSvgUrl = `${process.env.REACT_APP_BACKEND_URL}${layout.svg_url}`;
            } else {
              // If the URL points to a different domain, replace with current backend
              try {
                const urlObj = new URL(fullSvgUrl);
                const currentBackend = new URL(process.env.REACT_APP_BACKEND_URL);
                if (urlObj.hostname !== currentBackend.hostname) {
                  fullSvgUrl = `${process.env.REACT_APP_BACKEND_URL}${urlObj.pathname}`;
                  console.log('📷 Corrected SVG URL domain:', fullSvgUrl);
                }
              } catch (e) {
                console.warn('Could not parse SVG URL:', e);
              }
            }
            setSvgUrl(fullSvgUrl);
            setSvgFileInfo({ file_url: fullSvgUrl });
            console.log('📷 SVG URL set to:', fullSvgUrl);
          }
          
          toast.success(`Layout loaded with ${layout.plots?.length || 0} plots`);
        } else {
          // No layout yet, use project name as default
          setLayoutName(projectData.name + ' Layout');
          toast.info('No layout found. Create your first layout!');
        }
      } else {
        toast.error('Project not found');
      }
    } catch (error) {
      console.error('Error loading project/layout:', error);
      if (error.response?.status === 404) {
        // Layout doesn't exist yet, that's ok
        toast.info('Create a new layout for this project');
      } else {
        toast.error('Failed to load project');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload (SVG, PDF, PNG, JPG)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Determine file type
    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'application/pdf'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(svg|pdf|png|jpg|jpeg)$/i)) {
      toast.error('Please upload SVG, PDF, PNG, or JPG file');
      return;
    }

    setUploading(true);
    setSvgFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/layouts/upload-svg`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        // Make sure SVG URL is absolute (prefix with backend URL if relative)
        let fullSvgUrl = response.data.file_url;
        if (response.data.file_url.startsWith('/')) {
          fullSvgUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.file_url}`;
        }
        setSvgUrl(fullSvgUrl);
        setSvgFileInfo({ ...response.data, file_url: fullSvgUrl });
        toast.success(`${file.name} uploaded successfully`);
      }
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

    if (showPlotForm) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    
    const x = ((e.clientX - rect.left) / rect.width) * viewBox.width;
    const y = ((e.clientY - rect.top) / rect.height) * viewBox.height;
    
    const newPoints = [...currentPoints, { x: Math.round(x), y: Math.round(y) }];
    setCurrentPoints(newPoints);
    
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
    
    if (quickDrawMode) {
      // Quick Draw Mode - Auto-save with minimal details
      quickSavePlot();
    } else {
      setShowPlotForm(true);
    }
  };

  // Quick save plot with auto-generated name (Draw First, Fill Later workflow)
  const quickSavePlot = async () => {
    const plotData = {
      id: `plot-${Date.now()}`,
      coordinates: currentPoints,
      display_name: `Plot ${nextPlotNumber}`,
      block: 'A',
      price: 0,
      area: 0,
      status: 'available',
      amenities: []
    };

    const updatedPlots = [...plots, plotData];
    setPlots(updatedPlots);
    setNextPlotNumber(prev => prev + 1);
    
    // Auto-save to database
    try {
      if (svgFileInfo) {
        const layoutData = {
          layout_name: layoutName,
          svg_url: svgFileInfo.file_url,
          plots: updatedPlots,
          metadata: {
            updated_by: user.id,
            last_updated: new Date().toISOString()
          }
        };

        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/layouts/projects/${projectId}/layout`,
          layoutData,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        
        toast.success(`Plot ${nextPlotNumber} drawn! Click "Details" to fill info.`);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Failed to auto-save plot');
    }
    
    // Reset for next plot
    setCurrentPoints([]);
  };

  // Edit plot details only (name, price, area, status)
  const handleEditPlotDetails = (plot) => {
    setEditingPlotId(plot.id);
    setPlotForm({
      display_name: plot.display_name,
      block: plot.block || 'A',
      price: plot.price?.toString() || '',
      area: plot.area?.toString() || '',
      unit: plot.unit || 'sq.yard',
      status: plot.status,
      amenities: plot.amenities || []
    });
    setCurrentPoints(plot.coordinates);
    setShowPlotForm(true);
  };

  // Re-mark plot points (change boundaries)
  const handleRemarkPlotPoints = (plot) => {
    setEditingPlotId(plot.id);
    setPlotForm({
      display_name: plot.display_name,
      block: plot.block || 'A',
      price: plot.price?.toString() || '',
      area: plot.area?.toString() || '',
      unit: plot.unit || 'sq.yard',
      status: plot.status,
      amenities: plot.amenities || []
    });
    setCurrentPoints([]);
    toast.info('Click on SVG to re-mark plot boundaries');
  };

  // Add or update plot with auto-save
  const savePlot = async () => {
    if (!plotForm.display_name || !plotForm.area || !plotForm.price) {
      toast.error('Please fill all required fields');
      return;
    }

    if (currentPoints.length < 3) {
      toast.error('Please mark at least 3 points for the plot');
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
      updatedPlots = plots.map(p => p.id === editingPlotId ? plotData : p);
      setPlots(updatedPlots);
      toast.success('Plot updated');
    } else {
      updatedPlots = [...plots, plotData];
      setPlots(updatedPlots);
      toast.success('Plot added');
    }
    
    // Auto-save to database immediately
    try {
      const layoutData = {
        layout_name: layoutName,
        svg_url: svgFileInfo.file_url,
        plots: updatedPlots,
        metadata: {
          updated_by: user.id,
          last_updated: new Date().toISOString()
        }
      };

      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/layouts/projects/${projectId}/layout`,
        layoutData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      toast.success('✅ Auto-saved to database');
      console.log('✅ Plot auto-saved to database');
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Failed to auto-save. Please try manual save.');
    }
    
    // Reset form
    setCurrentPoints([]);
    setShowPlotForm(false);
    setEditingPlotId(null);
    setPlotForm({
      display_name: '',
      block: 'A',
      price: '',
      area: '',
      unit: 'sq.yard',
      status: 'available',
      amenities: []
    });
  };

  const cancelPlot = () => {
    setCurrentPoints([]);
    setShowPlotForm(false);
    setEditingPlotId(null);
  };

  const deletePlot = (plotId) => {
    if (window.confirm('Delete this plot?')) {
      setPlots(plots.filter(p => p.id !== plotId));
      toast.success('Plot deleted');
    }
  };

  const undoLastPoint = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };

  const clearPoints = () => {
    setCurrentPoints([]);
    toast.info('Points cleared. Start marking again.');
  };

  const handlePointClick = (e, pointIndex) => {
    e.stopPropagation();
    const newPoints = currentPoints.filter((_, idx) => idx !== pointIndex);
    setCurrentPoints(newPoints);
    toast.success(`Point ${pointIndex + 1} removed`);
  };

  // Manual save layout (for name changes)
  const saveLayout = async () => {
    if (!layoutName.trim()) {
      toast.error('Please enter layout name');
      return;
    }

    if (!svgFileInfo) {
      toast.error('Please upload SVG file');
      return;
    }

    setSaving(true);
    try {
      const layoutData = {
        layout_name: layoutName,
        svg_url: svgFileInfo.file_url,
        plots: plots,
        metadata: {
          updated_by: user.id,
          last_updated: new Date().toISOString()
        }
      };

      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/layouts/projects/${projectId}/layout`,
        layoutData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      // Auto-sync plots to properties
      if (plots.length > 0) {
        try {
          const syncRes = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/layouts/projects/${projectId}/layout/sync-properties`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          if (syncRes.data.success) {
            toast.success(`Layout saved! ${syncRes.data.synced} properties synced, ${syncRes.data.updated} updated`);
          }
        } catch (syncError) {
          console.warn('Property sync warning:', syncError);
          toast.success('Layout saved! (Property sync may need manual refresh)');
        }
      } else {
        toast.success('Layout saved successfully!');
      }
    } catch (error) {
      console.error('Save layout error:', error);
      toast.error('Failed to save layout');
    } finally {
      setSaving(false);
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
  
  // Extract plot number from display_name (e.g., "Plot 1" -> "1", "A-1" -> "A-1")
  const getPlotLabel = (displayName) => {
    if (!displayName) return '';
    const match = displayName.match(/Plot\s*(\d+)/i);
    return match ? match[1] : displayName;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Layers className="w-16 h-16 mx-auto mb-4 text-ocean-primary animate-pulse" />
          <p className="text-lg text-gray-600">Loading project layout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
                Layout Editor
              </h1>
              <p className="text-sm text-gray-600">
                {project?.project_name} - {layoutName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Layout Info */}
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
            </CardContent>
          </Card>

          {/* Upload Layout Image */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-ocean-primary">Upload Layout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.pdf,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : svgUrl ? 'Change Layout' : 'Upload Layout'}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                Supports: SVG, PDF, PNG, JPG
              </p>
              
              {svgFile && (
                <p className="text-xs text-green-600">✓ {svgFile.name}</p>
              )}
            </CardContent>
          </Card>

          {/* Mark Plot Section */}
          {svgUrl && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary flex items-center justify-between">
                  <span>Draw Plots</span>
                  <Badge className={quickDrawMode ? "bg-green-500" : "bg-blue-500"}>
                    {quickDrawMode ? "Quick Draw" : "Manual"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Draw Mode Toggle */}
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Quick Draw Mode</p>
                    <p className="text-xs text-gray-500">Draw first, fill details later</p>
                  </div>
                  <Button
                    size="sm"
                    variant={quickDrawMode ? "default" : "outline"}
                    onClick={() => setQuickDrawMode(!quickDrawMode)}
                    className={quickDrawMode ? "bg-green-500 hover:bg-green-600" : ""}
                  >
                    {quickDrawMode ? "ON" : "OFF"}
                  </Button>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    📌 How to Draw:
                  </p>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Click on the layout to mark plot corners</li>
                    <li>Mark at least 3 points to form a plot</li>
                    <li>Click &quot;Save Plot&quot; when done marking</li>
                    {quickDrawMode && <li className="text-green-700 font-medium">Fill details later via &quot;Details&quot; button</li>}
                  </ol>
                </div>
                
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
                        {quickDrawMode ? `Save Plot ${nextPlotNumber}` : `Finish Marking (${currentPoints.length} pts)`}
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

          {/* Quick Draw Workflow Info */}
          {plots.length > 0 && (
            <Card className="glass-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold text-green-900 mb-2">✅ Workflow:</p>
                <div className="space-y-1 text-xs text-green-800">
                  <p>1. <strong>Draw</strong> - Mark plot boundaries</p>
                  <p>2. <strong>Details</strong> - Fill price, area, status</p>
                  <p>3. <strong>Save</strong> - Auto-saves after each action</p>
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
              {plots.length === 0 ? (
                <div className="text-center py-6">
                  <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    No plots drawn yet.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload a layout image and start drawing plots!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {plots.map((plot, index) => {
                    const needsDetails = !plot.price || !plot.area || plot.price === 0 || plot.area === 0;
                    return (
                      <div 
                        key={plot.id} 
                        className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${
                          needsDetails 
                            ? 'bg-blue-50 border-blue-300 hover:border-blue-400' 
                            : 'bg-white hover:border-ocean-primary'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{plot.display_name}</p>
                            {needsDetails && (
                              <Badge className="bg-blue-500 text-white text-xs">
                                Needs Details
                              </Badge>
                            )}
                          </div>
                          {needsDetails ? (
                            <p className="text-xs text-blue-700 mt-1">
                              Click &quot;Details&quot; to add price &amp; area
                            </p>
                          ) : (
                            <p className="text-xs text-gray-600">{plot.area} {plot.unit || 'sq.yard'} | ₹{plot.price?.toLocaleString()}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Status: <span className="capitalize">{plot.status}</span> | {plot.coordinates.length} points
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            onClick={() => handleEditPlotDetails(plot)}
                            variant="ghost"
                            size="sm"
                            className={`text-xs justify-start ${needsDetails ? 'text-blue-600 hover:bg-blue-100 font-medium' : 'text-blue-600 hover:bg-blue-50'}`}
                            title="Edit plot details"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                          <Button
                            onClick={() => handleRemarkPlotPoints(plot)}
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:bg-purple-50 text-xs justify-start"
                            title="Re-mark boundaries"
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
                    );
                  })}
                </div>
              )}
              
              {/* Summary of plots needing details */}
              {plots.length > 0 && plots.some(p => !p.price || !p.area || p.price === 0 || p.area === 0) && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    ⚠️ {plots.filter(p => !p.price || !p.area || p.price === 0 || p.area === 0).length} plot(s) need details filled
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Layout Button */}
          <Button
            onClick={saveLayout}
            disabled={saving || !layoutName.trim() || !svgFileInfo}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg py-6"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Layout ({plots.length} plots)
              </>
            )}
          </Button>
        </div>

        {/* Right Panel - SVG Canvas */}
        <div className="lg:col-span-3">
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
                        viewBox={`${svgDimensions.minX || 0} ${svgDimensions.minY || 0} ${svgDimensions.width} ${svgDimensions.height}`}
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {/* Render saved plots */}
                        {plots.map((plot) => (
                          <g key={plot.id} style={{ cursor: 'pointer' }}>
                            {/* Plot polygon with status color */}
                            <polygon
                              points={getPolygonPoints(plot.coordinates)}
                              fill={getStatusColor(plot.status)}
                              stroke="#0891b2"
                              strokeWidth="2"
                            />
                            {/* Plot number label - small text inside the plot, no background box */}
                            <text
                              x={plot.coordinates.reduce((sum, c) => sum + c.x, 0) / plot.coordinates.length}
                              y={plot.coordinates.reduce((sum, c) => sum + c.y, 0) / plot.coordinates.length}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#1e293b"
                              fontSize="11"
                              fontWeight="bold"
                              style={{ textShadow: '0 0 3px white, 0 0 3px white' }}
                            >
                              {getPlotLabel(plot.display_name)}
                            </text>
                          </g>
                        ))}

                        {/* Current drawing */}
                        {currentPoints.length > 0 && (
                          <>
                            {currentPoints.length >= 3 && (
                              <polygon
                                points={getPolygonPoints(currentPoints)}
                                fill="rgba(14, 165, 233, 0.2)"
                                stroke="#0ea5e9"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                              />
                            )}
                            
                            {currentPoints.length >= 2 && currentPoints.length < 3 && (
                              <polyline
                                points={getPolygonPoints(currentPoints)}
                                fill="none"
                                stroke="#0ea5e9"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                              />
                            )}
                            
                            {/* Small circular pins for marking points */}
                            {currentPoints.map((point, idx) => (
                              <g 
                                key={idx} 
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => handlePointClick(e, idx)}
                              >
                                {/* Small pin circle */}
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r="5"
                                  fill="#0ea5e9"
                                  stroke="#0369a1"
                                  strokeWidth="1.5"
                                />
                                {/* Pin number label - small */}
                                <text
                                  x={point.x}
                                  y={point.y + 1}
                                  fill="#ffffff"
                                  fontSize="6"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
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
                      <Home className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">Upload SVG to start marking plots</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
                💜 Re-marking boundaries: Click on SVG to mark new points
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold">Block</label>
              <Input
                value={plotForm.block}
                onChange={(e) => setPlotForm({...plotForm, block: e.target.value})}
                placeholder="A"
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold">Plot Number/Name *</label>
              <Input
                value={plotForm.display_name}
                onChange={(e) => setPlotForm({...plotForm, display_name: e.target.value})}
                placeholder="e.g., A-1, Plot 101"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold">Area *</label>
                <Input
                  type="number"
                  value={plotForm.area}
                  onChange={(e) => setPlotForm({...plotForm, area: e.target.value})}
                  placeholder="150"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Unit</label>
                <select
                  value={plotForm.unit || 'sq.yard'}
                  onChange={(e) => setPlotForm({...plotForm, unit: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="sq.yard">Sq. Yard</option>
                  <option value="sq.ft">Sq. Feet</option>
                  <option value="sq.m">Sq. Meter</option>
                  <option value="cents">Cents</option>
                  <option value="acres">Acres</option>
                  <option value="guntha">Guntha</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold">Price (₹) *</label>
              <Input
                type="number"
                value={plotForm.price}
                onChange={(e) => setPlotForm({...plotForm, price: e.target.value})}
                placeholder="5000000"
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold">Status</label>
              <select
                value={plotForm.status}
                onChange={(e) => setPlotForm({...plotForm, status: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              💡 Need to adjust points? Click &quot;Cancel&quot; to go back
            </div>
            
            <div className="flex gap-2">
              <Button onClick={cancelPlot} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={savePlot} className="flex-1 bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white">
                <Check className="w-4 h-4 mr-2" />
                {editingPlotId ? 'Update' : 'Add'} Plot
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Page Info Modal */}
      <PageInfoModal
        title="Project Layout Editor"
        description="A powerful SVG-based layout editor integrated directly into each project for creating, managing, and visualizing property plots. This tool enables precise plot marking, auto-saving, and comprehensive plot management with support for variable-point polygons (3+ points)."
        features={[
          "Project-specific layout management using dedicated API endpoints",
          "SVG file upload and rendering with automatic viewBox dimension extraction",
          "Interactive plot marking with variable points (minimum 3 points, no maximum limit)",
          "Fixed coordinate mapping bug - points now appear exactly where clicked",
          "Zoom functionality (50% to 300%) for precise plot marking",
          "Auto-save plots immediately after adding/updating (no manual save needed)",
          "Separate 'Edit Details' and 'Re-mark Points' buttons for clear workflow",
          "Plot management panel with real-time statistics and status tracking",
          "Undo last point and clear all points functionality for easy corrections",
          "Click on any point marker to remove it during marking process",
          "Visual plot preview with color coding (green=available, yellow=booked, red=sold)",
          "Responsive canvas with scrollable container for large layouts"
        ]}
        technologies={[
          "React.js",
          "SVG Manipulation",
          "Coordinate Transformation",
          "Tailwind CSS",
          "Shadcn UI",
          "MongoDB",
          "FastAPI"
        ]}
        implementations={[
          {
            title: "Coordinate Mapping Fix",
            description: "Resolved critical bug where click coordinates were misaligned. Implemented proper SVG viewBox handling, coordinate transformation with zoom support, and scrollable container structure matching the working LayoutEditor.js architecture."
          },
          {
            title: "Auto-Save Functionality",
            description: "Plots are automatically saved to the database immediately when 'Add Plot' or 'Update Plot' is clicked. No need for manual 'Update Layout' button - changes are persisted in real-time to prevent data loss."
          },
          {
            title: "Variable-Point Polygon Support",
            description: "Users can create plots with any number of points (minimum 3). System supports complex plot shapes beyond simple rectangles - perfect for irregular land parcels and custom layouts."
          },
          {
            title: "Dual-Mode Plot Editing",
            description: "Clear separation between editing plot metadata (name, price, area, status) and re-marking physical boundaries. Users can update details without accidentally moving points or vice versa."
          },
          {
            title: "Project-Integrated Architecture",
            description: "Layout editor is seamlessly integrated into each project context. Uses project-specific API routes (/api/layouts/projects/{projectId}/layout) instead of separate master layouts system for better data organization and access control."
          }
        ]}
      />
    </div>
  );
};

export default ProjectLayoutEditor;
