import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Edit2, Trash2, Copy, Lock, Unlock,
  DollarSign, FileText, CheckCircle, AlertCircle
} from 'lucide-react';
import apiInstance from '../../services/api';
import { toast } from 'sonner';

const PaymentSchemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tenantId, setTenantId] = useState('');
  
  const [formData, setFormData] = useState({
    scheme_name: '',
    scheme_type: '12_months',
    duration_months: 12,
    fields: [],
    description: '',
    terms_conditions: ''
  });

  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      const userResponse = await apiInstance.get('/user/me');
      const user = userResponse.data;
      const currentTenantId = user.tenant_id || localStorage.getItem('tenant_id');
      setTenantId(currentTenantId);
      setFormData(prev => ({ ...prev, tenant_id: currentTenantId }));
      fetchSchemes(currentTenantId);
    } catch (error) {
      console.error('Error initializing:', error);
      toast.error('Failed to initialize');
    }
  };

  const fetchSchemes = async (tid) => {
    setLoading(true);
    try {
      const response = await apiInstance.get('/schemes', {
        params: { tenant_id: tid }
      });
      setSchemes(response.data.schemes || []);
    } catch (error) {
      console.error('Error fetching schemes:', error);
      toast.error('Failed to load payment schemes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScheme = () => {
    setEditMode(false);
    setFormData({
      tenant_id: tenantId,
      scheme_name: '',
      scheme_type: '12_months',
      duration_months: 12,
      fields: [
        { field_name: 'Initial Payment', field_value: 0, due_month: 0, is_percentage: false, description: '' }
      ],
      description: '',
      terms_conditions: ''
    });
    setShowModal(true);
  };

  const handleEditScheme = (scheme) => {
    if (scheme.is_finalized) {
      toast.error('Cannot edit finalized scheme');
      return;
    }
    setEditMode(true);
    setFormData({
      ...scheme,
      fields: scheme.fields || []
    });
    setShowModal(true);
  };

  const addField = () => {
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, {
        field_name: '',
        field_value: 0,
        due_month: prev.fields.length,
        is_percentage: false,
        description: ''
      }]
    }));
  };

  const removeField = (index) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const updateField = (index, key, value) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, [key]: value } : field
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.fields.length === 0) {
      toast.error('Please add at least one payment field');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        fields: formData.fields.map(f => ({
          ...f,
          field_value: parseFloat(f.field_value),
          due_month: parseInt(f.due_month)
        }))
      };

      if (editMode) {
        await apiInstance.put(`/schemes/${formData.id}`, payload);
        toast.success('Payment scheme updated successfully');
      } else {
        await apiInstance.post('/schemes', payload);
        toast.success('Payment scheme created successfully');
      }

      setShowModal(false);
      fetchSchemes(tenantId);
    } catch (error) {
      console.error('Error saving scheme:', error);
      toast.error(error.response?.data?.detail || 'Failed to save payment scheme');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (schemeId) => {
    if (!window.confirm('Are you sure? Finalized schemes cannot be edited or deleted.')) {
      return;
    }

    try {
      await apiInstance.post(`/schemes/${schemeId}/finalize`);
      toast.success('Payment scheme finalized successfully');
      fetchSchemes(tenantId);
    } catch (error) {
      console.error('Error finalizing scheme:', error);
      toast.error(error.response?.data?.detail || 'Failed to finalize scheme');
    }
  };

  const handleClone = async (schemeId) => {
    try {
      await apiInstance.post(`/schemes/${schemeId}/clone`, {
        tenant_id: tenantId
      });
      toast.success('Payment scheme cloned successfully');
      fetchSchemes(tenantId);
    } catch (error) {
      console.error('Error cloning scheme:', error);
      toast.error(error.response?.data?.detail || 'Failed to clone scheme');
    }
  };

  const handleDelete = async (schemeId) => {
    if (!window.confirm('Are you sure you want to delete this payment scheme?')) {
      return;
    }

    try {
      await apiInstance.delete(`/schemes/${schemeId}`);
      toast.success('Payment scheme deleted successfully');
      fetchSchemes(tenantId);
    } catch (error) {
      console.error('Error deleting scheme:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete scheme');
    }
  };

  const calculateTotal = (fields) => {
    return fields.reduce((sum, field) => sum + (parseFloat(field.field_value) || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="text-blue-600" size={36} />
                Payment Schemes
              </h1>
              <p className="text-gray-600 mt-2">Manage installment payment schemes for properties</p>
            </div>
            <button
              onClick={handleCreateScheme}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus size={20} />
              Create Scheme
            </button>
          </div>
        </div>

        {/* Schemes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : schemes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No payment schemes found. Create your first scheme!</p>
            </div>
          ) : (
            schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{scheme.scheme_name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{scheme.duration_months} Months</p>
                    </div>
                    {scheme.is_finalized ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        <Lock size={12} />
                        Finalized
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        <Unlock size={12} />
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Total Amount */}
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{(scheme.total_amount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Payment Fields */}
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Payment Structure:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {scheme.fields && scheme.fields.slice(0, 3).map((field, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{field.field_name}</span>
                          <span className="font-semibold text-gray-900">
                            ₹{field.field_value.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      {scheme.fields && scheme.fields.length > 3 && (
                        <p className="text-xs text-gray-500">+{scheme.fields.length - 3} more...</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    {!scheme.is_finalized && (
                      <>
                        <button
                          onClick={() => handleEditScheme(scheme)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleFinalize(scheme.id)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={14} />
                          Finalize
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleClone(scheme.id)}
                      className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
                      title="Clone"
                    >
                      <Copy size={14} />
                    </button>
                    {!scheme.is_finalized && (
                      <button
                        onClick={() => handleDelete(scheme.id)}
                        className="px-3 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-2xl font-bold text-white">
                {editMode ? 'Edit Payment Scheme' : 'Create Payment Scheme'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheme Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.scheme_name}
                    onChange={(e) => setFormData({...formData, scheme_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 12 Month Standard"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (Months) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({...formData, duration_months: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Structure *
                  </label>
                  <button
                    type="button"
                    onClick={addField}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Field
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {formData.fields.map((field, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          value={field.field_name}
                          onChange={(e) => updateField(index, 'field_name', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Field name"
                        />
                        <input
                          type="number"
                          required
                          step="0.01"
                          value={field.field_value}
                          onChange={(e) => updateField(index, 'field_value', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Amount"
                        />
                        <input
                          type="number"
                          required
                          min="0"
                          value={field.due_month}
                          onChange={(e) => updateField(index, 'due_month', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Month"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{calculateTotal(formData.fields).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this payment scheme..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editMode ? 'Update Scheme' : 'Create Scheme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSchemes;
