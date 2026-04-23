import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Home, CreditCard, Calendar, AlertCircle, DollarSign, Building, CheckCircle, LogOut, ArrowLeft } from 'lucide-react';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [resaleRequests, setResaleRequests] = useState([]);
  const [showResaleDialog, setShowResaleDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [resaleForm, setResaleForm] = useState({
    asking_price: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    loadDashboard();
    loadBookings();
    loadPayments();
    loadProperties();
    loadPaymentSchedules();
    loadResaleRequests();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await customerService.getDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const data = await customerService.getBookings();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const data = await customerService.getPayments();
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadProperties = async () => {
    try {
      const data = await customerService.getProperties();
      setProperties(data.properties || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const loadPaymentSchedules = async () => {
    try {
      const data = await customerService.getPaymentSchedules();
      setPaymentSchedules(data.schedules || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadResaleRequests = async () => {
    try {
      const data = await customerService.getResaleRequests();
      setResaleRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading resale requests:', error);
    }
  };

  const handleResaleRequest = async () => {
    if (!selectedProperty || !resaleForm.asking_price) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await customerService.createResaleRequest({
        property_id: selectedProperty.id,
        booking_id: selectedProperty.booking_id,
        asking_price: parseFloat(resaleForm.asking_price),
        reason: resaleForm.reason,
        notes: resaleForm.notes
      });
      toast.success('Resale request submitted successfully!');
      setShowResaleDialog(false);
      setResaleForm({ asking_price: '', reason: '', notes: '' });
      setSelectedProperty(null);
      loadResaleRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit resale request');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b mb-6">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.role !== 'customer' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RealApex</h1>
                <p className="text-sm text-gray-500">Customer Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
        <p className="text-gray-600">Manage your properties, bookings and payments</p>
      </div>

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
              <Building className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.overview.active_bookings}</div>
              <p className="text-xs text-gray-600">Total: {dashboardData.overview.total_bookings}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{dashboardData.overview.total_invested.toLocaleString()}</div>
              <p className="text-xs text-green-600">Portfolio Value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₹{dashboardData.overview.total_pending.toLocaleString()}</div>
              <p className="text-xs text-gray-600">Paid: ₹{dashboardData.overview.total_paid.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className={dashboardData.overview.overdue_count > 0 ? "border-red-200" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className={`h-4 w-4 ${dashboardData.overview.overdue_count > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dashboardData.overview.overdue_count > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {dashboardData.overview.overdue_count}
              </div>
              <p className="text-xs text-red-600">
                {dashboardData.overview.overdue_count > 0 ? `₹${dashboardData.overview.overdue_amount.toLocaleString()}` : 'No overdue'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="properties">My Properties</TabsTrigger>
          <TabsTrigger value="schedules">Payment Schedule</TabsTrigger>
          <TabsTrigger value="resale">Resale Requests</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Upcoming Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.upcoming_payments?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.upcoming_payments.map((schedule, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">₹{schedule.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Due: {schedule.due_date}</p>
                      </div>
                      <Badge>{schedule.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No upcoming payments</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recent_payments?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recent_payments.map((payment, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{payment.payment_date}</p>
                      </div>
                      <Badge variant="success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No payment history</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>My Bookings ({bookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="border">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Property</p>
                          <p className="font-semibold">{booking.property?.property_number || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{booking.project?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="font-semibold">₹{booking.total_amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">Paid: ₹{booking.paid_amount?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <Badge>{booking.status}</Badge>
                          <p className="text-sm text-gray-600 mt-1">{booking.booking_date}</p>
                        </div>
                      </div>
                      {booking.payment_schedules?.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Payment Schedule ({booking.payment_schedules.length} installments)</p>
                          <div className="flex gap-2 flex-wrap">
                            {booking.payment_schedules.slice(0, 3).map((schedule, idx) => (
                              <Badge key={idx} variant={schedule.status === 'paid' ? 'success' : 'secondary'}>
                                ₹{schedule.amount.toLocaleString()} - {schedule.due_date}
                              </Badge>
                            ))}
                            {booking.payment_schedules.length > 3 && (
                              <Badge variant="outline">+{booking.payment_schedules.length - 3} more</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {bookings.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No bookings found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Property</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Mode</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-t">
                        <td className="px-4 py-3 text-sm">{payment.payment_date}</td>
                        <td className="px-4 py-3 font-medium">₹{payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{payment.property_number || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{payment.mode_id || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={payment.status === 'Success' ? 'success' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{payment.receipt_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No payment history</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>My Properties ({properties.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map((property) => (
                  <Card key={property.id} className="border">
                    <CardContent className="pt-6">
                      <div className="mb-4">
                        <div className="bg-gray-200 h-32 rounded flex items-center justify-center">
                          <Home className="h-12 w-12 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg">{property.property_number}</h3>
                      <p className="text-sm text-gray-600">{property.project?.name || 'N/A'}</p>
                      <div className="mt-3 space-y-1">
                        <p className="text-sm"><span className="text-gray-600">Area:</span> {property.area} {property.unit}</p>
                        <p className="text-sm"><span className="text-gray-600">Price:</span> ₹{property.price.toLocaleString()}</p>
                        <p className="text-sm"><span className="text-gray-600">Payment:</span> {property.payment_status}</p>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        variant="outline"
                        onClick={() => {
                          setSelectedProperty(property);
                          setShowResaleDialog(true);
                        }}
                      >
                        Request Resale
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {properties.length === 0 && (
                  <p className="text-gray-500 text-center py-8 col-span-3">No properties found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Schedule Tab */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule ({paymentSchedules.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentSchedules.map((schedule) => (
                  <div key={schedule.id} className="flex justify-between items-center p-4 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">₹{schedule.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{schedule.property_number || 'Property'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{schedule.due_date}</p>
                      <Badge className="mt-1" variant={schedule.status === 'paid' ? 'success' : schedule.status === 'pending' ? 'secondary' : 'destructive'}>
                        {schedule.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {paymentSchedules.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No payment schedules</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resale Requests Tab */}
        <TabsContent value="resale">
          <Card>
            <CardHeader>
              <CardTitle>Resale Requests ({resaleRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resaleRequests.map((request) => (
                  <Card key={request.id} className="border">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Property</p>
                          <p className="font-semibold">{request.property?.property_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Asking Price</p>
                          <p className="font-semibold">₹{request.asking_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <Badge>{request.status}</Badge>
                        </div>
                      </div>
                      {request.reason && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">Reason:</p>
                          <p className="text-sm">{request.reason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {resaleRequests.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No resale requests</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resale Request Dialog */}
      <Dialog open={showResaleDialog} onOpenChange={setShowResaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Property Resale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Property</label>
              <Input value={selectedProperty?.property_number || ''} disabled />
            </div>
            <div>
              <label className="text-sm font-medium">Asking Price *</label>
              <Input
                type="number"
                value={resaleForm.asking_price}
                onChange={(e) => setResaleForm({ ...resaleForm, asking_price: e.target.value })}
                placeholder="Enter asking price"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Input
                value={resaleForm.reason}
                onChange={(e) => setResaleForm({ ...resaleForm, reason: e.target.value })}
                placeholder="Reason for resale"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Notes (Optional)</label>
              <textarea
                value={resaleForm.notes}
                onChange={(e) => setResaleForm({ ...resaleForm, notes: e.target.value })}
                placeholder="Any additional information"
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>
            <Button onClick={handleResaleRequest} className="w-full">
              Submit Resale Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default CustomerDashboard;
