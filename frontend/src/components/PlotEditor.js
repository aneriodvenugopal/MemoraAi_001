import React, { useState, useRef, useEffect } from 'react';
import { 
  Move, Edit3, Save, X, Undo, Redo, ZoomIn, ZoomOut, 
  RotateCcw, Hand, MousePointer
} from 'lucide-react';

const PlotEditor = ({ layout, onSave, onCancel }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  // Editor state
  const [editMode, setEditMode] = useState('select');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [plots, setPlots] = useState(layout.plots || []);
  const [history, setHistory] = useState([plots]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  
  // View state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // SVG dimensions
  const [svgDimensions, setSvgDimensions] = useState({ 
    width: 1122.6667, 
    height: 793.33331 
  });
  
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
            }
          }
        });
    }
  }, [layout?.svg_url]);
  
  const addToHistory = (newPlots) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newPlots)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPlots(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPlots(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };
  
  const getSVGPoint = (evt) => {
    if (!svgRef.current) return null;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((evt.clientX - rect.left - pan.x) / zoom);
    const y = ((evt.clientY - rect.top - pan.y) / zoom);
    
    return { x, y };
  };
  
  const handleMouseDown = (evt, plot = null) => {
    evt.preventDefault();
    
    const point = getSVGPoint(evt);
    
    if (editMode === 'pan' || evt.button === 1 || evt.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: evt.clientX - pan.x, y: evt.clientY - pan.y });
    } else if (editMode === 'move' && plot) {
      setSelectedPlot(plot);
      setIsDragging(true);
      setDragStart(point);
    } else if (editMode === 'edit' && plot) {
      setSelectedPlot(plot);
      setIsDragging(true);
      setDragStart(point);
    } else if (editMode === 'select' && plot) {
      setSelectedPlot(plot);
    }
  };
  
  const handleMouseMove = (evt) => {
    if (isPanning) {
      setPan({
        x: evt.clientX - panStart.x,
        y: evt.clientY - panStart.y
      });
    } else if (isDragging && selectedPlot && dragStart) {
      const point = getSVGPoint(evt);
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      
      if (editMode === 'move') {
        const updatedPlots = plots.map(p => {
          if (p.id === selectedPlot.id || p.display_name === selectedPlot.display_name) {
            const boundary = p.coordinates || p.boundary || [];
            const newBoundary = boundary.map(pt => ({
              x: pt.x + dx,
              y: pt.y + dy
            }));
            return { ...p, coordinates: newBoundary, boundary: newBoundary };
          }
          return p;
        });
        
        setPlots(updatedPlots);
        setDragStart(point);
      }
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging && selectedPlot) {
      addToHistory(plots);
    }
    
    setIsPanning(false);
    setIsDragging(false);
    setDragStart(null);
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  const handleSave = () => {
    onSave(plots);
  };
  
  const renderPlot = (plot) => {
    const plotId = plot.id || plot.plot_number || plot.display_name;
    const isSelected = selectedPlot?.id === plot.id || selectedPlot?.display_name === plot.display_name;
    const boundary = plot.coordinates || plot.boundary || [];
    
    if (boundary.length < 3) return null;
    
    const pathData = boundary.map((point, idx) => 
      `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ') + ' Z';
    
    const color = 
      plot.status === 'available' ? '#10b981' :
      plot.status === 'booked' ? '#f59e0b' :
      plot.status === 'sold' ? '#8b5cf6' : '#6b7280';
    
    const centerX = boundary.reduce((sum, pt) => sum + pt.x, 0) / boundary.length;
    const centerY = boundary.reduce((sum, pt) => sum + pt.y, 0) / boundary.length;
    
    return (
      <g key={plotId}>
        <path
          d={pathData}
          fill={color}
          fillOpacity={isSelected ? 0.4 : 0.3}
          stroke={isSelected ? '#3b82f6' : color}
          strokeWidth={isSelected ? 3 : 2}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseDown={(e) => handleMouseDown(e, plot)}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.6'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        />
        
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#000"
          fontSize="14"
          fontWeight="bold"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {plot.display_name || plot.plot_number || plot.id}
        </text>
      </g>
    );
  };
  
  const btnClass = (active) => `px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition ${
    active 
      ? 'bg-blue-600 text-white' 
      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
  }`;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        width: '100%',
        height: '100%',
        maxWidth: '80rem',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Plot Editor
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {editMode === 'select' && 'Click on plots to select them'}
              {editMode === 'move' && 'Drag plots to move their position'}
              {editMode === 'edit' && 'Drag to resize plot boundaries'}
              {editMode === 'pan' && 'Drag to pan the view'}
            </p>
          </div>
          
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>
        
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setEditMode('select')} className={btnClass(editMode === 'select')}>
              <MousePointer style={{ width: '1rem', height: '1rem' }} />
              Select
            </button>
            
            <button onClick={() => setEditMode('move')} className={btnClass(editMode === 'move')}>
              <Move style={{ width: '1rem', height: '1rem' }} />
              Move
            </button>
            
            <button onClick={() => setEditMode('edit')} className={btnClass(editMode === 'edit')}>
              <Edit3 style={{ width: '1rem', height: '1rem' }} />
              Edit
            </button>
            
            <button onClick={() => setEditMode('pan')} className={btnClass(editMode === 'pan')}>
              <Hand style={{ width: '1rem', height: '1rem' }} />
              Pan
            </button>
            
            <div style={{ width: '1px', height: '2rem', backgroundColor: '#d1d5db', margin: '0 0.5rem' }} />
            
            <button onClick={handleUndo} disabled={historyIndex <= 0} className={btnClass(false)}>
              <Undo style={{ width: '1rem', height: '1rem' }} />
            </button>
            
            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className={btnClass(false)}>
              <Redo style={{ width: '1rem', height: '1rem' }} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={handleZoomOut} className={btnClass(false)}>
              <ZoomOut style={{ width: '1rem', height: '1rem' }} />
            </button>
            
            <span style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}>
              {(zoom * 100).toFixed(0)}%
            </span>
            
            <button onClick={handleZoomIn} className={btnClass(false)}>
              <ZoomIn style={{ width: '1rem', height: '1rem' }} />
            </button>
            
            <button onClick={handleResetView} className={btnClass(false)}>
              <RotateCcw style={{ width: '1rem', height: '1rem' }} />
            </button>
            
            <div style={{ width: '1px', height: '2rem', backgroundColor: '#d1d5db', margin: '0 0.5rem' }} />
            
            <button 
              onClick={handleSave}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#16a34a',
                color: 'white',
                borderRadius: '0.375rem',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <Save style={{ width: '1rem', height: '1rem' }} />
              Save Changes
            </button>
          </div>
        </div>
        
        {/* Canvas */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#f3f4f6',
          padding: '1rem'
        }}>
          <div 
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              border: '2px solid #d1d5db',
              overflow: 'hidden',
              position: 'relative',
              cursor: isPanning ? 'grabbing' : editMode === 'pan' ? 'grab' : 'default'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: '0 0'
              }}
            >
              {layout.svg_url && (
                <image
                  href={layout.svg_url}
                  width={svgDimensions.width}
                  height={svgDimensions.height}
                  opacity="0.3"
                />
              )}
              
              {plots.map(plot => renderPlot(plot))}
            </svg>
            
            {selectedPlot && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                border: '1px solid #d1d5db'
              }}>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                    Plot {selectedPlot.display_name || selectedPlot.plot_number || selectedPlot.id}
                  </div>
                  <div style={{ color: '#6b7280' }}>
                    <div>Status: {selectedPlot.status}</div>
                    {selectedPlot.area && <div>Area: {selectedPlot.area} sq.ft</div>}
                    {selectedPlot.price && <div>Price: ₹{selectedPlot.price.toLocaleString()}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlotEditor;
