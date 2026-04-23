import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Cancellation & Refund Policy</h1>
        
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Cancellation Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              You may cancel your MemoraAI subscription at any time:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Cancel anytime from your account settings</li>
              <li>Access continues until the end of your billing period</li>
              <li>Auto-renewal will be disabled upon cancellation</li>
              <li>No cancellation fees apply</li>
              <li>30-day data export window after cancellation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Refund Eligibility</h2>
            <p className="text-gray-700 leading-relaxed">
              Refunds are available in the following cases:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li><strong>7-Day Money-Back Guarantee:</strong> Full refund if cancelled within 7 days of initial purchase</li>
              <li><strong>Service Downtime:</strong> Prorated refund for downtime exceeding 24 hours in a month</li>
              <li><strong>Duplicate Charges:</strong> Full refund for any duplicate billing errors</li>
              <li><strong>Technical Issues:</strong> Refund if critical features are unavailable for extended periods</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Non-Refundable Items</h2>
            <p className="text-gray-700 leading-relaxed">
              The following are not eligible for refunds:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>SMS, Email, and WhatsApp credits already consumed</li>
              <li>Custom development or integration fees</li>
              <li>Training and onboarding services already provided</li>
              <li>Partial month subscriptions after 7-day period</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Refund Process</h2>
            <p className="text-gray-700 leading-relaxed">
              To request a refund:
            </p>
            <ol className="list-decimal ml-6 mt-2 text-gray-700 space-y-2">
              <li>Contact our support team at <a href="mailto:enquiry@memoraai.in" className="text-blue-600 hover:underline">enquiry@memoraai.in</a></li>
              <li>Provide your account details and reason for refund</li>
              <li>Our team will review within 2 business days</li>
              <li>Approved refunds processed within 7-10 business days</li>
              <li>Refund credited to original payment method</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Annual Subscriptions</h2>
            <p className="text-gray-700 leading-relaxed">
              For annual subscriptions:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>7-day money-back guarantee applies</li>
              <li>After 7 days, prorated refund for unused months</li>
              <li>Minimum 30-day notice required</li>
              <li>10% processing fee may apply for annual cancellations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Downgrades</h2>
            <p className="text-gray-700 leading-relaxed">
              When downgrading your plan:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Changes take effect at next billing cycle</li>
              <li>No refunds for the current billing period</li>
              <li>Access to premium features continues until downgrade</li>
              <li>Data exceeding new plan limits must be archived</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Contact for Refunds</h2>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-900 font-semibold">Refund Support</p>
              <p className="text-gray-700">Email: <a href="mailto:enquiry@memoraai.in" className="text-blue-600 hover:underline">enquiry@memoraai.in</a></p>
              <p className="text-gray-700">Phone: <a href="tel:+919948303060" className="text-blue-600 hover:underline">+91-9948303060</a></p>
              <p className="text-gray-700 mt-2">Response Time: Within 24 hours</p>
            </div>
          </section>

          <section className="border-t pt-6">
            <p className="text-sm text-gray-600">
              Last Updated: January 2025
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
