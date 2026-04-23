import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { 
  Upload, X, File, Image, Video, FileText, 
  CheckCircle, AlertCircle, Loader2, Trash2 
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// File type icons
const getFileIcon = (category) => {
  switch (category) {
    case 'image': return <Image className="w-8 h-8 text-blue-500" />;
    case 'video': return <Video className="w-8 h-8 text-purple-500" />;
    case 'document': return <FileText className="w-8 h-8 text-orange-500" />;
    default: return <File className="w-8 h-8 text-gray-500" />;
  }
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * FileUploader Component
 * 
 * Props:
 * - context: Upload context (customer_document, property_media, agreement, payment_proof, project_media, profile, general)
 * - relatedId: Related entity ID (customer_id, property_id, etc.)
 * - onUploadComplete: Callback when upload completes with file data
 * - accept: Accepted file types (e.g., "image/*", ".pdf,.doc")
 * - multiple: Allow multiple file selection
 * - maxFiles: Maximum number of files (default 10)
 * - showPreview: Show preview for uploaded files
 */
const FileUploader = ({ 
  context = 'general',
  relatedId = null,
  onUploadComplete,
  accept = 'image/*,.pdf,.doc,.docx',
  multiple = false,
  maxFiles = 10,
  showPreview = true,
  className = ''
}) => {
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]); // { file, progress, status, result }
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', context);
    if (relatedId) {
      formData.append('related_id', relatedId);
    }

    try {
      const response = await fetch(`${API_URL}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleFiles = async (files) => {
    const fileArray = Array.from(files).slice(0, maxFiles);
    
    if (fileArray.length === 0) return;

    setIsUploading(true);
    
    // Initialize upload state for each file
    const initialUploads = fileArray.map(file => ({
      file,
      progress: 0,
      status: 'pending',
      result: null
    }));
    
    setUploads(initialUploads);

    // Upload files sequentially
    const results = [];
    for (let i = 0; i < fileArray.length; i++) {
      setUploads(prev => prev.map((u, idx) => 
        idx === i ? { ...u, status: 'uploading', progress: 50 } : u
      ));

      const result = await uploadFile(fileArray[i]);
      
      setUploads(prev => prev.map((u, idx) => 
        idx === i ? { 
          ...u, 
          status: result.success ? 'complete' : 'error',
          progress: 100,
          result: result.success ? result.data : { error: result.error }
        } : u
      ));

      if (result.success) {
        results.push(result.data);
      }
    }

    setIsUploading(false);

    if (results.length > 0) {
      toast.success(`${results.length} file(s) uploaded successfully`);
      onUploadComplete?.(multiple ? results : results[0]);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  const removeUpload = (index) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploads([]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        data-testid="file-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          data-testid="file-input"
        />
        
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        
        <p className="text-lg font-medium text-gray-700">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Supports: Images, PDFs, Documents {multiple && `(max ${maxFiles} files)`}
        </p>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm text-gray-700">
                Uploads ({uploads.filter(u => u.status === 'complete').length}/{uploads.length})
              </h4>
              {!isUploading && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              {uploads.map((upload, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                >
                  {/* File Icon */}
                  {upload.result?.thumbnail_url ? (
                    <img 
                      src={`${API_URL}${upload.result.thumbnail_url}`}
                      alt=""
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(upload.result?.category)
                  )}
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {upload.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(upload.file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {upload.status === 'uploading' && (
                      <Progress value={upload.progress} className="h-1 mt-1" />
                    )}
                    
                    {/* Error Message */}
                    {upload.status === 'error' && (
                      <p className="text-xs text-red-500 mt-1">
                        {upload.result?.error || 'Upload failed'}
                      </p>
                    )}
                  </div>
                  
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {upload.status === 'uploading' && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {upload.status === 'complete' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    {upload.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  
                  {/* Remove Button */}
                  {!isUploading && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-auto"
                      onClick={() => removeUpload(index)}
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * FileGallery Component - Display uploaded files
 */
export const FileGallery = ({ 
  files = [], 
  onDelete, 
  showDelete = true,
  columns = 4 
}) => {
  const handleDelete = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      onDelete?.(fileId);
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <File className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-4`}>
      {files.map((file) => (
        <div 
          key={file.id || file.file_id} 
          className="relative group border rounded-lg overflow-hidden bg-gray-50"
        >
          {/* Preview */}
          {file.category === 'image' ? (
            <img 
              src={`${API_URL}${file.thumbnail_url || file.file_url}`}
              alt={file.original_filename}
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 flex items-center justify-center">
              {getFileIcon(file.category)}
            </div>
          )}
          
          {/* File Info */}
          <div className="p-2">
            <p className="text-xs font-medium text-gray-700 truncate">
              {file.original_filename}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(file.file_size)}
            </p>
          </div>
          
          {/* Actions Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(`${API_URL}${file.file_url}`, '_blank')}
            >
              View
            </Button>
            {showDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(file.id || file.file_id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileUploader;
