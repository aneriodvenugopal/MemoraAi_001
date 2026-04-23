import React, { useState } from 'react';
import { ArrowLeft, Save, Camera, FileText, Video, Music, MapPin } from 'lucide-react';
import PhotoUploader from './PhotoUploader';
import './PropertyEdit.css';

const PropertyEdit = ({ property, onSave, onCancel, isPremium = false }) => {
  const [editedProperty, setEditedProperty] = useState(property);
  const [activeTab, setActiveTab] = useState('basic'); // basic, media, documents

  const handleSave = () => {
    onSave(editedProperty);
  };

  const handlePhotoChange = (photos) => {
    setEditedProperty(prev => ({
      ...prev,
      photos: photos.map(p => p.preview || p)
    }));
  };

  return (
    <div className="property-edit">
      {/* Header */}
      <div className="edit-header">
        <button className="back-btn" onClick={onCancel}>
          <ArrowLeft size={20} />
        </button>
        <h2>Edit Property</h2>
        <button className="save-btn" onClick={handleSave}>
          <Save size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="edit-tabs">
        <button
          className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Info
        </button>
        <button
          className={`tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Photos/Videos
        </button>
        <button
          className={`tab ${activeTab === 'documents' ? 'active' : ''} ${!isPremium ? 'locked' : ''}`}
          onClick={() => isPremium && setActiveTab('documents')}
        >
          Documents {!isPremium && '🔒'}
        </button>
      </div>

      {/* Content */}
      <div className="edit-content">
        {activeTab === 'basic' && (
          <div className="basic-info-form">
            <div className="form-group">
              <label>Property Type</label>
              <select
                value={editedProperty.type}
                onChange={(e) => setEditedProperty(prev => ({ ...prev, type: e.target.value }))}
                className="form-input"
              >
                <option value="land">Land</option>
                <option value="plot">Plot</option>
                <option value="flat">Flat</option>
                <option value="villa">Villa</option>
              </select>
            </div>

            <div className="form-group">
              <label>Total Cost</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  value={editedProperty.cost?.amount || ''}
                  onChange={(e) => setEditedProperty(prev => ({
                    ...prev,
                    cost: { ...prev.cost, amount: parseFloat(e.target.value) }
                  }))}
                  className="form-input"
                />
                <select
                  value={editedProperty.cost?.unit || 'lakhs'}
                  onChange={(e) => setEditedProperty(prev => ({
                    ...prev,
                    cost: { ...prev.cost, unit: e.target.value }
                  }))}
                  className="unit-select"
                >
                  <option value="thousands">Thousands</option>
                  <option value="lakhs">Lakhs</option>
                  <option value="crores">Crores</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Size</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  step="0.01"
                  value={editedProperty.size?.value || ''}
                  onChange={(e) => setEditedProperty(prev => ({
                    ...prev,
                    size: { ...prev.size, value: parseFloat(e.target.value) }
                  }))}
                  className="form-input"
                />
                <select
                  value={editedProperty.size?.unit || 'acres'}
                  onChange={(e) => setEditedProperty(prev => ({
                    ...prev,
                    size: { ...prev.size, unit: e.target.value }
                  }))}
                  className="unit-select"
                >
                  <option value="acres">Acres</option>
                  <option value="guntas">Guntas</option>
                  <option value="hectares">Hectares</option>
                  <option value="cents">Cents</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Negotiable</label>
              <select
                value={editedProperty.negotiable || 'yes'}
                onChange={(e) => setEditedProperty(prev => ({ ...prev, negotiable: e.target.value }))}
                className="form-input"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="form-group">
              <label>Location</label>
              <div className="location-display">
                <MapPin size={16} />
                <span>{editedProperty.location?.address || 'No location set'}</span>
              </div>
              <button
                className="change-location-btn"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setEditedProperty(prev => ({
                          ...prev,
                          location: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
                          }
                        }));
                      }
                    );
                  }
                }}
              >
                Update Location
              </button>
            </div>

            <div className="form-group">
              <label>Additional Notes</label>
              <textarea
                rows="4"
                placeholder="Add details about the property..."
                value={editedProperty.notes || ''}
                onChange={(e) => setEditedProperty(prev => ({ ...prev, notes: e.target.value }))}
                className="form-textarea"
              />
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="media-section">
            <h3>Property Photos</h3>
            <PhotoUploader
              onPhotosChange={handlePhotoChange}
              maxPhotos={10}
            />
            
            {!isPremium && (
              <div className="premium-prompt">
                <Video size={24} />
                <p>Upgrade to Premium to add videos</p>
                <button className="upgrade-btn-small">Upgrade Now</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="documents-section">
            {isPremium ? (
              <>
                <h3>Upload Documents</h3>
                <div className="upload-options">
                  <button className="upload-option">
                    <FileText size={24} />
                    <span>Sale Deed</span>
                  </button>
                  <button className="upload-option">
                    <FileText size={24} />
                    <span>Approvals</span>
                  </button>
                  <button className="upload-option">
                    <Music size={24} />
                    <span>Audio Note</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="premium-required">
                <h3>Premium Feature</h3>
                <p>Upgrade to add documents, videos, and audio notes</p>
                <button className="upgrade-btn">Upgrade for ₹99</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyEdit;
