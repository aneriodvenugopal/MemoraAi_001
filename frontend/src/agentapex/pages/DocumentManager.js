import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  ArrowLeft, Upload, FileText, Shield, Book, FileCheck, 
  Map, CheckCircle, Receipt, File, Trash2, Download, 
  Plus, X, Loader2, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const ICON_MAP = {
  'file-text': FileText,
  'shield': Shield,
  'book': Book,
  'file-check': FileCheck,
  'map': Map,
  'check-circle': CheckCircle,
  'receipt': Receipt,
  'file': File,
};

const DocumentManager = () => {
  const navigate = useNavigate();
  const { propertyId } = useParams();
  const { api } = useAuth();
  const fileInputRef = useRef(null);
  
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [docName, setDocName] = useState('');

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [propRes, typesRes, docsRes] = await Promise.all([
        api().get(`/properties/${propertyId}`),
        api().get('/document-types'),
        api().get(`/properties/${propertyId}/documents`)
      ]);
      setProperty(propRes.data);
      setDocumentTypes(typesRes.data);
      setDocuments(docsRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(ext)) {
        toast.error('File type not allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB');
        return;
      }
      setSelectedFile(file);
      if (!docName) {
        setDocName(file.name.split('.')[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType || !docName) {
      toast.error('Please fill all fields');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('doc_type', selectedType);
      formData.append('doc_name', docName);

      await api().post(`/properties/${propertyId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Document uploaded');
      setShowUpload(false);
      setSelectedFile(null);
      setSelectedType('');
      setDocName('');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Failed to upload');
    }
    setUploading(false);
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return;

    try {
      await api().delete(`/properties/${propertyId}/documents/${docId}`);
      toast.success('Document deleted');
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete');
    }
  };

  const getTypeInfo = (typeId) => {
    return documentTypes.find(t => t.id === typeId) || { name: typeId, icon: 'file' };
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="document-manager">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Documents</h1>
            <p className="text-xs text-gray-500 truncate">{property?.title || 'Property'}</p>
          </div>
          <button 
            onClick={() => setShowUpload(true)}
            data-testid="upload-btn"
            className="w-10 h-10 flex items-center justify-center"
          >
            <Plus className="w-6 h-6 text-blue-500" />
          </button>
        </div>
      </header>

      {/* Document Types Grid */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 mb-3">Document Checklist</p>
        <div className="grid grid-cols-4 gap-2">
          {documentTypes.slice(0, 8).map(type => {
            const Icon = ICON_MAP[type.icon] || File;
            const count = documents.filter(d => d.type === type.id).length;
            return (
              <div key={type.id} className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                  count > 0 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${count > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <p className="text-[10px] text-gray-600 mt-1 truncate">{type.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents List */}
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">
          Uploaded ({documents.length})
        </p>
        
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-900 font-semibold">No documents yet</p>
            <p className="text-gray-500 text-sm mt-1">Upload your property documents</p>
            <button 
              onClick={() => setShowUpload(true)}
              className="mt-6 px-8 py-3 bg-blue-500 text-white font-semibold rounded-xl"
            >
              Upload Document
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, i) => {
              const typeInfo = getTypeInfo(doc.type);
              const Icon = ICON_MAP[typeInfo.icon] || File;
              
              return (
                <motion.div 
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-gray-50 rounded-xl p-4"
                  data-testid={`doc-${doc.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                      <Icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500">{typeInfo.name} • {formatSize(doc.size)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={`${process.env.REACT_APP_BACKEND_URL}${doc.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200"
                        data-testid={`view-doc-${doc.id}`}
                      >
                        <Eye className="w-5 h-5 text-gray-600" />
                      </a>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200"
                        data-testid={`delete-doc-${doc.id}`}
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Bottom Sheet */}
      <Drawer.Root open={showUpload} onOpenChange={setShowUpload}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] max-h-[85vh] flex flex-col outline-none">
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              
              <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Document</h2>

              {/* Document Type */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">Document Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {documentTypes.map(type => {
                    const Icon = ICON_MAP[type.icon] || File;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        data-testid={`type-${type.id}`}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          selectedType === type.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${selectedType === type.id ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className="text-sm">{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Document Name */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-2">Document Name</p>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g., Sale Deed 2024"
                  className="w-full"
                  data-testid="doc-name-input"
                />
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-2">Select File</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  data-testid="file-input"
                />
                
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <FileText className="w-10 h-10 text-green-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatSize(selectedFile.size)}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedFile(null)} 
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-2"
                    data-testid="select-file-btn"
                  >
                    <Upload className="w-10 h-10 text-gray-300" />
                    <p className="text-sm text-gray-500">Tap to select file</p>
                    <p className="text-xs text-gray-400">PDF, JPG, PNG, DOC (Max 10MB)</p>
                  </button>
                )}
              </div>
            </div>

            {/* Sticky Footer with Upload Button */}
            <div className="p-4 pt-2 border-t border-gray-100 bg-white">
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !selectedType || !docName}
                className="w-full py-4 bg-blue-500 disabled:bg-gray-200 text-white disabled:text-gray-400 font-semibold rounded-xl flex items-center justify-center gap-2"
                data-testid="confirm-upload-btn"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};

export default DocumentManager;
