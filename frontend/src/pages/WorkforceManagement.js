import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, Edit, Users, MapPin, TrendingUp, RefreshCw, X, Phone, MessageCircle, Search, Briefcase, Calendar } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const WorkforceManagement = () => {
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scrapeForm, setScrapeForm] = useState({
    skill_type: 'all', // Changed to 'all' by default
    location: '',
    limit: 10
  });
  const [skillTypes, setSkillTypes] = useState([]);
  const [scraping, setScraping] = useState(false);
  const locationInputRef = React.useRef(null);
  const autocompleteRef = React.useRef(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalWorkers, setModalWorkers] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
    fetchSkillTypes();
    initializeGooglePlaces();
  }, []);

  const initializeGooglePlaces = () => {
    // Load Google Maps API for autocomplete
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = setupAutocomplete;
      document.head.appendChild(script);
    } else {
      setupAutocomplete();
    }
  };

  const setupAutocomplete = () => {
    if (locationInputRef.current && window.google) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          types: ['(cities)'],
          componentRestrictions: { country: 'in' }
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.formatted_address || place.name) {
          setScrapeForm({ 
            ...scrapeForm, 
            location: place.formatted_address || place.name 
          });
        }
      });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pendingRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/workforce/admin/pending`, { headers }),
        axios.get(`${BACKEND_URL}/api/workforce/stats`)
      ]);

      setPendingWorkers(pendingRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching workforce data:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Only SaaS Admin can access this page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSkillTypes = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/workforce/skills`);
      setSkillTypes(response.data);
    } catch (error) {
      console.error('Error fetching skill types:', error);
    }
  };

  const handleApprove = async (workerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/workforce/admin/${workerId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Worker approved successfully!');
      fetchData();
    } catch (error) {
      alert('Failed to approve worker');
      console.error(error);
    }
  };

  const handleReject = async (workerId) => {
    if (!window.confirm('Are you sure you want to reject this worker?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/workforce/admin/${workerId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Worker rejected');
      fetchData();
    } catch (error) {
      alert('Failed to reject worker');
      console.error(error);
    }
  };

  const handleDelete = async (workerId) => {
    if (!window.confirm('Are you sure you want to delete this worker permanently?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${BACKEND_URL}/api/workforce/admin/${workerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Worker deleted successfully');
      fetchData();
    } catch (error) {
      alert('Failed to delete worker');
      console.error(error);
    }
  };

  const fetchWorkersBySkill = async (skill) => {
    setModalLoading(true);
    setShowModal(true);
    setModalTitle(`${skill} Workers`);
    setSearchTerm('');
    
    try {
      const response = await axios.get(`${BACKEND_URL}/api/workforce/search?skill_type=${skill}&limit=500`);
      setModalWorkers(response.data);
    } catch (error) {
      console.error('Error fetching workers by skill:', error);
      alert('Failed to load workers');
      setShowModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchWorkersByCity = async (city) => {
    setModalLoading(true);
    setShowModal(true);
    setModalTitle(`Workers in ${city}`);
    setSearchTerm('');
    
    try {
      const response = await axios.get(`${BACKEND_URL}/api/workforce/search?city=${encodeURIComponent(city)}&limit=500`);
      setModalWorkers(response.data);
    } catch (error) {
      console.error('Error fetching workers by city:', error);
      alert('Failed to load workers');
      setShowModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalWorkers([]);
    setModalTitle('');
    setSearchTerm('');
  };

  const handleAIScrape = async (e) => {
    e.preventDefault();
    
    if (!scrapeForm.skill_type || !scrapeForm.location) {
      alert('Please fill all required fields');
      return;
    }

    setScraping(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/workforce/admin/scrape`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: scrapeForm
        }
      );
      
      alert(response.data.message);
      
      // Refresh data after a delay to show newly added workers
      setTimeout(() => {
        fetchData();
      }, 3000);
      
      // Reset form
      setScrapeForm({ skill_type: '', location: '', limit: 10 });
    } catch (error) {
      alert('AI scraping failed: ' + (error.response?.data?.detail || 'Unknown error'));
      console.error(error);
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workforce Management</h1>
          <p className="text-gray-600">Manage construction skilled workforce directory</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Workers</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total_approved_workers}</p>
                </div>
                <Users className="w-12 h-12 text-blue-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.pending_approval}</p>
                </div>
                <RefreshCw className="w-12 h-12 text-orange-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Skill Types</p>
                  <p className="text-3xl font-bold text-green-600">{stats.by_skill.length}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cities Covered</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.by_city.length}</p>
                </div>
                <MapPin className="w-12 h-12 text-purple-600 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* AI Scraping Tool */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            AI-Powered Workforce Aggregation
          </h2>
          <p className="mb-4 opacity-90">Use AI to automatically find and add construction workers from public sources</p>
          
          <form onSubmit={handleAIScrape} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1 opacity-90">Skill Type *</label>
              <select
                value={scrapeForm.skill_type}
                onChange={(e) => setScrapeForm({ ...scrapeForm, skill_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-gray-900"
                required
              >
                <option value="all">🔥 All Skills (Recommended)</option>
                <option value="">-- Or Select Single Skill --</option>
                {skillTypes.map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
              <p className="text-xs mt-1 opacity-75">Select "All Skills" to fetch all workforce types at once</p>
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-90">Location * (Auto-Suggest)</label>
              <input
                ref={locationInputRef}
                type="text"
                value={scrapeForm.location}
                onChange={(e) => setScrapeForm({ ...scrapeForm, location: e.target.value })}
                placeholder="Start typing city name..."
                className="w-full px-3 py-2 rounded-lg text-gray-900"
                required
              />
              <p className="text-xs mt-1 opacity-75">Google auto-complete enabled</p>
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-90">Limit</label>
              <input
                type="number"
                min="1"
                max="50"
                value={scrapeForm.limit}
                onChange={(e) => setScrapeForm({ ...scrapeForm, limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg text-gray-900"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={scraping}
                className="w-full px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scraping ? 'Scraping...' : 'Start AI Scraping'}
              </button>
            </div>
          </form>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : pendingWorkers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No pending approvals
                    </td>
                  </tr>
                ) : (
                  pendingWorkers.map(worker => (
                    <tr key={worker.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{worker.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(worker.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {worker.skill_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p>{worker.phone}</p>
                        {worker.whatsapp && <p className="text-gray-500">WA: {worker.whatsapp}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p>{worker.location.city}</p>
                        <p className="text-gray-500">{worker.location.state}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {worker.experience_years && <p>Exp: {worker.experience_years} yrs</p>}
                        {worker.daily_rate && <p className="text-green-600">₹{worker.daily_rate}/day</p>}
                        {worker.work_type && <p className="text-gray-500">{worker.work_type}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          worker.source === 'ai_scraped' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {worker.source === 'ai_scraped' ? 'AI Scraped' : 'User Submitted'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(worker.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(worker.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(worker.id)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats by Skill */}
        {stats && stats.by_skill.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Workers by Skill Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.by_skill.map(item => (
                <div 
                  key={item.skill} 
                  onClick={() => fetchWorkersBySkill(item.skill)}
                  className="border rounded-lg p-4 cursor-pointer hover:shadow-lg hover:border-blue-400 hover:scale-105 transition-all duration-200 group"
                >
                  <p className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">{item.skill}</p>
                  <p className="text-2xl font-bold text-blue-600">{item.count}</p>
                  <p className="text-xs text-gray-400 mt-1 group-hover:text-blue-500">Click to view contacts →</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats by City */}
        {stats && stats.by_city.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Cities</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.by_city.map(item => (
                <div 
                  key={item.city} 
                  onClick={() => fetchWorkersByCity(item.city)}
                  className="border rounded-lg p-4 cursor-pointer hover:shadow-lg hover:border-green-400 hover:scale-105 transition-all duration-200 group"
                >
                  <p className="text-sm text-gray-600 group-hover:text-green-600 transition-colors">{item.city}</p>
                  <p className="text-2xl font-bold text-green-600">{item.count}</p>
                  <p className="text-xs text-gray-400 mt-1 group-hover:text-green-500">Click to view contacts →</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Worker Contacts Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{modalTitle}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {modalWorkers.length} worker{modalWorkers.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Body - Worker Cards */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modalWorkers
                    .filter(worker => 
                      worker.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(worker => (
                      <div 
                        key={worker.id} 
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
                      >
                        {/* Worker Name & Skill */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{worker.name}</h3>
                            <p className="text-sm text-blue-600 font-medium">{worker.skill_type}</p>
                          </div>
                          {worker.verified && (
                            <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                          )}
                        </div>

                        {/* Contact Buttons */}
                        <div className="flex gap-2 mb-3">
                          <a
                            href={`tel:${worker.phone}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Phone size={16} />
                            Call
                          </a>
                          {worker.whatsapp ? (
                            <a
                              href={`https://wa.me/${worker.whatsapp.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              <MessageCircle size={16} />
                              WhatsApp
                            </a>
                          ) : (
                            <a
                              href={`https://wa.me/${worker.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              <MessageCircle size={16} />
                              WhatsApp
                            </a>
                          )}
                        </div>

                        {/* Worker Details */}
                        <div className="space-y-2 text-sm border-t pt-3">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={14} className="flex-shrink-0" />
                            <span>{worker.phone}</span>
                          </div>
                          
                          {worker.location && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin size={14} className="flex-shrink-0" />
                              <span className="truncate">{worker.location.city}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={14} className="flex-shrink-0" />
                            <span>{worker.experience_years} years exp</span>
                          </div>

                          {worker.work_type && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Briefcase size={14} className="flex-shrink-0" />
                              <span>{worker.work_type}</span>
                            </div>
                          )}

                          {worker.daily_rate && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-lg font-bold text-green-600">
                                ₹{worker.daily_rate}/day
                              </p>
                            </div>
                          )}

                          {worker.description && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {worker.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {!modalLoading && modalWorkers.filter(worker => 
                worker.name.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 font-medium">No workers found</p>
                  {searchTerm && (
                    <p className="text-sm text-gray-500 mt-2">
                      Try adjusting your search term
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforceManagement;
