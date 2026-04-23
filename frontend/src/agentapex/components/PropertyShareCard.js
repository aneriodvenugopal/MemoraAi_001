import React, { useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Download, Share2, Loader2, User, MapPin, Maximize2, IndianRupee, Phone } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const PLAYSTORE_URL = 'https://play.google.com/store/apps/details?id=agentapex';

const PropertyShareCard = ({ property, agent, onClose }) => {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const coverIdx = property?.cover_image_index || 0;
  const coverImage = property?.images?.[coverIdx] 
    ? `${API_BASE}${property.images[coverIdx]}` 
    : null;
  const agentImage = agent?.profile_image 
    ? `${API_BASE}${agent.profile_image}` 
    : null;

  const propId = property?.property_id || 'AX-P-00000';
  const price = Number(property?.price || 0).toLocaleString('en-IN');
  const priceUnit = property?.price_unit || 'Lakhs';
  const negotiable = property?.negotiable ? '(Negotiable)' : '';
  const propType = property?.type || property?.property_type || 'Property';

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0A1B30'
      });
      return dataUrl;
    } catch (e) {
      console.error('Failed to generate image', e);
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `${propId}-share-card.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Card downloaded!');
    }
  };

  const handleShare = async () => {
    const shareText = `*${propType} FOR SALE*

*Property ID:* ${propId}
*Price:* \u20B9${price} ${priceUnit} ${negotiable}
*Area:* ${property?.area} ${property?.area_unit}
*Location:* ${property?.location}

Search this Property ID in AgentApex App to view full details.

--- *${agent?.name || 'Agent'}* ---
AgentApex Property Advisor

Download AgentApex: ${PLAYSTORE_URL}`;

    const dataUrl = await generateImage();
    if (dataUrl && navigator.share) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${propId}.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: `${propType} - ${propId}`, text: shareText });
        return;
      } catch (e) { /* fallback */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-3 backdrop-blur-sm">
      <div className="bg-[#0A1B30] rounded-2xl max-w-[380px] w-full max-h-[92vh] overflow-y-auto shadow-2xl">
        
        {/* === SHARE CARD IMAGE === */}
        <div ref={cardRef} style={{ width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          
          {/* Top: Property Image with overlay */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#0A1B30' }}>
            {coverImage ? (
              <img src={coverImage} alt="Property" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1E3A5A, #0A1B30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>No Image</span>
              </div>
            )}
            {/* Gradient overlay at bottom */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, #0A1B30 10%, transparent)' }} />
            
            {/* Property type badge */}
            <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'linear-gradient(135deg, #FF6B00, #D13C00)', color: 'white', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {propType} FOR SALE
            </div>
            
            {/* Property ID badge */}
            <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', color: '#0A1B30', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', fontFamily: 'monospace' }}>
              {propId}
            </div>

            {/* Title on image */}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', lineHeight: '1.2', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                PREMIUM {propType.toUpperCase()} FOR SALE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '8px', width: 'fit-content' }}>
                <MapPin style={{ width: '14px', height: '14px', color: '#FCCF1A' }} />
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{property?.location}</span>
              </div>
            </div>
          </div>

          {/* Property Details - 3 Column Grid */}
          <div style={{ background: 'linear-gradient(135deg, #0A1B30, #1E3A5A)', padding: '20px 16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Area */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: '#FCCF1A', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Maximize2 style={{ width: '18px', height: '18px', color: '#0A1B30' }} />
                </div>
                <div style={{ fontSize: '10px', color: '#B5C7D5', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>AREA</div>
                <div style={{ background: '#FCCF1A', borderRadius: '8px', padding: '6px 8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0A1B30' }}>{property?.area} {property?.area_unit}</span>
                </div>
              </div>
              
              {/* Location */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: '#FCCF1A', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin style={{ width: '18px', height: '18px', color: '#0A1B30' }} />
                </div>
                <div style={{ fontSize: '10px', color: '#B5C7D5', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>LOCATION</div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>{property?.location?.split(',')[0]}</span>
                </div>
              </div>
              
              {/* Price */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', background: '#FCCF1A', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IndianRupee style={{ width: '18px', height: '18px', color: '#0A1B30' }} />
                </div>
                <div style={{ fontSize: '10px', color: '#B5C7D5', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>PRICE</div>
                <div style={{ background: 'linear-gradient(135deg, #FF4F4F, #D13C00)', borderRadius: '8px', padding: '6px 8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{'\u20B9'}{price}</span>
                </div>
                <div style={{ fontSize: '9px', color: '#B5C7D5', marginTop: '3px' }}>{priceUnit} {negotiable}</div>
              </div>
            </div>
          </div>

          {/* Agent Section */}
          <div style={{ background: '#0A1B30', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Agent Photo */}
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px solid #FCCF1A', overflow: 'hidden', flexShrink: 0 }}>
              {agentImage ? (
                <img src={agentImage} alt={agent?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #FCCF1A, #FF9500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User style={{ width: '28px', height: '28px', color: 'white' }} />
                </div>
              )}
            </div>
            
            {/* Agent Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'white', textTransform: 'uppercase' }}>{agent?.name || 'Agent'}</div>
              <div style={{ fontSize: '11px', color: '#A3B9CC', fontWeight: '500', marginTop: '2px' }}>AgentApex Property Advisor</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#304D6D', padding: '3px 8px', borderRadius: '6px', marginTop: '4px' }}>
                <div style={{ width: '12px', height: '12px', background: '#42A5F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '8px', fontWeight: '900' }}>✓</span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: '700', color: 'white' }}>AgentApex Partner</span>
              </div>
            </div>
            
            {/* QR Code */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg, #4CAF50, #388E3C)', padding: '8px', borderRadius: '10px' }}>
                <QRCodeSVG value={PLAYSTORE_URL} size={52} level="M" includeMargin={false} bgColor="transparent" fgColor="white" />
                <div style={{ fontSize: '7px', color: 'white', fontWeight: '700', marginTop: '4px' }}>SCAN & INSTALL</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: '#060F1D', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '9px', color: '#B5C7D5' }}>Search Property ID in AgentApex App</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '8px', color: '#667788' }}>Powered by</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <div style={{ width: '14px', height: '14px', background: '#FCCF1A', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#0A1B30', fontSize: '9px', fontWeight: '900' }}>A</span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'white', letterSpacing: '0.5px' }}>AgentApex</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleShare}
            disabled={generating}
            data-testid="share-card-btn"
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #4CAF50, #388E3C)', color: 'white', fontWeight: '700', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
            Share via WhatsApp
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            data-testid="download-card-btn"
            style={{ width: '100%', padding: '14px', background: '#1E3A5A', color: 'white', fontWeight: '700', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Download Card
          </button>
          <button
            onClick={onClose}
            style={{ width: '100%', padding: '10px', background: 'transparent', color: '#667788', fontWeight: '500', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyShareCard;
