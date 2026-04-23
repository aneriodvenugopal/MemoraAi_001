import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Building2, ChevronRight, ChevronDown, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api as apiInstance } from '../../services';

const TenantCategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [tenantId, setTenantId] = useState('');
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState(null);
  
  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    master_category_id: '',
    sort_order: 0
  });
  
  const [subcategoryForm, setSubcategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    master_subcategory_id: '',
    additional_fields: '',
    sort_order: 0
  });

  useEffect(() => {
    // Get tenant_id from user context
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setTenantId(user.tenant_id || '');
    
    if (user.tenant_id) {
      loadData(user.tenant_id);
    }
  }, []);

  const loadData = async (tid) => {
    setLoading(true);
    try {
      // Load master categories for reference
      const masterRes = await apiInstance.get('/property-categories/categories/master');
      setMasterCategories(masterRes.data.categories || []);
      
      // Load tenant categories
      const response = await apiInstance.get(`/property-categories/categories/tenant?tenant_id=${tid}`);
      const tenantCats = response.data.categories || [];
      
      // Load subcategories for each category
      const catsWithSubs = await Promise.all(
        tenantCats.map(async (cat) => {
          try {
            const subRes = await apiInstance.get(`/property-categories/subcategories/tenant?category_id=${cat.id}`);
            return { ...cat, subcategories: subRes.data.subcategories || [] };
          } catch (error) {
            return { ...cat, subcategories: [] };
          }
        })
      );
      
      setCategories(catsWithSubs);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      icon: '',
      master_category_id: '',
      sort_order: categories.length + 1
    });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      master_category_id: category.master_category_id || '',
      sort_order: category.sort_order
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryForm.name || !categoryForm.slug) {
        toast.error('Name and slug are required');
        return;
      }

      const data = {
        ...categoryForm,
        tenant_id: tenantId
      };

      if (editingCategory) {
        await apiInstance.put(`/property-categories/categories/tenant/${editingCategory.id}`, data);
        toast.success('Category updated successfully');
      } else {
        await apiInstance.post('/property-categories/categories/tenant', data);
        toast.success('Category created successfully');
      }
      
      setShowCategoryModal(false);
      loadData(tenantId);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await apiInstance.delete(`/property-categories/categories/tenant/${categoryId}`);
      toast.success('Category deleted successfully');
      loadData(tenantId);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const handleCreateSubcategory = (category) => {
    setEditingSubcategory(null);
    setSelectedCategoryForSub(category);
    setSubcategoryForm({
      name: '',
      slug: '',
      description: '',
      icon: '',
      master_subcategory_id: '',
      additional_fields: '',
      sort_order: (category.subcategories?.length || 0) + 1
    });
    setShowSubcategoryModal(true);
  };

  const handleEditSubcategory = (subcategory, category) => {
    setEditingSubcategory(subcategory);
    setSelectedCategoryForSub(category);
    setSubcategoryForm({
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description || '',
      icon: subcategory.icon || '',
      master_subcategory_id: subcategory.master_subcategory_id || '',
      additional_fields: subcategory.additional_fields?.join(', ') || '',
      sort_order: subcategory.sort_order
    });
    setShowSubcategoryModal(true);
  };

  const handleSaveSubcategory = async () => {
    try {
      if (!subcategoryForm.name || !subcategoryForm.slug) {
        toast.error('Name and slug are required');
        return;
      }

      const subcategoryData = {
        ...subcategoryForm,
        tenant_id: tenantId,
        additional_fields: subcategoryForm.additional_fields
          ? subcategoryForm.additional_fields.split(',').map(f => f.trim())
          : []
      };

      if (editingSubcategory) {
        await apiInstance.put(`/property-categories/subcategories/tenant/${editingSubcategory.id}`, subcategoryData);
        toast.success('Subcategory updated successfully');
      } else {
        await apiInstance.post(`/property-categories/subcategories/tenant?tenant_category_id=${selectedCategoryForSub.id}`, subcategoryData);
        toast.success('Subcategory created successfully');
      }
      
      setShowSubcategoryModal(false);
      loadData(tenantId);
    } catch (error) {
      console.error('Error saving subcategory:', error);
      toast.error(error.response?.data?.detail || 'Failed to save subcategory');
    }
  };

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    
    try {
      await apiInstance.delete(`/property-categories/subcategories/tenant/${subcategoryId}`);
      toast.success('Subcategory deleted successfully');
      loadData(tenantId);
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete subcategory');
    }
  };

  const getMasterCategoryName = (masterId) => {
    const master = masterCategories.find(m => m.id === masterId);
    return master ? master.name : 'Custom';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-primary"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-primary/5 to-ocean-secondary/5">
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
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-ocean-primary">Property Category Management</h1>
                <p className="text-sm text-gray-600">Manage your property types and categories</p>
              </div>
            </div>
            <Button
              onClick={handleCreateCategory}
              className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="glass-card">
              <CardContent className="p-6">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="text-ocean-primary hover:bg-ocean-primary/10 p-2 rounded"
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <span className="text-3xl">{category.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-ocean-primary">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">slug: {category.slug}</Badge>
                        <Badge className="bg-ocean-primary/10 text-ocean-primary">
                          {category.subcategories?.length || 0} subcategories
                        </Badge>
                        {category.master_category_id && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Based on: {getMasterCategoryName(category.master_category_id)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCreateSubcategory(category)}
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Subcategory
                    </Button>
                    <Button
                      onClick={() => handleEditCategory(category)}
                      size="sm"
                      variant="outline"
                      className="text-ocean-primary"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCategory(category.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Subcategories */}
                {expandedCategories.has(category.id) && (
                  <div className="ml-12 mt-4 space-y-2">
                    {category.subcategories && category.subcategories.length > 0 ? (
                      category.subcategories.map((subcat) => (
                        <div
                          key={subcat.id}
                          className="flex items-center justify-between p-4 bg-ocean-primary/5 rounded-lg border border-ocean-primary/20"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-2xl">{subcat.icon}</span>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800">{subcat.name}</h4>
                              <p className="text-sm text-gray-600">{subcat.description}</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">slug: {subcat.slug}</Badge>
                                {subcat.additional_fields && subcat.additional_fields.length > 0 && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    Fields: {subcat.additional_fields.join(', ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditSubcategory(subcat, category)}
                              size="sm"
                              variant="outline"
                              className="text-ocean-primary"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteSubcategory(subcat.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-500 border-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No subcategories yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {categories.length === 0 && (
            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No categories found. Create your first property category!</p>
                <Button
                  onClick={handleCreateCategory}
                  className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Category
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="glass-modal max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-ocean-primary text-xl">
              {editingCategory ? 'Edit' : 'Create'} Property Category
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Link to Master Category (Optional)</label>
              <select
                value={categoryForm.master_category_id}
                onChange={(e) => setCategoryForm({ ...categoryForm, master_category_id: e.target.value })}
                className="w-full glass-input"
              >
                <option value="">-- Custom Category --</option>
                {masterCategories.map((master) => (
                  <option key={master.id} value={master.id}>
                    {master.icon} {master.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Link to a system master category or create a custom one</p>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Category Name *</label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Premium Apartments"
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Slug *</label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., premium_apartments"
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Icon (Emoji)</label>
              <Input
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                placeholder="e.g., 🏠"
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Description</label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description of the category"
                rows={3}
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Sort Order</label>
              <Input
                type="number"
                value={categoryForm.sort_order}
                onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                className="glass-input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowCategoryModal(false)}
                variant="outline"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveCategory}
                className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subcategory Modal */}
      <Dialog open={showSubcategoryModal} onOpenChange={setShowSubcategoryModal}>
        <DialogContent className="glass-modal max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-ocean-primary text-xl">
              {editingSubcategory ? 'Edit' : 'Create'} Subcategory
              {selectedCategoryForSub && (
                <span className="text-sm font-normal text-gray-600"> in {selectedCategoryForSub.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Subcategory Name *</label>
              <Input
                value={subcategoryForm.name}
                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                placeholder="e.g., 3BHK Apartments"
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Slug *</label>
              <Input
                value={subcategoryForm.slug}
                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., 3bhk_apartments"
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Icon (Emoji)</label>
              <Input
                value={subcategoryForm.icon}
                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, icon: e.target.value })}
                placeholder="e.g., 🏢"
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Description</label>
              <Textarea
                value={subcategoryForm.description}
                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                placeholder="Brief description of the subcategory"
                rows={3}
                className="glass-input"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Additional Fields</label>
              <Input
                value={subcategoryForm.additional_fields}
                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, additional_fields: e.target.value })}
                placeholder="e.g., floor_number, facing, balcony_count (comma separated)"
                className="glass-input"
              />
              <p className="text-xs text-gray-500 mt-1">Enter field names separated by commas</p>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Sort Order</label>
              <Input
                type="number"
                value={subcategoryForm.sort_order}
                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, sort_order: parseInt(e.target.value) || 0 })}
                className="glass-input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowSubcategoryModal(false)}
                variant="outline"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveSubcategory}
                className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Subcategory
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantCategoryManagement;
