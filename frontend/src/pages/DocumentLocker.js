/**
 * Document Locker - Simple document storage with physical location mapping
 * 
 * Features:
 * - Upload documents (PDF/JPG/PNG/DOC)
 * - Customer details: Name, Mobile, Email
 * - Manual keyword tagging for search
 * - Physical location mapping (visible to Admin/Accountant only)
 * - Search by customer name, mobile, keyword
 * - Email sharing (manual, no tracking)
 * 
 * NO AI, NO automation, NO smart features
 */
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Upload, Search, FolderOpen, Mail, Plus, Trash2,
  MapPin, Tag, User, Phone, Download, Eye, X, Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DocumentLocker = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  // State
  const [documents, setDocuments] = useState([]);
  const [physicalLocations, setPhysicalLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState({ customer_name: '', customer_mobile: '', keyword: '' });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  
  // Upload form
  const [uploadForm, setUploadForm] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_email: '',
    document_name: '',
    document_type: '',
    keywords: '',
    physical_location_id: '',
    notes: '',
    file_url: '',
    file_type: '',
    file_size: 0
  });
  
  // New location form
  const [newLocation, setNewLocation] = useState({ name: '', description: '' });
  
  // Email form
  const [emailTo, setEmailTo] = useState('');
  
  // Check if user can see physical location
  const canSeePhysicalLocation = user?.role === 'super_admin' || 
                                  user?.role === 'tenant_admin' || 
                                  user?.role === 'accountant';

  useEffect(() => {
    loadDocuments();
    loadPhysicalLocations();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/document-locker/documents`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setDocuments(response.data.documents);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadPhysicalLocations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/document-locker/physical-locations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setPhysicalLocations(response.data.locations);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/document-locker/documents/search`,
        {
          customer_name: searchQuery.customer_name || null,
          customer_mobile: searchQuery.customer_mobile || null,
          keyword: searchQuery.keyword || null
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) {
        setDocuments(response.data.documents);
        toast.success(`Found ${response.data.count} documents`);
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery({ customer_name: '', customer_mobile: '', keyword: '' });
    loadDocuments();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 
                          'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/document-locker/upload`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      if (response.data.success) {
        setUploadForm(prev => ({
          ...prev,
          file_url: response.data.file_url,
          file_type: response.data.file_type,
          file_size: response.data.file_size,
          document_name: response.data.original_name.replace(/\.[^/.]+$/, '')
        }));
        toast.success('File uploaded');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitDocument = async () => {
    // Validate required fields
    if (!uploadForm.customer_name || !uploadForm.customer_mobile || 
        !uploadForm.document_name || !uploadForm.physical_location_id || !uploadForm.file_url) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/document-locker/documents`,
        {
          ...uploadForm,
          keywords: uploadForm.keywords.split(',').map(k => k.trim()).filter(k => k)
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowUploadModal(false);
        resetUploadForm();
        loadDocuments();
        
        // Show physical code alert
        if (response.data.physical_code) {
          setTimeout(() => {
            alert(`IMPORTANT: Write this code on the physical file:\n\n${response.data.physical_code}`);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save document');
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      customer_name: '',
      customer_mobile: '',
      customer_email: '',
      document_name: '',
      document_type: '',
      keywords: '',
      physical_location_id: '',
      notes: '',
      file_url: '',
      file_type: '',
      file_size: 0
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) {
      toast.error('Location name is required');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/document-locker/physical-locations`,
        newLocation,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success('Location created');
        setShowLocationModal(false);
        setNewLocation({ name: '', description: '' });
        loadPhysicalLocations();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create location');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    
    try {
      await axios.delete(
        `${API_URL}/api/document-locker/documents/${docId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleShareEmail = async () => {
    if (!emailTo || !selectedDocument) return;
    
    const formData = new FormData();
    formData.append('email_to', emailTo);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/document-locker/documents/${selectedDocument.id}/share-email`,
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowEmailModal(false);
        setEmailTo('');
        setSelectedDocument(null);
      }
    } catch (error) {
      toast.error('Failed to share document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const documentTypes = [
    'Sale Deed', 'Agreement', 'Approval', 'NOC', 'Encumbrance Certificate',
    'Tax Receipt', 'ID Proof', 'Address Proof', 'Bank Statement', 'Other'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Archive className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Document Locker</h1>
              <p className="text-slate-500">Store and find documents quickly</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canSeePhysicalLocation && (
              <Button
                onClick={() => setShowLocationModal(true)}
                variant="outline"
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />
                Manage Locations
              </Button>
            )}
            <Button
              onClick={() => setShowUploadModal(true)}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-slate-500 mb-1 block">Customer Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery.customer_name}
                  onChange={(e) => setSearchQuery(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-slate-500 mb-1 block">Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by mobile..."
                  value={searchQuery.customer_mobile}
                  onChange={(e) => setSearchQuery(prev => ({ ...prev, customer_mobile: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-slate-500 mb-1 block">Keyword</label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by keyword..."
                  value={searchQuery.keyword}
                  onChange={(e) => setSearchQuery(prev => ({ ...prev, keyword: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} className="bg-slate-800 hover:bg-slate-900">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button onClick={clearSearch} variant="outline">
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-500">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No documents found</p>
              <p className="text-sm text-slate-400 mt-1">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="documents-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Document</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Customer</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Keywords</th>
                    {canSeePhysicalLocation && (
                      <th className="text-left p-3 text-sm font-semibold text-slate-600">Physical Location</th>
                    )}
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Uploaded</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-t hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-50 rounded">
                            <FileText className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{doc.document_name}</p>
                            <p className="text-xs text-slate-500">
                              {doc.document_type || 'Document'} • {doc.file_type?.toUpperCase()} • {formatFileSize(doc.file_size)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-slate-800">{doc.customer_name}</p>
                        <p className="text-xs text-slate-500">{doc.customer_mobile}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.keywords?.slice(0, 3).map((kw, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                          {doc.keywords?.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{doc.keywords.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      {canSeePhysicalLocation && (
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-4 h-4 text-amber-600" />
                            <span className="font-mono font-medium text-amber-700">
                              {doc.physical_code}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="p-3 text-sm text-slate-500">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`${API_URL}${doc.file_url}`, '_blank')}
                            title="View document"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDocument(doc);
                              setShowEmailModal(true);
                            }}
                            title="Share via email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-600" />
              Upload Document
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* File Upload */}
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploadForm.file_url ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-slate-800">{uploadForm.document_name}.{uploadForm.file_type}</p>
                    <p className="text-sm text-slate-500">{formatFileSize(uploadForm.file_size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadForm(prev => ({ ...prev, file_url: '', file_type: '', file_size: 0 }));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-slate-400">PDF, JPG, PNG, DOC (max 10MB)</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-4"
                    variant="outline"
                  >
                    {uploading ? 'Uploading...' : 'Select File'}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter customer name"
                  value={uploadForm.customer_name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, customer_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter mobile number"
                  value={uploadForm.customer_mobile}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, customer_mobile: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="Enter email"
                  value={uploadForm.customer_email}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, customer_email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g., Sale Deed - Plot 123"
                  value={uploadForm.document_name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, document_name: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Document Type & Keywords */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Document Type
                </label>
                <select
                  className="w-full border rounded-md p-2 text-sm"
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, document_type: e.target.value }))}
                >
                  <option value="">Select type...</option>
                  {documentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Keywords (comma separated)
                </label>
                <Input
                  placeholder="e.g., sale-deed, plot-123, 2024"
                  value={uploadForm.keywords}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, keywords: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Physical Location */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Physical Storage Location <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 border rounded-md p-2 text-sm"
                  value={uploadForm.physical_location_id}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, physical_location_id: e.target.value }))}
                >
                  <option value="">Select location...</option>
                  {physicalLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.description ? `(${loc.description})` : ''}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => setShowLocationModal(true)}
                  title="Add new location"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                A unique code will be generated. Write it on the physical file.
              </p>
            </div>
            
            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Notes (Optional)
              </label>
              <textarea
                className="w-full border rounded-md p-2 text-sm resize-none h-20"
                placeholder="Any additional notes..."
                value={uploadForm.notes}
                onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setShowUploadModal(false); resetUploadForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitDocument}
                disabled={!uploadForm.file_url || !uploadForm.customer_name || !uploadForm.customer_mobile || !uploadForm.physical_location_id}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Save Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Physical Location Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" />
              Physical Storage Locations
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing Locations */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {physicalLocations.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No locations created yet</p>
              ) : (
                physicalLocations.map(loc => (
                  <div key={loc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{loc.name}</p>
                      {loc.description && (
                        <p className="text-xs text-slate-500">{loc.description}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {loc.last_order_number || 0} documents
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Add New Location */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-slate-700 mb-2">Add New Location</p>
              <div className="space-y-2">
                <Input
                  placeholder="Location name (e.g., OFFICE-STORAGE-1)"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newLocation.description}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))}
                />
                <Button
                  onClick={handleCreateLocation}
                  disabled={!newLocation.name.trim()}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Location
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Share Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-600" />
              Share Document via Email
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800">{selectedDocument.document_name}</p>
                <p className="text-sm text-slate-500">
                  Customer: {selectedDocument.customer_name}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="Enter recipient email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowEmailModal(false); setEmailTo(''); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleShareEmail}
                  disabled={!emailTo}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentLocker;
