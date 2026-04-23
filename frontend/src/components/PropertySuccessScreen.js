import React, { useState, useEffect } from 'react';
import { CheckCircle, MapPin, Home, DollarSign, Edit, Share2, Eye, Lock, FileText, Video, Music } from 'lucide-react';
import { useLanguage } from '../i18n/translations';
import './PropertySuccessScreen.css';

const PropertySuccessScreen = ({ property, onEdit, onViewProperty, onAddAnother, onClose }) => {
  const { t } = useLanguage();
  const [showAnimation, setShowAnimation] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    // Trigger success animation
    setTimeout(() => setShowAnimation(true), 100);
  }, []);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out my property',
        text: `${property.property_type} for ${property.transaction_type} at ${property.location?.address}`,
        url: window.location.href
      }).catch(err => console.log('Share failed:', err));
    } else {
      alert('Share feature not supported on this browser');
    }
  };

  const formatPrice = (price) => {
    if (!price?.amount) return 'N/A';
    const lakhs = price.amount / 100000;
    return `₹${lakhs.toFixed(2)}L`;
  };

  const formatArea = (area) => {
    if (!area) return 'N/A';
    if (area.acres) return `${area.acres} Acres ${area.guntas || 0} Guntas`;
    if (area.sq_yards) return `${area.sq_yards} Sq.Yards`;
    if (area.sq_feet) return `${area.sq_feet} Sq.Feet`;
    return 'N/A';
  };

  return (
    <div className="property-success-screen">
      {/* Success Animation */}
      <div className={`success-animation ${showAnimation ? 'show' : ''}`}>
        <div className="success-checkmark">
          <CheckCircle size={80} color="#4CAF50" />
        </div>
        <h1 className="success-title">{t('propertyPostedSuccess')}</h1>
        <p className="success-subtitle">{t('yourPropertyIsLive')}</p>
      </div>

      {/* Property Summary Card */}
      <div className="property-summary-card">
        <div className="property-header">
          <div className="property-badge">
            {property.transaction_type === 'sell' ? 'FOR SALE' : 'WANTED'}
          </div>
          <div className="property-id">
            ID: {property.id?.substring(0, 8) || 'XXXXXX'}
          </div>
        </div>

        {/* Property Photos Preview */}
        {property.photos && property.photos.length > 0 && (
          <div className="property-photos-preview">
            <img src={property.photos[0].preview || property.photos[0]} alt="Property" />
            {property.photos.length > 1 && (
              <div className="photo-count">+{property.photos.length - 1}</div>
            )}
          </div>
        )}

        {/* Property Details */}
        <div className="property-details-grid">
          <div className="detail-item">
            <MapPin size={18} color="#666" />
            <div>
              <div className="detail-label">Location</div>
              <div className="detail-value">{property.location?.address || 'Unknown'}</div>
            </div>
          </div>

          <div className="detail-item">
            <Home size={18} color="#666" />
            <div>
              <div className="detail-label">Type</div>
              <div className="detail-value">{property.property_type}</div>
            </div>
          </div>

          <div className="detail-item">
            <DollarSign size={18} color="#666" />
            <div>
              <div className="detail-label">Price</div>
              <div className="detail-value">
                {formatPrice(property.price)}
                {property.price?.negotiable && <span className="negotiable-badge">Negotiable</span>}
              </div>
            </div>
          </div>

          <div className="detail-item">
            <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              📏
            </div>
            <div>
              <div className="detail-label">Area</div>
              <div className="detail-value">{formatArea(property.area)}</div>
            </div>
          </div>
        </div>

        {/* Additional Info if provided */}
        {property.details?.additional_info && (
          <div className="additional-info-section">
            <div className="section-title">Additional Information</div>
            <p>{property.details.additional_info}</p>
          </div>
        )}

        {/* Contact Info (Hidden) */}
        <div className="contact-info-section">
          <Lock size={16} />
          <span>Your contact details are secure and will only be visible to interested buyers</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="action-btn primary" onClick={onViewProperty}>
          <Eye size={20} />
          <span>{t('viewProperty')}</span>
        </button>

        <button className="action-btn secondary" onClick={onEdit}>
          <Edit size={20} />
          <span>{t('editProperty')}</span>
        </button>

        <button className="action-btn secondary" onClick={handleShare}>
          <Share2 size={20} />
          <span>{t('share')}</span>
        </button>
      </div>

      {/* Premium Features Upgrade Prompt */}
      <div className="upgrade-section">
        <div className="upgrade-header">
          <div className="premium-badge">✨ {t('premiumFeatures')}</div>
          <p>{t('addMoreDetails')}</p>
        </div>

        <div className="premium-features-list">
          <div className="premium-feature locked">
            <FileText size={18} />
            <span>Add Documents (Sale Deed, Approvals)</span>
            <Lock size={14} />
          </div>
          <div className="premium-feature locked">
            <Video size={18} />
            <span>Add Video Tours</span>
            <Lock size={14} />
          </div>
          <div className="premium-feature locked">
            <Music size={18} />
            <span>Add Audio Description</span>
            <Lock size={14} />
          </div>
        </div>

        <button 
          className="upgrade-btn"
          onClick={() => setShowUpgradePrompt(true)}
        >
          {t('upgradeToAddMore')}
        </button>
      </div>

      {/* Continue Button */}
      <button className="continue-btn" onClick={onClose}>
        {t('done')} - Go to Home
      </button>

      {/* Upgrade Modal */}
      {showUpgradePrompt && (
        <div className="upgrade-modal-overlay" onClick={() => setShowUpgradePrompt(false)}>
          <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Upgrade to Premium</h2>
            <p>Unlock advanced features to make your property stand out!</p>
            <div className="pricing">
              <div className="price">₹99</div>
              <div className="price-label">per property</div>
            </div>
            <ul className="premium-benefits">
              <li>✅ Upload legal documents</li>
              <li>✅ Add video walkthroughs</li>
              <li>✅ Record audio descriptions</li>
              <li>✅ Priority listing</li>
              <li>✅ Verified badge</li>
            </ul>
            <button className="pay-btn">Pay ₹99 & Upgrade</button>
            <button className="cancel-btn" onClick={() => setShowUpgradePrompt(false)}>
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertySuccessScreen;
