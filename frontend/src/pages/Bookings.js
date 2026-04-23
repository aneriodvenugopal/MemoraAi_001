import React, { useState, useEffect } from 'react';
import { bookingService, projectService, propertyService, categoryService, commissionService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, DollarSign, Calendar, CreditCard, CheckCircle, Clock, Phone, Mail, ChevronRight, Building, Banknote, Download, FileText, Building2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import PageInfoModal from '../components/PageInfoModal';
import ClickableStatCard from '../components/ClickableStatCard';
import PaymentButton from '../components/PaymentButton';
import BookingWizard from '../components/BookingWizard';
import QuickPayment from '../components/QuickPayment';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  
  const [projects, setProjects] = useState([]);
  const [properties, setProperties] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [propertyStatuses, setPropertyStatuses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const [formData, setFormData] = useState({
    tenant_id: user?.tenant_id || '',
    project_id: '',
    property_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    booking_amount: '',
    total_amount: '',
    currency_id: '',
    payment_plan_type: 'full_payment',
    emi_months: '',
    down_payment: '',
    closed_by: user?.id,
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode_id: '',
    transaction_id: '',
    payment_type: 'installment',
    installment_number: '',
    notes: '',
    bank_account_id: '',
  });

  useEffect(() => {
    fetchBookings();
    fetchProjects();
    fetchCategories();
    fetchPropertyStatuses();
    fetchBankAccounts();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await bookingService.getAll();
      setBookings(data);
    } catch (error) {
      toast.error('Failed to load bookings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const [modes, curr] = await Promise.all([
        categoryService.getAll('payment_mode', user?.tenant_id),
        categoryService.getAll('', user?.tenant_id),
      ]);
      setPaymentModes(modes);
      
      // Get currencies from context or API
      const inrCurrency = { id: 'inr-id', code: 'INR', symbol: '₹' };
      setCurrencies([inrCurrency]);
      setFormData(prev => ({ ...prev, currency_id: inrCurrency.id }));
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const fetchPropertyStatuses = async () => {
    try {
      const statuses = await categoryService.getAll('property_status', user?.tenant_id);
      setPropertyStatuses(statuses);
    } catch (error) {
      console.error('Failed to load property statuses:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/bank-accounts`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) {
        setBankAccounts(response.data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
    }
  };

  const handleProjectChange = async (projectId) => {
    setFormData(prev => ({ ...prev, project_id: projectId, property_id: '' }));
    try {
      const props = await propertyService.getAll(projectId);
      // Find the 'available' status ID
      const availableStatus = propertyStatuses.find(s => s.slug === 'available');
      const blockedStatus = propertyStatuses.find(s => s.slug === 'blocked');
      
      // Filter properties that are available or blocked (can still be booked)
      const filteredProps = props.filter(p => {
        if (!p.status_id) return true; // No status means available
        if (availableStatus && p.status_id === availableStatus.id) return true;
        if (blockedStatus && p.status_id === blockedStatus.id) return true;
        return false;
      });
      
      setProperties(filteredProps);
    } catch (error) {
      console.error('Failed to load properties:', error);
      toast.error('Failed to load properties for this project');
    }
  };

  const handlePropertyChange = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setFormData(prev => ({
        ...prev,
        property_id: propertyId,
        total_amount: property.price.toString(),
        booking_amount: (property.price * 0.1).toString(), // 10% booking amount
      }));
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingData = {
        ...formData,
        booking_amount: parseFloat(formData.booking_amount),
        total_amount: parseFloat(formData.total_amount),
        emi_months: formData.emi_months ? parseInt(formData.emi_months) : null,
        down_payment: formData.down_payment ? parseFloat(formData.down_payment) : null,
      };
      
      const booking = await bookingService.create(bookingData);
      
      // Auto-create commission for staff
      try {
        await commissionService.create({
          booking_id: booking.id,
          staff_id: user.id,
        });
      } catch (commErr) {
        console.error('Commission creation failed:', commErr);
      }
      
      toast.success('Booking created successfully!');
      setShowCreateDialog(false);
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBookingDetails = async (booking) => {
    setSelectedBooking(booking);
    setShowDetailsDialog(true);
    try {
      const details = await bookingService.getDetails(booking.id);
      setBookingDetails(details);
    } catch (error) {
      toast.error('Failed to load booking details');
      console.error(error);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;

    // Validate bank account selection
    if (!paymentData.bank_account_id) {
      toast.error('Please select a bank account to receive the payment');
      return;
    }

    try {
      await bookingService.createPayment(selectedBooking.id, {
        ...paymentData,
        booking_id: selectedBooking.id,
        amount: parseFloat(paymentData.amount),
        installment_number: paymentData.installment_number ? parseInt(paymentData.installment_number) : null,
        collected_by: user.id,
      });
      toast.success('Payment recorded successfully!');
      setPaymentData({
        amount: '',
        payment_mode_id: '',
        transaction_id: '',
        payment_type: 'installment',
        installment_number: '',
        notes: '',
        bank_account_id: '',
      });
      // Refresh booking details
      const details = await bookingService.getDetails(selectedBooking.id);
      setBookingDetails(details);
      fetchBookings();
    } catch (error) {
      toast.error('Failed to record payment');
      console.error(error);
    }
  };

  if (loading && bookings.length === 0) {
    return <div className="p-8">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Bookings</h2>
          <p className="text-gray-500">Manage property bookings and payments</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => setShowQuickPayment(true)}
            className="border-green-300 text-green-600 hover:bg-green-50"
          >
            <Zap className="w-4 h-4 mr-2" />
            Quick Payment
          </Button>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>
      
      {/* Booking Wizard */}
      <BookingWizard 
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={() => { fetchBookings(); }}
      />
      
      {/* Quick Payment Modal */}
      <QuickPayment
        isOpen={showQuickPayment}
        onClose={() => setShowQuickPayment(false)}
        onSuccess={() => { fetchBookings(); }}
      />

      {/* Old Create Dialog - keeping for backup */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Booking (Legacy)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project *</label>
                  <Select
                    value={formData.project_id}
                    onValueChange={handleProjectChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Property *</label>
                  <Select
                    value={formData.property_id}
                    onValueChange={handlePropertyChange}
                    required
                    disabled={!formData.project_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.property_number} - ₹{(property.price / 100000).toFixed(2)}L
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Name *</label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Phone *</label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Email</label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Booking Amount *</label>
                  <Input
                    type="number"
                    value={formData.booking_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, booking_amount: e.target.value }))}
                    placeholder="500000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Amount *</label>
                  <Input
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                    placeholder="5000000"
                    required
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Plan *</label>
                <Select
                  value={formData.payment_plan_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_plan_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_payment">Full Payment</SelectItem>
                    <SelectItem value="emi">EMI</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_plan_type === 'emi' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">EMI Months *</label>
                    <Input
                      type="number"
                      value={formData.emi_months}
                      onChange={(e) => setFormData(prev => ({ ...prev, emi_months: e.target.value }))}
                      placeholder="12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Down Payment</label>
                    <Input
                      type="number"
                      value={formData.down_payment}
                      onChange={(e) => setFormData(prev => ({ ...prev, down_payment: e.target.value }))}
                      placeholder="1000000"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Booking'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
              <p className="text-gray-500 mb-4">Start booking properties</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Booking
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl bg-white hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-200 group"
                  onClick={() => handleViewBookingDetails(booking)}
                  data-testid={`booking-item-${booking.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-semibold shadow-md">
                      {booking.customer_name?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {booking.customer_name}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        <a 
                          href={`tel:${booking.customer_phone}`}
                          className="flex items-center gap-1 hover:text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3 h-3" />
                          {booking.customer_phone}
                        </a>
                        {booking.customer_email && (
                          <a 
                            href={`mailto:${booking.customer_email}`}
                            className="flex items-center gap-1 hover:text-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="w-3 h-3" />
                            {booking.customer_email}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Building className="w-3 h-3" />
                        {booking.project_name || 'Project'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">₹{(booking.total_amount / 100000).toFixed(2)}L</div>
                      <Badge 
                        className={
                          booking.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBooking?.customer_name}&apos;s Booking</DialogTitle>
          </DialogHeader>
          {bookingDetails && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="payments">
                  Payments ({bookingDetails.payments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="pay-online">
                  <Banknote className="w-4 h-4 mr-1" />
                  Pay Online
                </TabsTrigger>
                <TabsTrigger value="add-payment">Record Payment</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                {/* PDF Download Actions */}
                <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`${API_URL}/api/pdf/booking-confirmation/${bookingDetails.booking?.id || selectedBooking?.id}`, '_blank')}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Booking Letter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`${API_URL}/api/pdf/allotment-letter/${bookingDetails.property?.id || selectedBooking?.property_id}`, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Allotment Letter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`${API_URL}/api/pdf/payment-schedule/${bookingDetails.property?.id || selectedBooking?.property_id}`, '_blank')}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Payment Schedule
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Property</label>
                    <div>{bookingDetails.property?.property_number}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project</label>
                    <div>{bookingDetails.project?.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Amount</label>
                    <div className="text-lg font-semibold">
                      ₹{(bookingDetails.booking.total_amount / 100000).toFixed(2)}L
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div>
                      <Badge>{bookingDetails.booking.status}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Progress</label>
                  <div className="mt-2">
                    <Progress value={bookingDetails.payment_progress || 0} className="h-2" />
                    <div className="flex justify-between text-sm mt-1">
                      <span>Paid: ₹{(bookingDetails.total_paid / 100000).toFixed(2)}L</span>
                      <span>Pending: ₹{(bookingDetails.total_pending / 100000).toFixed(2)}L</span>
                    </div>
                  </div>
                </div>

                {bookingDetails.payment_schedules && bookingDetails.payment_schedules.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Schedule</label>
                    <div className="mt-2 space-y-2">
                      {bookingDetails.payment_schedules.map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">EMI #{schedule.installment_number}</div>
                            <Badge variant={
                              schedule.status === 'paid' ? 'default' :
                              schedule.status === 'partial' ? 'secondary' : 
                              'outline'
                            }>
                              {schedule.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{(schedule.due_amount / 100000).toFixed(2)}L</div>
                            <div className="text-xs text-gray-500">
                              Due: {new Date(schedule.due_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-3">
                {bookingDetails.payments?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No payments yet</p>
                ) : (
                  bookingDetails.payments?.map((payment) => (
                    <Card key={payment.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">₹{(payment.amount / 100000).toFixed(2)}L</div>
                            <div className="text-sm text-gray-600">
                              {new Date(payment.payment_date).toLocaleString()}
                            </div>
                            {payment.receipt_number && (
                              <div className="text-xs text-gray-500 mt-1">
                                Receipt: {payment.receipt_number}
                              </div>
                            )}
                          </div>
                          <Badge className="bg-green-500">{payment.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Pay Online Tab */}
              <TabsContent value="pay-online" className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    Pay Online with Stripe
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Secure online payment via credit/debit card or UPI. Your payment will be processed instantly.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-sm text-gray-500">Total Amount</div>
                      <div className="text-xl font-bold text-gray-900">
                        ₹{((bookingDetails.booking.total_amount || 0) / 100000).toFixed(2)}L
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-sm text-gray-500">Pending Amount</div>
                      <div className="text-xl font-bold text-red-600">
                        ₹{((bookingDetails.total_pending || 0) / 100000).toFixed(2)}L
                      </div>
                    </div>
                  </div>
                  
                  {bookingDetails.total_pending > 0 ? (
                    <div className="space-y-3">
                      {/* Quick Payment Options */}
                      <div className="grid grid-cols-2 gap-3">
                        <PaymentButton
                          packageId="booking_token"
                          bookingId={selectedBooking?.id}
                          customerId={selectedBooking?.customer_id}
                          projectId={selectedBooking?.project_id}
                          propertyId={selectedBooking?.property_id}
                          description={`Booking Token for ${selectedBooking?.customer_name}`}
                          buttonText="Pay ₹50,000 Token"
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                          onSuccess={() => toast.success('Redirecting to payment...')}
                        />
                        <PaymentButton
                          packageId="booking_advance"
                          bookingId={selectedBooking?.id}
                          customerId={selectedBooking?.customer_id}
                          projectId={selectedBooking?.project_id}
                          propertyId={selectedBooking?.property_id}
                          description={`Booking Advance for ${selectedBooking?.customer_name}`}
                          buttonText="Pay ₹1,00,000 Advance"
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                          onSuccess={() => toast.success('Redirecting to payment...')}
                        />
                      </div>
                      
                      {/* Custom Amount */}
                      <div className="bg-white rounded-lg p-4 border">
                        <div className="text-sm font-medium text-gray-700 mb-2">Pay Custom Amount</div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter amount (min ₹100)"
                            id="custom-payment-amount"
                            min="100"
                            className="flex-1"
                          />
                          <PaymentButton
                            packageId="custom"
                            bookingId={selectedBooking?.id}
                            customerId={selectedBooking?.customer_id}
                            projectId={selectedBooking?.project_id}
                            propertyId={selectedBooking?.property_id}
                            description={`Custom Payment for ${selectedBooking?.customer_name}`}
                            customAmount={(() => {
                              const input = document.getElementById('custom-payment-amount');
                              return input ? parseFloat(input.value) || 0 : 0;
                            })()}
                            buttonText="Pay"
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6"
                            onSuccess={() => toast.success('Redirecting to payment...')}
                          />
                        </div>
                      </div>
                      
                      {/* Full Pending Amount */}
                      <PaymentButton
                        packageId="custom"
                        bookingId={selectedBooking?.id}
                        customerId={selectedBooking?.customer_id}
                        projectId={selectedBooking?.project_id}
                        propertyId={selectedBooking?.property_id}
                        description={`Full Pending Payment for ${selectedBooking?.customer_name}`}
                        customAmount={bookingDetails.total_pending}
                        buttonText={`Pay Full Pending Amount (₹${((bookingDetails.total_pending || 0) / 100000).toFixed(2)}L)`}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6"
                        onSuccess={() => toast.success('Redirecting to payment...')}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-green-700 font-medium">All payments completed!</p>
                      <p className="text-green-600 text-sm">This booking has no pending dues.</p>
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  Powered by Stripe • Secure SSL encrypted payment
                </div>
              </TabsContent>

              <TabsContent value="add-payment">
                <form onSubmit={handleAddPayment} className="space-y-4">
                  {/* Bank Account Selection - Required */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Receive Payment To *
                    </label>
                    <Select
                      value={paymentData.bank_account_id}
                      onValueChange={(value) => setPaymentData(prev => ({ ...prev, bank_account_id: value }))}
                      required
                    >
                      <SelectTrigger className="border-blue-200 bg-blue-50">
                        <SelectValue placeholder="Select bank/cash account to receive payment" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              {account.account_number === '1111111' ? (
                                <span className="text-green-600">💵 {account.account_name}</span>
                              ) : (
                                <span>🏦 {account.account_name} - {account.bank_name}</span>
                              )}
                              <span className="text-gray-500 text-xs">
                                (Bal: ₹{(account.current_balance || 0).toLocaleString()})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bankAccounts.length === 0 && (
                      <p className="text-xs text-red-500">No bank accounts found. Please add bank accounts in Banking section first.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount *</label>
                    <Input
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="500000"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Payment Mode *</label>
                      <Select
                        value={paymentData.payment_mode_id}
                        onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_mode_id: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentModes.map((mode) => (
                            <SelectItem key={mode.id} value={mode.id}>
                              {mode.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Transaction ID / Reference</label>
                      <Input
                        value={paymentData.transaction_id}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                        placeholder="TXN123456 / Cheque No."
                      />
                    </div>
                  </div>

                  {bookingDetails.booking.payment_plan_type === 'emi' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Installment Number</label>
                      <Input
                        type="number"
                        value={paymentData.installment_number}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, installment_number: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about the payment"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={bankAccounts.length === 0}>
                    Record Payment
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Page Info Modal */}
      <PageInfoModal
        title="Bookings & Sales Management"
        description="Complete property booking and payment management system. Handle customer bookings, process payments, manage installment schedules, track payment progress, and automatically generate sales commission for staff members."
        features={[
          "Create property bookings with customer details (name, phone, email)",
          "Project and property selection with dynamic filtering",
          "Automatic booking amount calculation (10% of property price)",
          "Multiple payment plans: Full Payment, EMI, Custom schedules",
          "EMI configuration with down payment and installment months",
          "Payment recording with multiple modes (Cash, UPI, Card, Cheque, Bank Transfer)",
          "Transaction ID tracking for digital payments",
          "Installment-wise payment tracking for EMI bookings",
          "Payment progress visualization with progress bar",
          "Payment schedule management with due dates and status",
          "Booking details view with complete payment history",
          "Automatic commission generation for sales staff",
          "Multi-currency support with tenant-level currency selection",
          "Receipt number generation for each payment",
          "Payment status tracking: Pending, Partial, Paid, Overdue"
        ]}
        technologies={[
          "React.js",
          "FastAPI Backend",
          "MongoDB",
          "Shadcn UI",
          "Currency Context",
          "Payment Processing",
          "Commission System",
          "Progress Tracking"
        ]}
        implementations={[
          {
            title: "Booking Creation Flow",
            description: "Multi-step booking form: Select project → Filter available properties → Auto-populate property price → Enter customer details → Configure payment plan (Full/EMI/Custom) → Create booking. System automatically calculates booking amount (10% default) and filters only available properties. Upon creation, booking record and commission record are generated simultaneously."
          },
          {
            title: "Payment Plans System",
            description: "Three payment plan types supported: (1) Full Payment - customer pays total amount upfront, (2) EMI - configure months and down payment, system auto-generates payment schedule with due dates, (3) Custom - flexible schedule creation. Each plan type has different form fields and validation rules."
          },
          {
            title: "Payment Recording",
            description: "Comprehensive payment form within booking details: Enter amount, select payment mode from categories, add transaction ID for digital payments, specify installment number for EMI plans, add notes. System validates against outstanding balance and updates booking status automatically. Each payment generates receipt number."
          },
          {
            title: "Payment Progress Tracking",
            description: "Visual progress bar shows paid vs pending amounts. Detail view displays: Total Amount, Total Paid (green), Total Pending (red), Payment Progress percentage, Payment Schedule with individual installment cards showing status (Paid/Partial/Pending), due dates, and amounts. Color-coded badges for quick status identification."
          },
          {
            title: "EMI Schedule Management",
            description: "Automatic generation of payment schedule based on EMI configuration. Each installment shows: Installment number, Due date, Due amount, Status (Paid/Partial/Pending), Payment history for that installment. Schedules displayed in chronological order with clear due date indicators. Overdue installments highlighted."
          },
          {
            title: "Automatic Commission Generation",
            description: "Upon booking creation, system automatically creates commission record for the staff member who closed the deal (closed_by field). Commission linked to booking for future calculation and payout processing. Integrates with Commission Management module."
          }
        ]}
      />
      
      {/* Floating Quick Payment Button */}
      <Button
        onClick={() => setShowQuickPayment(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl z-50"
        title="Quick Payment"
      >
        <Banknote className="w-6 h-6" />
      </Button>
    </div>
  );
};

export default Bookings;
