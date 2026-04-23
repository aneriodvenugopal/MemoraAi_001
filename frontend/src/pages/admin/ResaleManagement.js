import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const ResaleManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [stats, setStats] = useState({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0
  });
  
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (!user || !['super_admin', 'admin', 'frontdesk'].includes(user.role_id)) {
      toast.error('Admin access required');
      navigate('/dashboard');
      return;
    }
    
    loadRequests();
  }, [user, navigate, filterStatus]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const url = filterStatus 
        ? `${BACKEND_URL}/api/resale/admin/requests?status=${filterStatus}`
        : `${BACKEND_URL}/api/resale/admin/requests`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
        setStats({
          pending_count: data.pending_count,
          approved_count: data.approved_count,
          rejected_count: data.rejected_count
        });
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load resale requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/resale/admin/review/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: status,
          review_notes: reviewNotes
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Resale request ${status}!`);
        if (data.notified_users > 0) {
          toast.success(`${data.notified_users} interested users notified!`);
        }
        setReviewingRequest(null);
        setReviewNotes('');
        loadRequests();
      } else {
        toast.error(`Failed to ${status} request`);
      }
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error('Error processing request');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🏠 Resale Management
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve property resale requests
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Requests</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.pending_count}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved_count}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected_count}</p>
              </div>
              <div className="text-4xl">❌</div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Requests List */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {requests.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {requests.map((request) => (
                <li key={request.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{request.project_name}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-gray-500">Customer:</span> {request.customer_name}
                        </div>
                        {request.plot_number && (
                          <div>
                            <span className="text-gray-500">Plot:</span> {request.plot_number}
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Contact:</span> {request.contact_phone}
                        </div>
                        {request.expected_price && (
                          <div>
                            <span className="text-gray-500">Expected Price:</span> ₹{request.expected_price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-500 mb-1">Reason:</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.reason}</p>
                      </div>
                      
                      {request.review_notes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-500 mb-1">Review Notes:</p>
                          <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">{request.review_notes}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Submitted: {new Date(request.created_at).toLocaleString()}</span>
                        {request.urgent && <span className="text-red-600 font-bold">URGENT!</span>}
                        {request.reviewed_at && (
                          <span>Reviewed: {new Date(request.reviewed_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    
                    {request.status === 'pending' && (
                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => setReviewingRequest(request.id)}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Review
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No resale requests found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Review Resale Request</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Review Notes (Optional):</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any notes about your decision..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setReviewingRequest(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(reviewingRequest, 'rejected')}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleReview(reviewingRequest, 'approved')}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResaleManagement;
