import React, { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Eye, Share2, MapPin } from 'lucide-react';
import './MyPropertiesList.css';

const MyPropertiesList = ({ properties, onBack, onEdit, onDelete, onView }) => {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatCost = (cost) => {
    if (!cost) return 'N/A';
    return `₹${cost.amount} ${cost.unit.charAt(0).toUpperCase() + cost.unit.slice(1)}`;
  };

  const formatSize = (size) => {
    if (!size) return 'N/A';
    return `${size.value} ${size.unit.replace('_', ' ').toUpperCase()}`;
  };

  const getPropertyIcon = (type) => {
    const icons = {
      land: '🏞️',
      plot: '📐',
      flat: '🏢',
      independent_house: '🏡',
      villa: '🏰',
      farmhouse: '🌾'
    };
    return icons[type] || '🏠';
  };

  const handleDelete = (property) => {
    setSelectedProperty(property);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedProperty && onDelete) {
      onDelete(selectedProperty.id);
    }
    setShowDeleteConfirm(false);
    setSelectedProperty(null);
  };

  const handleShare = (property) => {
    if (navigator.share) {
      navigator.share({
        title: `${property.type} for sale`,
        text: `Check out this ${property.type} - ${formatCost(property.cost)}, ${formatSize(property.size)}`,
      });
    } else {
      alert('Share link copied to clipboard!');
    }
  };

  return (
    <div className="my-properties-container">
      {/* Header */}
      <div className="my-properties-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <h2>My Properties</h2>
        <div style={{ width: '40px' }} />
      </div>

      {/* Stats */}
      <div className="properties-stats">
        <div className="stat-card">
          <div className="stat-value">{properties.length}</div>
          <div className="stat-label">Total Properties</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{properties.filter(p => p.status === 'active').length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">Views</div>
        </div>
      </div>

      {/* Properties List */}
      <div className="properties-content">
        {properties.length === 0 ? (
          <div className="empty-properties">
            <div className="empty-icon">🏠</div>
            <h3>No Properties Yet</h3>
            <p>Start by posting your first property!</p>
          </div>
        ) : (
          properties.map((property) => (
            <div key={property.id} className="my-property-card">
              {/* Property Header */}
              <div className="property-card-header">
                <div className="property-type-badge">
                  <span className="property-emoji">{getPropertyIcon(property.type)}</span>
                  <span>{property.type?.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="property-id">#{property.id?.substring(0, 8)}</div>
              </div>

              {/* Property Details */}
              <div className="property-main-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <div className="detail-label">Cost</div>
                    <div className="detail-value">{formatCost(property.cost)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Size</div>
                    <div className="detail-value">{formatSize(property.size)}</div>
                  </div>
                </div>

                {property.bhk && (
                  <div className="property-bhk">🚪 {property.bhk} BHK</div>
                )}

                {property.location?.address && (
                  <div className="property-location-info">
                    <MapPin size={14} />
                    <span>{property.location.address}</span>
                  </div>
                )}

                {property.negotiable && (
                  <div className="negotiable-badge">✅ Negotiable</div>
                )}
              </div>

              {/* Actions */}
              <div className="property-actions">
                <button
                  className="action-btn-small view"
                  onClick={() => onView && onView(property)}
                >
                  <Eye size={16} />
                  <span>View</span>
                </button>
                <button
                  className="action-btn-small edit"
                  onClick={() => onEdit && onEdit(property)}
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button
                  className="action-btn-small share"
                  onClick={() => handleShare(property)}
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
                <button
                  className="action-btn-small delete"
                  onClick={() => handleDelete(property)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Property?</h3>
            <p>Are you sure you want to delete this property? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button className="modal-btn delete" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPropertiesList;