import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const ResaleRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [myRequests, setMyRequests] = useState([]);
  const [availableResales, setAvailableResales] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // available, my-requests, create
  
  // Form state
  const [formData, setFormData] = useState({
    project_id: '',
    property_id: '',
    plot_number: '',
    reason: '',
    expected_price: '',
    urgent: false,
    contact_phone: user?.phone || '',
    contact_email: user?.email || ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMyRequests(),
        loadAvailableResales(),
        loadProjects()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/resale/my-requests`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMyRequests(data.requests);
      }
    } catch (error) {
      console.error('Error loading my requests:', error);
    }
  };

  const loadAvailableResales = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/resale/available`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAvailableResales(data.resales);
      }
    } catch (error) {
      console.error('Error loading available resales:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/resale/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          expected_price: formData.expected_price ? parseFloat(formData.expected_price) : null
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Resale request submitted successfully!');
        setActiveTab('my-requests');
        loadMyRequests();
        // Reset form
        setFormData({
          project_id: '',
          property_id: '',
          plot_number: '',
          reason: '',
          expected_price: '',
          urgent: false,
          contact_phone: user?.phone || '',
          contact_email: user?.email || ''
        });
      } else {
        toast.error('Failed to submit resale request');
      }
    } catch (error) {
      console.error('Error submitting resale request:', error);
      toast.error('Error submitting resale request');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              🏠 Property Resale
            </h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('available')}
              className={`${
                activeTab === 'available'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Available Resales ({availableResales.length})
            </button>
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`${
                activeTab === 'my-requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              My Requests ({myRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Request Resale
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Available Resales Tab */}
        {activeTab === 'available' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Properties for Resale</h2>
            
            {availableResales.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableResales.map((resale) => (
                  <div key={resale.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{resale.project_name}</h3>
                    {resale.plot_number && (
                      <p className="text-sm text-gray-600 mb-2">Plot: {resale.plot_number}</p>
                    )}
                    {resale.expected_price && (
                      <p className="text-2xl font-bold text-blue-600 mb-4">₹{resale.expected_price.toLocaleString()}</p>
                    )}
                    <p className="text-sm text-gray-600 mb-4">{resale.reason}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>Contact: {resale.contact_phone}</span>
                    </div>
                    <button
                      onClick={() => navigate(`/resale/available/${resale.id}`)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No properties available for resale at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* My Requests Tab */}
        {activeTab === 'my-requests' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Resale Requests</h2>
            
            {myRequests.length > 0 ? (
              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {myRequests.map((request) => (
                    <li key={request.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{request.project_name}</h3>
                          {request.plot_number && (
                            <p className="text-sm text-gray-600">Plot: {request.plot_number}</p>
                          )}
                          <p className="mt-1 text-sm text-gray-600">{request.reason}</p>
                          {request.expected_price && (
                            <p className="mt-1 text-sm font-medium text-blue-600">₹{request.expected_price.toLocaleString()}</p>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{new Date(request.created_at).toLocaleDateString()}</span>
                            {request.urgent && <span className="text-red-600 font-medium">URGENT</span>}
                          </div>
                          {request.review_notes && (
                            <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              <strong>Review Notes:</strong> {request.review_notes}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">You haven't submitted any resale requests yet.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Request
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Request Tab */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Request Property Resale</h2>
            
            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plot Number</label>
                <input
                  type="text"
                  value={formData.plot_number}
                  onChange={(e) => setFormData({...formData, plot_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Plot 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Resale <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please explain why you want to resell"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Price (₹)</label>
                <input
                  type="number"
                  value={formData.expected_price}
                  onChange={(e) => setFormData({...formData, expected_price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 5000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={formData.urgent}
                  onChange={(e) => setFormData({...formData, urgent: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="urgent" className="ml-2 block text-sm text-gray-900">
                  Mark as urgent
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('my-requests')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResaleRequests;
