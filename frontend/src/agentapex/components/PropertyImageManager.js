import React, { useState } from 'react';
import { Star, Trash2, GripVertical, X } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const PropertyImageManager = ({ propertyId, images, coverIndex, api, onUpdate, onClose }) => {
  const [localImages, setLocalImages] = useState([...images]);
  const [localCover, setLocalCover] = useState(coverIndex || 0);
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSetCover = async (idx) => {
    try {
      await api().put(`/properties/${propertyId}/cover-image`, null, { params: { index: idx } });
      setLocalCover(idx);
      toast.success('Cover image set');
    } catch (e) {
      toast.error('Failed to set cover');
    }
  };

  const handleDelete = async (idx) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await api().delete(`/properties/${propertyId}/images/${idx}`);
      const newImages = localImages.filter((_, i) => i !== idx);
      setLocalImages(newImages);
      if (localCover >= newImages.length) setLocalCover(0);
      toast.success('Image deleted');
      if (onUpdate) onUpdate(newImages);
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newImages = [...localImages];
    const [removed] = newImages.splice(dragIdx, 1);
    newImages.splice(idx, 0, removed);
    setLocalImages(newImages);
    setDragIdx(idx);
  };

  const handleDragEnd = async () => {
    setDragIdx(null);
    setSaving(true);
    try {
      await api().put(`/properties/${propertyId}/reorder-images`, { images: localImages });
      setLocalCover(0);
      toast.success('Images reordered');
      if (onUpdate) onUpdate(localImages);
    } catch (e) {
      toast.error('Failed to save order');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Manage Images</h2>
            <p className="text-xs text-gray-500">{localImages.length} images - drag to reorder</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {localImages.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No images</p>
          ) : (
            localImages.map((img, idx) => (
              <div
                key={`${img}-${idx}`}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                data-testid={`image-item-${idx}`}
                className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all ${
                  dragIdx === idx ? 'border-blue-400 bg-blue-50' : 
                  localCover === idx ? 'border-amber-400 bg-amber-50' : 'border-gray-100'
                }`}
              >
                <GripVertical className="w-5 h-5 text-gray-300 cursor-grab flex-shrink-0" />
                <img
                  src={`${API_BASE}${img}`}
                  alt={`Photo ${idx + 1}`}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">Photo {idx + 1}</p>
                  {localCover === idx && (
                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                      Cover Image
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSetCover(idx)}
                    data-testid={`set-cover-${idx}`}
                    className={`w-8 h-8 flex items-center justify-center rounded-full ${
                      localCover === idx ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                    title="Set as cover"
                  >
                    <Star className="w-4 h-4" fill={localCover === idx ? 'white' : 'none'} />
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    data-testid={`delete-image-${idx}`}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyImageManager;
