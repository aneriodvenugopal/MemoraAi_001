import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GooglePlacesAutocomplete } from '../components/GooglePlacesAutocomplete';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  ArrowLeft, Pencil, Plus, Image, FileText, Youtube, 
  Check, X, Loader2, MapPin, IndianRupee, Maximize,
  Camera, Trash2, Upload, StickyNote, Hash
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const PropertyEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { api } = useAuth();
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit states
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editSuffix, setEditSuffix] = useState('');
  
  // Add media states
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { fetchProperty(); }, [id]);

  const fetchProperty = async () => {
    try {
      const res = await api().get(`/properties/${id}`);
      setProperty(res.data);
    } catch (e) { 
      toast.error('Failed to load property');
      navigate(-1);
    }
    setLoading(false);
  };

  const startEdit = (field, value, suffix = '') => {
    setEditingField(field);
    setEditValue(value?.toString() || '');
    setEditSuffix(suffix);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setEditSuffix('');
  };

  const saveEdit = async () => {
    if (!editingField) return;
    setSaving(true);
    
    try {
      let updateData = {};
      
      if (editingField === 'price') {
        updateData = { price: parseFloat(editValue), price_unit: editSuffix || property.price_unit };
      } else if (editingField === 'area') {
        updateData = { area: parseFloat(editValue), area_unit: editSuffix || property.area_unit };
      } else if (editingField === 'property_type') {
        updateData = { property_type: editValue };
      } else if (editingField === 'negotiable') {
        updateData = { negotiable: editValue === 'Yes' };
      } else if (editingField === 'description') {
        updateData = { description: editValue };
      } else if (editingField === 'location') {
        updateData = { location: editValue };
      }
      
      await api().put(`/properties/${id}`, updateData);
      setProperty(prev => ({ ...prev, ...updateData }));
      toast.success('Updated!');
      cancelEdit();
    } catch (e) {
      toast.error('Failed to update');
    }
    setSaving(false);
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    try {
      const res = await api().post(`/properties/${id}/images`, formData);
      setProperty(prev => ({ 
        ...prev, 
        images: [...(prev.images || []), ...res.data.urls] 
      }));
      toast.success(`${files.length} image(s) added!`);
    } catch (e) {
      toast.error('Failed to upload images');
    }
    setUploadingImage(false);
    setShowAddMedia(false);
  };

  const handleDocUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingDoc(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('document_type', 'general');
    
    try {
      const res = await api().post(`/properties/${id}/documents`, formData);
      setProperty(prev => ({ 
        ...prev, 
        documents: [...(prev.documents || []), ...res.data.documents] 
      }));
      toast.success(`${files.length} document(s) added!`);
    } catch (e) {
      toast.error('Failed to upload documents');
    }
    setUploadingDoc(false);
    setShowAddMedia(false);
  };

  const addYoutubeLink = async () => {
    if (!youtubeUrl) return;
    
    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      toast.error('Invalid YouTube URL');
      return;
    }
    
    try {
      const videos = [...(property.youtube_videos || []), youtubeUrl];
      await api().put(`/properties/${id}`, { youtube_videos: videos });
      setProperty(prev => ({ ...prev, youtube_videos: videos }));
      setYoutubeUrl('');
      toast.success('YouTube link added!');
      setShowAddMedia(false);
    } catch (e) {
      toast.error('Failed to add link');
    }
  };

  const deleteImage = async (imageUrl, index) => {
    try {
      const newImages = property.images.filter((_, i) => i !== index);
      await api().put(`/properties/${id}`, { images: newImages });
      setProperty(prev => ({ ...prev, images: newImages }));
      toast.success('Image removed');
    } catch (e) {
      toast.error('Failed to remove image');
    }
  };

  const deleteVideo = async (index) => {
    try {
      const newVideos = property.youtube_videos.filter((_, i) => i !== index);
      await api().put(`/properties/${id}`, { youtube_videos: newVideos });
      setProperty(prev => ({ ...prev, youtube_videos: newVideos }));
      toast.success('Video removed');
    } catch (e) {
      toast.error('Failed to remove video');
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const notes = [...(property.notes || []), { 
        text: noteText, 
        created_at: new Date().toISOString() 
      }];
      await api().put(`/properties/${id}`, { notes });
      setProperty(prev => ({ ...prev, notes }));
      setNoteText('');
      setShowAddNote(false);
      toast.success('Note added!');
    } catch (e) {
      toast.error('Failed to add note');
    }
    setSavingNote(false);
  };

  const deleteNote = async (index) => {
    try {
      const notes = property.notes.filter((_, i) => i !== index);
      await api().put(`/properties/${id}`, { notes });
      setProperty(prev => ({ ...prev, notes }));
      toast.success('Note removed');
    } catch (e) {
      toast.error('Failed to remove note');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Edit Property</h1>
            {property?.property_id && (
              <p className="text-xs text-gray-500 font-mono">{property.property_id}</p>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Property Type */}
        <EditableField
          label="Property Type"
          value={property.property_type}
          isEditing={editingField === 'property_type'}
          onEdit={() => startEdit('property_type', property.property_type)}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <div className="flex gap-2 mt-2">
            {['Land', 'Plot'].map(type => (
              <button
                key={type}
                onClick={() => setEditValue(type)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  editValue === type ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </EditableField>

        {/* Price */}
        <EditableField
          label="Price"
          value={`₹${property.price} ${property.price_unit}`}
          isEditing={editingField === 'price'}
          onEdit={() => startEdit('price', property.price, property.price_unit)}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl"
              placeholder="Enter price"
            />
            <select
              value={editSuffix}
              onChange={(e) => setEditSuffix(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl bg-white"
            >
              <option value="Lakhs">Lakhs</option>
              <option value="Crore">Crore</option>
            </select>
          </div>
        </EditableField>

        {/* Area */}
        <EditableField
          label="Area"
          value={`${property.area} ${property.area_unit}`}
          isEditing={editingField === 'area'}
          onEdit={() => startEdit('area', property.area, property.area_unit)}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl"
              placeholder="Enter area"
            />
            <select
              value={editSuffix}
              onChange={(e) => setEditSuffix(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl bg-white"
            >
              {property.property_type === 'Land' ? (
                <>
                  <option value="Acres">Acres</option>
                  <option value="Guntas">Guntas</option>
                  <option value="Hectare">Hectare</option>
                </>
              ) : (
                <>
                  <option value="Sq.Ft">Sq.Ft</option>
                  <option value="Sq.Yards">Sq.Yards</option>
                </>
              )}
            </select>
          </div>
        </EditableField>

        {/* Location - With Google Places Search */}
        <EditableField
          label="Location"
          value={property.location}
          isEditing={editingField === 'location'}
          onEdit={() => setShowLocationSearch(true)}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <div className="mt-2">
            <button
              onClick={() => setShowLocationSearch(true)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-left text-gray-600 flex items-center gap-2"
            >
              <MapPin className="w-5 h-5 text-gray-400" />
              {editValue || 'Search for location...'}
            </button>
          </div>
        </EditableField>
        
        {/* Google Places Location Search */}
        {showLocationSearch && (
          <GooglePlacesAutocomplete
            mode="fullscreen"
            placeholder="Search village, area, city..."
            initialValue={property.location?.split(',')[0] || ''}
            onSelect={async (location) => {
              setSaving(true);
              try {
                await api().put(`/properties/${id}`, {
                  location: location.formatted_address,
                  location_text: location.location_text,
                  place_id: location.place_id,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  city: location.city,
                  state: location.state
                });
                setProperty(prev => ({
                  ...prev,
                  location: location.formatted_address,
                  latitude: location.latitude,
                  longitude: location.longitude
                }));
                toast.success('Location updated');
              } catch (err) {
                toast.error('Failed to update location');
              }
              setSaving(false);
              setShowLocationSearch(false);
              setEditingField(null);
            }}
            onClose={() => setShowLocationSearch(false)}
          />
        )}

        {/* Negotiable */}
        <EditableField
          label="Negotiable"
          value={property.negotiable ? 'Yes' : 'No'}
          isEditing={editingField === 'negotiable'}
          onEdit={() => startEdit('negotiable', property.negotiable ? 'Yes' : 'No')}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <div className="flex gap-2 mt-2">
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                onClick={() => setEditValue(opt)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  editValue === opt ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </EditableField>

        {/* Description */}
        <EditableField
          label="Description"
          value={property.description || 'No description'}
          isEditing={editingField === 'description'}
          onEdit={() => startEdit('description', property.description || '')}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl mt-2 resize-none"
            rows={4}
            placeholder="Enter description"
          />
        </EditableField>

        {/* Images Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-500" />
              Photos ({property.images?.length || 0})
            </h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span>{uploadingImage ? 'Uploading...' : 'Add Photos'}</span>
            </button>
          </div>
          
          {property.images?.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {property.images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={img.startsWith('http') ? img : `${API_BASE}${img}`} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => deleteImage(img, i)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
              <Camera className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">No photos yet</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-blue-500 text-sm font-medium"
              >
                Click here to upload
              </button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              Documents ({property.documents?.length || 0})
            </h3>
            <button
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
              disabled={uploadingDoc}
            >
              {uploadingDoc ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{uploadingDoc ? 'Uploading...' : 'Add Documents'}</span>
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mb-3">
            Supported: PDF, DOC, DOCX, JPG, PNG (Max 10 files at once)
          </p>
          
          {property.documents?.length > 0 ? (
            <div className="space-y-2">
              {property.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{doc.name || `Document ${i+1}`}</span>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm">View</a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
              <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">No documents yet</p>
              <button 
                onClick={() => docInputRef.current?.click()}
                className="mt-2 text-green-500 text-sm font-medium"
              >
                Click here to upload
              </button>
            </div>
          )}
          
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
            onChange={handleDocUpload}
            className="hidden"
          />
        </div>

        {/* YouTube Links Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              Videos ({property.youtube_videos?.length || 0})
            </h3>
            <button
              onClick={() => setShowAddMedia(true)}
              className="p-2 bg-red-50 text-red-500 rounded-xl"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {property.youtube_videos?.length > 0 ? (
            <div className="space-y-2">
              {property.youtube_videos.map((url, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{url}</span>
                  <button onClick={() => deleteVideo(i)} className="text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No videos yet</p>
          )}
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-sky-500" />
              Notes ({property.notes?.length || 0})
            </h3>
            <button
              onClick={() => setShowAddNote(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 rounded-xl text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Note
            </button>
          </div>
          
          {property.notes?.length > 0 ? (
            <div className="space-y-2">
              {property.notes.map((note, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-sky-50 rounded-xl">
                  <StickyNote className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{note.text}</p>
                    {note.created_at && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <button onClick={() => deleteNote(i)} className="text-red-400 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No notes yet</p>
          )}
        </div>
      </div>

      {/* Floating + Button */}
      <button
        onClick={() => setShowAttachMenu(true)}
        data-testid="fab-attach-btn"
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center z-50"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Attach Menu Drawer */}
      <Drawer.Root open={showAttachMenu} onOpenChange={setShowAttachMenu}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[1002] outline-none">
            <div className="p-4 pb-8">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add to Property</h2>
              
              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                  data-testid="attach-gallery"
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Camera className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Gallery</span>
                </button>
                
                <button
                  onClick={() => { setShowAttachMenu(false); docInputRef.current?.click(); }}
                  data-testid="attach-document"
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-500" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Document</span>
                </button>
                
                <button
                  onClick={() => { setShowAttachMenu(false); setShowAddNote(true); }}
                  data-testid="attach-note"
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center">
                    <StickyNote className="w-6 h-6 text-sky-500" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Notes</span>
                </button>
                
                <button
                  onClick={() => { setShowAttachMenu(false); setShowAddMedia(true); }}
                  data-testid="attach-video"
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                    <Youtube className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Video</span>
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Add YouTube Link Drawer */}
      <Drawer.Root open={showAddMedia} onOpenChange={setShowAddMedia}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] outline-none">
            <div className="p-4 pb-8">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add YouTube Video</h2>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4"
              />
              <button
                onClick={addYoutubeLink}
                disabled={!youtubeUrl}
                className="w-full py-3.5 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Add Video Link
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Add Note Drawer */}
      <Drawer.Root open={showAddNote} onOpenChange={setShowAddNote}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] outline-none">
            <div className="p-4 pb-8">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add Note</h2>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your note..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none mb-4"
                data-testid="note-textarea"
              />
              <button
                onClick={addNote}
                disabled={!noteText.trim() || savingNote}
                className="w-full py-3.5 bg-sky-500 text-white font-semibold rounded-xl disabled:opacity-50"
                data-testid="save-note-btn"
              >
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Loading overlay */}
      {(uploadingImage || uploadingDoc) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-2xl p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span>Uploading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Editable Field Component
const EditableField = ({ label, value, isEditing, onEdit, onCancel, onSave, saving, children }) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        {!isEditing ? (
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Pencil className="w-4 h-4 text-gray-400" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={onSave} disabled={saving} className="p-2 bg-blue-500 text-white rounded-lg">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        children
      ) : (
        <p className="text-gray-900 font-medium mt-1">{value}</p>
      )}
    </div>
  );
};

export default PropertyEdit;
