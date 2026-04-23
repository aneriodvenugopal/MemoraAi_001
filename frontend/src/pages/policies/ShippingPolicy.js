import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ShippingPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Shipping & Delivery Policy</h1>
        
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
          <section>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
              <p className="text-blue-900 font-semibold">
                RealApex is a digital SaaS platform. No physical products are shipped.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Service Delivery</h2>
            <p className="text-gray-700 leading-relaxed">
              All RealApex services are delivered digitally:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li><strong>Instant Access:</strong> Account activated immediately upon successful payment</li>
              <li><strong>Cloud-Based:</strong> Access from anywhere with internet connection</li>
              <li><strong>No Downloads Required:</strong> Web-based platform accessible via browser</li>
              <li><strong>Mobile PWA:</strong> Install as mobile app for offline access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Onboarding & Setup</h2>
            <p className="text-gray-700 leading-relaxed">
              Get started with RealApex in minutes:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li><strong>Immediate Access:</strong> Login credentials sent via email within 5 minutes</li>
              <li><strong>Quick Setup:</strong> Guided setup wizard for initial configuration</li>
              <li><strong>Data Import:</strong> Tools to import your existing data</li>
              <li><strong>Training Materials:</strong> Video tutorials and documentation available instantly</li>
              <li><strong>Support:</strong> 24×7 support team available via chat and email</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Service Availability</h2>
            <p className="text-gray-700 leading-relaxed">
              Platform accessibility:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li><strong>24×7 Access:</strong> Available round the clock</li>
              <li><strong>99.9% Uptime:</strong> Highly reliable infrastructure</li>
              <li><strong>Global CDN:</strong> Fast loading times across India</li>
              <li><strong>Automatic Updates:</strong> New features delivered seamlessly</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. API Access & Integrations</h2>
            <p className="text-gray-700 leading-relaxed">
              For Enterprise plans:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>API keys delivered instantly upon request</li>
              <li>Integration documentation available in dashboard</li>
              <li>Webhook setup guides provided</li>
              <li>Developer support available</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Communication Delivery</h2>
            <p className="text-gray-700 leading-relaxed">
              SMS, Email, and WhatsApp services:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li><strong>SMS:</strong> Delivered within seconds to Indian mobile numbers</li>
              <li><strong>Email:</strong> Instant delivery to inbox</li>
              <li><strong>WhatsApp:</strong> Real-time message delivery</li>
              <li><strong>Notifications:</strong> Push notifications delivered immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Export</h2>
            <p className="text-gray-700 leading-relaxed">
              Export your data anytime:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>One-click export to CSV, Excel, or PDF</li>
              <li>Complete data backup available</li>
              <li>Reports generated and delivered instantly</li>
              <li>API access for programmatic data retrieval</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Physical Documentation (If Applicable)</h2>
            <p className="text-gray-700 leading-relaxed">
              In rare cases where physical materials are needed:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Custom contracts or agreements can be couriered</li>
              <li>Delivery within 3-7 business days within India</li>
              <li>Courier charges may apply for express delivery</li>
              <li>Tracking information provided</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact Information</h2>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-900 font-semibold">Digital Delivery Support</p>
              <p className="text-gray-700">Email: <a href="mailto:enquiry@realapex.in" className="text-blue-600 hover:underline">enquiry@realapex.in</a></p>
              <p className="text-gray-700">Phone: <a href="tel:+919948303060" className="text-blue-600 hover:underline">+91-9948303060</a></p>
              <p className="text-gray-700 mt-2">For immediate access issues, contact our 24×7 support team</p>
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

export default ShippingPolicy;
