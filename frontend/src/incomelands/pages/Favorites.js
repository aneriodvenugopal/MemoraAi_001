import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Home, Search, PlusSquare, Heart, User,
  ArrowLeft, MapPin, Trash2, Grid3X3
} from 'lucide-react';

// Bottom Navigation
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="bottom-nav">
      <button onClick={() => navigate('/')} data-testid="nav-home">
        <Home className={`w-6 h-6 ${isActive('/') ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/') ? 2.5 : 1.5} />
      </button>
      <button onClick={() => navigate('/search')} data-testid="nav-search">
        <Search className={`w-6 h-6 ${isActive('/search') ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/search') ? 2.5 : 1.5} />
      </button>
      <button onClick={() => navigate('/post')} data-testid="nav-post">
        <PlusSquare className={`w-6 h-6 ${isActive('/post') ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/post') ? 2.5 : 1.5} />
      </button>
      <button onClick={() => navigate('/favorites')} data-testid="nav-favorites">
        <Heart className={`w-6 h-6 ${isActive('/favorites') ? 'text-gray-900 fill-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/favorites') ? 2.5 : 1.5} />
      </button>
      <button onClick={() => navigate('/profile')} data-testid="nav-profile">
        <User className={`w-6 h-6 ${isActive('/profile') ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/profile') ? 2.5 : 1.5} />
      </button>
    </nav>
  );
};

const Favorites = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFavorites(); }, []);

  const fetchFavorites = async () => {
    try { 
      const res = await api().get('/favorites'); 
      setFavorites(res.data); 
    } catch (e) { 
      console.error(e); 
    }
    setLoading(false);
  };

  const remove = async (id) => {
    try { 
      await api().delete(`/favorites/${id}`); 
      setFavorites(prev => prev.filter(p => p.id !== id)); 
    } catch (e) { 
      console.error(e); 
    }
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Header - Instagram style */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Saved</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-xl skeleton" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold">Save properties you like</p>
            <p className="text-gray-500 text-sm mt-1">They'll show up here</p>
            <button 
              onClick={() => navigate('/search')} 
              data-testid="browse-properties"
              className="mt-6 px-8 py-3 bg-blue-500 text-white font-semibold rounded-xl"
            >
              Browse Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((p, i) => (
              <motion.div 
                key={p.id} 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl overflow-hidden border border-gray-100"
              >
                <div 
                  onClick={() => navigate(`/property/${p.id}`)}
                  className="cursor-pointer"
                >
                  <div className="relative aspect-square">
                    <img 
                      src={p.images?.[0] || 'https://images.pexels.com/photos/3030307/pexels-photo-3030307.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); remove(p.id); }} 
                      data-testid={`remove-${p.id}`}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center"
                    >
                      <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-base font-bold text-gray-900">₹{p.price} {p.price_unit}</p>
                    <p className="text-sm text-gray-900 truncate mt-0.5">{p.title}</p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />{p.location}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Favorites;
