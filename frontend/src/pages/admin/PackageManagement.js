import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../../services/api';
const api = apiInstance;
import { Package, Edit2, Trash2, Plus, X, Check, DollarSign, Users, Building, Zap } from 'lucide-react';

function PackageManagement() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState(getEmptyForm());

  useEffect(() => {
    fetchPackages();
  }, []);

  function getEmptyForm() {
    return {
      name: '',
      description: '',
      monthly_price: '',
      yearly_price: '',
      features: {
        max_projects: '',
        max_users: '',
        max_properties: '',
        advanced_analytics: false,
        ai_advisory: true,
        multi_language: true,
        custom_branding: false,
        api_access: false,
        priority_support: false,
        payment_gateway: true,
        referral_system: true,
        resale_marketplace: false,
        mobile_app: true,
        sms_credits: '',
        email_credits: '',
        whatsapp_credits: ''
      },
      is_active: true,
      display_order: 0
    };
  }

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/saas-admin/packages');
      if (response.data.success) {
        setPackages(response.data.packages);
      }
    } catch (err) {
      console.error('Failed to fetch packages:', err);
      if (err.response?.status === 403) {
        alert('Access denied.');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (pkg = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData(pkg);
    } else {
      setEditingPackage(null);
      setFormData(getEmptyForm());
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPackage(null);
    setFormData(getEmptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        monthly_price: parseFloat(formData.monthly_price),
        yearly_price: parseFloat(formData.yearly_price),
        features: {
          ...formData.features,
          max_projects: parseInt(formData.features.max_projects),
          max_users: parseInt(formData.features.max_users),
          max_properties: parseInt(formData.features.max_properties),
          sms_credits: parseInt(formData.features.sms_credits),
          email_credits: parseInt(formData.features.email_credits),
          whatsapp_credits: parseInt(formData.features.whatsapp_credits)
        }
      };

      if (editingPackage) {
        await api.put(`/api/saas-admin/packages/${editingPackage.id}`, payload);
        alert('Package updated successfully!');
      } else {
        await api.post('/saas-admin/packages', payload);
        alert('Package created successfully!');
      }
      
      handleCloseModal();
      fetchPackages();
    } catch (err) {
      console.error('Failed to save package:', err);
      alert(err.response?.data?.detail || 'Failed to save package');
    }
  };

  const handleDelete = async (packageId) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    
    try {
      await api.delete(`/api/saas-admin/packages/${packageId}`);
      alert('Package deleted successfully!');
      fetchPackages();
    } catch (err) {
      console.error('Failed to delete package:', err);
      alert(err.response?.data?.detail || 'Failed to delete package');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Package Management</h1>
              <p className="text-gray-600 mt-1">Manage subscription packages and pricing</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus size={18} />
                Create Package
              </button>
              <button
                onClick={() => navigate('/admin/saas-dashboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition">
              <div className={`p-6 ${
                pkg.name === 'Professional' ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                pkg.name === 'Enterprise' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                'bg-gradient-to-r from-blue-400 to-blue-500'
              }`}>
                <h3 className="text-2xl font-bold text-white">{pkg.name}</h3>
                <p className="text-white text-opacity-90 mt-1">{pkg.description}</p>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-white">
                    ₹{pkg.monthly_price.toLocaleString()}
                    <span className="text-sm font-normal">/month</span>
                  </p>
                  <p className="text-white text-opacity-90 text-sm mt-1">
                    ₹{pkg.yearly_price.toLocaleString()}/year (15% off)
                  </p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Building size={16} className="text-blue-600" />
                    <span>{pkg.features.max_projects === 999999 ? 'Unlimited' : pkg.features.max_projects} Projects</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Users size={16} className="text-green-600" />
                    <span>{pkg.features.max_users === 999999 ? 'Unlimited' : pkg.features.max_users} Users</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Zap size={16} className="text-blue-600" />
                    <span>{pkg.features.sms_credits} SMS, {pkg.features.email_credits} Email, {pkg.features.whatsapp_credits} WhatsApp</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Features:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {pkg.features.advanced_analytics && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check size={14} /> Advanced Analytics
                      </div>
                    )}
                    {pkg.features.custom_branding && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check size={14} /> Custom Branding
                      </div>
                    )}
                    {pkg.features.api_access && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check size={14} /> API Access
                      </div>
                    )}
                    {pkg.features.priority_support && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check size={14} /> Priority Support
                      </div>
                    )}
                    {pkg.features.resale_marketplace && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check size={14} /> Resale Market
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => handleOpenModal(pkg)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPackage ? 'Edit Package' : 'Create New Package'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    required
                    value={formData.display_order}
                    onChange={(e) => setFormData({...formData, display_order: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.monthly_price}
                    onChange={(e) => setFormData({...formData, monthly_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.yearly_price}
                    onChange={(e) => setFormData({...formData, yearly_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Limits</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Projects</label>
                    <input
                      type="number"
                      required
                      value={formData.features.max_projects}
                      onChange={(e) => setFormData({...formData, features: {...formData.features, max_projects: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                    <input
                      type="number"
                      required
                      value={formData.features.max_users}
                      onChange={(e) => setFormData({...formData, features: {...formData.features, max_users: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Properties</label>
                    <input
                      type="number"
                      required
                      value={formData.features.max_properties}
                      onChange={(e) => setFormData({...formData, features: {...formData.features, max_properties: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Monthly Credits</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMS Credits</label>
                    <input
                      type="number"
                      required
                      value={formData.features.sms_credits}
                      onChange={(e) => setFormData({...formData, features: {...formData.features, sms_credits: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Credits</label>
                    <input
                      type="number"
                      required
                      value={formData.features.email_credits}
                      onChange={(e) => setFormData({...formData, features: {...formData.features, email_credits: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Credits</label>
                    <input
                      type="number"
                      required
                      value={formData.features.whatsapp_credits}
                      onChange={(e) => setFormData({...formData, features: {...formData.features, whatsapp_credits: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'advanced_analytics', label: 'Advanced Analytics' },
                    { key: 'ai_advisory', label: 'AI Advisory' },
                    { key: 'multi_language', label: 'Multi-Language' },
                    { key: 'custom_branding', label: 'Custom Branding' },
                    { key: 'api_access', label: 'API Access' },
                    { key: 'priority_support', label: 'Priority Support' },
                    { key: 'payment_gateway', label: 'Payment Gateway' },
                    { key: 'referral_system', label: 'Referral System' },
                    { key: 'resale_marketplace', label: 'Resale Marketplace' },
                    { key: 'mobile_app', label: 'Mobile App' }
                  ].map(feature => (
                    <label key={feature.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.features[feature.key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          features: {...formData.features, [feature.key]: e.target.checked}
                        })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackageManagement;