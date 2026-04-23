import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Eye, Edit, Trash2, MapPin, Building2, Trees, Warehouse, 
  LayoutGrid, Filter, ArrowLeft 
} from 'lucide-react';
import { toast } from 'sonner';
import { layoutService } from '../services';

const LayoutsLibrary = () => {
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadLayouts();
    loadStats();
  }, [filterType]);

  const loadLayouts = async () => {
    setLoading(true);
    try {
      const response = await layoutService.getMasterLayouts(
        filterType === 'all' ? null : filterType,
        true
      );
      setLayouts(response.layouts || []);
    } catch (error) {
      console.error('Error loading layouts:', error);
      toast.error('Failed to load layouts');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await layoutService.getLayoutStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDelete = async (layoutId, layoutName) => {
    if (!confirm(`Are you sure you want to delete "${layoutName}"?`)) {
      return;
    }

    try {
      await layoutService.deleteMasterLayout(layoutId);
      toast.success('Layout deleted successfully');
      loadLayouts();
      loadStats();
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
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                className="text-ocean-primary hover:bg-ocean-primary/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
                Layouts Library
              </h1>
            </div>
            <Button
              onClick={() => navigate('/layouts/create')}
              className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Layout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-ocean-primary">{stats.total_layouts}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Layouts</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-ocean-secondary">{stats.by_type?.venture || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Ventures</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.by_type?.apartment || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Apartments</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{stats.assigned_to_projects}</p>
                  <p className="text-sm text-gray-600 mt-1">Assigned to Projects</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Section */}
        <Card className="glass-card mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Filter className="w-5 h-5 text-ocean-primary" />
              <span className="font-semibold text-gray-700">Filter by Type:</span>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => setFilterType('all')}
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className={filterType === 'all' ? 'bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white' : ''}
                >
                  All
                </Button>
                <Button
                  onClick={() => setFilterType('venture')}
                  variant={filterType === 'venture' ? 'default' : 'outline'}
                  size="sm"
                  className={filterType === 'venture' ? 'bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white' : ''}
                >
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  Ventures
                </Button>
                <Button
                  onClick={() => setFilterType('apartment')}
                  variant={filterType === 'apartment' ? 'default' : 'outline'}
                  size="sm"
                  className={filterType === 'apartment' ? 'bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white' : ''}
                >
                  <Building2 className="w-4 h-4 mr-1" />
                  Apartments
                </Button>
                <Button
                  onClick={() => setFilterType('open_land')}
                  variant={filterType === 'open_land' ? 'default' : 'outline'}
                  size="sm"
                  className={filterType === 'open_land' ? 'bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white' : ''}
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  Open Land
                </Button>
                <Button
                  onClick={() => setFilterType('farm_land')}
                  variant={filterType === 'farm_land' ? 'default' : 'outline'}
                  size="sm"
                  className={filterType === 'farm_land' ? 'bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white' : ''}
                >
                  <Trees className="w-4 h-4 mr-1" />
                  Farm Land
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layouts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-primary"></div>
            <p className="mt-4 text-gray-600">Loading layouts...</p>
          </div>
        ) : layouts.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <LayoutGrid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Layouts Found</h3>
              <p className="text-gray-600 mb-4">
                {filterType === 'all' 
                  ? 'Create your first layout to get started!'
                  : `No layouts of type "${getTypeLabel(filterType)}" found.`
                }
              </p>
              <Button
                onClick={() => navigate('/layouts/create')}
                className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Layout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layouts.map((layout) => (
              <Card key={layout.id} className="glass-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(layout.layout_type)}
                      <CardTitle className="text-lg text-ocean-primary">
                        {layout.layout_name}
                      </CardTitle>
                    </div>
                    {layout.is_template && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        Template
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{getTypeLabel(layout.layout_type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Plots:</span>
                      <span className="font-medium text-ocean-primary">{layout.plots?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {new Date(layout.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Preview SVG */}
                  {layout.svg_url && (
                    <div className="bg-gray-100 rounded-lg p-2 h-32 flex items-center justify-center overflow-hidden">
                      <img 
                        src={layout.svg_url} 
                        alt={layout.layout_name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/layouts/${layout.id}/view`)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {!layout.is_template && (
                      <>
                        <Button
                          onClick={() => navigate(`/layouts/${layout.id}/edit`)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(layout.id, layout.layout_name)}
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LayoutsLibrary;
