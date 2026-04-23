import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader } from 'lucide-react';
import './PhotoUploader.css';

const PhotoUploader = ({ onPhotosChange, maxPhotos = 10 }) => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large
          const maxDimension = 1200;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to target 800KB
          let quality = 0.8;
          let blob;
          
          const tryCompress = (q) => {
            canvas.toBlob(
              (b) => {
                if (b.size > 800000 && q > 0.3) {
                  // Still too large, reduce quality
                  tryCompress(q - 0.1);
                } else {
                  blob = b;
                  resolve({
                    file: new File([blob], file.name, { type: 'image/jpeg' }),
                    preview: canvas.toDataURL('image/jpeg', q),
                    size: blob.size
                  });
                }
              },
              'image/jpeg',
              q
            );
          };

          tryCompress(quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (files) => {
    if (photos.length >= maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);
    const newPhotos = [];

    for (let file of files) {
      if (photos.length + newPhotos.length >= maxPhotos) break;
      
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        newPhotos.push(compressed);
      }
    }

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
    setUploading(false);
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleRemovePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div className="photo-uploader">
      <div className="upload-buttons">
        <button
          type="button"
          onClick={handleCameraClick}
          className="upload-btn camera-btn"
          disabled={uploading || photos.length >= maxPhotos}
        >
          <Camera size={20} />
          <span>Camera</span>
        </button>
        
        <button
          type="button"
          onClick={handleGalleryClick}
          className="upload-btn gallery-btn"
          disabled={uploading || photos.length >= maxPhotos}
        >
          <ImageIcon size={20} />
          <span>Gallery</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />

      {uploading && (
        <div className="upload-loader">
          <Loader size={20} className="spinner" />
          <span>Compressing images...</span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="photo-preview-grid">
          {photos.map((photo, index) => (
            <div key={index} className="photo-preview-item">
              <img src={photo.preview} alt={`Photo ${index + 1}`} />
              <button
                type="button"
                onClick={() => handleRemovePhoto(index)}
                className="remove-photo-btn"
              >
                <X size={16} />
              </button>
              <div className="photo-size">
                {(photo.size / 1024).toFixed(0)}KB
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="photo-counter">
        {photos.length} / {maxPhotos} photos
      </div>
    </div>
  );
};

export default PhotoUploader;
