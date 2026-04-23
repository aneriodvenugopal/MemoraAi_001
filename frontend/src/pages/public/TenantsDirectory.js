import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../../services/api';
import { Building2, MapPin, Home, Search, ArrowRight, Briefcase } from 'lucide-react';

function TenantsDirectory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTenants, setFilteredTenants] = useState([]);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    // Filter tenants based on search term
    if (searchTerm.trim() === '') {
      setFilteredTenants(tenants);
    } else {
      const filtered = tenants.filter(tenant =>
        tenant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.state?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTenants(filtered);
    }
  }, [searchTerm, tenants]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await apiInstance.get('/public/tenants?limit=100');
      if (response.data.success) {
        setTenants(response.data.tenants);
        setFilteredTenants(response.data.tenants);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MemoraAI</h1>
                <p className="text-sm text-gray-600">Partner Companies</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold mb-4">Our Partner Companies</h2>
          <p className="text-xl text-blue-100 mb-8">
            Discover trusted real estate companies powered by MemoraAI
          </p>
          <div className="flex items-center justify-center gap-8 text-lg">
            <div className="flex items-center gap-2">
              <Building2 size={24} />
              <span>{tenants.length} Companies</span>
            </div>
            <div className="flex items-center gap-2">
              <Home size={24} />
              <span>{tenants.reduce((sum, t) => sum + (t.project_count || 0), 0)}+ Projects</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase size={24} />
              <span>{tenants.reduce((sum, t) => sum + (t.property_count || 0), 0)}+ Properties</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company name, city, or state..."
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent text-lg"
            />
          </div>
          {searchTerm && (
            <p className="mt-3 text-gray-600 text-sm">
              Showing {filteredTenants.length} of {tenants.length} companies
            </p>
          )}
        </div>
      </section>

      {/* Tenants Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredTenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">
                {searchTerm ? 'No companies found matching your search' : 'No companies available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  onClick={() => navigate(`/public/tenant/${tenant.id}`)}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-blue-500"
                >
                  {/* Company Header */}
                  <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 text-white">
                    <div className="flex items-center gap-4 mb-4">
                      {tenant.logo_url ? (
                        <img
                          src={tenant.logo_url}
                          alt={tenant.company_name}
                          className="h-16 w-16 bg-white rounded-full object-contain p-2"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-2xl">
                            {tenant.company_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold truncate">{tenant.company_name}</h3>
                        {tenant.tagline && (
                          <p className="text-sm text-blue-100 truncate">{tenant.tagline}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Company Stats */}
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{tenant.project_count || 0}</p>
                        <p className="text-xs text-gray-600">Projects</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{tenant.property_count || 0}</p>
                        <p className="text-xs text-gray-600">Properties</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{tenant.booking_count || 0}</p>
                        <p className="text-xs text-gray-600">Bookings</p>
                      </div>
                    </div>

                    {/* Location */}
                    {(tenant.city || tenant.state) && (
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                        <MapPin size={16} />
                        <span>
                          {tenant.city}
                          {tenant.city && tenant.state && ', '}
                          {tenant.state}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {tenant.description && (
                      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                        {tenant.description}
                      </p>
                    )}

                    {/* View Button */}
                    <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2">
                      View Company <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} MemoraAI. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition">
              Home
            </button>
            <button onClick={() => navigate('/about')} className="text-gray-400 hover:text-white transition">
              About
            </button>
            <button onClick={() => navigate('/contact')} className="text-gray-400 hover:text-white transition">
              Contact
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default TenantsDirectory;
