import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus } from 'lucide-react';

const FAQItem = ({ question, answer, isOpen, toggle }) => {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between py-6 text-left hover:text-blue-600 transition-colors"
      >
        <span className="text-lg font-semibold text-gray-900 pr-8">{question}</span>
        {isOpen ? (
          <Minus className="w-5 h-5 text-blue-600 flex-shrink-0" />
        ) : (
          <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="pb-6 text-gray-700 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

const FAQRealEstate = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "How does MemoraAI help avoid lead leakage and improve conversions?",
      answer: (
        <div className="space-y-3">
          <p>MemoraAI's Anti-Leakage System ensures zero lead loss through:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Automatic Lead Capture:</strong> Every inquiry is automatically logged with source tracking</li>
            <li><strong>Smart Assignment:</strong> Leads instantly assigned to team members based on rules</li>
            <li><strong>Follow-up Reminders:</strong> Automated reminders ensure no lead is forgotten</li>
            <li><strong>WhatsApp Integration:</strong> Instant lead notifications via WhatsApp</li>
            <li><strong>Activity Tracking:</strong> Monitor all interactions and touchpoints</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: Companies see 40X faster growth with 0% lead leakage</p>
        </div>
      )
    },
    {
      question: "What automation features help speed up real estate operations?",
      answer: (
        <div className="space-y-3">
          <p>MemoraAI automates time-consuming tasks:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Payment Automation:</strong> Auto-generate receipts, invoices, and payment reminders</li>
            <li><strong>SMS/Email/WhatsApp:</strong> Automated communication for bookings, payments, updates</li>
            <li><strong>Commission Calculations:</strong> Automatic calculation and distribution to agents</li>
            <li><strong>Document Generation:</strong> Auto-create agreements, receipts, statements</li>
            <li><strong>Follow-up Scheduling:</strong> Smart scheduling based on customer behavior</li>
            <li><strong>Reporting:</strong> Real-time dashboards without manual data entry</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: Save 20+ hours per week on manual tasks</p>
        </div>
      )
    },
    {
      question: "How does the resale property feature work and generate additional revenue?",
      answer: (
        <div className="space-y-3">
          <p>Our Resale Marketplace creates a new revenue stream:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Customer Requests:</strong> Customers can list their properties for resale</li>
            <li><strong>Approval Workflow:</strong> Admin reviews and approves listings</li>
            <li><strong>Public Listings:</strong> Approved properties appear on your website</li>
            <li><strong>Lead Generation:</strong> New buyers interested in resale properties</li>
            <li><strong>Commission Tracking:</strong> Track resale commissions separately</li>
            <li><strong>Customer Retention:</strong> Keep customers engaged even after primary sale</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: 15-25% additional revenue from resale transactions</p>
        </div>
      )
    },
    {
      question: "What payment integrations are available and how do they work?",
      answer: (
        <div className="space-y-3">
          <p>Multi-gateway payment integration:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Razorpay & Stripe:</strong> Accept online payments instantly</li>
            <li><strong>Payment Links:</strong> Send secure payment links via SMS/WhatsApp</li>
            <li><strong>EMI Options:</strong> Offer installment plans to customers</li>
            <li><strong>Auto-reconciliation:</strong> Payments auto-matched with bookings</li>
            <li><strong>Multi-currency:</strong> Accept payments in different currencies</li>
            <li><strong>Payment Reminders:</strong> Automated reminders for pending payments</li>
            <li><strong>Secure:</strong> PCI-DSS compliant payment processing</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: 60% faster payment collection, 90% reduction in payment delays</p>
        </div>
      )
    },
    {
      question: "How do SMS, Email, and WhatsApp integrations improve communication?",
      answer: (
        <div className="space-y-3">
          <p>Omni-channel communication platform:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Bulk Messaging:</strong> Send updates to 1000s of customers instantly</li>
            <li><strong>WhatsApp Business API:</strong> Official verified business account</li>
            <li><strong>Personalized Templates:</strong> Custom messages with customer data</li>
            <li><strong>Event-based Triggers:</strong> Auto-send on booking, payment, follow-up</li>
            <li><strong>Multi-language:</strong> Send in Telugu, Hindi, English</li>
            <li><strong>Delivery Reports:</strong> Track message delivery and read receipts</li>
            <li><strong>Credits System:</strong> Pay only for messages sent, no wastage</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: 80% better engagement, 50% cost savings vs traditional methods</p>
        </div>
      )
    },
    {
      question: "What Business Intelligence and reporting features are included?",
      answer: (
        <div className="space-y-3">
          <p>Comprehensive analytics and insights:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Real-time Dashboards:</strong> Sales, revenue, conversions at a glance</li>
            <li><strong>Team Performance:</strong> Track individual and team metrics</li>
            <li><strong>Lead Analytics:</strong> Source tracking, conversion funnels, quality scores</li>
            <li><strong>Revenue Reports:</strong> Booking values, payment collections, outstanding</li>
            <li><strong>Property Performance:</strong> Which properties sell fastest</li>
            <li><strong>Commission Reports:</strong> Agent earnings, pending approvals</li>
            <li><strong>Custom Reports:</strong> Build your own reports with filters</li>
            <li><strong>Export Options:</strong> Download as PDF, Excel, CSV</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: Data-driven decisions lead to 30% better ROI</p>
        </div>
      )
    },
    {
      question: "How does calendar integration help manage follow-ups and site visits?",
      answer: (
        <div className="space-y-3">
          <p>Smart scheduling and calendar management:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Google Calendar Sync:</strong> Sync appointments with Google Calendar</li>
            <li><strong>Site Visit Scheduling:</strong> Book customer site visits with availability</li>
            <li><strong>Follow-up Reminders:</strong> Never miss a follow-up call or meeting</li>
            <li><strong>Team Calendar:</strong> View entire team's schedule</li>
            <li><strong>Color Coding:</strong> Different colors for different activity types</li>
            <li><strong>Auto-reminders:</strong> SMS/Email reminders before appointments</li>
            <li><strong>Conflict Prevention:</strong> Avoid double-booking</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: 95% reduction in missed appointments</p>
        </div>
      )
    },
    {
      question: "Does MemoraAI support video calling for virtual site visits?",
      answer: (
        <div className="space-y-3">
          <p>Yes! Video calling capabilities:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>In-App Video Calls:</strong> Call customers directly from the platform</li>
            <li><strong>Screen Sharing:</strong> Share property layouts and documents</li>
            <li><strong>Virtual Tours:</strong> Conduct remote site visits</li>
            <li><strong>Call Recording:</strong> Record calls for future reference (with consent)</li>
            <li><strong>Meeting Links:</strong> Send secure meeting links via SMS/WhatsApp</li>
            <li><strong>Call Logs:</strong> Track all video interactions</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: Reach customers anywhere, close deals 3X faster</p>
        </div>
      )
    },
    {
      question: "How does MemoraAI calculate commissions and manage agent payments?",
      answer: (
        <div className="space-y-3">
          <p>Transparent commission management:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Auto-calculation:</strong> Commission calculated based on rules you set</li>
            <li><strong>Multi-level Splits:</strong> Support for referral and team hierarchies</li>
            <li><strong>Approval Workflow:</strong> Review and approve before payment</li>
            <li><strong>Payment Tracking:</strong> Track paid, pending, and upcoming commissions</li>
            <li><strong>Agent Portal:</strong> Agents can view their earnings in real-time</li>
            <li><strong>Tax Compliance:</strong> Generate TDS certificates and reports</li>
            <li><strong>Payment History:</strong> Complete audit trail of all payments</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: Zero disputes, 100% transparency, automated tracking</p>
        </div>
      )
    },
    {
      question: "What makes MemoraAI 40X faster than traditional real estate operations?",
      answer: (
        <div className="space-y-3">
          <p>Speed comes from complete automation:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Instant Lead Capture:</strong> No manual data entry</li>
            <li><strong>Auto-Assignment:</strong> Leads routed in seconds</li>
            <li><strong>One-Click Actions:</strong> Book property, generate receipt, send SMS - all in one click</li>
            <li><strong>Smart Search:</strong> Find any customer, property, payment in 2 seconds</li>
            <li><strong>Bulk Operations:</strong> Update 100s of records at once</li>
            <li><strong>Mobile Access:</strong> Team works from anywhere, anytime</li>
            <li><strong>Real-time Sync:</strong> All data updated across team instantly</li>
            <li><strong>No Manual Reports:</strong> Everything auto-generated</li>
          </ul>
          <p className="font-semibold text-blue-600">Result: What took 40 hours now takes 1 hour</p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            FAQ for Real Estate Companies
          </h1>
          <p className="text-xl text-gray-600">
            Learn how MemoraAI transforms your business with automation, eliminates leakage, and accelerates growth
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 mb-12 text-white">
          <h2 className="text-2xl font-bold mb-4">🚀 Transform Your Real Estate Business</h2>
          <p className="text-lg opacity-90 mb-4">
            MemoraAI helps you automate operations, eliminate revenue leakage, and grow 40X faster with:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>✓ 0% Lead Leakage</div>
            <div>✓ Payment Automation</div>
            <div>✓ SMS/Email/WhatsApp</div>
            <div>✓ Commission Management</div>
            <div>✓ BI Reports & Analytics</div>
            <div>✓ Calendar & Video Calls</div>
            <div>✓ Resale Marketplace</div>
            <div>✓ Mobile PWA App</div>
            <div>✓ Multi-language Support</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              toggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>

        <div className="mt-12 bg-blue-50 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Automate Your Real Estate Business?
          </h3>
          <p className="text-gray-700 mb-6">
            Join 500+ real estate companies using MemoraAI to eliminate leakage and grow faster
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
            >
              Start Free Trial →
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 bg-white hover:bg-gray-50 text-blue-600 font-bold rounded-lg border-2 border-blue-600 transition-all"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQRealEstate;
