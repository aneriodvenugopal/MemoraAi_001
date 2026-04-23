import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileUp, MapPin, Hash, Trash2, RefreshCw, 
  CheckCircle, XCircle, AlertTriangle, Users, Database,
  ArrowLeft, FileText, Loader2, Eye, Link, Settings, Shield
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VotersListImport = () => {
  const navigate = useNavigate();
  
  // Form state
  const [village, setVillage] = useState('Aliyabad');
  const [wardNo, setWardNo] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [importMethod, setImportMethod] = useState('excel'); // 'excel', 'pdf', 'url', 'text'
  const [textData, setTextData] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Data state
  const [wards, setWards] = useState([]);
  const [stats, setStats] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [incompleteStats, setIncompleteStats] = useState(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`${API_URL}/api/voters/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
      
      // Also fetch incomplete stats
      const incompleteRes = await fetch(`${API_URL}/api/voters/incomplete-stats?village=${encodeURIComponent(village)}`);
      const incompleteData = await incompleteRes.json();
      if (incompleteData.success) {
        setIncompleteStats(incompleteData.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [village]);

  // Fetch wards
  const fetchWards = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/voters/wards?village=${encodeURIComponent(village)}`);
      const data = await response.json();
      if (data.success) {
        setWards(data.wards || []);
      }
    } catch (error) {
      console.error('Failed to fetch wards:', error);
    }
  }, [village]);

  useEffect(() => {
    fetchStats();
    fetchWards();
  }, [fetchStats, fetchWards]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isPdf = fileName.endsWith('.pdf');
      
      if (importMethod === 'excel' && !isExcel) {
        toast.error('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      if (importMethod === 'pdf' && !isPdf) {
        toast.error('Please select a PDF file');
        return;
      }
      
      // Check file size - warn if > 15MB
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > 15 && isPdf) {
        toast.warning(`Large file (${fileSizeMB.toFixed(1)} MB) - Use "From URL" for better reliability`, {
          duration: 8000
        });
      }
      
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!village.trim()) {
      toast.error('Please enter village name');
      return;
    }
    if (!wardNo.trim()) {
      toast.error('Please enter ward number');
      return;
    }
    
    // Validate based on import method
    if ((importMethod === 'excel' || importMethod === 'pdf') && !selectedFile) {
      toast.error(`Please select a ${importMethod === 'excel' ? 'Excel' : 'PDF'} file`);
      return;
    }
    if (importMethod === 'url' && !pdfUrl.trim()) {
      toast.error('Please enter PDF URL');
      return;
    }
    if (importMethod === 'text' && !textData.trim()) {
      toast.error('Please paste voter data');
      return;
    }
    
    // Block direct upload for PDF files > 25MB
    if (importMethod === 'pdf' && selectedFile) {
      const fileSizeMB = selectedFile.size / 1024 / 1024;
      if (fileSizeMB > 25) {
        toast.error(`File too large (${fileSizeMB.toFixed(1)} MB). Please use "From URL" option for files over 25MB.`);
        setImportMethod('url');
        return;
      }
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      let response;

      if (importMethod === 'url') {
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
      } else if (importMethod === 'excel') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('village', village.trim());
        formData.append('ward_no', wardNo.trim());
        formData.append('replace_existing', replaceExisting);

        response = await fetch(`${API_URL}/api/voters/upload-excel`, {
          method: 'POST',
          body: formData
        });
      } else {
        // PDF upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('village', village.trim());
        formData.append('ward_no', wardNo.trim());
        formData.append('replace_existing', replaceExisting);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

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
        toast.success(`Imported ${data.extracted_count} voters for Ward ${wardNo}!`);
        setSelectedFile(null);
        setPdfUrl('');
        setTextData('');
        const fileInput = document.getElementById('ward-pdf-input');
        if (fileInput) fileInput.value = '';
        const excelInput = document.getElementById('ward-excel-input');
        if (excelInput) excelInput.value = '';
        fetchStats();
        fetchWards();
      } else {
        toast.error(data.message || 'Import failed');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('Upload timed out. Try "Import from URL" for large files.');
      } else if (error.message === 'Failed to fetch') {
        toast.error('Network error. Try "Import from URL" for large files.');
      } else {
        toast.error('Failed: ' + error.message);
      }
      setUploadResult({ success: false, message: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete ward
  const handleDeleteWard = async (wardNumber) => {
    if (!window.confirm(`Delete all voters from Ward ${wardNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/voters/clear?village=${encodeURIComponent(village)}&ward_no=${wardNumber}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(`Deleted ${data.deleted_count} voters from Ward ${wardNumber}`);
        fetchStats();
        fetchWards();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-6 h-6 text-indigo-600" />
                  Ward-wise Voters Import
                </h1>
                <p className="text-gray-500 text-sm">Import voter data by ward</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/voters-bulk-update')}
              >
                <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                Fix Missing Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/voters-admin')}
              >
                <Shield className="w-4 h-4 mr-2 text-amber-500" />
                Admin Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Total Voters</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingStats ? '...' : (stats?.total || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Wards</p>
                  <p className="text-2xl font-bold text-gray-900">{wards.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Male</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.male?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Female</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.female?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Incomplete Records Card */}
          <Card className="bg-white border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate('/voters-bulk-update')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Incomplete</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {incompleteStats?.incomplete || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Import Form */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Import Ward Data
              </CardTitle>
              <CardDescription className="text-gray-500">
                Upload Excel, PDF, paste text or import from URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Village Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Village Name
                </label>
                <Input
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Enter village name"
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Ward Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ward Number *
                </label>
                <Input
                  type="number"
                  value={wardNo}
                  onChange={(e) => setWardNo(e.target.value)}
                  placeholder="e.g., 1, 2, 13"
                  min="1"
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Import Method Toggle - 4 Options */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setImportMethod('excel'); setSelectedFile(null); }}
                  className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                    importMethod === 'excel'
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => { setImportMethod('pdf'); setSelectedFile(null); }}
                  className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                    importMethod === 'pdf'
                      ? 'bg-red-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <FileUp className="w-4 h-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setImportMethod('url')}
                  className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                    importMethod === 'url'
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setImportMethod('text')}
                  className={`py-2 px-2 rounded-md text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                    importMethod === 'text'
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Text
                </button>
              </div>

              {/* Excel Upload */}
              {importMethod === 'excel' && (
                <div>
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors cursor-pointer bg-green-50"
                       onClick={() => document.getElementById('ward-excel-input').click()}>
                    <input
                      id="ward-excel-input"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-green-600" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-10 h-10 mx-auto text-green-400 mb-2" />
                        <p className="text-gray-700 font-medium">Click to upload Excel file</p>
                        <p className="text-xs text-gray-500 mt-1">Supports .xlsx and .xls files</p>
                        <p className="text-xs text-green-600 mt-2 font-medium">✓ Best option - All 943 records will import</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* PDF Upload */}
              {importMethod === 'pdf' && (
                <div>
                  <div className="border-2 border-dashed border-red-300 rounded-lg p-6 text-center hover:border-red-500 transition-colors cursor-pointer bg-red-50"
                       onClick={() => document.getElementById('ward-pdf-input').click()}>
                    <input
                      id="ward-pdf-input"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3">
                          <FileUp className="w-8 h-8 text-red-600" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                            <p className={`text-sm ${selectedFile.size / 1024 / 1024 > 15 ? 'text-amber-600' : 'text-gray-500'}`}>
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FileUp className="w-10 h-10 mx-auto text-red-400 mb-2" />
                        <p className="text-gray-700 font-medium">Click to upload PDF file</p>
                        <p className="text-xs text-gray-500 mt-1">For large files use URL option</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* URL Input */}
              {importMethod === 'url' && (
                <div>
                  <Input
                    placeholder="https://example.com/ward-voters.pdf"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Direct link to PDF file (for large files)</p>
                </div>
              )}

              {/* Text Input */}
              {importMethod === 'text' && (
                <div>
                  <textarea
                    placeholder={`Paste voter list text here...\n\nSupported formats:\n- Serial EPIC Name Father Age Gender House\n- Data copied from voter PDF`}
                    value={textData}
                    onChange={(e) => setTextData(e.target.value)}
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">Copy text from PDF and paste here</p>
                    <p className="text-xs text-purple-600 font-medium">
                      {textData ? `~${textData.split('\n').filter(l => l.trim()).length} lines` : '0 lines'}
                    </p>
                  </div>
                </div>
              )}

              {/* Replace Option */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="replace-ward"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="replace-ward" className="text-sm text-gray-700">
                  Replace existing data for this ward
                </label>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={isUploading || !wardNo || 
                  ((importMethod === 'excel' || importMethod === 'pdf') && !selectedFile) || 
                  (importMethod === 'url' && !pdfUrl) ||
                  (importMethod === 'text' && !textData)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing Ward {wardNo}...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Ward {wardNo || '?'} Voters
                  </>
                )}
              </Button>

              {/* Upload Result */}
              {uploadResult && (
                <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    {uploadResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${uploadResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {uploadResult.message}
                      </p>
                      {uploadResult.extracted_count !== undefined && (
                        <div className="text-sm text-gray-600 mt-2 space-y-1">
                          <p>Extracted: <span className="font-semibold text-gray-900">{uploadResult.extracted_count}</span> voters</p>
                          {uploadResult.skipped_count > 0 && (
                            <p>Skipped: <span className="text-amber-600 font-semibold">{uploadResult.skipped_count}</span> duplicates</p>
                          )}
                          {uploadResult.metadata?.total_pages && (
                            <p>Pages processed: <span className="font-semibold">{uploadResult.metadata.total_pages}</span></p>
                          )}
                          {uploadResult.missing_sl_numbers && uploadResult.missing_sl_numbers.length > 0 && (
                            <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                              <p className="text-amber-700 font-medium text-xs mb-1">Missing Serial Numbers:</p>
                              <p className="text-amber-600 text-xs">{uploadResult.missing_sl_numbers.slice(0, 20).join(', ')}{uploadResult.missing_sl_numbers.length > 20 ? '...' : ''}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {uploadResult.success && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => navigate(`/voters-bulk-update?ward=${wardNo}`)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Check Incomplete Records
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ward List */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Imported Wards
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { fetchStats(); fetchWards(); }}
                  className="text-gray-500 hover:text-gray-900"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription className="text-gray-500">
                {village} - {wards.length} ward(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wards.length > 0 ? (
                <div className="space-y-3">
                  {wards.map((ward) => (
                    <div
                      key={ward.ward_no}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-indigo-600">{ward.ward_no}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Ward {ward.ward_no}</p>
                          <p className="text-sm text-gray-500">{ward.voter_count.toLocaleString()} voters</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => navigate(`/voters-bulk-update?ward=${ward.ward_no}`)}
                          title="Check incomplete records"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          onClick={() => navigate(`/voterslist/${village.toLowerCase()}/ward/${ward.ward_no}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteWard(ward.ward_no)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No wards imported yet</p>
                  <p className="text-sm text-gray-400">Upload a ward PDF to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Guide */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-1">Quick Guide</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Enter ward number and upload the PDF for that ward</li>
                  <li>For large files (&gt;20MB), use &quot;From URL&quot; option</li>
                  <li>Check &quot;Replace existing&quot; to overwrite previous data</li>
                  <li>After import, click <span className="text-amber-600 font-medium">Check Incomplete Records</span> to view missing data</li>
                  <li>Use <span className="text-amber-600 font-medium">Admin Settings</span> to enable/disable ward visibility and export</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VotersListImport;
