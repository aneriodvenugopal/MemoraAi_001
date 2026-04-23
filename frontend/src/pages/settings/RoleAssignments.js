import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Plus, Users, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RoleAssignments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoleAssignments();
  }, []);

  const fetchRoleAssignments = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');

      // Fetch all role assignments for the tenant
      const response = await fetch(`${apiUrl}/api/role-assignments/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Failed to fetch role assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-600" />
                Role Assignments
              </h1>
              <p className="text-gray-600 mt-1">Manage multi-role assignments for users across projects</p>
            </div>
          </div>
          <Button
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white gap-2"
            onClick={() => alert('Assign Role feature coming soon!')}
          >
            <Plus className="w-4 h-4" />
            Assign Role
          </Button>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Multi-Role Architecture</h3>
                <p className="text-gray-700 text-sm">
                  This system supports flexible role assignments where the same user can have multiple roles:
                </p>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• <strong>Multiple roles in same project</strong>: E.g., User can be both Agent AND Customer</li>
                  <li>• <strong>Different roles across projects</strong>: E.g., Agent in Project A, Supervisor in Project B</li>
                  <li>• <strong>Cross-tenant roles</strong>: E.g., Customer in Tenant 1, Agent in Tenant 2</li>
                  <li>• <strong>Context-specific metadata</strong>: Each role has its own commission%, permissions, etc.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Role Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No role assignments found</p>
                <p className="text-sm mt-1">Click "Assign Role" to create your first assignment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment, index) => (
                  <div
                    key={assignment.id || index}
                    className="border rounded-lg p-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-purple-100">
                          <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 capitalize">
                            {assignment.role_name || 'Unknown Role'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {assignment.project_name || 'Tenant Level'}
                          </p>
                          {assignment.context_metadata?.commission_percentage && (
                            <p className="text-xs text-purple-600 mt-1">
                              Commission: {assignment.context_metadata.commission_percentage}%
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => alert('Remove role feature coming soon!')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Reference */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">API Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Base URL:</strong> /api/role-assignments</p>
              <div className="mt-3">
                <p className="font-semibold">Available Endpoints:</p>
                <ul className="mt-2 space-y-1 ml-4">
                  <li>• POST /assign - Assign role to user</li>
                  <li>• GET /user/{'{user_id}'} - Get user's roles</li>
                  <li>• GET /project/{'{project_id}'}/users - Get project users</li>
                  <li>• GET /my-contexts - Get all user contexts</li>
                  <li>• DELETE /assignment/{'{id}'} - Remove assignment</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleAssignments;