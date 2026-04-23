import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  const location = useLocation();
  const isAgentApex = location.search?.includes('app=agentapex') || location.pathname?.includes('agentapex');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to={isAgentApex ? "/agentapex" : "/"} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="bg-white rounded-xl shadow-md p-8 space-y-6">

          {/* ==================== REALAPEX SECTION ==================== */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">MemoraAI Platform</h2>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed">
              At MemoraAI, we collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Name, email address, phone number, and company details</li>
              <li>Property and project information you upload</li>
              <li>Payment and billing information</li>
              <li>Communication preferences and history</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We implement industry-standard security measures to protect your personal information:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Data encryption during transmission (SSL/TLS)</li>
              <li>Secure data storage with regular backups</li>
              <li>Access controls and authentication</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="text-gray-700 leading-relaxed">
              We do not sell your personal information. We may share your information only:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>With your consent</li>
              <li>With service providers who assist in our operations</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-900 font-semibold">MemoraAI</p>
              <p className="text-gray-700">
                Email: <a href="mailto:enquiry@memoraai.in" className="text-blue-600 hover:underline">enquiry@memoraai.in</a>
              </p>
              <p className="text-gray-700">
                Phone: <a href="tel:+919948303060" className="text-blue-600 hover:underline">+91-9948303060</a>
              </p>
              <p className="text-gray-700">
                WhatsApp: <a href="https://wa.me/919948303060" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">+91-9948303060</a>
              </p>
            </div>
          </section>

          {/* ==================== AGENTAPEX SECTION ==================== */}
          <section className="border-t-4 border-sky-400 pt-8 mt-8" id="agentapex">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">AgentApex - Privacy Policy</h2>
            </div>
            <p className="text-gray-600 mb-4">
              AgentApex is a product of MemoraAI. This section specifically covers the privacy practices for the AgentApex mobile application and web platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. About AgentApex</h2>
            <p className="text-gray-700 leading-relaxed">
              AgentApex is a mobile-first property management platform designed for real estate agents and property consultants. 
              It enables agents to list properties, track leads, manage follow-ups, share property details, and grow their real estate business.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              When you use AgentApex, we may collect the following information:
            </p>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">a) Account Information</h3>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Phone number (for OTP-based login authentication)</li>
              <li>Name, email address, and designation</li>
              <li>Profile photo (optional, uploaded by you)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4">b) Property Information</h3>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Property details: type, price, area, location, coordinates</li>
              <li>Property images and documents you upload</li>
              <li>Property descriptions and additional notes</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4">c) Lead & Contact Information</h3>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Buyer/enquiry contact details (name, phone, message)</li>
              <li>Follow-up contact details you add manually</li>
              <li>Lead interaction history and status</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4">d) Device & Usage Information</h3>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Device type, operating system, and browser version</li>
              <li>App usage patterns and feature interactions</li>
              <li>Location data (only when you grant permission, used for map features)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>To authenticate your identity via OTP verification</li>
              <li>To display your properties on the map and in search results</li>
              <li>To generate property share cards with your agent branding</li>
              <li>To track and manage leads from property enquiries</li>
              <li>To send notifications about new leads and property activities</li>
              <li>To provide follow-up reminders and scheduling</li>
              <li>To improve app performance and user experience</li>
              <li>To generate Property IDs for unique property identification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Data Storage & Security</h2>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>All data is encrypted in transit using SSL/TLS</li>
              <li>Property images and documents are stored securely in cloud storage</li>
              <li>Authentication tokens are stored locally on your device</li>
              <li>We use MongoDB with access controls for data storage</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>No passwords are stored - we use OTP-based authentication only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Information Sharing & Visibility</h2>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li><strong>Property Listings:</strong> Properties you list are visible to other agents and users on the platform</li>
              <li><strong>Share Cards:</strong> When you share properties, your name, designation, and profile photo are included (not your direct contact details)</li>
              <li><strong>Contact Protection:</strong> Your phone number and direct contact details are NOT shared in property posters or share cards. Buyers must submit enquiries through the app</li>
              <li><strong>Lead Data:</strong> Lead information from enquiries is visible only to the property owner/agent</li>
              <li>We do not sell or rent your personal information to third parties</li>
              <li>We may share anonymized, aggregated data for analytics purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Permissions We Request</h2>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li><strong>Camera/Gallery:</strong> To upload property images and profile photo</li>
              <li><strong>Location:</strong> To show properties on map and enable location-based search</li>
              <li><strong>Contacts:</strong> To import contacts for follow-up management (optional, only when you use the feature)</li>
              <li><strong>Storage:</strong> To download and save property share cards</li>
              <li><strong>Notifications:</strong> To alert you about new leads and follow-up reminders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
            <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-2">
              <li>Access and download your property data at any time</li>
              <li>Update or correct your profile information</li>
              <li>Delete your account and all associated data</li>
              <li>Opt out of notifications</li>
              <li>Revoke app permissions through your device settings</li>
              <li>Request a copy of your personal data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your data as long as your account is active. When you delete your account, 
              all personal data including properties, leads, follow-ups, and uploaded files will be 
              permanently deleted within 30 days. Some anonymized analytics data may be retained for 
              service improvement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              AgentApex is designed for real estate professionals. Our services are not intended for 
              children under 18 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes through the app or via the email address associated with your account. 
              Your continued use of AgentApex after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Contact Us - AgentApex</h2>
            <p className="text-gray-700 leading-relaxed">
              For any questions about AgentApex's privacy practices:
            </p>
            <div className="mt-4 p-4 bg-sky-50 rounded-lg border border-sky-200">
              <p className="text-gray-900 font-semibold">AgentApex (A Product of MemoraAI)</p>
              <p className="text-gray-700">
                Email: <a href="mailto:info@agentapex.in" className="text-blue-600 hover:underline">info@agentapex.in</a>
              </p>
              <p className="text-gray-700">
                Website: <a href="https://agentapex.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">agentapex.com</a>
              </p>
              <p className="text-gray-700">
                Developer: <a href="mailto:aneroid.venugopal@gmail.com" className="text-blue-600 hover:underline">aneroid.venugopal@gmail.com</a>
              </p>
            </div>
          </section>

          <section className="border-t pt-6">
            <p className="text-sm text-gray-600">
              Last Updated: March 2026
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
