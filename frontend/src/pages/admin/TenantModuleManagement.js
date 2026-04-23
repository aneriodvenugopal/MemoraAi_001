import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiInstance from '../../services/api';
const api = apiInstance;
import { ArrowLeft, Check, X, Package, Settings, Users, DollarSign, MessageSquare, FileText, Calendar, BarChart3, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  core: <Settings className="w-4 h-4" />,
  sales: <Users className="w-4 h-4" />,
  finance: <DollarSign className="w-4 h-4" />,
  communication: <MessageSquare className="w-4 h-4" />,
  tools: <FileText className="w-4 h-4" />,
  marketing: <BarChart3 className="w-4 h-4" />,
  support: <MessageSquare className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  categories: <Package className="w-4 h-4" />
};

const CATEGORY_COLORS = {
  core: 'bg-blue-100 text-blue-700 border-blue-200',
  sales: 'bg-green-100 text-green-700 border-green-200',
  finance: 'bg-sky-100 text-sky-700 border-sky-200',
  communication: 'bg-purple-100 text-purple-700 border-purple-200',
  tools: 'bg-gray-100 text-gray-700 border-gray-200',
  marketing: 'bg-pink-100 text-pink-700 border-pink-200',
  support: 'bg-red-100 text-red-700 border-red-200',
  settings: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  categories: 'bg-teal-100 text-teal-700 border-teal-200'
};

function TenantModuleManagement() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [allModules, setAllModules] = useState([]);
  const [enabledModules, setEnabledModules] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchModules();
  }, [tenantId]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/saas-admin/tenants/${tenantId}/modules`);
      if (response.data.success) {
        setTenantName(response.data.tenant_name);
        setAllModules(response.data.all_modules);
        setEnabledModules(response.data.enabled_modules);
      }
    } catch (err) {
      console.error('Failed to fetch modules:', err);
      toast.error('Failed to load modules');
      if (err.response?.status === 403) {
        navigate('/admin/tenants');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    setEnabledModules(prev => {
      const newModules = prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId];
      setHasChanges(true);
      return newModules;
    });
  };

  const toggleCategory = (category) => {
    const categoryModules = allModules.filter(m => m.category === category).map(m => m.id);
    const allEnabled = categoryModules.every(id => enabledModules.includes(id));
    
    setEnabledModules(prev => {
      if (allEnabled) {
        // Disable all in category
        return prev.filter(id => !categoryModules.includes(id));
      } else {
        // Enable all in category
        return [...new Set([...prev, ...categoryModules])];
      }
    });
    setHasChanges(true);
  };

  const selectAll = () => {
    setEnabledModules(allModules.map(m => m.id));
    setHasChanges(true);
  };

  const deselectAll = () => {
    // Keep core modules always enabled
    setEnabledModules(['dashboard', 'settings']);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      const response = await api.put(`/saas-admin/tenants/${tenantId}/modules`, {
        enabled_modules: enabledModules
      });
      if (response.data.success) {
        toast.success('Modules updated successfully!');
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Failed to save modules:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Group modules by category
  const groupedModules = allModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/tenants')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Module Permissions</h1>
                <p className="text-sm text-gray-500">{tenantName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {enabledModules.length} of {allModules.length} modules enabled
              </span>
              <button
                onClick={saveChanges}
                disabled={!hasChanges || saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  hasChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-3">
          <button
            onClick={selectAll}
            className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
          >
            Enable All
          </button>
          <button
            onClick={deselectAll}
            className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Disable All (Keep Core)
          </button>
        </div>
      </div>

      {/* Module Categories */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {Object.entries(groupedModules).map(([category, modules]) => {
          const allEnabled = modules.every(m => enabledModules.includes(m.id));
          const someEnabled = modules.some(m => enabledModules.includes(m.id));
          
          return (
            <div key={category} className="mb-6">
              {/* Category Header */}
              <div 
                className={`flex items-center justify-between p-4 rounded-t-xl border ${CATEGORY_COLORS[category]}`}
              >
                <div className="flex items-center gap-3">
                  {CATEGORY_ICONS[category]}
                  <span className="font-semibold capitalize">{category}</span>
                  <span className="text-xs opacity-70">
                    ({modules.filter(m => enabledModules.includes(m.id)).length}/{modules.length})
                  </span>
                </div>
                <button
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    allEnabled 
                      ? 'bg-white/50 hover:bg-white/70' 
                      : 'bg-white hover:bg-white/80'
                  }`}
                >
                  {allEnabled ? 'Disable All' : 'Enable All'}
                </button>
              </div>
              
              {/* Module List */}
              <div className="bg-white border border-t-0 rounded-b-xl divide-y">
                {modules.map(module => {
                  const isEnabled = enabledModules.includes(module.id);
                  const isEssential = module.essential === true;
                  
                  return (
                    <div
                      key={module.id}
                      className={`flex items-center justify-between p-4 transition-colors ${
                        isEnabled ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleModule(module.id)}
                          className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                            isEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              isEnabled ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <div>
                          <p className={`font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                            {module.name}
                            {isEssential && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                Essential
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-400">{module.description}</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isEnabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Save Button (Mobile) */}
      {hasChanges && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

export default TenantModuleManagement;
