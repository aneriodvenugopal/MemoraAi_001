import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, MapPin, Loader2, User, Hash, Send } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const PropertySearchById = () => {
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiry, setEnquiry] = useState({ buyer_name: '', buyer_phone: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    const id = searchId.trim().toUpperCase();
    if (!id) {
      toast.error('Enter a Property ID');
      return;
    }
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const res = await axios.get(`${API_BASE}/api/agentapex/properties/search-by-id?property_id=${id}`);
      setResult(res.data);
    } catch (e) {
      if (e.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error('Search failed');
      }
    }
    setLoading(false);
  };

  const handleEnquiry = async (e) => {
    e.preventDefault();
    if (!result?.property?.id) return;
    setSending(true);
    try {
      await axios.post(`${API_BASE}/api/agentapex/leads`, {
        property_id: result.property.id,
        buyer_name: enquiry.buyer_name,
        buyer_phone: enquiry.buyer_phone,
        message: enquiry.message || `Interested in ${result.property.property_id}`
      });
      toast.success('Enquiry sent! Agent will contact you.');
      setShowEnquiry(false);
      setEnquiry({ buyer_name: '', buyer_phone: '', message: '' });
    } catch (e) {
      toast.error('Failed to send enquiry');
    }
    setSending(false);
  };

  const coverIdx = result?.property?.cover_image_index || 0;
  const coverImage = result?.property?.images?.[coverIdx]
    ? `${API_BASE}${result.property.images[coverIdx]}`
    : null;
  const agentImage = result?.agent?.profile_image
    ? `${API_BASE}${result.agent.profile_image}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Search Property</h1>
            <p className="text-xs text-gray-500">Enter Property ID to find details</p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="p-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Property ID</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="AX-P-10001"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base font-mono uppercase"
                data-testid="search-property-id-input"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              data-testid="search-property-btn"
              className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Example: AX-P-10001, AX-V-10002</p>
        </div>
      </div>

      {/* Not Found */}
      <AnimatePresence>
        {notFound && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4"
          >
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <Hash className="w-10 h-10 text-red-300 mx-auto mb-3" />
              <p className="text-red-800 font-semibold">Property Not Found</p>
              <p className="text-red-600 text-sm mt-1">No property with ID "{searchId}" exists</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pb-8"
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {/* Property Image */}
              <div className="relative" style={{ aspectRatio: '16/9' }}>
                {coverImage ? (
                  <img src={coverImage} alt="Property" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white px-3 py-1.5 rounded-lg">
                  <p className="text-xs font-bold uppercase">{result.property.property_type}</p>
                </div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-gray-900 px-3 py-1.5 rounded-lg">
                  <p className="text-xs font-bold font-mono">{result.property.property_id}</p>
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-600">{result.property.location}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Area</p>
                    <p className="text-sm font-bold text-gray-900">{result.property.area} {result.property.area_unit}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Price</p>
                    <p className="text-sm font-bold text-gray-900">{'\u20B9'}{Number(result.property.price).toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-gray-500">{result.property.price_unit}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Type</p>
                    <p className="text-sm font-bold text-gray-900">{result.property.property_type}</p>
                  </div>
                </div>

                {/* Agent Info */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-sky-50 to-orange-50 rounded-xl border border-sky-100">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-sky-300 flex-shrink-0">
                    {agentImage ? (
                      <img src={agentImage} alt={result.agent.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-400 to-orange-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{result.agent.name}</p>
                    <p className="text-xs text-sky-600 font-medium">{result.agent.designation}</p>
                  </div>
                </div>

                {/* Enquiry Button */}
                <button
                  onClick={() => setShowEnquiry(true)}
                  data-testid="request-contact-btn"
                  className="w-full mt-4 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Send className="w-5 h-5" /> Request Contact Details
                </button>
              </div>
            </div>

            {/* Image Gallery */}
            {result.property.images?.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {result.property.images.map((img, i) => (
                  <img
                    key={i}
                    src={`${API_BASE}${img}`}
                    alt={`Photo ${i + 1}`}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border-2 border-white shadow"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enquiry Form Modal */}
      {showEnquiry && (
        <div className="fixed inset-0 bg-black/50 z-[1001] flex items-end">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="bg-white rounded-t-3xl w-full p-4 pb-8"
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-1">Request Contact</h2>
            <p className="text-sm text-gray-500 mb-4">Agent will contact you about {result?.property?.property_id}</p>
            
            <form onSubmit={handleEnquiry} className="space-y-3">
              <input
                type="text"
                value={enquiry.buyer_name}
                onChange={(e) => setEnquiry({ ...enquiry, buyer_name: e.target.value })}
                placeholder="Your Name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                required
                data-testid="enquiry-name"
              />
              <input
                type="tel"
                value={enquiry.buyer_phone}
                onChange={(e) => setEnquiry({ ...enquiry, buyer_phone: e.target.value })}
                placeholder="Phone Number"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                required
                data-testid="enquiry-phone"
              />
              <textarea
                value={enquiry.message}
                onChange={(e) => setEnquiry({ ...enquiry, message: e.target.value })}
                placeholder="Message (optional)"
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none"
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3.5 bg-blue-500 text-white font-semibold rounded-xl"
                data-testid="submit-enquiry-btn"
              >
                {sending ? 'Sending...' : 'Send Enquiry'}
              </button>
              <button
                type="button"
                onClick={() => setShowEnquiry(false)}
                className="w-full py-3 text-gray-500"
              >
                Cancel
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PropertySearchById;
