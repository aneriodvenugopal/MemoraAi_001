import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';

const PublicLayoutViewer = ({ layout, properties = [], onPlotClick }) => {
  const [zoom, setZoom] = useState(1);
  const [hoveredPlot, setHoveredPlot] = useState(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 1200, height: 800, minX: 0, minY: 0 });

  const statusColors = {
    available: '#22c55e40',
    booked: '#f59e0b40',
    reserved: '#f59e0b40',
    blocked: '#6b728040',
    sold: '#ef444440'
  };

  const statusStrokes = {
    available: '#22c55e',
    booked: '#f59e0b',
    reserved: '#f59e0b',
    blocked: '#6b7280',
    sold: '#ef4444'
  };

  const statusLabels = {
    available: 'Available',
    booked: 'Booked',
    reserved: 'Reserved',
    blocked: 'Blocked',
    sold: 'Sold'
  };

  // Extract SVG viewBox from the actual file - CRITICAL for alignment
  useEffect(() => {
    if (layout?.svg_url) {
      fetch(layout.svg_url)
        .then(res => res.text())
        .then(svgText => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgElement = svgDoc.querySelector('svg');
          
          if (svgElement) {
            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
              const [x, y, width, height] = viewBox.split(' ').map(Number);
              setSvgDimensions({ width, height, minX: x, minY: y, fromSvg: true });
              console.log('✅ PublicLayoutViewer: ViewBox from SVG:', { x, y, width, height });
            } else {
              const width = parseFloat(svgElement.getAttribute('width')) || 1200;
              const height = parseFloat(svgElement.getAttribute('height')) || 800;
              setSvgDimensions({ width, height, minX: 0, minY: 0, fromSvg: true });
              console.log('✅ PublicLayoutViewer: Dimensions from SVG:', { width, height });
            }
          }
        })
        .catch(err => console.warn('Could not read SVG dimensions:', err));
    }
  }, [layout?.svg_url]);

  // Fallback: Calculate from plot coordinates if no SVG available
  useEffect(() => {
    if (layout?.plots && layout.plots.length > 0 && !svgDimensions.fromSvg) {
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
        const padding = 100;
        const width = maxX - minX + (padding * 2);
        const height = maxY - minY + (padding * 2);
        
        setSvgDimensions({ 
          width, 
          height,
          minX: minX - padding,
          minY: minY - padding
        });
        console.log('📐 PublicLayoutViewer: ViewBox from plots:', { minX: minX - padding, minY: minY - padding, width, height });
      }
    }
  }, [layout, svgDimensions.fromSvg]);

  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handlePlotClick = (plot) => {
    if (onPlotClick && plot.status === 'available') {
      onPlotClick(plot);
    }
  };

  const getPolygonPoints = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) return '';
    return coordinates.map(coord => `${coord.x},${coord.y}`).join(' ');
  };

  const getPlotCenter = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return { x: 0, y: 0 };
    const sumX = coordinates.reduce((sum, c) => sum + (c.x || 0), 0);
    const sumY = coordinates.reduce((sum, c) => sum + (c.y || 0), 0);
    return { x: sumX / coordinates.length, y: sumY / coordinates.length };
  };

  const resetView = () => {
    setZoom(1);
  };

  const getStatusSummary = () => {
    const summary = { available: 0, booked: 0, reserved: 0, blocked: 0, sold: 0 };
    properties?.forEach(prop => {
      const status = prop.status || 'available';
      if (summary[status] !== undefined) {
        summary[status]++;
      }
    });
    return summary;
  };

  const statusSummary = getStatusSummary();

  // Merge layout plots with property data
  const plots = layout?.plots?.map(plot => {
    const property = properties.find(p => 
      p.plot_number === plot.display_name || 
      p.block === plot.block
    );
    return {
      ...plot,
      ...property,
      status: property?.status || plot.status || 'available'
    };
  }) || [];

  return (
    <div className="w-full space-y-4">
      {/* Status Legend */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusSummary).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: statusStrokes[status] }}
                ></div>
                <span className="text-sm font-medium text-gray-700">
                  {statusLabels[status]}: <span className="font-bold text-gray-900">{count}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="text-sm font-semibold text-blue-600">
            Total: {properties.length || plots.length}
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="bg-white rounded-lg shadow-md p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleZoom(0.2)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={resetView}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition flex items-center gap-1"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="text-sm font-medium">Reset View</span>
          </button>
          <span className="text-sm ml-auto text-gray-600">Zoom: {(zoom * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Interactive Layout */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <div 
          className="relative bg-gray-50 overflow-auto" 
          style={{ height: '800px' }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: 'fit-content',
              minWidth: '100%',
              minHeight: '100%'
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: 'auto', display: 'inline-block' }}>
              {/* Background Layout Image */}
              {layout?.svg_url && (
                <img 
                  src={layout.svg_url} 
                  alt="Layout Plan"
                  style={{ display: 'block', maxWidth: '100%' }}
                />
              )}

              {/* Interactive SVG Overlay - Dynamic viewBox matching the background */}
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'all'
                }}
                viewBox={`${svgDimensions.minX} ${svgDimensions.minY} ${svgDimensions.width} ${svgDimensions.height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Interactive plots - NO transforms, coordinates match the SVG */}
                {plots.map((plot) => {
                  const center = getPlotCenter(plot.coordinates);
                  const isHovered = hoveredPlot?.id === plot.id;
                  
                  return (
                    <g key={plot.id}>
                      <polygon
                        points={getPolygonPoints(plot.coordinates)}
                        fill={isHovered ? '#3b82f640' : statusColors[plot.status]}
                        stroke={isHovered ? '#3b82f6' : statusStrokes[plot.status]}
                        strokeWidth={isHovered ? 4 : 2}
                        style={{ 
                          cursor: plot.status === 'available' ? 'pointer' : 'default',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlotClick(plot);
                        }}
                        onMouseEnter={() => setHoveredPlot(plot)}
                        onMouseLeave={() => setHoveredPlot(null)}
                      />
                      <text
                        x={center.x}
                        y={center.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1e293b"
                        fontSize="11"
                        fontWeight="bold"
                        style={{ 
                          pointerEvents: 'none',
                          textShadow: '0 0 3px white, 0 0 3px white'
                        }}
                      >
                        {plot.display_name || plot.plot_number}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Hovered Plot Info */}
      {hoveredPlot && (
        <div className="bg-white rounded-xl shadow-xl p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-lg">{hoveredPlot.display_name}</h3>
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: statusColors[hoveredPlot.status],
                color: statusStrokes[hoveredPlot.status]
              }}
            >
              {statusLabels[hoveredPlot.status]}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {hoveredPlot.area && (
              <div>
                <span className="text-gray-500">Area:</span>
                <span className="ml-2 font-semibold">{hoveredPlot.area} sq.ft</span>
              </div>
            )}
            {hoveredPlot.price && (
              <div>
                <span className="text-gray-500">Price:</span>
                <span className="ml-2 font-semibold">₹{Number(hoveredPlot.price).toLocaleString('en-IN')}</span>
              </div>
            )}
            {hoveredPlot.block && (
              <div>
                <span className="text-gray-500">Block:</span>
                <span className="ml-2 font-semibold">{hoveredPlot.block}</span>
              </div>
            )}
            {hoveredPlot.facing && (
              <div>
                <span className="text-gray-500">Facing:</span>
                <span className="ml-2 font-semibold">{hoveredPlot.facing}</span>
              </div>
            )}
          </div>
          {hoveredPlot.status === 'available' && (
            <p className="mt-2 text-sm text-green-600 font-medium">
              Click to book this plot
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicLayoutViewer;
