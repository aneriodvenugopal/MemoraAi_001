import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, Undo, Redo, ArrowLeft, ZoomIn, ZoomOut, Move, Square,
  Triangle, Circle, Pentagon, Edit, Trash2, Copy, RotateCw,
  Maximize2, Eye, EyeOff, Lock, Unlock, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { layoutService } from '../services';

const EnhancedLayoutEditor = () => {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  
  // Core State
  const [layoutName, setLayoutName] = useState('');
  const [svgUrl, setSvgUrl] = useState(null);
  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // SVG Coordinate System
  const [svgDimensions, setSvgDimensions] = useState({ width: 1123, height: 793 });
  
  // Drawing State
  const [drawingMode, setDrawingMode] = useState(null);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // History for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Side Panel
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    area: '',
    price: '',
    status: 'available',
    block: 'A',
    facing: 'North'
  });
  
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const bgImageRef = useRef(null);
  
  // Load layout and detect SVG dimensions
  useEffect(() => {
    if (layoutId) {
      loadLayout();
    } else {
      setLoading(false);
    }
  }, [layoutId]);
  
  // Detect SVG dimensions when background loads
  useEffect(() => {
    if (svgUrl && bgImageRef.current) {
      const img = new Image();
      img.onload = () => {
        // Try to get viewBox from actual SVG
        fetch(svgUrl)
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
                console.log('SVG ViewBox detected:', w, 'x', h);
              } else {
                const w = parseFloat(svgEl.getAttribute('width')) || 1123;
                const h = parseFloat(svgEl.getAttribute('height')) || 793;
                setSvgDimensions({ width: w, height: h });
                console.log('SVG dimensions detected:', w, 'x', h);
              }
            }
          })
          .catch(err => {
            console.log('Using default SVG dimensions');
          });
      };
      img.src = svgUrl;
    }
  }, [svgUrl]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Delete' && selectedPlotId) {
        handleDeletePlot(selectedPlotId);
      }
      if (e.key === 'Escape') {
        cancelDrawing();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlotId, historyIndex, history]);
  
  const loadLayout = async () => {
    try {
      const response = await layoutService.getMasterLayout(layoutId);
      const layout = response.layout;
      
      setLayoutName(layout.layout_name);
      setSvgUrl(layout.svg_url);
      
      const sortedPlots = (layout.plots || []).sort((a, b) => {
        const numA = parseInt(a.display_name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.display_name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      
      setPlots(sortedPlots);
      saveToHistory(sortedPlots);
    } catch (error) {
      console.error('Error loading layout:', error);
      toast.error('Failed to load layout');
      navigate('/layouts');
    } finally {
      setLoading(false);
    }
  };
  
  // History Management
  const saveToHistory = useCallback((newPlots) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newPlots)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPlots(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      toast.success('Undone');
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPlots(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      toast.success('Redone');
    }
  };
  
  // Drawing Functions
  const startDrawing = (mode) => {
    setDrawingMode(mode);
    setCurrentPoints([]);
    setIsDrawing(true);
    toast.info(`Draw ${mode}. Click to add points.`);
  };
  
  const cancelDrawing = () => {
    setDrawingMode(null);
    setCurrentPoints([]);
    setIsDrawing(false);
  };
  
  const handleSvgClick = (e) => {
    if (!isDrawing || !drawingMode) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    const newPoints = [...currentPoints, { x: svgP.x, y: svgP.y }];
    setCurrentPoints(newPoints);
    
    // Auto-complete shapes
    if (drawingMode === 'rectangle' && newPoints.length === 2) {
      createRectanglePlot(newPoints);
    } else if (drawingMode === 'square' && newPoints.length === 2) {
      createSquarePlot(newPoints);
    } else if (drawingMode === 'triangle' && newPoints.length === 3) {
      createPolygonPlot(newPoints, 'triangle');
    } else if (drawingMode === 'circle' && newPoints.length === 2) {
      createCirclePlot(newPoints);
    }
  };
  
  const createRectanglePlot = (points) => {
    const [p1, p2] = points;
    const plotPoints = [
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p1.y },
      { x: p2.x, y: p2.y },
      { x: p1.x, y: p2.y }
    ];
    addPlot(plotPoints, 'rectangle');
  };
  
  const createSquarePlot = (points) => {
    const [p1, p2] = points;
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);
    const size = Math.max(width, height);
    
    const plotPoints = [
      { x: p1.x, y: p1.y },
      { x: p1.x + size, y: p1.y },
      { x: p1.x + size, y: p1.y + size },
      { x: p1.x, y: p1.y + size }
    ];
    addPlot(plotPoints, 'square');
  };
  
  const createCirclePlot = (points) => {
    const [center, edge] = points;
    const radius = Math.sqrt(
      Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
    );
    
    const segments = 16;
    const plotPoints = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      plotPoints.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      });
    }
    addPlot(plotPoints, 'circle');
  };
  
  const createPolygonPlot = (points, shapeType = 'polygon') => {
    addPlot(points, shapeType);
  };
  
  const addPlot = (coordinates, shapeType) => {
    const plotNumber = plots.length + 1;
    const newPlot = {
      id: `plot-${Date.now()}`,
      display_name: `Plot ${plotNumber}`,
      coordinates: coordinates,
      price: 0,
      area: calculateArea(coordinates),
      status: 'available',
      block: 'A',
      amenities: [],
      shapeType: shapeType
    };
    
    const newPlots = [...plots, newPlot];
    setPlots(newPlots);
    saveToHistory(newPlots);
    cancelDrawing();
    toast.success(`${shapeType} plot created`);
  };
  
  const calculateArea = (coords) => {
    if (coords.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i].x * coords[j].y;
      area -= coords[j].x * coords[i].y;
    }
    return Math.abs(area / 2);
  };
  
  // Plot Management
  const handleSelectPlot = (plot) => {
    setSelectedPlotId(plot.id);
    setSelectedPlot(plot);
    setEditForm({
      display_name: plot.display_name,
      area: plot.area,
      price: plot.price,
      status: plot.status,
      block: plot.block || 'A',
      facing: plot.facing || 'North'
    });
  };
  
  const handleUpdatePlot = () => {
    const updatedPlots = plots.map(p => 
      p.id === selectedPlot.id 
        ? { ...p, ...editForm }
        : p
    );
    setPlots(updatedPlots);
    saveToHistory(updatedPlots);
    setSelectedPlot({ ...selectedPlot, ...editForm });
    toast.success('Plot updated');
  };
  
  const handleDeletePlot = (plotId) => {
    if (!window.confirm('Delete this plot?')) return;
    const newPlots = plots.filter(p => p.id !== plotId);
    setPlots(newPlots);
    saveToHistory(newPlots);
    if (selectedPlotId === plotId) {
      setSelectedPlotId(null);
      setSelectedPlot(null);
    }
    toast.success('Plot deleted');
  };
  
  const handleDuplicatePlot = (plot) => {
    const newCoords = plot.coordinates.map(c => ({
      x: c.x + 20,
      y: c.y + 20
    }));
    const newPlot = {
      ...plot,
      id: `plot-${Date.now()}`,
      display_name: `${plot.display_name} (Copy)`,
      coordinates: newCoords
    };
    const newPlots = [...plots, newPlot];
    setPlots(newPlots);
    saveToHistory(newPlots);
    toast.success('Plot duplicated');
  };
  
  const handleSave = async () => {
    if (!layoutName.trim()) {
      toast.error('Please enter layout name');
      return;
    }
    if (plots.length === 0) {
      toast.error('Please add at least one plot');
      return;
    }
    setSaving(true);
    try {
      const layoutData = {
        layout_name: layoutName,
        svg_url: svgUrl,
        plots: plots,
        metadata: {
          totalPlots: plots.length,
          lastModified: new Date().toISOString(),
          svgDimensions: svgDimensions
        }
      };
      if (layoutId) {
        await layoutService.updateMasterLayout(layoutId, layoutData);
        toast.success('Layout updated successfully');
      } else {
        const response = await layoutService.createMasterLayout(layoutData);
        toast.success('Layout created successfully');
        navigate(`/layouts/enhanced/${response.layout_id}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save layout');
    } finally {
      setSaving(false);
    }
  };
  
  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.5));
  const handleResetZoom = () => setZoom(1);
  
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
    return {
      x: sumX / coords.length,
      y: sumY / coords.length
    };
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'booked': return '#f59e0b';
      case 'sold': return '#ef4444';
      case 'blocked': return '#6b7280';
      default: return '#10b981';
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layouts')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <input
            type="text"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            placeholder="Layout Name"
            className="px-3 py-2 border rounded-lg w-64 font-semibold"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50" title="Undo (Ctrl+Z)">
            <Undo size={20} />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50" title="Redo (Ctrl+Y)">
            <Redo size={20} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomOut size={20} /></button>
          <span className="text-sm font-medium min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded-lg"><ZoomIn size={20} /></button>
          <button onClick={handleResetZoom} className="p-2 hover:bg-gray-100 rounded-lg text-xs">1:1</button>
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            <Save size={18} />{saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">DRAWING TOOLS</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: 'rectangle', icon: Square, label: 'Rectangle' },
                { mode: 'square', icon: Square, label: 'Square' },
                { mode: 'triangle', icon: Triangle, label: 'Triangle' },
                { mode: 'circle', icon: Circle, label: 'Circle' },
                { mode: 'polygon', icon: Pentagon, label: 'Polygon' }
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => startDrawing(mode)}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 hover:bg-blue-50 hover:border-blue-500 transition ${drawingMode === mode ? 'bg-blue-50 border-blue-500' : 'border-gray-200'}`}
                >
                  <Icon size={20} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
              {isDrawing && (
                <button onClick={cancelDrawing} className="p-3 rounded-lg border-2 border-red-300 bg-red-50 flex flex-col items-center gap-1 hover:bg-red-100">
                  <span className="text-xs">Cancel</span>
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">PLOTS ({plots.length})</h3>
            <div className="space-y-1">
              {plots.map((plot) => (
                <div
                  key={plot.id}
                  onClick={() => handleSelectPlot(plot)}
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between hover:bg-gray-50 ${selectedPlotId === plot.id ? 'bg-blue-50 border border-blue-300' : 'border border-transparent'}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{plot.display_name}</div>
                    <div className="text-xs text-gray-500">{plot.area.toFixed(0)} sq.ft • {plot.status}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleDuplicatePlot(plot); }} className="p-1 hover:bg-white rounded" title="Duplicate"><Copy size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePlot(plot.id); }} className="p-1 hover:bg-white rounded text-red-600" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {plots.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No plots yet.<br/>Use drawing tools to add plots.</div>}
            </div>
          </div>
        </div>
        
        <div className="flex-1 relative overflow-hidden bg-gray-100" ref={containerRef}>
          <svg
            ref={svgRef}
            onClick={handleSvgClick}
            viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
            style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
          >
            {svgUrl && <image ref={bgImageRef} href={svgUrl} width={svgDimensions.width} height={svgDimensions.height} opacity="0.3" preserveAspectRatio="xMidYMid meet" />}
            {plots.map((plot) => {
              const center = getPlotCenter(plot.coordinates);
              const isSelected = selectedPlotId === plot.id;
              return (
                <g key={plot.id}>
                  <path d={getPlotPath(plot.coordinates)} fill={getStatusColor(plot.status)} fillOpacity={isSelected ? 0.6 : 0.3} stroke={isSelected ? '#3b82f6' : '#000'} strokeWidth={isSelected ? 3 : 1} className="cursor-pointer hover:fill-opacity-50" onClick={(e) => { e.stopPropagation(); handleSelectPlot(plot); }} />
                  <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none font-bold" fontSize="14" fill="#000">{plot.display_name}</text>
                </g>
              );
            })}
            {currentPoints.map((point, idx) => <circle key={idx} cx={point.x} cy={point.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />)}
            {currentPoints.length > 1 && <polyline points={currentPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />}
          </svg>
          {isDrawing && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 border border-blue-300">
              <p className="text-sm font-medium text-blue-600">
                {drawingMode === 'polygon' ? 'Click to add points. Press Esc to finish.' : `Click to add points (${currentPoints.length}/${drawingMode === 'rectangle' || drawingMode === 'square' || drawingMode === 'circle' ? '2' : '3'} needed)`}
              </p>
            </div>
          )}
        </div>
        
        {selectedPlot && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Plot Details</h3>
                <button onClick={() => { setSelectedPlot(null); setSelectedPlotId(null); }} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Plot Name/Number</label><input type="text" value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Area (sq.ft)</label><input type="number" value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label><input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg"><option value="available">Available</option><option value="booked">Booked</option><option value="sold">Sold</option><option value="blocked">Blocked</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Block</label><input type="text" value={editForm.block} onChange={(e) => setEditForm({ ...editForm, block: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Facing</label><select value={editForm.facing} onChange={(e) => setEditForm({ ...editForm, facing: e.target.value })} className="w-full px-3 py-2 border rounded-lg"><option value="North">North</option><option value="South">South</option><option value="East">East</option><option value="West">West</option><option value="North-East">North-East</option><option value="North-West">North-West</option><option value="South-East">South-East</option><option value="South-West">South-West</option></select></div>
                <button onClick={handleUpdatePlot} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Update Plot</button>
                <div className="pt-4 border-t"><button onClick={() => handleDeletePlot(selectedPlot.id)} className="w-full py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium flex items-center justify-center gap-2"><Trash2 size={18} />Delete Plot</button></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedLayoutEditor;