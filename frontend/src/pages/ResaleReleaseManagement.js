/**
 * Resale/Release Management
 * - Release: Properties returned to inventory (cancelled/defaulted bookings)
 * - Resale: Customer-initiated property sales
 * - Auto-notify interested parties in booking queue
 * - Track inquiries and commission
 */
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  RefreshCw,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Bell,
  DollarSign,
  Trash2,
  Building2,
  TrendingUp,
  Package,
  Clock,
  ArrowLeftRight,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ResaleReleaseManagement() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("releases");
  const [loading, setLoading] = useState(false);
  const [releases, setReleases] = useState([]);
  const [resales, setResales] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [selectedProject, setSelectedProject] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Dialogs
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form Data
  const [releaseForm, setReleaseForm] = useState({
    project_id: "",
    property_id: "",
    previous_customer_name: "",
    release_reason: "customer_request",
    release_notes: "",
    refund_amount: 0,
    deduction_amount: 0,
    deduction_reason: "",
  });
  
  const [approvalForm, setApprovalForm] = useState({
    approved: true,
    admin_notes: "",
    rejection_reason: "",
    commission_percentage: 2.0,
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Fetch Projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      } else if (data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, [token]);

  // Fetch Releases
  const fetchReleases = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/resale-release/releases?limit=100`;
      if (selectedProject && selectedProject !== "all") url += `&project_id=${selectedProject}`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setReleases(data.releases || []);
      }
    } catch (err) {
      console.error("Error fetching releases:", err);
      toast.error("Failed to fetch releases");
    } finally {
      setLoading(false);
    }
  }, [token, selectedProject]);

  // Fetch Resales
  const fetchResales = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/resale-release/resales?limit=100`;
      if (selectedProject && selectedProject !== "all") url += `&project_id=${selectedProject}`;
      if (statusFilter && statusFilter !== "all") url += `&status=${statusFilter}`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setResales(data.resales || []);
      }
    } catch (err) {
      console.error("Error fetching resales:", err);
      toast.error("Failed to fetch resales");
    } finally {
      setLoading(false);
    }
  }, [token, selectedProject, statusFilter]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/resale-release/resales/stats`, { headers });
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, [fetchProjects, fetchStats]);

  useEffect(() => {
    if (activeTab === "releases") {
      fetchReleases();
    } else {
      fetchResales();
    }
  }, [activeTab, fetchReleases, fetchResales]);

  // Create Release
  const handleCreateRelease = async () => {
    if (!releaseForm.project_id || !releaseForm.property_id) {
      toast.error("Project and Property are required");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/resale-release/releases`, {
        method: "POST",
        headers,
        body: JSON.stringify(releaseForm),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Property released to inventory");
        setShowReleaseDialog(false);
        setReleaseForm({
          project_id: "",
          property_id: "",
          previous_customer_name: "",
          release_reason: "customer_request",
          release_notes: "",
          refund_amount: 0,
          deduction_amount: 0,
          deduction_reason: "",
        });
        fetchReleases();
        fetchStats();
      } else {
        toast.error(data.detail || "Failed to create release");
      }
    } catch (err) {
      toast.error("Error creating release");
    } finally {
      setLoading(false);
    }
  };

  // Notify Queue for Release
  const handleNotifyQueue = async (releaseId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/resale-release/releases/${releaseId}/notify-queue`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchReleases();
      } else {
        toast.error(data.detail || "Failed to notify queue");
      }
    } catch (err) {
      toast.error("Error notifying queue");
    } finally {
      setLoading(false);
    }
  };

  // Approve/Reject Resale
  const handleApproveResale = async () => {
    if (!selectedItem) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/resale-release/resales/${selectedItem.id}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify(approvalForm),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowApprovalDialog(false);
        setSelectedItem(null);
        fetchResales();
        fetchStats();
      } else {
        toast.error(data.detail || "Failed to process approval");
      }
    } catch (err) {
      toast.error("Error processing approval");
    } finally {
      setLoading(false);
    }
  };

  // List Resale (Make Public)
  const handleListResale = async (resaleId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/resale-release/resales/${resaleId}/list`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Property listed for resale");
        fetchResales();
        fetchStats();
      } else {
        toast.error(data.detail || "Failed to list property");
      }
    } catch (err) {
      toast.error("Error listing property");
    } finally {
      setLoading(false);
    }
  };

  // Notify Interested Parties
  const handleNotifyInterested = async (resaleId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/resale-release/resales/${resaleId}/notify-interested`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchResales();
      } else {
        toast.error(data.detail || "Failed to notify");
      }
    } catch (err) {
      toast.error("Error notifying parties");
    } finally {
      setLoading(false);
    }
  };

  // Mark as Sold
  const handleMarkSold = async (resale) => {
    const finalPrice = prompt("Enter final sale price:", resale.asking_price);
    if (!finalPrice) return;
    
    const buyerName = prompt("Enter buyer name:");
    if (!buyerName) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/resale-release/resales/${resale.id}/mark-sold?buyer_name=${encodeURIComponent(buyerName)}&final_price=${finalPrice}`,
        {
          method: "POST",
          headers,
        }
      );
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Sold! Commission earned: ₹${data.commission_earned.toLocaleString()}`);
        fetchResales();
        fetchStats();
      } else {
        toast.error(data.detail || "Failed to mark as sold");
      }
    } catch (err) {
      toast.error("Error marking as sold");
    } finally {
      setLoading(false);
    }
  };

  // Withdraw Resale
  const handleWithdraw = async (resaleId) => {
    if (!window.confirm("Are you sure you want to withdraw this listing?")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/resale-release/resales/${resaleId}/withdraw`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Listing withdrawn");
        fetchResales();
        fetchStats();
      } else {
        toast.error(data.detail || "Failed to withdraw");
      }
    } catch (err) {
      toast.error("Error withdrawing listing");
    } finally {
      setLoading(false);
    }
  };

  // View Details
  const handleViewDetails = async (resale) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/resale-release/resales/${resale.id}`, { headers });
      const data = await res.json();
      
      if (data.success) {
        setSelectedItem({ ...data.resale, inquiries: data.inquiries });
        setShowDetailDialog(true);
      }
    } catch (err) {
      toast.error("Error fetching details");
    } finally {
      setLoading(false);
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const colors = {
      pending_approval: "bg-blue-100 text-blue-800",
      approved: "bg-blue-100 text-blue-800",
      listed: "bg-green-100 text-green-800",
      under_negotiation: "bg-purple-100 text-purple-800",
      sold: "bg-emerald-100 text-emerald-800",
      withdrawn: "bg-gray-100 text-gray-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getReleaseReasonLabel = (reason) => {
    const labels = {
      booking_cancelled: "Booking Cancelled",
      payment_default: "Payment Default",
      customer_request: "Customer Request",
      legal_issue: "Legal Issue",
      other: "Other",
    };
    return labels[reason] || reason;
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || projectId?.slice(0, 8) + "...";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="resale-release-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowLeftRight className="w-7 h-7 text-indigo-600" />
                Resale & Release Management
              </h1>
              <p className="text-gray-500 mt-1">
                Manage property releases and resale listings
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchReleases();
                fetchResales();
                fetchStats();
              }}
              disabled={loading}
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Resales</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending Approval</p>
                    <p className="text-2xl font-bold">{stats.by_status?.pending_approval || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Listed</p>
                    <p className="text-2xl font-bold">{stats.by_status?.listed || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Commission Earned</p>
                    <p className="text-2xl font-bold">₹{(stats.total_commission_earned || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-64">
                <Label className="text-sm">Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger data-testid="project-filter">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeTab === "resales" && (
                <div className="w-48">
                  <Label className="text-sm">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="status-filter">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="listed">Listed</SelectItem>
                      <SelectItem value="under_negotiation">Under Negotiation</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="releases" data-testid="releases-tab">
              <Package className="w-4 h-4 mr-2" />
              Releases ({releases.length})
            </TabsTrigger>
            <TabsTrigger value="resales" data-testid="resales-tab">
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Resales ({resales.length})
            </TabsTrigger>
          </TabsList>

          {/* Releases Tab */}
          <TabsContent value="releases" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Property Releases</CardTitle>
                  <CardDescription>
                    Properties returned to inventory (cancelled bookings, payment defaults)
                  </CardDescription>
                </div>
                <Button onClick={() => setShowReleaseDialog(true)} data-testid="create-release-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Release Property
                </Button>
              </CardHeader>
              <CardContent>
                {releases.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No releases found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {releases.map((release) => (
                      <div
                        key={release.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        data-testid={`release-item-${release.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {getProjectName(release.project_id)}
                              </span>
                              <Badge variant="outline">
                                {getReleaseReasonLabel(release.release_reason)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Property: {release.property_id.slice(0, 12)}...
                            </p>
                            {release.previous_customer_name && (
                              <p className="text-sm text-gray-600">
                                Previous Owner: {release.previous_customer_name}
                              </p>
                            )}
                            <div className="flex gap-4 text-sm text-gray-500">
                              <span>Refund: ₹{(release.refund_amount || 0).toLocaleString()}</span>
                              <span>Deduction: ₹{(release.deduction_amount || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-400">
                              Released: {new Date(release.released_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {release.is_processed ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Processed
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleNotifyQueue(release.id)}
                                disabled={loading}
                                data-testid={`notify-queue-btn-${release.id}`}
                              >
                                <Bell className="w-4 h-4 mr-1" />
                                Notify Queue
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resales Tab */}
          <TabsContent value="resales" className="mt-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Resale Listings</CardTitle>
                  <CardDescription>
                    Properties being sold by existing owners
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {resales.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No resale listings found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resales.map((resale) => (
                      <div
                        key={resale.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        data-testid={`resale-item-${resale.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {resale.property_number || `Property ${resale.property_id.slice(0, 8)}...`}
                              </span>
                              <Badge className={getStatusBadge(resale.status)}>
                                {resale.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Seller: {resale.seller_name} ({resale.seller_phone})
                            </p>
                            <div className="flex gap-4 text-sm">
                              <span className="text-gray-500">
                                Original: ₹{(resale.original_price || 0).toLocaleString()}
                              </span>
                              <span className="font-medium text-green-600">
                                Asking: ₹{(resale.asking_price || 0).toLocaleString()}
                              </span>
                              <span className="text-gray-500">
                                Commission: {resale.commission_percentage}%
                              </span>
                            </div>
                            {resale.property_area && (
                              <p className="text-sm text-gray-500">
                                Area: {resale.property_area} {resale.property_area_unit}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              Created: {new Date(resale.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {/* Action buttons based on status */}
                            {resale.status === "pending_approval" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(resale);
                                  setApprovalForm({
                                    approved: true,
                                    admin_notes: "",
                                    rejection_reason: "",
                                    commission_percentage: resale.commission_percentage,
                                  });
                                  setShowApprovalDialog(true);
                                }}
                                data-testid={`approve-btn-${resale.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            )}
                            {resale.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleListResale(resale.id)}
                                disabled={loading}
                                data-testid={`list-btn-${resale.id}`}
                              >
                                <Building2 className="w-4 h-4 mr-1" />
                                List Property
                              </Button>
                            )}
                            {resale.status === "listed" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleNotifyInterested(resale.id)}
                                  disabled={loading}
                                  data-testid={`notify-btn-${resale.id}`}
                                >
                                  <Bell className="w-4 h-4 mr-1" />
                                  Notify ({resale.notified_count || 0})
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleMarkSold(resale)}
                                  disabled={loading}
                                  data-testid={`mark-sold-btn-${resale.id}`}
                                >
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  Mark Sold
                                </Button>
                              </>
                            )}
                            {["listed", "approved", "under_negotiation"].includes(resale.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => handleWithdraw(resale.id)}
                                disabled={loading}
                                data-testid={`withdraw-btn-${resale.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Withdraw
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(resale)}
                              data-testid={`view-btn-${resale.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Release Dialog */}
        <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Release Property to Inventory</DialogTitle>
              <DialogDescription>
                Mark a property as released (booking cancelled or payment default)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Project *</Label>
                <Select
                  value={releaseForm.project_id}
                  onValueChange={(v) => setReleaseForm({ ...releaseForm, project_id: v })}
                >
                  <SelectTrigger data-testid="release-project-select">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property ID *</Label>
                <Input
                  value={releaseForm.property_id}
                  onChange={(e) => setReleaseForm({ ...releaseForm, property_id: e.target.value })}
                  placeholder="Enter property ID"
                  data-testid="release-property-input"
                />
              </div>
              <div>
                <Label>Previous Customer Name</Label>
                <Input
                  value={releaseForm.previous_customer_name}
                  onChange={(e) => setReleaseForm({ ...releaseForm, previous_customer_name: e.target.value })}
                  placeholder="Previous owner name"
                  data-testid="release-customer-input"
                />
              </div>
              <div>
                <Label>Release Reason *</Label>
                <Select
                  value={releaseForm.release_reason}
                  onValueChange={(v) => setReleaseForm({ ...releaseForm, release_reason: v })}
                >
                  <SelectTrigger data-testid="release-reason-select">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking_cancelled">Booking Cancelled</SelectItem>
                    <SelectItem value="payment_default">Payment Default</SelectItem>
                    <SelectItem value="customer_request">Customer Request</SelectItem>
                    <SelectItem value="legal_issue">Legal Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Refund Amount</Label>
                  <Input
                    type="number"
                    value={releaseForm.refund_amount}
                    onChange={(e) => setReleaseForm({ ...releaseForm, refund_amount: parseFloat(e.target.value) || 0 })}
                    data-testid="release-refund-input"
                  />
                </div>
                <div>
                  <Label>Deduction Amount</Label>
                  <Input
                    type="number"
                    value={releaseForm.deduction_amount}
                    onChange={(e) => setReleaseForm({ ...releaseForm, deduction_amount: parseFloat(e.target.value) || 0 })}
                    data-testid="release-deduction-input"
                  />
                </div>
              </div>
              <div>
                <Label>Deduction Reason</Label>
                <Input
                  value={releaseForm.deduction_reason}
                  onChange={(e) => setReleaseForm({ ...releaseForm, deduction_reason: e.target.value })}
                  placeholder="Reason for deduction"
                  data-testid="release-deduction-reason-input"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={releaseForm.release_notes}
                  onChange={(e) => setReleaseForm({ ...releaseForm, release_notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={3}
                  data-testid="release-notes-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRelease} disabled={loading} data-testid="submit-release-btn">
                {loading ? "Processing..." : "Release Property"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Resale Request</DialogTitle>
              <DialogDescription>
                Approve or reject this resale listing
              </DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedItem.property_number || selectedItem.property_id}</p>
                  <p className="text-sm text-gray-600">Seller: {selectedItem.seller_name}</p>
                  <p className="text-sm">
                    Asking Price: ₹{(selectedItem.asking_price || 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant={approvalForm.approved ? "default" : "outline"}
                    onClick={() => setApprovalForm({ ...approvalForm, approved: true })}
                    className="flex-1"
                    data-testid="approve-option-btn"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant={!approvalForm.approved ? "destructive" : "outline"}
                    onClick={() => setApprovalForm({ ...approvalForm, approved: false })}
                    className="flex-1"
                    data-testid="reject-option-btn"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
                {approvalForm.approved ? (
                  <div>
                    <Label>Commission Percentage</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={approvalForm.commission_percentage}
                      onChange={(e) => setApprovalForm({ ...approvalForm, commission_percentage: parseFloat(e.target.value) })}
                      data-testid="commission-input"
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Rejection Reason *</Label>
                    <Textarea
                      value={approvalForm.rejection_reason}
                      onChange={(e) => setApprovalForm({ ...approvalForm, rejection_reason: e.target.value })}
                      placeholder="Why is this being rejected?"
                      rows={3}
                      data-testid="rejection-reason-input"
                    />
                  </div>
                )}
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={approvalForm.admin_notes}
                    onChange={(e) => setApprovalForm({ ...approvalForm, admin_notes: e.target.value })}
                    placeholder="Internal notes"
                    rows={2}
                    data-testid="admin-notes-input"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApproveResale}
                disabled={loading || (!approvalForm.approved && !approvalForm.rejection_reason)}
                className={approvalForm.approved ? "" : "bg-red-600 hover:bg-red-700"}
                data-testid="confirm-approval-btn"
              >
                {loading ? "Processing..." : approvalForm.approved ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Resale Details</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Property</Label>
                    <p className="font-medium">{selectedItem.property_number || selectedItem.property_id}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <Badge className={getStatusBadge(selectedItem.status)}>
                      {selectedItem.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500">Seller</Label>
                    <p>{selectedItem.seller_name}</p>
                    <p className="text-sm text-gray-600">{selectedItem.seller_phone}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Pricing</Label>
                    <p>Original: ₹{(selectedItem.original_price || 0).toLocaleString()}</p>
                    <p className="font-medium text-green-600">
                      Asking: ₹{(selectedItem.asking_price || 0).toLocaleString()}
                    </p>
                    {selectedItem.minimum_price && (
                      <p className="text-sm text-gray-500">
                        Min: ₹{selectedItem.minimum_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                
                {selectedItem.seller_notes && (
                  <div>
                    <Label className="text-gray-500">Seller Notes</Label>
                    <p className="text-sm">{selectedItem.seller_notes}</p>
                  </div>
                )}
                
                {selectedItem.admin_notes && (
                  <div>
                    <Label className="text-gray-500">Admin Notes</Label>
                    <p className="text-sm">{selectedItem.admin_notes}</p>
                  </div>
                )}

                {/* Inquiries */}
                {selectedItem.inquiries && selectedItem.inquiries.length > 0 && (
                  <div>
                    <Label className="text-gray-500 mb-2 block">
                      Inquiries ({selectedItem.inquiries.length})
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedItem.inquiries.map((inq) => (
                        <div key={inq.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between">
                            <p className="font-medium">{inq.inquirer_name}</p>
                            <Badge variant="outline">{inq.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{inq.inquirer_phone}</p>
                          {inq.offered_price && (
                            <p className="text-sm text-green-600">
                              Offered: ₹{inq.offered_price.toLocaleString()}
                            </p>
                          )}
                          {inq.message && (
                            <p className="text-sm text-gray-500 mt-1">{inq.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
