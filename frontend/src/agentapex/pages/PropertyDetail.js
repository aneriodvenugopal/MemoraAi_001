import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  ArrowLeft, Heart, Share2, MapPin, MessageCircle, 
  ChevronLeft, ChevronRight, FolderOpen, FileText, MoreHorizontal, Bookmark,
  Brain, Edit, Send, Phone, Lock, Unlock, Loader2, Image as ImageIcon, Hash, Download
} from 'lucide-react';
import { toast } from 'sonner';
import AreaIntelligence from '../components/AreaIntelligence';
import PropertyShareCard from '../components/PropertyShareCard';
import PropertyImageManager from '../components/PropertyImageManager';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiry, setEnquiry] = useState({ buyer_name: '', buyer_phone: '', message: '' });
  const [sending, setSending] = useState(false);
  
  // Contact reveal states
  const [contactRevealed, setContactRevealed] = useState(false);
  const [ownerContact, setOwnerContact] = useState(null);
  const [revealPrice, setRevealPrice] = useState(10);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [showImageManager, setShowImageManager] = useState(false);

  const isOwner = property?.user_id === user?.id;

  useEffect(() => {
    fetchProperty();
    checkFavorite();
    checkContactReveal();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await api().get(`/properties/${id}`);
      setProperty(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const checkFavorite = async () => {
    try {
      const response = await api().get('/favorites');
      setIsFavorite(response.data.some(p => p.id === id));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkContactReveal = async () => {
    try {
      const response = await api().get(`/contact-reveal/check/${id}`);
      if (response.data.revealed) {
        setContactRevealed(true);
        setOwnerContact({
          name: response.data.owner_name,
          phone: response.data.owner_phone
        });
      } else {
        setRevealPrice(response.data.price || 10);
      }
    } catch (error) {
      console.error('Error checking contact reveal:', error);
    }
  };

  const handleRevealContact = async () => {
    setProcessingPayment(true);
    try {
      const orderRes = await api().post(`/contact-reveal/create-order?property_id=${id}`);
      
      if (orderRes.data.already_paid) {
        setContactRevealed(true);
        setOwnerContact({
          name: orderRes.data.owner_name,
          phone: orderRes.data.owner_phone
        });
        setProcessingPayment(false);
        return;
      }
      
      // Load Razorpay
      const options = {
        key: orderRes.data.key_id,
        amount: orderRes.data.amount * 100,
        currency: orderRes.data.currency,
        name: 'AgentApex',
        description: 'Contact Reveal',
        order_id: orderRes.data.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await api().post('/contact-reveal/verify', null, {
              params: {
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature
              }
            });
            
            if (verifyRes.data.success) {
              setContactRevealed(true);
              setOwnerContact({
                name: verifyRes.data.owner_name,
                phone: verifyRes.data.owner_phone
              });
              toast.success('Contact revealed!');
            }
          } catch (e) {
            toast.error('Payment verification failed');
          }
          setProcessingPayment(false);
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
          }
        },
        prefill: {
          contact: user?.phone
        },
        theme: {
          color: '#3B82F6'
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment');
      setProcessingPayment(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await api().delete(`/favorites/${id}`);
      } else {
        await api().post(`/favorites/${id}`);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEnquiry = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api().post('/leads', { property_id: id, ...enquiry });
      setShowEnquiry(false);
      setEnquiry({ buyer_name: '', buyer_phone: '', message: '' });
      toast.success('Enquiry sent successfully!');
    } catch (error) {
      toast.error('Failed to send enquiry');
    }
    setSending(false);
  };

  const handleShare = async () => {
    try {
      const res = await api().get(`/properties/${id}/share-data`);
      setShareData(res.data);
      setShowShareCard(true);
    } catch (e) {
      // Fallback to text share
      const propId = property?.property_id || '';
      const shareText = `*${property?.property_type} For Sale*
${propId ? `\n*Property ID:* ${propId}` : ''}
*Price:* ${'\u20B9'}${property?.price} ${property?.price_unit}
*Area:* ${property?.area} ${property?.area_unit}
*Location:* ${property?.location}

Search this Property ID in AgentApex App to view full details.
Download: https://play.google.com/store/apps/details?id=agentapex`;
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const handleWhatsAppShare = async () => {
    const propId = property?.property_id || '';
    let agentName = user?.name || 'Agent';
    try {
      const res = await api().get(`/properties/${id}/share-data`);
      agentName = res.data.agent?.name || agentName;
    } catch (e) { /* use defaults */ }

    const shareText = `*${property?.property_type} For Sale*
${propId ? `\n*Property ID:* ${propId}` : ''}
*Price:* ${'\u20B9'}${property?.price} ${property?.price_unit} ${property?.negotiable ? '(Negotiable)' : ''}
*Area:* ${property?.area} ${property?.area_unit}
*Location:* ${property?.location}

Search this Property ID in AgentApex App to view full details.

--- *${agentName}* ---
AgentApex Property Advisor

Download AgentApex: https://play.google.com/store/apps/details?id=agentapex`;

    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const defaultImages = [
    'https://images.pexels.com/photos/3030307/pexels-photo-3030307.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/4525178/pexels-photo-4525178.jpeg?auto=compress&cs=tinysrgb&w=800'
  ];

  const images = property?.images?.length > 0 ? property.images : defaultImages;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="text-gray-500">Property not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 font-medium">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Image Gallery - Instagram style full width */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={images[currentImage]}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        
        {/* Header - Floating */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            data-testid="back-btn"
            className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              data-testid="share-btn"
              className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
            >
              <Share2 className="w-5 h-5 text-gray-900" />
            </button>
            <button
              className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-900" />
            </button>
          </div>
        </div>

        {/* Image Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrentImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>
            <button
              onClick={() => setCurrentImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentImage ? 'bg-white w-4' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Bar - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={toggleFavorite} data-testid="favorite-btn">
            <Heart className={`w-7 h-7 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-900'}`} />
          </button>
          <button onClick={() => setShowEnquiry(true)} data-testid="enquiry-btn">
            <MessageCircle className="w-7 h-7 text-gray-900" />
          </button>
          <button onClick={handleShare}>
            <Share2 className="w-7 h-7 text-gray-900" />
          </button>
        </div>
        <button onClick={handleWhatsAppShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium">
          <Send className="w-4 h-4" />
          WhatsApp
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Property ID Badge */}
        {property.property_id && (
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg">
              <Hash className="w-3.5 h-3.5" />
              <span className="text-xs font-bold font-mono">{property.property_id}</span>
            </div>
            <span className="text-xs text-gray-400">{property.views} views</span>
          </div>
        )}

        {/* Price */}
        <p className="text-2xl font-bold text-gray-900">
          {'\u20B9'}{property.price} {property.price_unit}
        </p>
        
        {/* Title */}
        <h1 className="text-base text-gray-900 mt-1">{property.title}</h1>
        
        {/* Location */}
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
          <MapPin className="w-4 h-4" />
          {property.location}
        </p>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Type</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{property.property_type}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Area</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{property.area} {property.area_unit}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{property.negotiable ? 'Negotiable' : 'Fixed'}</p>
          </div>
        </div>

        {/* Description */}
        {property.description && (
          <div className="mt-4">
            <p className="text-sm text-gray-900">{property.description}</p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-100 my-4" />

        {/* Documents */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Documents</p>
            <p className="text-xs text-gray-500 mt-0.5">{property.documents?.length || 0} files uploaded</p>
          </div>
          {isOwner && (
            <button
              onClick={() => navigate(`/agentapex/property/${id}/documents`)}
              data-testid="manage-docs-btn"
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-900"
            >
              Manage
            </button>
          )}
        </div>

        {property.documents?.length > 0 && (
          <div className="mt-3 space-y-2">
            {property.documents.slice(0, 3).map((doc, idx) => (
              <a
                key={idx}
                href={`${process.env.REACT_APP_BACKEND_URL}${doc.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <FileText className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">{doc.type}</p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-100 my-4" />

        {/* AI Area Intelligence */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Area Intelligence</p>
            <p className="text-xs text-gray-500 mt-0.5">AI-powered location insights</p>
          </div>
          <AreaIntelligence 
            latitude={property.latitude}
            longitude={property.longitude}
            location={property.location}
            propertyType={property.property_type}
            trigger={
              <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-sm font-medium text-white flex items-center gap-1">
                <Brain className="w-4 h-4" />
                Get Insights
              </button>
            }
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-4" />

        {/* Map */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-3">Location</p>
          <div className="h-40 rounded-xl overflow-hidden">
            <MapContainer
              center={[property.latitude, property.longitude]}
              zoom={14}
              className="h-full w-full"
              scrollWheelZoom={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[property.latitude, property.longitude]} />
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-bottom">
        {isOwner ? (
          <div className="flex gap-3">
            <button
              onClick={() => setShowImageManager(true)}
              className="flex-1 py-3.5 bg-gray-100 text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-5 h-5" />
              Images
            </button>
            <button
              onClick={() => navigate(`/agentapex/property/${id}/edit`)}
              data-testid="edit-property-btn"
              className="flex-1 py-3.5 bg-gray-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Edit
            </button>
          </div>
        ) : contactRevealed && ownerContact ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Unlock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{ownerContact.name || 'Property Owner'}</p>
                  <p className="text-sm text-gray-600">{ownerContact.phone}</p>
                </div>
              </div>
              <a 
                href={`tel:${ownerContact.phone}`}
                className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Phone className="w-6 h-6 text-white" />
              </a>
            </div>
            <button
              onClick={() => setShowEnquiry(true)}
              className="w-full py-3 bg-gray-100 text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Send Enquiry
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setShowEnquiry(true)}
              className="flex-1 py-3.5 bg-gray-100 text-gray-900 font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Enquiry
            </button>
            <button
              onClick={handleRevealContact}
              disabled={processingPayment}
              data-testid="reveal-contact-btn"
              className="flex-1 py-3.5 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {processingPayment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  View Contact ₹{revealPrice}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Enquiry Bottom Sheet */}
      <Drawer.Root open={showEnquiry} onOpenChange={setShowEnquiry}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] outline-none">
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send Enquiry</h2>
              
              <form onSubmit={handleEnquiry} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">Your Name</label>
                  <input
                    type="text"
                    value={enquiry.buyer_name}
                    onChange={(e) => setEnquiry({ ...enquiry, buyer_name: e.target.value })}
                    data-testid="input-name"
                    placeholder="Enter your name"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    value={enquiry.buyer_phone}
                    onChange={(e) => setEnquiry({ ...enquiry, buyer_phone: e.target.value })}
                    data-testid="input-phone"
                    placeholder="Enter phone number"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">Message (Optional)</label>
                  <textarea
                    value={enquiry.message}
                    onChange={(e) => setEnquiry({ ...enquiry, message: e.target.value })}
                    data-testid="input-message"
                    placeholder="Any specific questions..."
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>
                <button
                  type="submit"
                  data-testid="submit-enquiry"
                  disabled={sending}
                  className="w-full py-3.5 bg-blue-500 text-white font-semibold rounded-xl mt-2"
                >
                  {sending ? 'Sending...' : 'Send Enquiry'}
                </button>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Share Card Modal */}
      {showShareCard && shareData && (
        <PropertyShareCard
          property={shareData.property}
          agent={shareData.agent}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {/* Image Manager Modal */}
      {showImageManager && (
        <PropertyImageManager
          propertyId={id}
          images={property?.images || []}
          coverIndex={property?.cover_image_index || 0}
          api={api}
          onUpdate={(newImages) => {
            setProperty(prev => ({ ...prev, images: newImages }));
          }}
          onClose={() => setShowImageManager(false)}
        />
      )}
    </div>
  );
};

export default PropertyDetail;
