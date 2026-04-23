import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  IndianRupee, Search, Phone, User, Building, CheckCircle, 
  Loader2, CreditCard, Banknote, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * QuickPayment - Fast Payment Recording Modal
 * 
 * Flow:
 * 1. Enter customer phone
 * 2. Auto-fetch booking details
 * 3. Enter amount
 * 4. Select bank account
 * 5. Record payment (3 clicks!)
 */
const QuickPayment = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_mode_id: '',
    bank_account_id: '',
    transaction_id: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchBankAccounts();
      fetchPaymentModes();
    }
  }, [isOpen]);

  // Search bookings when phone number changes
  useEffect(() => {
    if (phoneNumber.length >= 10) {
      searchBookingsByPhone(phoneNumber);
    } else {
      setBookings([]);
      setSelectedBooking(null);
    }
  }, [phoneNumber]);

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

  const fetchPaymentModes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/categories/?type=payment_mode`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPaymentModes(data || []);
    } catch (error) {
      console.error('Error fetching payment modes:', error);
    }
  };

  const searchBookingsByPhone = async (phone) => {
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/bookings/?customer_phone=${phone}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Filter active bookings (not completed)
      const activeBookings = (data || []).filter(b => 
        b.status !== 'completed' && b.status !== 'cancelled'
      );
      
      setBookings(activeBookings);
      
      // Auto-select if only one booking
      if (activeBookings.length === 1) {
        setSelectedBooking(activeBookings[0]);
      }
    } catch (error) {
      console.error('Error searching bookings:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedBooking) {
      toast.error('Please select a booking');
      return;
    }
    
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/bookings/record-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          amount: parseFloat(paymentData.amount),
          payment_mode_id: paymentData.payment_mode_id || null,
          transaction_id: paymentData.transaction_id || null,
          payment_type: 'installment',
          notes: paymentData.notes || null,
          bank_account_id: paymentData.bank_account_id || null
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`✅ Payment of ₹${parseFloat(paymentData.amount).toLocaleString('en-IN')} recorded successfully!`);
        resetForm();
        onSuccess && onSuccess(data);
        onClose();
      } else {
        toast.error(data.detail || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPhoneNumber('');
    setBookings([]);
    setSelectedBooking(null);
    setPaymentData({
      amount: '',
      payment_mode_id: '',
      bank_account_id: '',
      transaction_id: '',
      notes: ''
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
  };

  const calculatePending = (booking) => {
    return (booking.total_amount || 0) - (booking.paid_amount || 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); }}}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-600" />
            Quick Payment Recording
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Phone Search */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Customer Phone Number
            </label>
            <div className="relative mt-1">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 10-digit phone number"
                maxLength={10}
                className="pr-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>

          {/* Booking Selection */}
          {bookings.length > 0 && (
            <div>
              <label className="text-sm font-medium">Select Booking</label>
              <div className="space-y-2 mt-1 max-h-40 overflow-y-auto">
                {bookings.map((booking) => (
                  <Card
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className={`cursor-pointer transition-all ${
                      selectedBooking?.id === booking.id 
                        ? 'ring-2 ring-green-500 bg-green-50' 
                        : 'hover:border-green-300'
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{booking.customer_name}</p>
                          <p className="text-sm text-gray-500">
                            {booking.property_number || 'Property'} | {booking.project_name || 'Project'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Pending</p>
                          <p className="font-bold text-orange-600">
                            {formatCurrency(calculatePending(booking))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {phoneNumber.length >= 10 && bookings.length === 0 && !searching && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-yellow-700">No active bookings found for this phone number</p>
              </CardContent>
            </Card>
          )}

          {/* Selected Booking Summary */}
          {selectedBooking && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-800">Selected Booking</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <span className="ml-1 font-medium">{selectedBooking.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Property:</span>
                    <span className="ml-1 font-medium">{selectedBooking.property_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-1 font-medium">{formatCurrency(selectedBooking.total_amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pending:</span>
                    <span className="ml-1 font-bold text-orange-600">
                      {formatCurrency(calculatePending(selectedBooking))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          {selectedBooking && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    Amount *
                  </label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Mode</label>
                  <Select
                    value={paymentData.payment_mode_id}
                    onValueChange={(v) => setPaymentData(prev => ({ ...prev, payment_mode_id: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((mode) => (
                        <SelectItem key={mode.id} value={mode.id}>{mode.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Bank Account</label>
                  <Select
                    value={paymentData.bank_account_id}
                    onValueChange={(v) => setPaymentData(prev => ({ ...prev, bank_account_id: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select bank" />
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
                <div>
                  <label className="text-sm font-medium">Transaction ID</label>
                  <Input
                    value={paymentData.transaction_id}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                    placeholder="Reference number"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Input
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes"
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleRecordPayment}
            disabled={loading || !selectedBooking || !paymentData.amount}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Record Payment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickPayment;
