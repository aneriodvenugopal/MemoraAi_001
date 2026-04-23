import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, Edit, Trash2, Download, Share2, Building2, MapPin, Trees, Warehouse, LayoutGrid,
  Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Search, Filter, X, 
  Home, IndianRupee, Ruler, Calendar, User, Phone, Mail, MessageSquare,
  Image as ImageIcon, Video, FileText, Heart, ShoppingCart, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { layoutService } from '../services';

const LayoutViewer = () => {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [svgDimensions, setSvgDimensions] = useState({ width: 1200, height: 800, minX: 0, minY: 0 });

  useEffect(() => {
    loadLayout();
  }, [layoutId]);

  // Calculate viewBox based on plot coordinates - ensures plots align correctly
  useEffect(() => {
    if (layout?.plots && layout.plots.length > 0) {
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
        console.log('📐 LayoutViewer: ViewBox calculated from plots:', { 
          minX: minX - padding, 
          minY: minY - padding, 
          width, 
          height 
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'venture':
        return <LayoutGrid className="w-5 h-5" />;
      case 'apartment':
        return <Building2 className="w-5 h-5" />;
      case 'farm_land':
        return <Trees className="w-5 h-5" />;
      case 'open_land':
        return <MapPin className="w-5 h-5" />;
      default:
        return <Warehouse className="w-5 h-5" />;
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

  if (!layout) {
    return null;
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
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/layouts')}
                variant="ghost"
                className="text-ocean-primary hover:bg-ocean-primary/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Layouts
              </Button>
              <div className="flex items-center gap-2">
                {getTypeIcon(layout.layout_type)}
                <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
                  {layout.layout_name}
                </h1>
                {layout.is_template && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    Template
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!layout.is_template && (
                <>
                  <Button
                    onClick={() => navigate(`/layouts/${layoutId}/edit`)}
                    className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Layout Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Type</p>
                <p className="text-xl font-bold text-ocean-primary">{getTypeLabel(layout.layout_type)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Plots</p>
                <p className="text-xl font-bold text-ocean-secondary">{layout.plots?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Available</p>
                <p className="text-xl font-bold text-green-600">
                  {layout.plots?.filter(p => p.status === 'available').length || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="text-xl font-bold text-purple-600">
                  {new Date(layout.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Plots List Sidebar */}
          <div className="lg:col-span-1">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary">Plots ({layout.plots?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {layout.plots && layout.plots.map((plot) => (
                    <div key={plot.id} className="p-3 bg-ocean-primary/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-ocean-primary">Plot {plot.display_name}</span>
                        <Badge 
                          className={
                            plot.status === 'available' ? 'bg-green-500' :
                            plot.status === 'booked' ? 'bg-yellow-500' :
                            plot.status === 'sold' ? 'bg-purple-500' :
                            'bg-red-500'
                          }
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
                          <span className="font-medium">₹{plot.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!layout.plots || layout.plots.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No plots defined
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SVG Viewer */}
          <div className="lg:col-span-3">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-ocean-primary">Layout Map</CardTitle>
              </CardHeader>
              <CardContent>
                {layout.svg_url ? (
                  <div className="bg-gray-50 rounded-lg overflow-auto border-2 border-ocean-primary/20 p-4" style={{ maxHeight: '700px' }}>
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                      <img 
                        src={layout.svg_url} 
                        alt={layout.layout_name} 
                        style={{ display: 'block', width: '100%', height: 'auto' }} 
                      />
                      
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none'
                        }}
                        viewBox={`${svgDimensions.minX} ${svgDimensions.minY} ${svgDimensions.width} ${svgDimensions.height}`}
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {layout.plots && layout.plots.map((plot) => (
                          <g key={plot.id}>
                            <polygon
                              points={getPolygonPoints(plot.coordinates)}
                              fill={getStatusColor(plot.status)}
                              stroke="#0891b2"
                              strokeWidth="2"
                            />
                            <text
                              x={plot.coordinates.reduce((sum, c) => sum + c.x, 0) / plot.coordinates.length}
                              y={plot.coordinates.reduce((sum, c) => sum + c.y, 0) / plot.coordinates.length}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#000"
                              fontSize="14"
                              fontWeight="bold"
                            >
                              {plot.display_name}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-12 text-center">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No SVG layout available</p>
                  </div>
                )}

                {/* Legend */}
                <div className="mt-4 flex gap-4 flex-wrap">
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LayoutViewer;
