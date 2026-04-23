import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Users, User, ChevronLeft, ChevronRight, Lock, Eye, EyeOff, Download, RefreshCw, MapPin, Phone, Check, X, Edit2, Plus, FileSpreadsheet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Manual Voter Entry Modal
const AddVoterModal = ({ isOpen, onClose, village, wardNo, onVoterAdded }) => {
  const [formData, setFormData] = useState({
    epic_no: '',
    name: '',
    father_husband_name: '',
    age: '',
    gender: '',
    house_number: '',
    sl_no: '',
    mobile_number: ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.epic_no.trim()) {
      toast.error('EPIC Number is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/voters/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          village: village,
          ward_no: wardNo
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Voter ${formData.epic_no} added successfully`);
        onVoterAdded(data.voter);
        setFormData({
          epic_no: '',
          name: '',
          father_husband_name: '',
          age: '',
          gender: '',
          house_number: '',
          sl_no: '',
          mobile_number: ''
        });
        onClose();
      } else {
        toast.error(data.detail || 'Failed to add voter');
      }
    } catch (error) {
      toast.error('Failed to add voter');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Voter
          </h2>
          <p className="text-indigo-100 text-sm mt-1">
            {village} - Ward {wardNo}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">EPIC Number *</label>
              <Input
                value={formData.epic_no}
                onChange={(e) => handleChange('epic_no', e.target.value.toUpperCase())}
                placeholder="e.g., YAV1234567"
                className="font-mono"
                autoFocus
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Full name"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Father/Husband Name</label>
              <Input
                value={formData.father_husband_name}
                onChange={(e) => handleChange('father_husband_name', e.target.value)}
                placeholder="Father or Husband name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="Age"
                min="18"
                max="120"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House No</label>
              <Input
                value={formData.house_number}
                onChange={(e) => handleChange('house_number', e.target.value)}
                placeholder="e.g., 1-123"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SL No</label>
              <Input
                type="number"
                value={formData.sl_no}
                onChange={(e) => handleChange('sl_no', e.target.value)}
                placeholder="Serial No"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <Input
                type="tel"
                inputMode="numeric"
                value={formData.mobile_number}
                onChange={(e) => handleChange('mobile_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                maxLength={10}
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Voter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Inline editable row component
const VoterRow = ({ voter, index, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [mobileValue, setMobileValue] = useState(voter.mobile_number || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validate mobile number (10 digits or empty)
    if (mobileValue && !/^[0-9]{10}$/.test(mobileValue)) {
      toast.error('Mobile number must be 10 digits');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/voters/update/${voter.epic_no}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: mobileValue })
      });

      const data = await response.json();
      if (data.success) {
        onUpdate(data.voter);
        setIsEditing(false);
        toast.success('Mobile number updated');
      } else {
        toast.error(data.detail || 'Failed to update');
      }
    } catch (error) {
      toast.error('Failed to update mobile number');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setMobileValue(voter.mobile_number || '');
    setIsEditing(false);
  };

  // Get relation badge color
  const getRelationBadge = (relationType) => {
    if (!relationType) return null;
    const type = relationType.toLowerCase();
    if (type.includes('father')) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Father</span>;
    } else if (type.includes('husband')) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Husband</span>;
    }
    return <span className="text-gray-500 text-xs">{relationType}</span>;
  };

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-3 py-2 text-sm text-gray-900 font-medium">{voter.s_no || voter.sl_no || (index + 1)}</td>
      <td className="px-3 py-2 text-sm font-mono text-indigo-600">{voter.ac_ps_sl || '-'}</td>
      <td className="px-3 py-2 text-sm font-medium text-gray-900">{voter.name || '-'}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{voter.relation_name || voter.father_husband_name || '-'}</td>
      <td className="px-3 py-2 text-sm">{getRelationBadge(voter.relation_type)}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{voter.age || '-'}</td>
      <td className="px-3 py-2 text-sm">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          voter.gender === 'M' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-pink-100 text-pink-800'
        }`}>
          {voter.gender === 'M' ? 'M' : voter.gender === 'F' ? 'F' : '-'}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-gray-600">{voter.house_number || '-'}</td>
      <td className="px-3 py-2 text-sm font-mono text-blue-600">{voter.epic_no}</td>
      <td className="px-3 py-2 text-sm">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              value={mobileValue}
              onChange={(e) => setMobileValue(e.target.value.replace(/\D/g, ''))}
              className="w-28 h-7 text-sm px-2"
              placeholder="10 digits"
              autoFocus
              disabled={saving}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {voter.mobile_number ? (
              <a href={`tel:${voter.mobile_number}`} className="text-blue-600 hover:underline flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {voter.mobile_number}
              </a>
            ) : (
              <span className="text-gray-400">-</span>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit mobile"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

const VotersList = () => {
  // Get URL params
  const { village, wardNo } = useParams();
  const navigate = useNavigate();
  
  // Derived values from URL
  const urlVillage = village || 'aliyabad';
  const urlWard = wardNo || null;

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Data state
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [availableWards, setAvailableWards] = useState([]);

  // Filter state - use URL ward if provided
  const [selectedWard, setSelectedWard] = useState(urlWard || 'all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVoters, setTotalVoters] = useState(0);
  const limit = 100; // Show 100 records per page (max 2000 supported)

  // Update selected ward when URL changes
  useEffect(() => {
    if (urlWard) {
      setSelectedWard(urlWard);
    }
  }, [urlWard]);

  // Check if already authenticated
  useEffect(() => {
    const token = sessionStorage.getItem('voters_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/voters/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('voters_token', data.token);
        setIsAuthenticated(true);
        toast.success('Login successful!');
      } else {
        toast.error(data.detail || 'Invalid password');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Fetch available wards
  const fetchAvailableWards = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/voters/wards?village=${urlVillage}`);
      const data = await response.json();
      if (data.success) {
        setAvailableWards(data.wards || []);
      }
    } catch (error) {
      console.error('Failed to fetch wards');
    }
  }, [urlVillage]);

  // Fetch voters list
  const fetchVoters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('village', urlVillage);
      if (selectedWard !== 'all') params.append('ward', selectedWard);
      if (selectedGender !== 'all') params.append('gender', selectedGender);
      if (ageMin) params.append('age_min', ageMin);
      if (ageMax) params.append('age_max', ageMax);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', currentPage);
      params.append('limit', limit);

      const response = await fetch(`${API_URL}/api/voters/list?${params}`);
      const data = await response.json();

      if (data.success) {
        setVoters(data.data);
        setTotalPages(data.pagination.total_pages);
        setTotalVoters(data.pagination.total);
      }
    } catch (error) {
      toast.error('Failed to fetch voters');
    } finally {
      setLoading(false);
    }
  }, [urlVillage, selectedWard, selectedGender, ageMin, ageMax, searchQuery, currentPage]);

  // Export to Excel
  const handleExport = async (exportType) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('export_type', exportType);
      params.append('village', urlVillage);
      if (selectedWard !== 'all') params.append('ward', selectedWard);
      if (selectedGender !== 'all') params.append('gender', selectedGender);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`${API_URL}/api/voters/export/excel?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'voters.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success(`Exported ${exportType === 'all' ? 'all' : 'filtered'} voters successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  // Handle new voter added
  const handleVoterAdded = (newVoter) => {
    setVoters(prev => [newVoter, ...prev]);
    setTotalVoters(prev => prev + 1);
    fetchStats();
  };

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('village', urlVillage);
      if (selectedWard !== 'all') params.append('ward', selectedWard);

      const response = await fetch(`${API_URL}/api/voters/stats?${params}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  }, [urlVillage, selectedWard]);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchVoters();
      fetchStats();
      fetchAvailableWards();
    }
  }, [isAuthenticated, fetchVoters, fetchStats, fetchAvailableWards]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWard, selectedGender, ageMin, ageMax, searchQuery]);

  // Handle ward change - update URL
  const handleWardChange = (ward) => {
    setSelectedWard(ward);
    if (ward !== 'all') {
      navigate(`/voterslist/${urlVillage}/ward/${ward}`);
    } else {
      navigate(`/voterslist/${urlVillage}`);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedWard(urlWard || 'all');
    setSelectedGender('all');
    setAgeMin('');
    setAgeMax('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Format village name for display
  const formatVillageName = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Voters List</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <MapPin className="w-4 h-4 text-gray-300" />
              <p className="text-gray-300 text-sm">
                {formatVillageName(urlVillage)} Municipality
                {urlWard && <span className="text-blue-300 font-semibold"> - Ward {urlWard}</span>}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                disabled={loginLoading}
                data-testid="login-button"
              >
                {loginLoading ? 'Logging in...' : 'Access Voters List'}
              </Button>
            </form>
            <p className="text-center text-gray-400 text-xs mt-4">
              Contact admin for password
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Voters List Screen
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add Voter Modal */}
      <AddVoterModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        village={urlVillage}
        wardNo={selectedWard !== 'all' ? selectedWard : urlWard || '1'}
        onVoterAdded={handleVoterAdded}
      />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-7 h-7" />
                Voters List - Aliyabad
              </h1>
              <p className="text-blue-100 text-sm mt-1">Ward-wise Electoral Roll</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Add Voter Button */}
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => setShowAddModal(true)}
                data-testid="add-voter-button"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Voter
              </Button>
              
              {/* Export Dropdown */}
              <div className="relative group">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  disabled={exporting}
                  data-testid="export-button"
                >
                  {exporting ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                  )}
                  Export Excel
                </Button>
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={() => handleExport('filtered')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Export Filtered ({totalVoters})
                  </button>
                  <button
                    onClick={() => handleExport('all')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export All Data
                  </button>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => {
                  sessionStorage.removeItem('voters_token');
                  setIsAuthenticated(false);
                }}
                data-testid="logout-button"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <p className="text-blue-100 text-sm">Total Voters</p>
                <p className="text-3xl font-bold">{stats.total.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-4">
                <p className="text-green-100 text-sm">Male</p>
                <p className="text-3xl font-bold">{stats.male.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
              <CardContent className="p-4">
                <p className="text-pink-100 text-sm">Female</p>
                <p className="text-3xl font-bold">{stats.female.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <p className="text-purple-100 text-sm">Wards Available</p>
                <p className="text-3xl font-bold">{stats.wards?.length || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search name, EPIC, house no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>

              {/* Ward Filter */}
              <Select value={selectedWard} onValueChange={setSelectedWard}>
                <SelectTrigger className="w-[140px]" data-testid="ward-filter">
                  <SelectValue placeholder="Ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {stats?.wards?.map(ward => (
                    <SelectItem key={ward} value={String(ward)}>Ward {ward}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Gender Filter */}
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger className="w-[120px]" data-testid="gender-filter">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>

              {/* Age Range */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min Age"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="w-[90px]"
                  data-testid="age-min-input"
                />
                <span className="text-gray-400">-</span>
                <Input
                  type="number"
                  placeholder="Max Age"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="w-[90px]"
                  data-testid="age-max-input"
                />
              </div>

              {/* Clear & Refresh */}
              <Button variant="outline" size="icon" onClick={clearFilters} title="Clear Filters">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={fetchVoters} title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{voters.length}</span> of{' '}
            <span className="font-semibold">{totalVoters.toLocaleString()}</span> voters
          </p>
        </div>

        {/* Voters Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="voters-table">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">S.No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">AC-PS-SL</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Relation Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Relation</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Age</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sex</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Door No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EPIC No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mobile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading voters...
                    </td>
                  </tr>
                ) : voters.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      No voters found
                    </td>
                  </tr>
                ) : (
                  voters.map((voter, index) => (
                    <VoterRow 
                      key={voter.epic_no || index} 
                      voter={voter} 
                      index={index}
                      onUpdate={(updatedVoter) => {
                        setVoters(prev => prev.map(v => 
                          v.epic_no === updatedVoter.epic_no ? updatedVoter : v
                        ));
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="prev-page-btn"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="next-page-btn"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VotersList;
