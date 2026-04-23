import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, Maximize2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

const InteractiveLayoutViewer = ({ layoutData, projectData, onPlotClick, readOnly = false }) => {
  const [zoom, setZoom] = useState(1);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [hoveredPlot, setHoveredPlot] = useState(null);

  const statusColors = {
    available: '#dff0d8',
    booked: '#f0ad4e',
    blocked: '#d9534f',
    sold: '#6b7280'
  };

  const statusStrokes = {
    available: '#5cb85c',
    booked: '#d58512',
    blocked: '#c9302c',
    sold: '#4b5563'
  };

  const statusLabels = {
    available: 'Available',
    booked: 'Booked',
    blocked: 'Blocked',
    sold: 'Sold'
  };

  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
    if (onPlotClick && !readOnly) {
      onPlotClick(plot);
    }
  };

  const getPolygonPoints = (coordinates) => {
    return coordinates.map(coord => `${coord.x},${coord.y}`).join(' ');
  };

  const resetView = () => {
    setZoom(1);
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/public/layout/${projectData?.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Shareable link copied!');
  };

  const getStatusSummary = () => {
    const summary = { available: 0, booked: 0, blocked: 0, sold: 0 };
    layoutData?.plots?.forEach(plot => {
      if (summary[plot.status] !== undefined) {
        summary[plot.status]++;
      }
    });
    return summary;
  };

  const statusSummary = getStatusSummary();

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-ocean-primary">{projectData?.name || 'Layout Plan'}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{projectData?.location}</p>
            </div>
            <div className="flex gap-2">
              {!readOnly && (
                <Button onClick={handleShare} className="bg-gradient-to-r from-ocean-secondary to-ocean-accent text-white">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Link
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              {Object.entries(statusSummary).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: statusColors[status] }}></div>
                  <span className="text-sm font-medium">
                    {statusLabels[status]}: <span className="text-ocean-primary font-bold">{count}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="text-sm font-semibold text-ocean-primary">
              Total: {layoutData?.plots?.length || 0}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Button onClick={() => handleZoom(0.2)} variant="outline" size="sm">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button onClick={() => handleZoom(-0.2)} variant="outline" size="sm">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button onClick={resetView} variant="outline" size="sm">
              <Maximize2 className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <span className="text-sm ml-auto">Zoom: {(zoom * 100).toFixed(0)}%</span>
          </div>

          <div className="relative bg-white rounded-lg overflow-auto border-2 border-ocean-primary/20" style={{ height: '700px' }}>
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: 'fit-content'
              }}
            >
              {/* Exact replication of Laravel blade structure */}
              <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
                
                {/* Background SVG/Image */}
                <div style={{ width: '100%', border: '1px solid #ccc' }}>
                  {layoutData?.svg_url && (
                    <img 
                      src={layoutData.svg_url} 
                      alt="Layout Plan"
                      style={{ width: '100%', border: '1px solid #ccc' }}
                    />
                  )}
                </div>

                {/* Interactive SVG overlay - EXACT match to Laravel */}
                <svg
                  id="layoutSVG"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1122.6667 793.33331"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                >
                  {/* Title */}
                  <text
                    x="561"
                    y="30"
                    textAnchor="middle"
                    fontFamily="Arial"
                    fontSize="24"
                    fontWeight="bold"
                    fill="#333"
                    style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.8)' }}
                  >
                    SATTENAPALLI LAYOUT - INTERACTIVE PLOT BOOKING
                  </text>

                  {/* Interactive plots group with EXACT transforms */}
                  <g
                    id="plotsGroup"
                    transform="matrix(0,-1.3333333,-1.3333333,0,1122.6667,793.33333)"
                    style={{ pointerEvents: 'all' }}
                  >
                    <g transform="matrix(0.12,0,0,0.12,2,2)">
                      {/* Render plots with exact coordinates */}
                      {layoutData?.plots?.map((plot) => (
                        <g key={plot.id}>
                          <polygon
                            id={`plot-${plot.id}`}
                            points={getPolygonPoints(plot.coordinates)}
                            fill={hoveredPlot?.id === plot.id ? '#cce5ff' : statusColors[plot.status]}
                            stroke={hoveredPlot?.id === plot.id ? '#007bff' : statusStrokes[plot.status]}
                            strokeWidth={hoveredPlot?.id === plot.id ? 5 : 3}
                            data-status={plot.status}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlotClick(plot);
                            }}
                            onMouseEnter={() => setHoveredPlot(plot)}
                            onMouseLeave={() => setHoveredPlot(null)}
                          />
                          {/* Plot label */}
                          <text
                            x={plot.coordinates.reduce((sum, c) => sum + c.x, 0) / plot.coordinates.length}
                            y={plot.coordinates.reduce((sum, c) => sum + c.y, 0) / plot.coordinates.length}
                            textAnchor="middle"
                            fontFamily="Arial"
                            fontSize="60"
                            fill="#333"
                            style={{ pointerEvents: 'none' }}
                          >
                            {plot.display_name}
                          </text>
                        </g>
                      ))}
                    </g>
                  </g>

                  {/* Message box */}
                  <g id="overlayElements">
                    <rect x="50" y="60" width="200" height="30" fill="rgba(255,255,255,0.9)" stroke="#333" strokeWidth="1" rx="5" />
                    <text x="150" y="80" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#333">
                      Click on plots to view details
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Hover Tooltip */}
            {hoveredPlot && (
              <div
                className="fixed glass-card p-4 max-w-xs z-50 pointer-events-none"
                style={{ 
                  top: '50%',
                  right: '20px',
                  transform: 'translateY(-50%)'
                }}
              >
                <h4 className="font-bold text-ocean-primary text-lg">Plot {hoveredPlot.display_name}</h4>
                <div className="text-sm space-y-2 mt-2">
                  <p className="flex justify-between">
                    <span className="font-semibold">Status:</span> 
                    <Badge style={{ backgroundColor: statusColors[hoveredPlot.status] }}>
                      {statusLabels[hoveredPlot.status]}
                    </Badge>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold">Area:</span> 
                    <span>{hoveredPlot.area} sq.ft</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold">Price:</span> 
                    <span className="text-ocean-primary font-bold">₹{(hoveredPlot.price / 100000).toFixed(2)}L</span>
                  </p>
                  {hoveredPlot.block && (
                    <p className="flex justify-between">
                      <span className="font-semibold">Block:</span> 
                      <span>{hoveredPlot.block}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPlot} onOpenChange={() => setSelectedPlot(null)}>
        <DialogContent className="glass-modal max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-ocean-primary">
              Plot {selectedPlot?.display_name} - Block {selectedPlot?.block}
            </DialogTitle>
            <p className="text-sm text-gray-600">Premium residential plot in {projectData?.name}</p>
          </DialogHeader>
          {selectedPlot && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">PRICE</p>
                  <p className="text-2xl font-bold text-ocean-primary">₹{(selectedPlot.price / 100000).toFixed(2)}L</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">AREA</p>
                  <p className="text-xl font-bold">{selectedPlot.area} sq.ft</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">STATUS</p>
                  <Badge style={{ backgroundColor: statusColors[selectedPlot.status] }} className="text-sm px-3 py-1">
                    {statusLabels[selectedPlot.status]}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Block</p>
                  <p className="font-semibold text-lg">{selectedPlot.block}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Per Sq Ft</p>
                  <p className="font-semibold text-lg">₹{(selectedPlot.price / selectedPlot.area).toFixed(0)}</p>
                </div>
              </div>

              {selectedPlot.amenities && selectedPlot.amenities.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Premium Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlot.amenities.map((amenity, idx) => (
                      <Badge key={idx} variant="outline" className="border-ocean-primary text-ocean-primary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {!readOnly && selectedPlot.status === 'available' && (
                <Button className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white text-lg py-6">
                  Express Interest / Book This Plot
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InteractiveLayoutViewer;
