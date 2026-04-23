import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star, Stethoscope, Building, PartyPopper, Sprout, Scissors, GraduationCap,
  Plus, Trash2, Edit2, Check, X, ArrowLeft, Sparkles, ChevronRight
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ICONS = {
  real_estate: Building,
  astrology: Star,
  doctor_clinic: Stethoscope,
  function_hall: PartyPopper,
  pesticides_fertilizer: Sprout,
  beauty_salon: Scissors,
  coaching_center: GraduationCap,
};

const CATEGORY_COLORS = {
  real_estate: "bg-blue-500",
  astrology: "bg-purple-500",
  doctor_clinic: "bg-emerald-500",
  function_hall: "bg-amber-500",
  pesticides_fertilizer: "bg-lime-600",
  beauty_salon: "bg-pink-500",
  coaching_center: "bg-indigo-500",
};

export default function CategorySetup() {
  const navigate = useNavigate();
  const [availableCategories, setAvailableCategories] = useState([]);
  const [myCategories, setMyCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState("categories");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({ name: "", description: "", price: 0, duration_mins: 30 });
  const [showAddService, setShowAddService] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [avail, my, svc] = await Promise.all([
        axios.get(`${API}/memoraai/categories/available`),
        axios.get(`${API}/memoraai/categories/my`, { headers }),
        axios.get(`${API}/memoraai/services?active_only=false`, { headers }),
      ]);
      setAvailableCategories(avail.data.categories || []);
      setMyCategories(my.data.categories || []);
      setServices(svc.data.services || []);
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectCategory = async (slug) => {
    setLoading(true);
    try {
      await axios.post(`${API}/memoraai/categories/select`, { category_slug: slug }, { headers });
      await fetchData();
    } catch (e) {
      console.error("Failed to select category", e);
    }
    setLoading(false);
  };

  const removeCategory = async (slug) => {
    if (!window.confirm(`Remove ${slug} category? Services will be deactivated.`)) return;
    try {
      await axios.delete(`${API}/memoraai/categories/${slug}`, { headers });
      await fetchData();
    } catch (e) {
      console.error("Failed to remove category", e);
    }
  };

  const setPrimary = async (slug) => {
    try {
      await axios.post(`${API}/memoraai/categories/set-primary`, { category_slug: slug }, { headers });
      await fetchData();
    } catch (e) {
      console.error("Failed to set primary", e);
    }
  };

  const toggleService = async (serviceId) => {
    try {
      await axios.post(`${API}/memoraai/services/${serviceId}/toggle`, {}, { headers });
      await fetchData();
    } catch (e) {
      console.error("Failed to toggle service", e);
    }
  };

  const updateService = async (serviceId, data) => {
    try {
      await axios.put(`${API}/memoraai/services/${serviceId}`, data, { headers });
      setEditingService(null);
      await fetchData();
    } catch (e) {
      console.error("Failed to update service", e);
    }
  };

  const addService = async () => {
    if (!newService.name || !selectedCategory) return;
    try {
      await axios.post(`${API}/memoraai/services`, {
        ...newService,
        category_slug: selectedCategory,
        price: Number(newService.price) || 0,
        duration_mins: Number(newService.duration_mins) || 30,
      }, { headers });
      setNewService({ name: "", description: "", price: 0, duration_mins: 30 });
      setShowAddService(false);
      await fetchData();
    } catch (e) {
      console.error("Failed to add service", e);
    }
  };

  const deleteService = async (serviceId) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await axios.delete(`${API}/memoraai/services/${serviceId}`, { headers });
      await fetchData();
    } catch (e) {
      console.error("Failed to delete service", e);
    }
  };

  const myCategorySlugs = myCategories.map(c => c.category_slug);
  const filteredServices = selectedCategory
    ? services.filter(s => s.category_slug === selectedCategory)
    : services;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="category-setup-page">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Category Setup</h1>
            <p className="text-sm text-gray-500">Configure your business categories and services for MemoraAI</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4" data-testid="category-tabs">
            <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            {/* My Selected Categories */}
            {myCategories.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-3 text-gray-800">Your Active Categories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myCategories.map(cat => {
                    const Icon = CATEGORY_ICONS[cat.category_slug] || Building;
                    const color = CATEGORY_COLORS[cat.category_slug] || "bg-gray-500";
                    return (
                      <Card key={cat.id} className={`border-2 ${cat.is_primary ? 'border-blue-500' : 'border-gray-200'}`} data-testid={`my-category-${cat.category_slug}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{cat.category_name}</h3>
                                {cat.is_primary && <Badge className="bg-blue-100 text-blue-700 text-xs">Primary</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {!cat.is_primary && (
                                <Button size="sm" variant="outline" onClick={() => setPrimary(cat.category_slug)} data-testid={`set-primary-${cat.category_slug}`}>
                                  Set Primary
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeCategory(cat.category_slug)} data-testid={`remove-category-${cat.category_slug}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Categories to Add */}
            <h2 className="text-lg font-semibold mb-3 text-gray-800">
              {myCategories.length > 0 ? "Add More Categories" : "Select Your Business Category"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCategories.filter(c => !myCategorySlugs.includes(c.slug)).map(cat => {
                const Icon = CATEGORY_ICONS[cat.slug] || Building;
                const color = CATEGORY_COLORS[cat.slug] || "bg-gray-500";
                return (
                  <Card key={cat.slug} className="hover:shadow-md transition-shadow cursor-pointer group" data-testid={`available-category-${cat.slug}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{cat.default_services_count} pre-defined services</p>
                        </div>
                      </div>
                      <Button
                        className="w-full mt-3 gap-2"
                        onClick={() => selectCategory(cat.slug)}
                        disabled={loading}
                        data-testid={`select-category-${cat.slug}`}
                      >
                        <Sparkles className="w-4 h-4" />
                        Select & Auto-Setup Services
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="services">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                size="sm"
                variant={!selectedCategory ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                data-testid="filter-all-services"
              >
                All ({services.length})
              </Button>
              {myCategories.map(cat => (
                <Button
                  key={cat.category_slug}
                  size="sm"
                  variant={selectedCategory === cat.category_slug ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.category_slug)}
                  data-testid={`filter-${cat.category_slug}`}
                >
                  {cat.category_name} ({services.filter(s => s.category_slug === cat.category_slug).length})
                </Button>
              ))}
            </div>

            {/* Add Service Button */}
            {selectedCategory && (
              <div className="mb-4">
                {!showAddService ? (
                  <Button onClick={() => setShowAddService(true)} className="gap-2" data-testid="add-service-btn">
                    <Plus className="w-4 h-4" /> Add New Service
                  </Button>
                ) : (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-3">Add New Service to {myCategories.find(c => c.category_slug === selectedCategory)?.category_name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input placeholder="Service Name" value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} data-testid="new-service-name" />
                        <Input placeholder="Description" value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} data-testid="new-service-desc" />
                        <Input type="number" placeholder="Price (INR)" value={newService.price} onChange={e => setNewService({ ...newService, price: e.target.value })} data-testid="new-service-price" />
                        <Input type="number" placeholder="Duration (mins)" value={newService.duration_mins} onChange={e => setNewService({ ...newService, duration_mins: e.target.value })} data-testid="new-service-duration" />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button onClick={addService} className="gap-1" data-testid="save-new-service"><Check className="w-4 h-4" /> Save</Button>
                        <Button variant="ghost" onClick={() => setShowAddService(false)}><X className="w-4 h-4" /> Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Services List */}
            <div className="space-y-2">
              {filteredServices.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    {myCategories.length === 0
                      ? "Select a business category first to get AI-suggested services"
                      : "No services found. Select a category filter and add services."}
                  </CardContent>
                </Card>
              ) : (
                filteredServices.map(svc => (
                  <Card key={svc.id} className={`${!svc.is_active ? 'opacity-60' : ''}`} data-testid={`service-${svc.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={svc.is_active}
                          onCheckedChange={() => toggleService(svc.id)}
                          data-testid={`toggle-service-${svc.id}`}
                        />
                        <div className="flex-1">
                          {editingService === svc.id ? (
                            <EditServiceRow svc={svc} onSave={(data) => updateService(svc.id, data)} onCancel={() => setEditingService(null)} />
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{svc.name}</span>
                                <Badge variant="outline" className="text-xs">{svc.category_slug.replace("_", " ")}</Badge>
                              </div>
                              <p className="text-xs text-gray-500">{svc.description || "No description"}</p>
                              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                <span>Rs. {svc.price}</span>
                                <span>{svc.duration_mins} mins</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {editingService !== svc.id && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingService(svc.id)} data-testid={`edit-service-${svc.id}`}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteService(svc.id)} data-testid={`delete-service-${svc.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EditServiceRow({ svc, onSave, onCancel }) {
  const [name, setName] = useState(svc.name);
  const [description, setDescription] = useState(svc.description || "");
  const [price, setPrice] = useState(svc.price);
  const [duration, setDuration] = useState(svc.duration_mins);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" data-testid="edit-service-name" />
      <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" data-testid="edit-service-desc" />
      <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" data-testid="edit-service-price" />
      <div className="flex gap-1">
        <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Mins" data-testid="edit-service-duration" />
        <Button size="sm" onClick={() => onSave({ name, description, price: Number(price), duration_mins: Number(duration) })} data-testid="save-edit-service"><Check className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
