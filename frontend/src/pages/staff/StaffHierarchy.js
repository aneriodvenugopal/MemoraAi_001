import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit2, Trash2, TrendingUp, Network,
  User, Phone, Mail, Percent, ChevronDown, ChevronRight
} from 'lucide-react';
import apiInstance from '../../services/api';
import { toast } from 'sonner';

const StaffHierarchy = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  
  const [formData, setFormData] = useState({
    staff_name: '',
    staff_phone: '',
    staff_email: '',
    staff_role: 'sales_agent',
    parent_staff_id: '',
    direct_commission_percentage: 0,
    gap_commission_percentage: 0,
    is_active: true
  });

  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      const userResponse = await apiInstance.get('/user/me');
      const user = userResponse.data;
      const currentTenantId = user.tenant_id || localStorage.getItem('tenant_id');
      setTenantId(currentTenantId);
      fetchStaff(currentTenantId);
    } catch (error) {
      console.error('Error initializing:', error);
      toast.error('Failed to initialize');
    }
  };

  const fetchStaff = async (tid) => {
    setLoading(true);
    try {
      const response = await apiInstance.get('/staff-hierarchy', {
        params: { tenant_id: tid }
      });
      setStaff(response.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditMode(false);
    setFormData({
      tenant_id: tenantId,
      staff_name: '',
      staff_phone: '',
      staff_email: '',
      staff_role: 'sales_agent',
      parent_staff_id: '',
      direct_commission_percentage: 1,
      gap_commission_percentage: 0.5,
      is_active: true
    });
    setShowModal(true);
  };

  const handleEdit = (member) => {
    setEditMode(true);
    setFormData({
      ...member,
      parent_staff_id: member.parent_staff_id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        tenant_id: tenantId,
        direct_commission_percentage: parseFloat(formData.direct_commission_percentage),
        gap_commission_percentage: parseFloat(formData.gap_commission_percentage),
        parent_staff_id: formData.parent_staff_id || null
      };

      if (editMode) {
        await apiInstance.put(`/staff-hierarchy/${formData.staff_id}`, payload);
        toast.success('Staff member updated successfully');
      } else {
        await apiInstance.post('/staff-hierarchy', payload);
        toast.success('Staff member added successfully');
      }

      setShowModal(false);
      fetchStaff(tenantId);
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to save staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm('Are you sure? This will remove the staff member from hierarchy.')) {
      return;
    }

    try {
      await apiInstance.delete(`/staff-hierarchy/${staffId}`);
      toast.success('Staff member removed successfully');
      fetchStaff(tenantId);
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove staff member');
    }
  };

  const toggleNode = (staffId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  const buildHierarchyTree = () => {
    const staffMap = new Map();
    const roots = [];

    staff.forEach(member => {
      staffMap.set(member.staff_id, { ...member, children: [] });
    });

    staff.forEach(member => {
      if (member.parent_staff_id) {
        const parent = staffMap.get(member.parent_staff_id);
        if (parent) {
          parent.children.push(staffMap.get(member.staff_id));
        } else {
          roots.push(staffMap.get(member.staff_id));
        }
      } else {
        roots.push(staffMap.get(member.staff_id));
      }
    });

    return roots;
  };

  const renderHierarchyNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.staff_id);

    return (
      <div key={node.staff_id} className="mb-2">
        <div 
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all"
          style={{ marginLeft: `${level * 40}px` }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.staff_id)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          ) : (
            <div className="w-7" />
          )}

          {/* Staff Info */}
          <div className="flex-1 grid grid-cols-4 gap-4 items-center">
            <div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                <span className="font-semibold text-gray-900">{node.staff_name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Phone size={14} className="text-gray-400" />
                <span className="text-sm text-gray-600">{node.staff_phone}</span>
              </div>
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {node.staff_role?.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <TrendingUp size={14} />
                  Direct
                </div>
                <div className="font-bold text-green-600">{node.direct_commission_percentage}%</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Network size={14} />
                  Gap
                </div>
                <div className="font-bold text-purple-600">{node.gap_commission_percentage}%</div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleEdit(node)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(node.staff_id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {node.children.map(child => renderHierarchyNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const hierarchyTree = buildHierarchyTree();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="text-blue-600" size={36} />
                Staff Hierarchy
              </h1>
              <p className="text-gray-600 mt-2">Manage sales team structure and commission rates</p>
            </div>
            <button
              onClick={handleCreate}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus size={20} />
              Add Staff
            </button>
          </div>
        </div>

        {/* Hierarchy Tree */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : hierarchyTree.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No staff members found. Add your first team member!</p>
            </div>
          ) : (
            hierarchyTree.map(node => renderHierarchyNode(node))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-2xl font-bold text-white">
                {editMode ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.staff_name}
                    onChange={(e) => setFormData({...formData, staff_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Staff name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.staff_phone}
                    onChange={(e) => setFormData({...formData, staff_phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.staff_email}
                  onChange={(e) => setFormData({...formData, staff_email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.staff_role}
                    onChange={(e) => setFormData({...formData, staff_role: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sales_agent">Sales Agent</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="regional_head">Regional Head</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reports To
                  </label>
                  <select
                    value={formData.parent_staff_id}
                    onChange={(e) => setFormData({...formData, parent_staff_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None (Top Level)</option>
                    {staff
                      .filter(s => !editMode || s.staff_id !== formData.staff_id)
                      .map(s => (
                        <option key={s.staff_id} value={s.staff_id}>
                          {s.staff_name} ({s.staff_role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <TrendingUp size={16} className="text-green-600" />
                    Direct Commission %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.direct_commission_percentage}
                    onChange={(e) => setFormData({...formData, direct_commission_percentage: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Network size={16} className="text-purple-600" />
                    Gap Commission %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.gap_commission_percentage}
                    onChange={(e) => setFormData({...formData, gap_commission_percentage: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.5"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editMode ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffHierarchy;
