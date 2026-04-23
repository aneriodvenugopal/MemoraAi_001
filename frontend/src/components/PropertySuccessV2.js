import React, { useState, useEffect } from 'react';
import { ThumbsUp, Edit, Eye, Share2, Home } from 'lucide-react';
import './PropertySuccessV2.css';

const PropertySuccessV2 = ({ property, onEdit, onViewProperty, onAddAnother, onClose }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [propertyId] = useState(`#${Math.random().toString(36).substr(2, 9).toUpperCase()}`);

  useEffect(() => {
    // Play success sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS46eeaTQ4MW6fs6rVbGgjn');
    audio.volume = 0.3;
    audio.play().catch(() => console.log('Audio play failed'));

    // Trigger animation
    setTimeout(() => setShowSuccess(true), 100);
  }, []);

  const formatCost = () => {
    if (!property.cost) return 'N/A';
    const { amount, unit } = property.cost;
    return `₹${amount} ${unit.charAt(0).toUpperCase() + unit.slice(1)}`;
  };

  const formatSize = () => {
    if (!property.size) return 'N/A';
    const { value, unit } = property.size;
    return `${value} ${unit.replace('_', ' ').toUpperCase()}`;
  };

  return (
    <div className="success-v2-container">
      {/* Success Animation */}
      <div className={`success-animation-v2 ${showSuccess ? 'show' : ''}`}>
        <div className="checkmark-circle">
          <ThumbsUp size={60} className="thumbs-icon" />
        </div>
        <h1 className="success-title-v2">Property Posted!</h1>
        <p className="success-subtitle-v2">Your property is now live</p>
        <div className="property-id-badge">{propertyId}</div>
      </div>

      {/* Property Summary */}
      <div className="property-summary-v2">
        <div className="summary-row">
          <div className="summary-icon">🏠</div>
          <div className="summary-content">
            <div className="summary-label">Type</div>
            <div className="summary-value">
              {property.type?.replace('_', ' ').toUpperCase() || 'N/A'}
            </div>
          </div>
        </div>

        <div className="summary-row">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-label">Cost</div>
            <div className="summary-value">{formatCost()}</div>
          </div>
        </div>

        <div className="summary-row">
          <div className="summary-icon">📏</div>
          <div className="summary-content">
            <div className="summary-label">Size</div>
            <div className="summary-value">{formatSize()}</div>
          </div>
        </div>

        <div className="summary-row">
          <div className="summary-icon">📍</div>
          <div className="summary-content">
            <div className="summary-label">Location</div>
            <div className="summary-value">
              {property.location?.address || 'To be added'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons-v2">
        <button className="action-btn-v2 primary" onClick={onViewProperty}>
          <Eye size={20} />
          <span>View Property</span>
        </button>

        <button className="action-btn-v2 secondary" onClick={onEdit}>
          <Edit size={20} />
          <span>Edit Details</span>
        </button>

        <button className="action-btn-v2 secondary" onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: 'Check out my property',
              text: `${property.type} for sale - ${formatCost()}`,
            });
          }
        }}>
          <Share2 size={20} />
          <span>Share</span>
        </button>
      </div>

      {/* Footer Actions */}
      <div className="footer-actions-v2">
        <button className="footer-btn add-another" onClick={onAddAnother}>
          + Add Another Property
        </button>
        <button className="footer-btn go-home" onClick={onClose}>
          <Home size={18} />
          <span>Go to Dashboard</span>
        </button>
      </div>
    </div>
  );
};

export default PropertySuccessV2;