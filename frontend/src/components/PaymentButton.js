import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * PaymentButton - A reusable component for initiating Stripe payments
 * 
 * @param {string} packageId - Payment package ID (booking_token, booking_advance, emi_standard, custom)
 * @param {number} customAmount - Custom amount for custom package (optional)
 * @param {string} bookingId - Related booking ID (optional)
 * @param {string} emiId - Related EMI payment ID (optional)
 * @param {string} customerId - Customer ID (optional)
 * @param {string} projectId - Project ID (optional)
 * @param {string} propertyId - Property ID (optional)
 * @param {string} description - Payment description (optional)
 * @param {string} buttonText - Custom button text
 * @param {string} className - Additional CSS classes
 * @param {function} onSuccess - Callback after successful redirect to Stripe
 * @param {function} onError - Callback on error
 */
const PaymentButton = ({
  packageId = 'custom',
  customAmount,
  bookingId,
  emiId,
  customerId,
  projectId,
  propertyId,
  description,
  buttonText = 'Pay Now',
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
  onSuccess,
  onError,
  children
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const originUrl = window.location.origin;

      const requestBody = {
        package_id: packageId,
        origin_url: originUrl,
        booking_id: bookingId,
        emi_id: emiId,
        customer_id: customerId,
        project_id: projectId,
        property_id: propertyId,
        description: description,
        custom_amount: customAmount
      };

      const response = await fetch(`${API_URL}/api/payments/checkout/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (data.checkout_url) {
        // Callback before redirect
        if (onSuccess) {
          onSuccess(data);
        }
        
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || disabled}
      className={className}
      variant={variant}
      size={size}
      data-testid="payment-button"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        children || (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {buttonText}
          </>
        )
      )}
    </Button>
  );
};

export default PaymentButton;
