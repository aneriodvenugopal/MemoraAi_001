import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService, authService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Search, Edit, Trash2, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react';
import PageInfoModal from '../components/PageInfoModal';

const UsersManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPerformance, setShowPerformance] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role_id: '',
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [filterRole, filterStatus]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        tenant_id: user?.role !== 'super_admin' ? user?.tenant_id : null,
        search: searchTerm || null,
        role_id: filterRole || null,
        is_active: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : null,
      };
      
      const data = await userService.getAll(params);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await authService.getRoles();
      setRoles(response || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleAddUser = async () => {
    try {
      await userService.create({
        ...formData,
        tenant_id: user?.role !== 'super_admin' ? user?.tenant_id : null,
      });
      toast.success('User created successfully!');
      setShowAddDialog(false);
      setFormData({ name: '', phone: '', email: '', role_id: '' });
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleEditUser = async () => {
    try {
      await userService.update(selectedUser.id, formData);
      toast.success('User updated successfully!');
      setShowEditDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      if (currentStatus) {
        await userService.deactivate(userId);
        toast.success('User deactivated');
      } else {
        await userService.activate(userId);
        toast.success('User activated');
      }
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleViewPerformance = async (userId) => {
    try {
      const data = await userService.getPerformance(userId);
      setPerformanceData(data);
      setShowPerformance(true);
    } catch (error) {
      toast.error('Failed to load performance data');
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      phone: user.phone,
      email: user.email || '',
      role_id: user.role_id,
    });
    setShowEditDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Users & Staff Management</h1>
          <p className="text-gray-600">Manage your team members and their roles</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number *</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email (Optional)</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role *</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleAddUser} className="w-full">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <Button onClick={loadUsers} variant="outline">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({users.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{user.phone}</td>
                    <td className="px-4 py-3 text-sm">{user.email || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role?.slug === 'super_admin' ? 'destructive' : 'default'}>
                        {user.role?.name || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? 'success' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {user.role?.slug === 'staff' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPerformance(user.id)}
                          >
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={user.is_active ? 'destructive' : 'default'}
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleEditUser} className="w-full">Update User</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Dialog */}
      {performanceData && (
        <Dialog open={showPerformance} onOpenChange={setShowPerformance}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Staff Performance - {performanceData.user.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{performanceData.metrics.total_leads}</div>
                    <div className="text-sm text-gray-600">Total Leads</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{performanceData.metrics.converted_leads}</div>
                    <div className="text-sm text-gray-600">Converted</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{performanceData.metrics.conversion_rate}%</div>
                    <div className="text-sm text-gray-600">Conversion Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{performanceData.metrics.bookings_closed}</div>
                    <div className="text-sm text-gray-600">Bookings Closed</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Commission Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Earned:</span>
                      <span className="font-bold">₹{performanceData.metrics.total_commission_earned.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span className="font-bold">₹{performanceData.metrics.commission_paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Pending:</span>
                      <span className="font-bold">₹{performanceData.metrics.commission_pending.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {performanceData.recent_leads.map((lead) => (
                      <div key={lead.id} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>{lead.name}</span>
                        <Badge>{lead.status_name}</Badge>
                      </div>
                    ))}
                    {performanceData.recent_leads.length === 0 && (
                      <p className="text-gray-500 text-center">No recent leads</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Page Info Modal */}
      <PageInfoModal
        title="Users & Staff Management"
        description="Centralized user management system for your entire team. Create users, assign roles, manage permissions, track staff performance, monitor activity, and control access across your real estate organization."
        features={[
          "Create new users with name, phone (10-digit), email, and role assignment",
          "Role-based access control with multiple roles (Super Admin, Tenant Admin, Staff, Customer, etc.)",
          "User status management: Activate/Deactivate users",
          "Edit user details and role assignments",
          "Advanced search: Filter by name, phone, email",
          "Role-based filtering to view users by specific roles",
          "Status filtering: All, Active, Inactive users",
          "Staff performance tracking with detailed metrics",
          "Performance dashboard per staff member showing: Total Leads, Converted Leads, Conversion Rate, Bookings Closed",
          "Commission earnings tracking: Total Earned, Paid, Pending amounts",
          "Recent leads view per staff member with status badges",
          "Tenant-level user isolation (Tenant Admins see only their users)",
          "Super Admin global user management across all tenants",
          "User activity indicators and status badges",
          "Responsive table design with action buttons"
        ]}
        technologies={[
          "React.js",
          "FastAPI Backend",
          "MongoDB",
          "Shadcn UI",
          "Role-Based Access Control (RBAC)",
          "User Service API",
          "Performance Analytics API",
          "Auth Service"
        ]}
        implementations={[
          {
            title: "User Creation & Management",
            description: "Modal-based user creation form with validation: Full name (required), 10-digit phone number (required, used for login), email (optional), role selection from dropdown. Form validates all fields before submission. After creation, user can login with phone/email and default password. Edit dialog allows updating name, email, and role assignment."
          },
          {
            title: "Role-Based Access Control",
            description: "Integrated with auth service to fetch available roles dynamically. Roles displayed in dropdown with proper naming. Super Admins can assign any role, Tenant Admins restricted to their tenant roles. Role displayed as color-coded badge (Super Admin = red destructive badge, others = default blue). Role affects user permissions across entire application."
          },
          {
            title: "Advanced Filtering System",
            description: "Three-tier filtering: (1) Search bar with real-time search across name, phone, and email fields, (2) Role dropdown filter to show users of specific role, (3) Status filter (All/Active/Inactive). Filters work together - can combine role + status + search. 'Apply Filters' button triggers data refresh with filter parameters."
          },
          {
            title: "User Status Management",
            description: "Toggle button for each user to activate/deactivate. Active users shown with green 'Active' badge, inactive with gray 'Inactive' badge. Deactivated users cannot log in but data is preserved. Quick visual indicators with XCircle (deactivate) and CheckCircle (activate) icons. Status changes reflected immediately in table."
          },
          {
            title: "Staff Performance Dashboard",
            description: "Dedicated performance view for staff members (staff role only). Accessible via TrendingUp icon button in actions column. Performance modal shows: (1) Metrics Grid: 4 KPI cards with Total Leads, Converted Leads (green), Conversion Rate %, Bookings Closed, (2) Commission Card: Total Earned, Paid (green), Pending (orange) with proper currency formatting, (3) Recent Leads List: Last 10 leads with status badges and formatted display. Data fetched from performance API on-demand."
          },
          {
            title: "Tenant Data Isolation",
            description: "Multi-tenancy support built-in. Tenant Admins see only users within their tenant (filtered by tenant_id automatically). Super Admins see all users across all tenants (no tenant_id filter). User list API respects tenant context from logged-in user. Ensures data privacy and proper access boundaries."
          }
        ]}
      />
    </div>
  );
};

export default UsersManagement;
