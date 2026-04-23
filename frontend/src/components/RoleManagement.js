import React, { useState, useEffect } from 'react';
import { roleService, userService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Shield, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const RoleManagement = ({ projectId, tenantId }) => {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffData, rolesData, usersData] = await Promise.all([
        roleService.getProjectStaff(projectId),
        roleService.getSystemRoles(),
        userService.getAll({ tenant_id: tenantId }),
      ]);

      setStaff(staffData.staff || []);
      setRoles(rolesData.roles || []);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Failed to load role management data:', error);
      toast.error('Failed to load role management data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error('Please select both user and role');
      return;
    }

    try {
      setAssigning(true);
      await roleService.createAssignment({
        user_id: selectedUser,
        tenant_id: tenantId,
        project_id: projectId,
        role_id: selectedRole,
        metadata: {},
      });

      toast.success('Role assigned successfully');
      setShowAssignDialog(false);
      setSelectedUser('');
      setSelectedRole('');
      loadData();
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign role');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId, userName, roleName) => {
    if (!window.confirm(`Remove ${roleName} role from ${userName}?`)) {
      return;
    }

    try {
      await roleService.deleteAssignment(assignmentId);
      toast.success('Role assignment removed');
      loadData();
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove assignment');
    }
  };

  const getRoleBadgeColor = (level) => {
    const colors = {
      1: 'bg-purple-500',
      2: 'bg-blue-500',
      3: 'bg-green-500',
      4: 'bg-yellow-500',
      5: 'bg-orange-500',
      6: 'bg-pink-500',
      7: 'bg-gray-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const groupedStaff = staff.reduce((acc, member) => {
    const role = member.role_name || 'Unknown';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(member);
    return acc;
  }, {});

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading role management...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-xl">
      <CardHeader className="border-b border-ocean-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
              Role Management
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Manage user roles and permissions for this project. Assign roles to control access levels.
            </p>
          </div>
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogTrigger asChild>
              <Button className="bg-ocean-primary hover:bg-ocean-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Role to User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Role</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.filter(r => r.slug !== 'vendor' && r.slug !== 'customer').map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getRoleBadgeColor(role.level)} text-white`}>
                              L{role.level}
                            </Badge>
                            {role.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRole && (
                    <p className="text-xs text-gray-500 mt-2">
                      {roles.find(r => r.id === selectedRole)?.description}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAssignDialog(false)}
                  disabled={assigning}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignRole}
                  disabled={assigning || !selectedUser || !selectedRole}
                  className="bg-ocean-primary hover:bg-ocean-secondary"
                >
                  {assigning ? 'Assigning...' : 'Assign Role'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {staff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No staff assigned yet</h3>
            <p className="text-gray-500 mb-4">
              Assign roles to users to grant them access to this project
            </p>
            <Button
              onClick={() => setShowAssignDialog(true)}
              className="bg-ocean-primary hover:bg-ocean-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign First Role
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border border-gray-200">
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto text-ocean-primary mb-2" />
                  <div className="text-2xl font-bold">{staff.length}</div>
                  <div className="text-xs text-gray-600">Total Staff</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200">
                <CardContent className="p-4 text-center">
                  <Shield className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                  <div className="text-2xl font-bold">{Object.keys(groupedStaff).length}</div>
                  <div className="text-xs text-gray-600">Active Roles</div>
                </CardContent>
              </Card>
            </div>

            {/* Staff by Role */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Staff by Role</h3>
              {Object.entries(groupedStaff).map(([roleName, members]) => {
                const roleLevel = members[0]?.role_level || 0;
                return (
                  <Card key={roleName} className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getRoleBadgeColor(roleLevel)} text-white`}>
                            {roleName}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {members.length} {members.length === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-ocean-primary/10 flex items-center justify-center">
                                <span className="text-ocean-primary font-semibold">
                                  {member.user_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{member.user_name || 'Unknown User'}</div>
                                <div className="text-sm text-gray-600">{member.user_email}</div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveAssignment(member.id, member.user_name, roleName)
                              }
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Available Roles Info */}
            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Available Roles in System
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roles.filter(r => r.slug !== 'vendor' && r.slug !== 'customer').map((role) => (
                    <div key={role.id} className="flex items-start gap-2">
                      <Badge className={`${getRoleBadgeColor(role.level)} text-white mt-0.5`}>
                        L{role.level}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{role.name}</div>
                        <div className="text-xs text-gray-600">{role.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoleManagement;
