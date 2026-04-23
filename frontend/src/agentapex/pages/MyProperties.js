import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, MapPin, Edit2, Trash2, Eye, Check, Building2, Hash } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const MyProperties = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { api } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (routerLocation.state?.success) { 
      toast.success('Property posted successfully!');
    }
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try { 
      const res = await api().get('/properties/my'); 
      setProperties(res.data); 
    } catch (e) { 
      console.error(e); 
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this property?')) return;
    try { 
      await api().delete(`/properties/${id}`); 
      setProperties(prev => prev.filter(p => p.id !== id)); 
      toast.success('Property deleted');
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">My Properties</h1>
              <p className="text-xs text-gray-500">{properties.length} listings</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/agentapex/post')} 
            data-testid="add-property-btn" 
            className="w-10 h-10 flex items-center justify-center"
          >
            <Plus className="w-6 h-6 text-blue-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl skeleton" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-900 font-semibold">No properties yet</p>
            <p className="text-gray-500 text-sm mt-1">Start by posting your first property</p>
            <button 
              onClick={() => navigate('/agentapex/post')} 
              data-testid="add-first-property" 
              className="mt-6 px-8 py-3 bg-blue-500 text-white font-semibold rounded-xl"
            >
              Post Property
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((p, i) => (
              <motion.div 
                key={p.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <div className="flex">
                  <div 
                    className="w-28 h-28 flex-shrink-0 cursor-pointer"
                    onClick={() => navigate(`/agentapex/property/${p.id}`)}
                  >
                    <img 
                      src={p.images?.[p.cover_image_index || 0] ? `${API_BASE}${p.images[p.cover_image_index || 0]}` : 'https://images.pexels.com/photos/3030307/pexels-photo-3030307.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0" onClick={() => navigate(`/agentapex/property/${p.id}`)}>
                        {p.property_id && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] font-mono font-bold rounded mb-1">
                            <Hash className="w-2.5 h-2.5" />{p.property_id}
                          </span>
                        )}
                        <p className="text-base font-bold text-gray-900">{'\u20B9'}{p.price} {p.price_unit}</p>
                        <p className="text-sm text-gray-900 truncate">{p.title || p.property_type}</p>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{p.location}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">
                        Active
                      </span>
                    </div>
                    
                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">{p.views || 0} views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => navigate(`/agentapex/property/${p.id}/documents`)}
                          className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
                          data-testid={`docs-${p.id}`}
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"
                          data-testid={`delete-${p.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProperties;
