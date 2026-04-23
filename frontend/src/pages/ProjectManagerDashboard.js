import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../services/api';
import {
  Building2, Home, Users, TrendingUp, DollarSign, AlertCircle,
  Calendar, Package, FileText, CheckCircle, Clock, XCircle, ArrowRight
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function ProjectManagerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [resaleRequests, setResaleRequests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectAnalytics(selectedProject);
      fetchResaleRequests(selectedProject);
    }
  }, [selectedProject]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiInstance.get('/project-dashboard/overview');
      
      if (response.data.success) {
        setOverview(response.data.overview);
        setProjects(response.data.projects);
        
        // Auto-select first project
        if (response.data.projects.length > 0) {
          setSelectedProject(response.data.projects[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard');
      
      if (err.response?.status === 403) {
        alert('Access denied. Project Manager role required.');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectAnalytics = async (projectId) => {
    try {
      const response = await apiInstance.get(`/project-dashboard/analytics?project_id=${projectId}`);
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchResaleRequests = async (projectId) => {
    try {
      const response = await apiInstance.get(`/project-dashboard/resale-requests?project_id=${projectId}`);
      if (response.data.success) {
        setResaleRequests(response.data.resale_requests);
      }
    } catch (err) {
      console.error('Failed to fetch resale requests:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg font-medium">Loading Project Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  // Prepare chart data
  const leadsData = analytics?.leads_by_status ? 
    Object.entries(analytics.leads_by_status).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    })) : [];

  const propertiesData = analytics?.properties_by_status ?
    Object.entries(analytics.properties_by_status).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    })) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Project Manager Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Manage Your Assigned Projects</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium"
            >
              Back to Main Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Building2 size={28} />
              </div>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Total Projects</p>
            <p className="text-4xl font-bold">{overview.total_projects}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Home size={28} />
              </div>
            </div>
            <p className="text-green-100 text-sm font-medium mb-1">Total Properties</p>
            <p className="text-4xl font-bold">{overview.total_properties}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Users size={28} />
              </div>
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1">Total Leads</p>
            <p className="text-4xl font-bold">{overview.total_leads}</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Package size={28} />
              </div>
            </div>
            <p className="text-orange-100 text-sm font-medium mb-1">Total Bookings</p>
            <p className="text-4xl font-bold">{overview.total_bookings}</p>
          </div>
        </div>

        {/* Project Selector */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="text-blue-600" size={28} />
            Your Assigned Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className={`p-6 rounded-xl cursor-pointer transition-all border-2 ${
                  selectedProject === project.id
                    ? 'border-blue-600 bg-blue-50 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <h3 className="font-bold text-lg text-gray-900 mb-3">{project.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Properties:</span>
                    <span className="font-semibold text-gray-900">{project.total_properties}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Available:</span>
                    <span className="font-semibold text-green-600">{project.available_properties}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Leads:</span>
                    <span className="font-semibold text-blue-600">{project.total_leads}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bookings:</span>
                    <span className="font-semibold text-purple-600">{project.total_bookings}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-bold text-green-600">₹{(project.total_revenue / 100000).toFixed(2)}L</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Analytics */}
        {selectedProjectData && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Leads by Status */}
            {leadsData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Users className="text-blue-600" size={24} />
                  Leads Distribution - {selectedProjectData.name}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Properties by Status */}
            {propertiesData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Home className="text-green-600" size={24} />
                  Properties Status - {selectedProjectData.name}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={propertiesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Resale Requests */}
        {resaleRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="text-orange-600" size={24} />
              Recent Resale Requests - {selectedProjectData?.name}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Property</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Customer</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-gray-700">Asking Price</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {resaleRequests.slice(0, 10).map((request, idx) => (
                    <tr key={request.id} className={`border-b hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="py-3 px-4 font-medium text-gray-900">{request.property_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-700">{request.customer_name || 'Unknown'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        ₹{request.asking_price ? (request.asking_price / 100000).toFixed(2) : 0}L
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                          request.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {request.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {new Date(request.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate(`/projects/${selectedProject}/leads`)}
            className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:shadow-xl transition-all group"
          >
            <Users size={32} className="mb-3" />
            <h4 className="font-bold text-lg mb-2">View Leads</h4>
            <p className="text-sm text-blue-100 mb-3">Manage project leads</p>
            <ArrowRight className="ml-auto group-hover:translate-x-2 transition-transform" />
          </button>

          <button
            onClick={() => navigate(`/projects/${selectedProject}/properties`)}
            className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white hover:shadow-xl transition-all group"
          >
            <Home size={32} className="mb-3" />
            <h4 className="font-bold text-lg mb-2">View Properties</h4>
            <p className="text-sm text-green-100 mb-3">Check property status</p>
            <ArrowRight className="ml-auto group-hover:translate-x-2 transition-transform" />
          </button>

          <button
            onClick={() => navigate(`/projects/${selectedProject}/bookings`)}
            className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white hover:shadow-xl transition-all group"
          >
            <Package size={32} className="mb-3" />
            <h4 className="font-bold text-lg mb-2">View Bookings</h4>
            <p className="text-sm text-purple-100 mb-3">Track bookings & payments</p>
            <ArrowRight className="ml-auto group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectManagerDashboard;
