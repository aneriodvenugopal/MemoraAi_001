import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileUp, MapPin, Hash, Trash2, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, Users, Database,
  ArrowLeft, FileText, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VotersImport = () => {
  const navigate = useNavigate();
  
  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [village, setVillage] = useState('');
  const [wardNo, setWardNo] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Data state
  const [villages, setVillages] = useState([]);
  const [wards, setWards] = useState([]);
  const [stats, setStats] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  
  // URL import state
  const [pdfUrl, setPdfUrl] = useState('');
  const [useUrlImport, setUseUrlImport] = useState(false);
  
  // Text import state
  const [importMethod, setImportMethod] = useState('file'); // 'file', 'url', 'text'
  const [textData, setTextData] = useState('');
  
  // Loading states
  const [loadingStats, setLoadingStats] = useState(false);

  // Fetch existing villages
  const fetchVillages = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/voters/villages`);
      const data = await response.json();
      if (data.success) {
        setVillages(data.villages || []);
      }
    } catch (error) {
      console.error('Failed to fetch villages:', error);
    }
  }, []);

  // Fetch wards for selected village
  const fetchWards = useCallback(async (villageName) => {
    if (!villageName) {
      setWards([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/voters/wards?village=${encodeURIComponent(villageName)}`);
      const data = await response.json();
      if (data.success) {
        setWards(data.wards || []);
      }
    } catch (error) {
      console.error('Failed to fetch wards:', error);
    }
  }, []);

  // Fetch overall stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`${API_URL}/api/voters/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchVillages();
    fetchStats();
  }, [fetchVillages, fetchStats]);

  // Fetch wards when village changes
  useEffect(() => {
    if (village) {
      fetchWards(village);
    }
  }, [village, fetchWards]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Please select a PDF file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File too large. Maximum 100MB allowed.');
        return;
      }
      
      // Check file size - warn if > 15MB
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > 15) {
        toast.warning(`Large file (${fileSizeMB.toFixed(1)} MB) - Use "From URL" for better reliability`, {
          duration: 8000
        });
      }
      
      setSelectedFile(file);
      setUploadResult(null);
      setUseUrlImport(false);
    }
  };

  // Handle upload (file, URL, or text)
  const handleUpload = async () => {
    // Validate inputs
    if (importMethod === 'file' && !selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }
    if (importMethod === 'url' && !pdfUrl.trim()) {
      toast.error('Please enter a PDF URL');
      return;
    }
    if (importMethod === 'text' && !textData.trim()) {
      toast.error('Please paste voter data text');
      return;
    }
    if (!village.trim()) {
      toast.error('Please enter village name');
      return;
    }
    
    // Block direct upload for files > 25MB
    if (importMethod === 'file' && selectedFile) {
      const fileSizeMB = selectedFile.size / 1024 / 1024;
      if (fileSizeMB > 25) {
        toast.error(`File too large (${fileSizeMB.toFixed(1)} MB). Please use "From URL" option for files over 25MB.`);
        setImportMethod('url');
        return;
      }
    }
    if (!wardNo.trim()) {
      toast.error('Please enter ward number');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      let response;
      
      if (importMethod === 'url') {
        // URL-based import (for large files)
        response = await fetch(`${API_URL}/api/voters/import-from-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: pdfUrl.trim(),
            village: village.trim(),
            ward_no: parseInt(wardNo.trim()),
            replace_existing: replaceExisting
          })
        });
      } else if (importMethod === 'text') {
        // Text-based import
        response = await fetch(`${API_URL}/api/voters/import-from-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text_data: textData.trim(),
            village: village.trim(),
            ward_no: parseInt(wardNo.trim()),
            replace_existing: replaceExisting
          })
        });
      } else {
        // Direct file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('village', village.trim());
        formData.append('ward_no', wardNo.trim());
        formData.append('replace_existing', replaceExisting);

        // Create AbortController for timeout (5 minutes for large files)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout

        response = await fetch(`${API_URL}/api/voters/upload-pdf`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setUploadResult(data);

      if (data.success) {
        toast.success(`Imported ${data.extracted_count} voters successfully!` + 
          (data.skipped_count > 0 ? ` (${data.skipped_count} duplicates skipped)` : ''));
        setSelectedFile(null);
        setPdfUrl('');
        setTextData('');
        // Reset file input
        const fileInput = document.getElementById('pdf-file-input');
        if (fileInput) fileInput.value = '';
        // Refresh data
        fetchVillages();
        fetchStats();
        fetchWards(village);
      } else {
        toast.error(data.message || 'Import failed');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('Upload timed out. Try using "Import from URL" option for large files.');
      } else if (error.message === 'Failed to fetch') {
        toast.error('Network error. For large files (>20MB), try using "Import from URL" option.');
      } else {
        toast.error('Failed to upload: ' + error.message);
      }
      setUploadResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle clear data
  const handleClearData = async (targetVillage, targetWard) => {
    if (!window.confirm(`Are you sure you want to delete voter data for ${targetVillage || 'all villages'} ${targetWard ? `Ward ${targetWard}` : '(all wards)'}?`)) {
      return;
    }

    try {
      const params = new URLSearchParams();
      if (targetVillage) params.append('village', targetVillage);
      if (targetWard) params.append('ward_no', targetWard);

      const response = await fetch(`${API_URL}/api/voters/clear?${params}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Deleted ${data.deleted_count} records`);
        fetchStats();
        fetchVillages();
        if (village) fetchWards(village);
      } else {
        toast.error('Failed to clear data');
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-6 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Database className="w-7 h-7" />
                  Voters Data Import
                </h1>
                <p className="text-indigo-100 text-sm mt-1">Upload PDFs and map to village/ward</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-blue-100 text-xs">Total Voters</p>
                  <p className="text-2xl font-bold">
                    {loadingStats ? '...' : (stats?.total || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-green-100 text-xs">Villages</p>
                  <p className="text-2xl font-bold">{villages.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Hash className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-purple-100 text-xs">Wards</p>
                  <p className="text-2xl font-bold">{stats?.wards?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-orange-100 text-xs">Per Ward</p>
                  <p className="text-2xl font-bold">
                    ~{stats?.total && stats?.wards?.length ? Math.round(stats.total / stats.wards.length) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Import Voter Data
              </CardTitle>
              <CardDescription>
                Upload a PDF voter list and map it to a village and ward
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Import Method Toggle */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setImportMethod('file')}
                  className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                    importMethod === 'file'
                      ? 'bg-white text-indigo-600 shadow' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📁 PDF File
                </button>
                <button
                  type="button"
                  onClick={() => setImportMethod('url')}
                  className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                    importMethod === 'url'
                      ? 'bg-white text-indigo-600 shadow' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔗 From URL
                </button>
                <button
                  type="button"
                  onClick={() => setImportMethod('text')}
                  className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                    importMethod === 'text'
                      ? 'bg-white text-indigo-600 shadow' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📝 Paste Text
                </button>
              </div>

              {/* File Upload */}
              {importMethod === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select PDF File *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                    <input
                      id="pdf-file-input"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      data-testid="pdf-file-input"
                    />
                    <label
                      htmlFor="pdf-file-input"
                      className="cursor-pointer"
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileUp className="w-8 h-8 text-indigo-600" />
                          <div className="text-left">
                            <p className="font-medium text-gray-800">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <FileUp className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-600">Click to browse or drag PDF here</p>
                          <p className="text-xs text-gray-400 mt-1">For large files (&gt;20MB), use &quot;Import from URL&quot;</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}
              
              {/* URL Input */}
              {importMethod === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF URL * <span className="text-xs text-gray-500">(for large files)</span>
                  </label>
                  <Input
                    placeholder="https://example.com/voters.pdf"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    className="font-mono text-sm"
                    data-testid="pdf-url-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste a direct link to the PDF file. Works better for large files.
                  </p>
                </div>
              )}

              {/* Text Input */}
              {importMethod === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Voter Data * <span className="text-xs text-gray-500">(copy from PDF)</span>
                  </label>
                  <textarea
                    placeholder={`Paste voter list text here...\n\nExample format:\n1 YTL0123456 Name Father Name 45 M 1-23\n2 YTL0123457 Name Father Name 32 F 1-24`}
                    value={textData}
                    onChange={(e) => setTextData(e.target.value)}
                    className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    data-testid="text-data-input"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      Copy text from voter PDF and paste here
                    </p>
                    <p className="text-xs text-indigo-600 font-medium">
                      {textData ? `~${textData.split('\n').filter(l => l.trim()).length} lines` : '0 lines'}
                    </p>
                  </div>
                </div>
              )}

              {/* Village Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Village Name *
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter village name (e.g., Aliyabad)"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="flex-1"
                    data-testid="village-input"
                  />
                  {villages.length > 0 && (
                    <Select value={village} onValueChange={setVillage}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Existing" />
                      </SelectTrigger>
                      <SelectContent>
                        {villages.map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Ward Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ward Number *
                </label>
                <Input
                  type="number"
                  placeholder="Enter ward number (e.g., 1, 13)"
                  value={wardNo}
                  onChange={(e) => setWardNo(e.target.value)}
                  min="1"
                  data-testid="ward-input"
                />
              </div>

              {/* Replace Option */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="replace-existing"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="replace-existing" className="text-sm text-gray-700">
                  Replace existing data for this village/ward
                </label>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={isUploading || (!useUrlImport && !selectedFile) || (useUrlImport && !pdfUrl) || !village || !wardNo}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                data-testid="upload-button"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {useUrlImport ? 'Importing from URL...' : 'Processing PDF...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {useUrlImport ? 'Import from URL' : 'Import Voters'}
                  </>
                )}
              </Button>

              {/* Upload Result */}
              {uploadResult && (
                <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    {uploadResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {uploadResult.message}
                      </p>
                      {uploadResult.metadata && (
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          <p>Pages processed: {uploadResult.metadata.total_pages}</p>
                          <p>Extraction method: {uploadResult.metadata.extraction_method}</p>
                          {uploadResult.metadata.detected_ward && (
                            <p>Auto-detected ward: {uploadResult.metadata.detected_ward}</p>
                          )}
                          {uploadResult.replaced_count > 0 && (
                            <p>Replaced {uploadResult.replaced_count} existing records</p>
                          )}
                          {uploadResult.metadata.errors?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-orange-600 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                Extraction warnings:
                              </p>
                              <ul className="list-disc list-inside text-xs text-gray-500 mt-1">
                                {uploadResult.metadata.errors.map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-600" />
                  Existing Data
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchStats();
                    fetchVillages();
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                View and manage imported voter data by village and ward
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.ward_wise && Object.keys(stats.ward_wise).length > 0 ? (
                <div className="space-y-3">
                  {/* Ward-wise breakdown */}
                  <div className="divide-y">
                    {Object.entries(stats.ward_wise).sort((a, b) => Number(a[0]) - Number(b[0])).map(([ward, count]) => (
                      <div key={ward} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-indigo-600">{ward}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">Ward {ward}</p>
                            <p className="text-sm text-gray-500">{count.toLocaleString()} voters</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/voterslist/aliyabad/ward/${ward}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleClearData('aliyabad', ward)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Gender breakdown */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Gender Distribution</h4>
                    <div className="flex gap-4">
                      <div className="flex-1 bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.male?.toLocaleString() || 0}</p>
                        <p className="text-xs text-blue-600">Male</p>
                      </div>
                      <div className="flex-1 bg-pink-50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-pink-600">{stats.female?.toLocaleString() || 0}</p>
                        <p className="text-xs text-pink-600">Female</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No voter data imported yet</p>
                  <p className="text-sm text-gray-400">Upload a PDF to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
          <CardHeader>
            <CardTitle className="text-lg">How to Import Voter Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-medium text-gray-800">Select PDF File</h4>
                  <p className="text-sm text-gray-600">Click browse to select the voter list PDF. Supported format is the standard Ward Photo Voter List.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-medium text-gray-800">Map Village & Ward</h4>
                  <p className="text-sm text-gray-600">Enter the village name and ward number. You can select existing villages from the dropdown.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-medium text-gray-800">Import & View</h4>
                  <p className="text-sm text-gray-600">Click Import to process the PDF. View imported data using the Voters List page.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VotersImport;
