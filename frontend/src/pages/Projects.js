import React, { useState, useEffect } from 'react';
import { projectService, categoryService, currencyService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Building2, MapPin, Calendar, TrendingUp, Search, 
  Grid, List, Filter, ArrowRight, Eye, Edit, LayoutGrid,
  Layers, Home, Users, IndianRupee, ChevronRight, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    tenant_id: user?.tenant_id || '',
    name: '',
    description: '',
    project_type: '',
    location: '',
    city: '',
    state: '',
    country: 'India',
    currency_id: '',
    price_per_unit: '',
  });

  useEffect(() => {
    fetchProjects();
    fetchCurrencies();
    fetchPropertyTypes();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      toast.error('Failed to load projects');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const data = await currencyService.getAll();
      setCurrencies(data);
      if (data.length > 0) {
        const inr = data.find(c => c.code === 'INR');
        setFormData(prev => ({ ...prev, currency_id: inr?.id || data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const fetchPropertyTypes = async () => {
    try {
      const data = await categoryService.getAll('property_type', user?.tenant_id);
      setPropertyTypes(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, project_type: data[0].slug }));
      }
    } catch (error) {
      console.error('Failed to load property types:', error);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newProject = await projectService.create(formData);
      
      try {
        await categoryService.dumpToProject(newProject.id);
      } catch (dumpError) {
        console.error('Failed to dump categories:', dumpError);
      }
      
      toast.success('Project created successfully!');
      setShowCreateDialog(false);
      fetchProjects();
      setFormData({
        tenant_id: user?.tenant_id || '',
        name: '',
        description: '',
        project_type: propertyTypes[0]?.slug || '',
        location: '',
        city: '',
        state: '',
        country: 'India',
        currency_id: currencies.find(c => c.code === 'INR')?.id || currencies[0]?.id,
        price_per_unit: '',
      });
    } catch (error) {
      // Handle different types of error responses
      const detail = error.response?.data?.detail;
      let errorMessage = 'Failed to create project';
      
      if (detail) {
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object') {
          // Handle structured error (like usage limit)
          if (detail.message) {
            errorMessage = detail.message;
          } else if (detail.msg) {
            errorMessage = detail.msg;
          } else if (Array.isArray(detail)) {
            // Pydantic validation errors
            errorMessage = detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
          } else {
            errorMessage = JSON.stringify(detail);
          }
        }
      }
      
      toast.error(errorMessage);
      console.error('Create project error:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || project.project_type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: projects.length,
    plots: projects.filter(p => p.project_type === 'plot').length,
    flats: projects.filter(p => p.project_type === 'flat').length,
    villas: projects.filter(p => p.project_type === 'villa').length,
  };

  const getTypeColor = (type) => {
    const colors = {
      plot: 'from-green-500 to-emerald-600',
      flat: 'from-blue-500 to-indigo-600',
      villa: 'from-purple-500 to-pink-600',
      commercial: 'from-orange-500 to-red-600',
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      plot: 'bg-green-100 text-green-700 border-green-200',
      flat: 'bg-blue-100 text-blue-700 border-blue-200',
      villa: 'bg-purple-100 text-purple-700 border-purple-200',
      commercial: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur rounded-xl">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Projects</h1>
                  <p className="text-cyan-100">Manage your real estate portfolio</p>
                </div>
              </div>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white text-cyan-700 hover:bg-cyan-50 shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-600" />
                    Create New Project
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Project Name *</label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Green Valley Residency"
                        className="border-gray-200 focus:border-cyan-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Project Type *</label>
                      <Select
                        value={formData.project_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, project_type: value }))}
                      >
                        <SelectTrigger className="border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {propertyTypes.map((type) => (
                            <SelectItem key={type.id} value={type.slug}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <Input
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Brief description of the project"
                      className="border-gray-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Location *</label>
                      <Input
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="Street address or area"
                        className="border-gray-200"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">City *</label>
                      <Input
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Hyderabad"
                        className="border-gray-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">State *</label>
                      <Input
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Telangana"
                        className="border-gray-200"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Currency</label>
                      <Select
                        value={formData.currency_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, currency_id: value }))}
                      >
                        <SelectTrigger className="border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.id}>
                              {currency.symbol} {currency.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
                      {loading ? 'Creating...' : 'Create Project'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm">Total Projects</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Building2 className="w-10 h-10 text-white/50" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm">Plot Projects</p>
                  <p className="text-3xl font-bold">{stats.plots}</p>
                </div>
                <Layers className="w-10 h-10 text-green-300/50" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm">Flat Projects</p>
                  <p className="text-3xl font-bold">{stats.flats}</p>
                </div>
                <Home className="w-10 h-10 text-blue-300/50" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm">Villa Projects</p>
                  <p className="text-3xl font-bold">{stats.villas}</p>
                </div>
                <Building2 className="w-10 h-10 text-purple-300/50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search & Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search projects by name, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200 shadow-sm"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 bg-white border-gray-200 shadow-sm">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="plot">Plots</SelectItem>
                <SelectItem value="flat">Flats</SelectItem>
                <SelectItem value="villa">Villas</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-cyan-600' : ''}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-cyan-600' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Projects Grid/List */}
        {filteredProjects.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Projects Found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Try adjusting your search or filters' : 'Create your first project to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-cyan-600 to-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-white cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                {/* Card Header with Gradient */}
                <div className={`h-32 bg-gradient-to-br ${getTypeColor(project.project_type)} p-4 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full"></div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full"></div>
                  <div className="relative z-10">
                    <Badge className={`${getTypeBadgeColor(project.project_type)} border text-xs font-medium`}>
                      {project.project_type?.toUpperCase() || 'PROJECT'}
                    </Badge>
                    <h3 className="text-xl font-bold text-white mt-3 line-clamp-1">{project.name}</h3>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  {/* Location */}
                  <div className="flex items-start gap-2 text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-600" />
                    <div className="text-sm">
                      <p className="font-medium">{project.location || 'Location not set'}</p>
                      <p className="text-gray-400 text-xs">{project.city}, {project.state}</p>
                    </div>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-cyan-600">{project.total_properties || 0}</p>
                      <p className="text-xs text-gray-500">Properties</p>
                    </div>
                    <div className="text-center border-x border-gray-100">
                      <p className="text-lg font-bold text-green-600">{project.available_count || 0}</p>
                      <p className="text-xs text-gray-500">Available</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-600">{project.sold_count || 0}</p>
                      <p className="text-xs text-gray-500">Sold</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}/layout/edit`);
                      }}
                    >
                      <LayoutGrid className="w-4 h-4 mr-1" />
                      Layout
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}`);
                      }}
                    >
                      View
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-all duration-200 border-0 bg-white cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTypeColor(project.project_type)} flex items-center justify-center`}>
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{project.name}</h3>
                          <Badge className={`${getTypeBadgeColor(project.project_type)} border text-xs`}>
                            {project.project_type?.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {project.location}, {project.city}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-xl font-bold text-cyan-600">{project.total_properties || 0}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-600">{project.available_count || 0}</p>
                        <p className="text-xs text-gray-500">Available</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">{project.sold_count || 0}</p>
                        <p className="text-xs text-gray-500">Sold</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}/layout/edit`);
                          }}
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-gradient-to-r from-cyan-600 to-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                          }}
                        >
                          View <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
