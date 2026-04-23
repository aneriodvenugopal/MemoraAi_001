import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsConditions = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>
        
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using RealApex services, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Service Description</h2>
            <p className="text-gray-700 leading-relaxed">
              RealApex provides a comprehensive real estate management platform including:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Lead and CRM management</li>
              <li>Property and project management</li>
              <li>Payment and booking automation</li>
              <li>Communication tools (SMS, Email, WhatsApp)</li>
              <li>Analytics and reporting</li>
              <li>FREE 24×7 Expert Advisory services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Responsibilities</h2>
            <p className="text-gray-700 leading-relaxed">
              As a user of RealApex, you agree to:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service in compliance with applicable laws</li>
              <li>Not misuse or attempt to disrupt the service</li>
              <li>Not share your account with unauthorized users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription and Payments</h2>
            <p className="text-gray-700 leading-relaxed">
              Subscription terms:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Subscriptions are billed monthly or annually as selected</li>
              <li>Payment is due at the beginning of each billing cycle</li>
              <li>Auto-renewal applies unless cancelled before renewal date</li>
              <li>Prices are subject to change with 30 days notice</li>
              <li>All payments are processed through secure payment gateways (Razorpay/Stripe)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Ownership</h2>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of all data you upload to RealApex. We provide:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Data export functionality</li>
              <li>Regular automated backups</li>
              <li>Multi-tenant data isolation</li>
              <li>Right to delete your data upon account closure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Service Availability</h2>
            <p className="text-gray-700 leading-relaxed">
              We strive to provide 99.9% uptime but cannot guarantee uninterrupted service. Planned maintenance will be notified in advance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              RealApex shall not be liable for any indirect, incidental, special, or consequential damages arising from use of our services. Our total liability is limited to the amount paid by you in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              Either party may terminate the subscription with 30 days notice. Upon termination, you will have 30 days to export your data before it is permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact Information</h2>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-900 font-semibold">RealApex</p>
              <p className="text-gray-700">Email: <a href="mailto:enquiry@realapex.in" className="text-blue-600 hover:underline">enquiry@realapex.in</a></p>
              <p className="text-gray-700">Phone: <a href="tel:+919948303060" className="text-blue-600 hover:underline">+91-9948303060</a></p>
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

export default TermsConditions;
