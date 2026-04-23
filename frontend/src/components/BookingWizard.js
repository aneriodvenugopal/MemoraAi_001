import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Check, ChevronLeft, ChevronRight, User, Building, 
  CreditCard, FileCheck, Search, Phone, Mail, MapPin, 
  IndianRupee, Calendar, Home, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * BookingWizard - 4-Step Wizard for Creating Bookings
 * 
 * Step 1: Customer Selection/Creation
 * Step 2: Property Selection (Visual)
 * Step 3: Payment Plan Selection
 * Step 4: Review & Confirm
 */
const BookingWizard = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [properties, setProperties] = useState([]);
  const [propertyStatuses, setPropertyStatuses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  
  // Form Data
  const [customerMode, setCustomerMode] = useState('search'); // 'search' or 'create'
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  const [paymentPlan, setPaymentPlan] = useState({
    type: 'full_payment', // full_payment, emi, custom
    booking_amount: '',
    down_payment: '',
    emi_months: 12,
    bank_account_id: ''
  });
  
  const steps = [
    { id: 1, title: 'Customer', icon: User },
    { id: 2, title: 'Property', icon: Building },
    { id: 3, title: 'Payment', icon: CreditCard },
    { id: 4, title: 'Confirm', icon: FileCheck }
  ];

  // Fetch data on mount
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      fetchPropertyStatuses();
      fetchBankAccounts();
    }
  }, [isOpen]);

  // Search customers when search changes
  useEffect(() => {
    if (customerSearch.length >= 3) {
      searchCustomers(customerSearch);
    }
  }, [customerSearch]);

  // Fetch properties when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchProperties(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProjects(data.projects || data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchPropertyStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/categories/?type=property_status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPropertyStatuses(data || []);
    } catch (error) {
      console.error('Error fetching property statuses:', error);
    }
  };

  const fetchProperties = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/properties/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Filter only available properties
      const availableStatus = propertyStatuses.find(s => s.slug === 'available');
      const availableProps = (data.properties || data || []).filter(p => 
        availableStatus ? p.status_id === availableStatus.id : true
      );
      
      setProperties(availableProps);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/bank-accounts/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBankAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const searchCustomers = async (query) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/customers/?search=${encodeURIComponent(query)}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCustomers(data.customers || data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const handleNext = () => {
    // Validation per step
    if (currentStep === 1) {
      if (customerMode === 'search' && !selectedCustomer) {
        toast.error('Please select a customer');
        return;
      }
      if (customerMode === 'create' && (!newCustomer.name || !newCustomer.phone)) {
        toast.error('Please fill customer name and phone');
        return;
      }
    }
    
    if (currentStep === 2) {
      if (!selectedProject || !selectedProperty) {
        toast.error('Please select a project and property');
        return;
      }
    }
    
    if (currentStep === 3) {
      if (!paymentPlan.booking_amount) {
        toast.error('Please enter booking amount');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCreateBooking = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Prepare customer data
      let customerId = selectedCustomer?.id;
      
      if (customerMode === 'create') {
        // Create customer first if new
        const customerRes = await fetch(`${API_URL}/api/customers/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newCustomer.name,
            phone: newCustomer.phone,
            email: newCustomer.email
          })
        });
        const customerData = await customerRes.json();
        
        if (customerData.id) {
          customerId = customerData.id;
        } else if (customerData.customer?.id) {
          customerId = customerData.customer.id;
        } else {
          throw new Error('Failed to create customer');
        }
      }
      
      // Create booking
      const bookingPayload = {
        tenant_id: user?.tenant_id,
        project_id: selectedProject.id,
        property_id: selectedProperty.id,
        customer_name: customerMode === 'create' ? newCustomer.name : selectedCustomer.name,
        customer_phone: customerMode === 'create' ? newCustomer.phone : selectedCustomer.phone,
        customer_email: customerMode === 'create' ? newCustomer.email : (selectedCustomer.email || ''),
        booking_amount: parseFloat(paymentPlan.booking_amount),
        total_amount: selectedProperty.price,
        payment_plan_type: paymentPlan.type,
        emi_months: paymentPlan.type === 'emi' ? parseInt(paymentPlan.emi_months) : null,
        down_payment: paymentPlan.down_payment ? parseFloat(paymentPlan.down_payment) : null,
        closed_by: user?.id
      };
      
      const response = await fetch(`${API_URL}/api/bookings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingPayload)
      });
      
      const data = await response.json();
      
      if (response.ok && data) {
        toast.success('🎉 Booking created successfully!');
        resetWizard();
        onSuccess && onSuccess(data);
        onClose();
      } else {
        toast.error(data.detail || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setCustomerMode('search');
    setCustomerSearch('');
    setSelectedCustomer(null);
    setNewCustomer({ name: '', phone: '', email: '' });
    setSelectedProject(null);
    setSelectedProperty(null);
    setPaymentPlan({
      type: 'full_payment',
      booking_amount: '',
      down_payment: '',
      emi_months: 12,
      bank_account_id: ''
    });
    setCustomers([]);
    setProperties([]);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Calculate EMI
  const calculateEMI = () => {
    if (!selectedProperty || !paymentPlan.down_payment || !paymentPlan.emi_months) return 0;
    const principal = selectedProperty.price - parseFloat(paymentPlan.down_payment || 0);
    return Math.ceil(principal / paymentPlan.emi_months);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetWizard(); onClose(); }}}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl">Create New Booking</DialogTitle>
          
          {/* Step Progress */}
          <div className="flex items-center justify-between mt-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isComplete = currentStep > step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isComplete ? 'bg-green-500 text-white' :
                      isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {isComplete ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {/* Step 1: Customer */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Button
                  type="button"
                  variant={customerMode === 'search' ? 'default' : 'outline'}
                  onClick={() => setCustomerMode('search')}
                  className="flex-1"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Existing
                </Button>
                <Button
                  type="button"
                  variant={customerMode === 'create' ? 'default' : 'outline'}
                  onClick={() => setCustomerMode('create')}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
              </div>

              {customerMode === 'search' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or phone (min 3 chars)..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {customers.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {customers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => setSelectedCustomer(customer)}
                          className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                            selectedCustomer?.id === customer.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.phone}</p>
                          </div>
                          {selectedCustomer?.id === customer.id && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedCustomer && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg">
                            {selectedCustomer.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-green-800">{selectedCustomer.name}</p>
                            <p className="text-sm text-green-600">{selectedCustomer.phone}</p>
                            {selectedCustomer.email && (
                              <p className="text-xs text-green-500">{selectedCustomer.email}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4" /> Customer Name *
                    </label>
                    <Input
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter customer name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Phone Number *
                    </label>
                    <Input
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="9876543210"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email (Optional)
                    </label>
                    <Input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@email.com"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Property */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Project *</label>
                <Select
                  value={selectedProject?.id || ''}
                  onValueChange={(id) => {
                    const project = projects.find(p => p.id === id);
                    setSelectedProject(project);
                    setSelectedProperty(null);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject && (
                <div>
                  <label className="text-sm font-medium">
                    Available Properties ({properties.length})
                  </label>
                  
                  {properties.length === 0 ? (
                    <Card className="mt-2 bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <AlertCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-blue-700">No available properties in this project</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-2 max-h-64 overflow-y-auto pr-2">
                      {properties.map((property) => (
                        <Card
                          key={property.id}
                          onClick={() => setSelectedProperty(property)}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedProperty?.id === property.id 
                              ? 'ring-2 ring-blue-500 bg-blue-50' 
                              : 'hover:border-blue-300'
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-lg">{property.property_number}</p>
                                <p className="text-sm text-gray-500">{property.area} sq.yard</p>
                                {property.facing && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {property.facing} Facing
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600">{formatCurrency(property.price)}</p>
                                {selectedProperty?.id === property.id && (
                                  <CheckCircle className="w-5 h-5 text-blue-600 mt-1 ml-auto" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedProperty && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-green-700">Selected Property</p>
                        <p className="font-bold text-lg text-green-800">
                          {selectedProject.name} - {selectedProperty.property_number}
                        </p>
                        <p className="text-sm text-green-600">
                          {selectedProperty.area} sq.yard | {selectedProperty.facing || 'N/A'} Facing
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-700">Total Price</p>
                        <p className="font-bold text-2xl text-green-800">
                          {formatCurrency(selectedProperty.price)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Payment Plan */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Property Value:</span>
                    <span className="font-bold text-xl">{formatCurrency(selectedProperty?.price)}</span>
                  </div>
                </CardContent>
              </Card>

              <div>
                <label className="text-sm font-medium">Payment Plan Type *</label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { id: 'full_payment', label: 'Full Payment', desc: 'Pay in full' },
                    { id: 'emi', label: 'EMI', desc: 'Monthly installments' },
                    { id: 'custom', label: 'Custom', desc: 'Milestone based' }
                  ].map((plan) => (
                    <Card
                      key={plan.id}
                      onClick={() => setPaymentPlan(prev => ({ ...prev, type: plan.id }))}
                      className={`cursor-pointer text-center ${
                        paymentPlan.type === plan.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:border-blue-300'
                      }`}
                    >
                      <CardContent className="p-3">
                        <p className="font-semibold">{plan.label}</p>
                        <p className="text-xs text-gray-500">{plan.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" /> Booking Amount *
                  </label>
                  <Input
                    type="number"
                    value={paymentPlan.booking_amount}
                    onChange={(e) => setPaymentPlan(prev => ({ ...prev, booking_amount: e.target.value }))}
                    placeholder="50000"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Amount to collect now (token)</p>
                </div>
                
                {paymentPlan.type === 'emi' && (
                  <div>
                    <label className="text-sm font-medium">Down Payment</label>
                    <Input
                      type="number"
                      value={paymentPlan.down_payment}
                      onChange={(e) => setPaymentPlan(prev => ({ ...prev, down_payment: e.target.value }))}
                      placeholder="500000"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {paymentPlan.type === 'emi' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">EMI Tenure (Months)</label>
                    <Select
                      value={String(paymentPlan.emi_months)}
                      onValueChange={(v) => setPaymentPlan(prev => ({ ...prev, emi_months: parseInt(v) }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 12, 18, 24, 36].map((m) => (
                          <SelectItem key={m} value={String(m)}>{m} Months</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Monthly EMI</label>
                    <div className="mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(calculateEMI())}
                      </p>
                      <p className="text-xs text-blue-600">/month</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Receive Payment To (Bank Account)</label>
                <Select
                  value={paymentPlan.bank_account_id}
                  onValueChange={(v) => setPaymentPlan(prev => ({ ...prev, bank_account_id: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select bank account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bank_name} - ****{acc.account_number?.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-center mb-4">Review Booking Details</h3>
              
              {/* Customer Summary */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-blue-700">Customer</span>
                  </div>
                  <p className="font-bold">
                    {customerMode === 'create' ? newCustomer.name : selectedCustomer?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {customerMode === 'create' ? newCustomer.phone : selectedCustomer?.phone}
                  </p>
                </CardContent>
              </Card>

              {/* Property Summary */}
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-green-700">Property</span>
                  </div>
                  <p className="font-bold">{selectedProject?.name} - {selectedProperty?.property_number}</p>
                  <p className="text-sm text-gray-600">
                    {selectedProperty?.area} sq.yard | {selectedProperty?.facing || 'N/A'} Facing
                  </p>
                  <p className="font-bold text-green-600 text-lg mt-1">
                    {formatCurrency(selectedProperty?.price)}
                  </p>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-orange-700">Payment Plan</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan Type:</span>
                      <Badge>{paymentPlan.type === 'full_payment' ? 'Full Payment' : paymentPlan.type === 'emi' ? 'EMI' : 'Custom'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booking Amount:</span>
                      <span className="font-bold">{formatCurrency(paymentPlan.booking_amount)}</span>
                    </div>
                    {paymentPlan.type === 'emi' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Down Payment:</span>
                          <span className="font-medium">{formatCurrency(paymentPlan.down_payment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monthly EMI:</span>
                          <span className="font-medium">{formatCurrency(calculateEMI())} x {paymentPlan.emi_months} months</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800 font-medium">
                  ⚠️ Please verify all details before confirming the booking
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t pt-4 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={loading}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {currentStep < 4 ? (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
              type="button" 
              onClick={handleCreateBooking}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingWizard;
