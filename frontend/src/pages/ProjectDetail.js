import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService, propertyService, categoryService } from '../services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Building2, Grid, List, Filter, Map, Settings, Share2, Edit2, Lock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import PageInfoModal from '../components/PageInfoModal';
import RoleManagement from '../components/RoleManagement';
import CustomFieldsManager from '../components/CustomFieldsManager';
import PropertyEditTabs from '../components/PropertyEditTabs';

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [propertyStatuses, setPropertyStatuses] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingProperty, setEditingProperty] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [formData, setFormData] = useState({
    project_id: projectId,
    property_number: '',
    property_type_id: '',
    area: '',
    price: '',
    status_id: '',
    facing: '',
    block: '',
    floor: '',
  });

  useEffect(() => {
    fetchProjectData();
    fetchProjectCategories();
    fetchCustomFields();
  }, [projectId]);

  const fetchProjectCategories = async () => {
    try {
      const response = await categoryService.getProjectCategories(projectId);
      setProjectCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const response = await categoryService.getCustomFields(projectId);
      setCustomFields(response.fields || []);
    } catch (error) {
      console.error('Failed to load custom fields:', error);
    }
  };

  const fetchProjectData = async () => {
    try {
      const [projectData, statsData, propertiesData] = await Promise.all([
        projectService.getById(projectId),
        projectService.getStats(projectId),
        propertyService.getAll(projectId),
      ]);
      setProject(projectData);
      setStats(statsData);
      setProperties(propertiesData);
      
      // Fetch categories
      const [types, statuses, curr] = await Promise.all([
        categoryService.getAll('property_type', projectData.tenant_id, projectId),
        categoryService.getAll('property_status', projectData.tenant_id, projectId),
        categoryService.getAll('', projectData.tenant_id),
      ]);
      setPropertyTypes(types);
      setPropertyStatuses(statuses);
      
      // Set default values
      if (types.length > 0) {
        setFormData(prev => ({ ...prev, property_type_id: types[0].id }));
      }
      if (statuses.length > 0) {
        const availableStatus = statuses.find(s => s.slug === 'available');
        setFormData(prev => ({ 
          ...prev, 
          status_id: availableStatus?.id || statuses[0].id,
          currency_id: projectData.currency_id,
          tenant_id: projectData.tenant_id
        }));
      }
    } catch (error) {
      toast.error('Failed to load project data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await propertyService.create({
        ...formData,
        area: parseFloat(formData.area),
        price: parseFloat(formData.price),
        floor: formData.floor ? parseInt(formData.floor) : null,
      });
      toast.success('Property created successfully!');
      setShowCreateDialog(false);
      fetchProjectData();
      // Reset form
      setFormData(prev => ({
        ...prev,
        property_number: '',
        area: '',
        price: '',
        facing: '',
        block: '',
        floor: '',
      }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  // Edit property handler - Opens tabbed edit modal
  const handleEditProperty = (property) => {
    // Check if property is available - Rule: Only available plots can be edited
    const status = propertyStatuses.find(s => s.id === property.status_id);
    if (status && status.slug !== 'available') {
      toast.error('Only available properties can be edited. Booked/Sold properties are locked.');
      return;
    }
    
    setEditingProperty(property);
    setShowEditDialog(true);
  };

  const handleSavePropertyEdit = async (updatedData) => {
    if (!editingProperty) return;
    
    try {
      await propertyService.update(editingProperty.id, updatedData);
      setShowEditDialog(false);
      setEditingProperty(null);
      fetchProjectData();
    } catch (error) {
      throw error;
    }
  };

  const canEditProperty = (property) => {
    // If status_id is null/undefined, treat as available (editable)
    if (!property.status_id) return true;
    
    const status = propertyStatuses.find(s => s.id === property.status_id);
    // If status not found or is 'available', allow edit
    return !status || status.slug === 'available';
  };

  const getStatusColor = (statusSlug) => {
    const colors = {
      available: 'bg-green-500',   // Green
      booked: 'bg-blue-500',     // Yellow
      blocked: 'bg-orange-500',    // Orange
      sold: 'bg-red-500',          // Red
      resale: 'bg-purple-500',
    };
    return colors[statusSlug] || 'bg-gray-500';
  };

  const getStatusBadge = (statusId) => {
    // If no statusId, show as Available
    if (!statusId) {
      return <Badge className="bg-green-500">Available</Badge>;
    }
    const status = propertyStatuses.find(s => s.id === statusId);
    return status ? (
      <Badge className={getStatusColor(status.slug)}>
        {status.name}
      </Badge>
    ) : <Badge className="bg-green-500">Available</Badge>;
  };

  if (loading && !project) {
    return <div className="p-8">Loading project...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/projects')}
              className="glass-card hover:shadow-md transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
                {project?.project_name}
              </h2>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {project?.city}, {project?.state}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(`/projects/${projectId}/layout/edit`)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all border-0"
            >
              <Map className="w-4 h-4 mr-2" />
              Layout Editor
            </Button>
            <Button
              onClick={() => {
                const shareUrl = `${window.location.origin}/public/projects/${projectId}/layout`;
                navigator.clipboard.writeText(shareUrl);
                toast.success('Public layout link copied to clipboard!');
              }}
              variant="outline"
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Layout
            </Button>
            <Button
              onClick={() => navigate(`/projects/${projectId}/pricing`)}
              variant="outline"
              className="border-green-300 text-green-600 hover:bg-green-50"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Pricing Settings
            </Button>
        </div>
      </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total Properties" value={stats?.total_properties || 0} color="blue" icon={Building2} />
          <StatCard title="Available" value={stats?.available || 0} color="green" />
          <StatCard title="Sold" value={stats?.sold || 0} color="gray" />
          <StatCard title="Blocked" value={stats?.blocked || 0} color="orange" />
        </div>

        {/* Tabs for Properties and Settings */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Properties Tab */}
          <TabsContent value="overview">
            <Card className="glass-card shadow-xl">
              <CardHeader className="border-b border-ocean-primary/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
                    Properties
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white' : ''}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white' : ''}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
              {properties.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                  <p className="text-gray-500 mb-4">Create properties using the Layout Editor</p>
                  <Button onClick={() => navigate(`/projects/${projectId}/layout/edit`)}>
                    <Map className="w-4 h-4 mr-2" />
                    Open Layout Editor
                  </Button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
                  {properties.map((property) => (
                    viewMode === 'grid' ? (
                      <Card key={property.id} className="glass-card hover:shadow-xl transition-all duration-300 hover:scale-105 border-ocean-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-bold text-lg text-ocean-primary">{property.property_number}</h4>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(property.status_id)}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Area:</span>
                              <span>{property.area} {property.unit || 'sq.yard'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Price:</span>
                              <span className="text-green-600 font-bold">₹{(property.price / 100000).toFixed(2)}L</span>
                            </div>
                            {property.facing && (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Facing:</span>
                                <span>{property.facing}</span>
                              </div>
                            )}
                            {property.block && (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Block:</span>
                                <span>{property.block}</span>
                              </div>
                            )}
                          </div>
                          {/* Edit button - Only for Available properties */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {canEditProperty(property) ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => handleEditProperty(property)}
                              >
                                <Edit2 className="w-3 h-3 mr-2" />
                                Edit Details
                              </Button>
                            ) : (
                              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-1">
                                <Lock className="w-3 h-3" />
                                <span>Locked (Booked/Sold)</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div key={property.id} className="flex items-center justify-between p-4 glass-card rounded-lg hover:shadow-lg transition-all duration-200 border-ocean-primary/20">
                        <div className="flex items-center gap-6">
                          <div className="font-bold text-lg text-ocean-primary">{property.property_number}</div>
                          <div className="text-sm text-gray-600">
                            <span className="font-semibold">Area:</span> {property.area} {property.unit || 'sq.yard'}
                          </div>
                          <div className="text-sm font-bold text-green-600">₹{(property.price / 100000).toFixed(2)}L</div>
                          {property.facing && <div className="text-sm text-gray-600"><span className="font-semibold">Facing:</span> {property.facing}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          {canEditProperty(property) ? (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-blue-600 hover:bg-blue-50"
                              onClick={() => handleEditProperty(property)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Lock className="w-4 h-4 text-gray-300" title="Locked - Booked/Sold" />
                          )}
                          {getStatusBadge(property.status_id)}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Categories Section */}
              <Card className="glass-card shadow-xl">
                <CardHeader className="border-b border-ocean-primary/10">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
                    Project Categories
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Manage categories and subcategories for this project. Categories dumped from master templates can be customized here.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {projectCategories.length === 0 ? (
                    <div className="text-center py-12">
                      <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No categories found</h3>
                      <p className="text-gray-500 mb-4">Categories are automatically added when you create a project</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projectCategories.map((category) => (
                        <Card key={category.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-lg">{category.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {category.subcategories?.length || 0} subcategories
                                  {category.created_from === 'master_dump' && (
                                    <Badge variant="outline" className="ml-2">From Master</Badge>
                                  )}
                                </p>
                              </div>
                              <Badge className={category.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                                {category.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            
                            {category.subcategories && category.subcategories.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold mb-2">Subcategories:</p>
                                <div className="flex flex-wrap gap-2">
                                  {category.subcategories.map((subcat) => (
                                    <Badge 
                                      key={subcat.id} 
                                      variant="secondary"
                                      className={!subcat.is_active ? 'opacity-50' : ''}
                                    >
                                      {subcat.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Fields Section */}
              <CustomFieldsManager 
                projectId={projectId} 
                customFields={customFields}
                onFieldsUpdate={fetchCustomFields}
              />

              {/* Role Management Section */}
              <RoleManagement projectId={projectId} tenantId={project?.tenant_id} />
            </div>
          </TabsContent>
        </Tabs>

      {/* Edit Property Dialog - Tabbed Modal */}
      {showEditDialog && editingProperty && (
        <PropertyEditTabs
          property={editingProperty}
          projectId={projectId}
          onSave={handleSavePropertyEdit}
          onClose={() => {
            setShowEditDialog(false);
            setEditingProperty(null);
          }}
          propertyStatuses={propertyStatuses}
          propertyTypes={propertyTypes}
        />
      )}

      {/* Page Info Modal */}
      <PageInfoModal
        title="Project Detail Page"
        description="A comprehensive project management interface that provides a complete overview of all properties within a specific real estate project. This page serves as the central hub for viewing project statistics, managing properties, and accessing the layout editor."
        features={[
          "Real-time project statistics dashboard with total, available, sold, and blocked properties",
          "Interactive property grid and list view modes with smooth transitions",
          "Quick access to Layout Editor with dedicated button for SVG-based plot management",
          "Add new properties with comprehensive form (type, area, price, facing, block, floor)",
          "Beautiful animated gradient background with floating orbs for premium UX",
          "Glass card effects with hover animations for modern, professional appearance",
          "Status badges with color coding (green=available, blue=booked, gray=sold, orange=blocked)",
          "Responsive design that works seamlessly on desktop, tablet, and mobile devices"
        ]}
        technologies={[
          "React.js",
          "Tailwind CSS",
          "Shadcn UI Components",
          "React Router",
          "Lucide Icons",
          "FastAPI Backend",
          "MongoDB Database"
        ]}
        implementations={[
          {
            title: "Enhanced Visual Design",
            description: "Implemented modern UI with gradient backgrounds, glass-morphism cards, smooth hover animations, and color-coded status indicators. Added animated floating orbs in the background for a premium, professional look."
          },
          {
            title: "Property Management System",
            description: "Built comprehensive property CRUD operations with form validation, status management, and real-time updates. Properties can be viewed in both grid and list modes with seamless switching."
          },
          {
            title: "Layout Integration",
            description: "Seamlessly integrated with the Project Layout Editor through a prominent button. Users can quickly switch between property management and SVG-based layout editing without losing context."
          },
          {
            title: "Statistics Dashboard",
            description: "Created an at-a-glance statistics panel with four key metrics cards featuring gradient icon boxes, hover scale effects, and real-time data updates from the backend API."
          }
        ]}
      />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, icon: Icon }) => {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      icon: 'text-blue-500'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-50',
      text: 'text-green-600',
      icon: 'text-green-500'
    },
    gray: {
      gradient: 'from-gray-500 to-gray-600',
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      icon: 'text-gray-500'
    },
    orange: {
      gradient: 'from-indigo-500 to-orange-600',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      icon: 'text-orange-500'
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:scale-105">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          </div>
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}>
            {Icon ? (
              <Icon className="w-8 h-8 text-white" />
            ) : (
              <div className="w-8 h-8 bg-white rounded-full opacity-30"></div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectDetail;
