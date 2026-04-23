import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, AlertTriangle, Check, X, Edit2, ArrowLeft, 
  RefreshCw, Hash, MapPin, Plus, FileSpreadsheet, Copy, ListPlus
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Add/Edit Voter Modal
const VoterModal = ({ isOpen, onClose, voter, village, wardNo, onSave, initialSlNo }) => {
  const [formData, setFormData] = useState({
    epic_no: '',
    name: '',
    relation_type: 'Father',
    relation_name: '',
    age: '',
    gender: '',
    house_number: '',
    sl_no: '',
    mobile_number: ''
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!voter?.epic_no;

  useEffect(() => {
    if (voter) {
      setFormData({
        epic_no: voter.epic_no || '',
        name: voter.name || '',
        relation_type: voter.relation_type || 'Father',
        relation_name: voter.relation_name || voter.father_husband_name || '',
        age: voter.age || '',
        gender: voter.gender || '',
        house_number: voter.house_number || '',
        sl_no: voter.sl_no || '',
        mobile_number: voter.mobile_number || ''
      });
    } else {
      setFormData({
        epic_no: '',
        name: '',
        relation_type: 'Father',
        relation_name: '',
        age: '',
        gender: '',
        house_number: '',
        sl_no: initialSlNo || '',
        mobile_number: ''
      });
    }
  }, [voter, initialSlNo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.epic_no.trim()) {
      toast.error('EPIC Number is required');
      return;
    }

    setSaving(true);
    try {
      let response;
      
      if (isEdit) {
        response = await fetch(`${API_URL}/api/voters/update-full/${formData.epic_no}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            father_husband_name: formData.relation_name,
            village,
            ward_no: wardNo
          })
        });
      } else {
        response = await fetch(`${API_URL}/api/voters/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            father_husband_name: formData.relation_name,
            village,
            ward_no: wardNo
          })
        });
      }

      const data = await response.json();
      if (data.success) {
        toast.success(isEdit ? 'Voter updated' : 'Voter added');
        onSave(data.voter);
        onClose();
      } else {
        toast.error(data.detail || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save voter');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {isEdit ? <Edit2 className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-green-600" />}
            {isEdit ? 'Edit Voter' : 'Add New Voter'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {village} - Ward {wardNo}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number (SL No)</label>
              <Input
                type="number"
                value={formData.sl_no}
                onChange={(e) => setFormData(prev => ({ ...prev, sl_no: e.target.value }))}
                placeholder="e.g., 1, 2, 3..."
                className="bg-white border-gray-300 text-gray-900"
                autoFocus={!isEdit}
              />
              <p className="text-xs text-gray-400 mt-1">First box number from voter card</p>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">EPIC Number *</label>
              <Input
                value={formData.epic_no}
                onChange={(e) => setFormData(prev => ({ ...prev, epic_no: e.target.value.toUpperCase() }))}
                placeholder="e.g., YAV1234567"
                className="bg-white border-gray-300 text-gray-900 font-mono"
                disabled={isEdit}
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            {/* Relationship Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <Select value={formData.relation_type} onValueChange={(v) => setFormData(prev => ({ ...prev, relation_type: v }))}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Husband">Husband</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Relationship Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{formData.relation_type || 'Father'}&apos;s Name</label>
              <Input
                value={formData.relation_name}
                onChange={(e) => setFormData(prev => ({ ...prev, relation_name: e.target.value }))}
                placeholder={`${formData.relation_type || 'Father'}'s name`}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="Age"
                min="18"
                max="120"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">House No</label>
              <Input
                value={formData.house_number}
                onChange={(e) => setFormData(prev => ({ ...prev, house_number: e.target.value }))}
                placeholder="e.g., 1-123"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <Input
                type="tel"
                value={formData.mobile_number}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="10-digit mobile"
                maxLength={10}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={saving}
            >
              {saving ? 'Saving...' : (isEdit ? 'Update Voter' : 'Add Voter')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Missing Voters Modal - Add all missing serial numbers
const MissingVotersModal = ({ isOpen, onClose, missingNumbers, village, wardNo, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  
  useEffect(() => {
    setSelectedNumbers([]);
  }, [isOpen]);

  const toggleNumber = (num) => {
    setSelectedNumbers(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const selectAll = () => {
    setSelectedNumbers([...missingNumbers]);
  };

  const selectNone = () => {
    setSelectedNumbers([]);
  };

  const handleAddSelected = async () => {
    if (selectedNumbers.length === 0) {
      toast.error('Please select at least one serial number');
      return;
    }

    setSaving(true);
    try {
      // Create placeholder voters for selected serial numbers
      const voters = selectedNumbers.map(sl_no => ({
        sl_no,
        epic_no: `TEMP_${wardNo}_${sl_no}`, // Temporary EPIC, user will update
        name: '',
        relation_type: '',
        relation_name: '',
        age: null,
        gender: '',
        house_number: ''
      }));

      const response = await fetch(`${API_URL}/api/voters/add-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voters,
          village,
          ward_no: wardNo
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Added ${data.added_count} placeholder records. Please update EPIC numbers.`);
        onSave();
        onClose();
      } else {
        toast.error(data.detail || 'Failed to add');
      }
    } catch (error) {
      toast.error('Failed to add voters');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-sky-600" />
            Missing Serial Numbers - Ward {wardNo}
          </h2>
          <p className="text-gray-500 text-sm">{missingNumbers.length} serial numbers missing</p>
        </div>
        
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={selectAll} className="border-gray-300">
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone} className="border-gray-300">
            Select None
          </Button>
          <span className="text-sm text-gray-500 ml-auto">
            {selectedNumbers.length} selected
          </span>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="flex flex-wrap gap-2">
            {missingNumbers.map((num) => (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedNumbers.includes(num)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-gray-300"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
            disabled={saving || selectedNumbers.length === 0}
          >
            {saving ? 'Adding...' : `Add ${selectedNumbers.length} Placeholder Records`}
          </Button>
        </div>
        
        <div className="px-4 pb-4 bg-gray-50">
          <p className="text-xs text-gray-500">
            Note: This will create placeholder records with temporary EPIC numbers. 
            You will need to update them with actual EPIC numbers later.
          </p>
        </div>
      </div>
    </div>
  );
};

// Bulk Update Modal
const BulkUpdateModal = ({ isOpen, onClose, voters, village, wardNo, onSave }) => {
  const [bulkData, setBulkData] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (voters && voters.length > 0) {
      setBulkData(voters.map(v => ({
        epic_no: v.epic_no,
        sl_no: v.sl_no || '',
        name: v.name || '',
        relation_type: v.relation_type || 'Father',
        relation_name: v.relation_name || v.father_husband_name || '',
        age: v.age || '',
        gender: v.gender || '',
        house_number: v.house_number || ''
      })));
    }
  }, [voters]);

  const handleChange = (index, field, value) => {
    setBulkData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const voter of bulkData) {
      try {
        const response = await fetch(`${API_URL}/api/voters/update-full/${voter.epic_no}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...voter,
            father_husband_name: voter.relation_name,
            village,
            ward_no: wardNo
          })
        });

        const data = await response.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    setSaving(false);
    toast.success(`Updated ${successCount} voters${failCount > 0 ? `, ${failCount} failed` : ''}`);
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Bulk Update - {bulkData.length} Records
            </h2>
            <p className="text-gray-500 text-sm">{village} - Ward {wardNo}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-300"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAll}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">SL No</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">EPIC No</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Relation</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Relation Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Age</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Gender</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">House No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bulkData.map((voter, index) => (
                <tr key={voter.epic_no} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={voter.sl_no}
                      onChange={(e) => handleChange(index, 'sl_no', e.target.value)}
                      className="w-16 h-8 text-xs bg-white border-gray-200"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{voter.epic_no}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={voter.name}
                      onChange={(e) => handleChange(index, 'name', e.target.value)}
                      className="h-8 text-xs bg-white border-gray-200"
                      placeholder="Name"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={voter.relation_type}
                      onChange={(e) => handleChange(index, 'relation_type', e.target.value)}
                      className="h-8 text-xs border border-gray-200 rounded px-2 bg-white"
                    >
                      <option value="Father">Father</option>
                      <option value="Husband">Husband</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={voter.relation_name}
                      onChange={(e) => handleChange(index, 'relation_name', e.target.value)}
                      className="h-8 text-xs bg-white border-gray-200"
                      placeholder={`${voter.relation_type}'s name`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={voter.age}
                      onChange={(e) => handleChange(index, 'age', e.target.value)}
                      className="w-16 h-8 text-xs bg-white border-gray-200"
                      placeholder="Age"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={voter.gender}
                      onChange={(e) => handleChange(index, 'gender', e.target.value)}
                      className="h-8 text-xs border border-gray-200 rounded px-2 bg-white"
                    >
                      <option value="">-</option>
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={voter.house_number}
                      onChange={(e) => handleChange(index, 'house_number', e.target.value)}
                      className="h-8 text-xs bg-white border-gray-200"
                      placeholder="House No"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VotersBulkUpdate = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [loading, setLoading] = useState(true);
  const [voters, setVoters] = useState([]);
  const [wards, setWards] = useState([]);
  const [incompleteStats, setIncompleteStats] = useState(null);
  const [missingSlNumbers, setMissingSlNumbers] = useState([]);
  const [expectedTotal, setExpectedTotal] = useState('');
  
  // Filters
  const [village] = useState(searchParams.get('village') || 'aliyabad');
  const [selectedWard, setSelectedWard] = useState(searchParams.get('ward') || 'all');
  const [filterType, setFilterType] = useState(searchParams.get('filter') || 'incomplete');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVoter, setEditingVoter] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedVoters, setSelectedVoters] = useState([]);
  const [missingModalOpen, setMissingModalOpen] = useState(false);
  const [addSlNo, setAddSlNo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVoters, setTotalVoters] = useState(0);
  const limit = 50;

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

  // Fetch incomplete stats
  const fetchIncompleteStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/voters/incomplete-stats?village=${encodeURIComponent(village)}${selectedWard !== 'all' ? `&ward=${selectedWard}` : ''}`);
      const data = await response.json();
      if (data.success) {
        setIncompleteStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch incomplete stats:', error);
    }
  }, [village, selectedWard]);

  // Fetch missing serial numbers
  const fetchMissingSlNumbers = useCallback(async () => {
    if (selectedWard === 'all') {
      setMissingSlNumbers([]);
      return;
    }
    try {
      const url = `${API_URL}/api/voters/missing-sl-numbers?village=${encodeURIComponent(village)}&ward=${selectedWard}${expectedTotal ? `&expected_total=${expectedTotal}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setMissingSlNumbers(data.missing_numbers || []);
      }
    } catch (error) {
      console.error('Failed to fetch missing SL numbers:', error);
    }
  }, [village, selectedWard, expectedTotal]);

  // Fetch voters
  const fetchVoters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('village', village);
      if (selectedWard !== 'all') params.append('ward', selectedWard);
      params.append('filter_type', filterType);
      params.append('page', currentPage);
      params.append('limit', limit);

      const response = await fetch(`${API_URL}/api/voters/list-with-status?${params}`);
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
  }, [village, selectedWard, filterType, currentPage]);

  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  useEffect(() => {
    fetchVoters();
    fetchIncompleteStats();
    fetchMissingSlNumbers();
  }, [fetchVoters, fetchIncompleteStats, fetchMissingSlNumbers]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (village !== 'aliyabad') params.set('village', village);
    if (selectedWard !== 'all') params.set('ward', selectedWard);
    if (filterType !== 'incomplete') params.set('filter', filterType);
    setSearchParams(params);
  }, [village, selectedWard, filterType, setSearchParams]);

  // Handle edit
  const handleEdit = (voter) => {
    setEditingVoter(voter);
    setAddSlNo('');
    setModalOpen(true);
  };

  // Handle add new
  const handleAddNew = (slNo = '') => {
    setEditingVoter(null);
    setAddSlNo(slNo);
    setModalOpen(true);
  };

  // Handle save from modal
  const handleSaveVoter = (savedVoter) => {
    if (editingVoter) {
      setVoters(prev => prev.map(v => v.epic_no === savedVoter.epic_no ? savedVoter : v));
    } else {
      setVoters(prev => [savedVoter, ...prev]);
    }
    fetchIncompleteStats();
    fetchMissingSlNumbers();
  };

  // Handle bulk update
  const handleBulkUpdate = () => {
    const incompleteVoters = voters.filter(v => {
      const fields = ['name', 'relation_name', 'age', 'gender', 'house_number'];
      return fields.some(f => !v[f] || v[f] === '');
    });
    setSelectedVoters(incompleteVoters);
    setBulkModalOpen(true);
  };

  // Get completeness indicator
  const getCompleteness = (voter) => {
    const fields = ['name', 'age', 'gender', 'house_number'];
    const filled = fields.filter(f => voter[f] && voter[f] !== '').length;
    const percentage = Math.round((filled / fields.length) * 100);
    
    if (percentage === 100) return { status: 'complete', color: 'green', text: 'Complete' };
    if (percentage >= 50) return { status: 'partial', color: 'yellow', text: 'Partial' };
    return { status: 'incomplete', color: 'red', text: 'Incomplete' };
  };

  // Get missing fields for a voter
  const getMissingFields = (voter) => {
    const fieldLabels = {
      name: 'Name',
      relation_name: 'Relation',
      age: 'Age',
      gender: 'Gender',
      house_number: 'House No'
    };
    
    return Object.entries(fieldLabels)
      .filter(([key]) => !voter[key] || voter[key] === '')
      .map(([, label]) => label);
  };

  // Check if voter is duplicate
  const epicCounts = voters.reduce((acc, v) => {
    acc[v.epic_no] = (acc[v.epic_no] || 0) + 1;
    return acc;
  }, {});

  // Calculate actual missing count
  const wardData = wards.find(w => String(w.ward_no) === String(selectedWard));
  const actualMissing = expectedTotal ? Math.max(0, parseInt(expectedTotal) - (incompleteStats?.total || 0)) : missingSlNumbers.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modals */}
      <VoterModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        voter={editingVoter}
        village={village}
        wardNo={selectedWard !== 'all' ? selectedWard : '1'}
        onSave={handleSaveVoter}
        initialSlNo={addSlNo}
      />

      <BulkUpdateModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        voters={selectedVoters}
        village={village}
        wardNo={selectedWard !== 'all' ? selectedWard : '1'}
        onSave={() => { fetchVoters(); fetchIncompleteStats(); }}
      />

      <MissingVotersModal
        isOpen={missingModalOpen}
        onClose={() => setMissingModalOpen(false)}
        missingNumbers={missingSlNumbers}
        village={village}
        wardNo={selectedWard !== 'all' ? selectedWard : '1'}
        onSave={() => { fetchVoters(); fetchIncompleteStats(); fetchMissingSlNumbers(); }}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
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
                  <AlertTriangle className="w-6 h-6 text-sky-500" />
                  Bulk Update - Missing Records
                </h1>
                <p className="text-gray-500 text-sm">View and update incomplete voter records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAddNew()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Voter
              </Button>
              <Button
                variant="outline"
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                onClick={handleBulkUpdate}
                disabled={voters.filter(v => getCompleteness(v).status !== 'complete').length === 0}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Bulk Edit ({voters.filter(v => getCompleteness(v).status !== 'complete').length})
              </Button>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/voters-admin')}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Imported</p>
                  <p className="text-xl font-bold text-gray-900">{incompleteStats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Complete</p>
                  <p className="text-xl font-bold text-gray-900">{incompleteStats?.complete || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Partial</p>
                  <p className="text-xl font-bold text-gray-900">{incompleteStats?.partial || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Incomplete</p>
                  <p className="text-xl font-bold text-gray-900">{incompleteStats?.incomplete || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Not Imported</p>
                  <p className="text-xl font-bold text-sky-600">{actualMissing}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expected Total Input and Missing Alert */}
        {selectedWard !== 'all' && (
          <Card className="bg-sky-50 border-sky-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <p className="font-medium text-sky-800">Ward {selectedWard} - Missing Voters Calculator</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-sky-700">Total in PDF:</span>
                      <Input
                        type="number"
                        value={expectedTotal}
                        onChange={(e) => setExpectedTotal(e.target.value)}
                        placeholder="e.g., 943"
                        className="w-24 h-8 text-sm bg-white border-sky-300"
                        onKeyDown={(e) => e.key === 'Enter' && fetchMissingSlNumbers()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-sky-300 text-sky-700 hover:bg-sky-100"
                        onClick={fetchMissingSlNumbers}
                      >
                        Calculate
                      </Button>
                    </div>
                  </div>
                  
                  {/* Results */}
                  <div className="bg-white rounded-lg p-3 border border-sky-200 mb-3">
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Imported:</span>
                        <span className="ml-2 font-bold text-green-600">{incompleteStats?.total || 0}</span>
                      </div>
                      {expectedTotal && (
                        <>
                          <div>
                            <span className="text-gray-500">Expected:</span>
                            <span className="ml-2 font-bold text-gray-900">{expectedTotal}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Not Imported:</span>
                            <span className="ml-2 font-bold text-red-600">
                              {Math.max(0, parseInt(expectedTotal) - (incompleteStats?.total || 0))}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {missingSlNumbers.length > 0 && (
                    <>
                      <p className="text-sm text-sky-700 mb-2">
                        <span className="font-semibold">{missingSlNumbers.length}</span> missing serial numbers: 
                        <span className="font-mono ml-2">{missingSlNumbers.slice(0, 10).join(', ')}</span>
                        {missingSlNumbers.length > 10 && (
                          <button
                            onClick={() => setMissingModalOpen(true)}
                            className="ml-2 text-indigo-600 hover:text-indigo-700 underline font-medium"
                          >
                            View all {missingSlNumbers.length} &amp; Add
                          </button>
                        )}
                      </p>
                      <Button
                        size="sm"
                        className="bg-sky-600 hover:bg-sky-700 text-white"
                        onClick={() => setMissingModalOpen(true)}
                      >
                        <ListPlus className="w-4 h-4 mr-2" />
                        Add {missingSlNumbers.length} Missing Voters
                      </Button>
                    </>
                  )}
                  
                  {!expectedTotal && (
                    <p className="text-xs text-sky-600 italic">
                      Enter the total voters count from your PDF header (e.g., 943) to calculate missing records accurately.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Ward:</span>
                <Select value={selectedWard} onValueChange={setSelectedWard}>
                  <SelectTrigger className="w-[120px] bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="All Wards" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wards</SelectItem>
                    {wards.map(w => (
                      <SelectItem key={w.ward_no} value={String(w.ward_no)}>Ward {w.ward_no}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Show:</span>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px] bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Records</SelectItem>
                    <SelectItem value="incomplete">Incomplete Only</SelectItem>
                    <SelectItem value="complete">Complete Only</SelectItem>
                    <SelectItem value="missing_name">Missing Name</SelectItem>
                    <SelectItem value="missing_age">Missing Age</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => { fetchVoters(); fetchIncompleteStats(); fetchMissingSlNumbers(); }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              <div className="ml-auto text-sm text-gray-500">
                Showing <span className="text-gray-900 font-semibold">{voters.length}</span> of{' '}
                <span className="text-gray-900 font-semibold">{totalVoters}</span> records
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voters Table */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SL No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">EPIC No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Relation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Age</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">House No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ward</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading voters...
                    </td>
                  </tr>
                ) : voters.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-12 text-center text-gray-500">
                      <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      No {filterType === 'incomplete' ? 'incomplete' : ''} records found
                    </td>
                  </tr>
                ) : (
                  voters.map((voter, index) => {
                    const completeness = getCompleteness(voter);
                    const missingFields = getMissingFields(voter);
                    const isDuplicate = epicCounts[voter.epic_no] > 1;
                    
                    return (
                      <tr 
                        key={`${voter.epic_no}-${index}`} 
                        className={`hover:bg-gray-50 ${isDuplicate ? 'bg-orange-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            completeness.color === 'green' ? 'bg-green-100 text-green-700' :
                            completeness.color === 'yellow' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {completeness.color === 'green' ? <Check className="w-3 h-3" /> :
                             completeness.color === 'yellow' ? <AlertTriangle className="w-3 h-3" /> :
                             <X className="w-3 h-3" />}
                            {completeness.text}
                          </span>
                          {isDuplicate && (
                            <span className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              <Copy className="w-3 h-3" />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-indigo-600">
                          {voter.sl_no || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-blue-600">{voter.epic_no}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {voter.name || <span className="text-red-500 italic">Missing</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {voter.relation_type ? (
                            <span className={`px-2 py-0.5 rounded ${
                              voter.relation_type === 'Father' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {voter.relation_type}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {voter.relation_name || voter.father_husband_name || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {voter.age || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {voter.gender ? (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              voter.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                            }`}>
                              {voter.gender === 'M' ? 'Male' : 'Female'}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {voter.house_number || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{voter.ward_no}</td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => handleEdit(voter)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Help Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-2">How to use Bulk Update</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Select ward to filter records for that ward</li>
                  <li>Enter <strong>Expected Total</strong> (from PDF header) to calculate correct missing count</li>
                  <li>Click <strong>&quot;View all &amp; Add&quot;</strong> to see and add all missing serial numbers</li>
                  <li>Click Edit icon to update individual records</li>
                  <li>Click &quot;Bulk Edit&quot; to update multiple records at once</li>
                  <li><span className="bg-orange-100 px-1 rounded">Orange rows</span> indicate duplicate EPIC numbers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VotersBulkUpdate;
