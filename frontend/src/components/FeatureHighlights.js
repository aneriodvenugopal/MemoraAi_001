import React from 'react';
import { LogIn, CreditCard, FileText, BarChart3, Users, MapPin, MessageSquare, Shield } from 'lucide-react';

const FeatureHighlights = () => {
  const features = [
    {
      icon: <LogIn className="w-10 h-10" />,
      title: "Secure Login Portal",
      description: "Everyone gets their own secure login",
      details: [
        "Companies: Full admin dashboard",
        "Customers: View bookings & payments", 
        "Agents: Access leads & commissions",
        "Staff: Role-based permissions"
      ],
      color: "blue"
    },
    {
      icon: <CreditCard className="w-10 h-10" />,
      title: "Payment & Billing",
      description: "Automated payment processing for all",
      details: [
        "Companies: Track all revenue streams",
        "Customers: Pay online with receipts",
        "Agents: Track commission payments",
        "Staff: Generate invoices instantly"
      ],
      color: "green"
    },
    {
      icon: <FileText className="w-10 h-10" />,
      title: "Reports & Documents",
      description: "Instant reports for everyone",
      details: [
        "Companies: Sales, revenue, performance",
        "Customers: Payment receipts, agreements",
        "Agents: Earnings & target reports",
        "Staff: Automated report generation"
      ],
      color: "purple"
    },
    {
      icon: <BarChart3 className="w-10 h-10" />,
      title: "Analytics Dashboard",
      description: "Real-time insights for decision making",
      details: [
        "Companies: Business intelligence reports",
        "Customers: Property value tracking",
        "Agents: Performance metrics",
        "Staff: Operational dashboards"
      ],
      color: "orange"
    },
    {
      icon: <Users className="w-10 h-10" />,
      title: "CRM & Lead Management",
      description: "Complete customer relationship management",
      details: [
        "Companies: Track every customer",
        "Customers: Easy communication",
        "Agents: Smart lead assignment",
        "Staff: Follow-up automation"
      ],
      color: "cyan"
    },
    {
      icon: <MapPin className="w-10 h-10" />,
      title: "Property Management",
      description: "Visual layouts & inventory tracking",
      details: [
        "Companies: Track all properties",
        "Customers: Interactive property maps",
        "Agents: Show properties on mobile",
        "Staff: Update availability instantly"
      ],
      color: "pink"
    },
    {
      icon: <MessageSquare className="w-10 h-10" />,
      title: "Communication Hub",
      description: "SMS, Email, WhatsApp automation",
      details: [
        "Companies: Bulk campaigns",
        "Customers: Instant notifications",
        "Agents: Direct customer contact",
        "Staff: Automated messaging"
      ],
      color: "indigo"
    },
    {
      icon: <Shield className="w-10 h-10" />,
      title: "Security & Access Control",
      description: "Enterprise-grade security",
      details: [
        "Companies: Complete data control",
        "Customers: Secure payment processing",
        "Agents: Protected commission data",
        "Staff: Role-based access only"
      ],
      color: "red"
    }
  ];

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    cyan: 'from-cyan-500 to-cyan-600',
    pink: 'from-pink-500 to-pink-600',
    indigo: 'from-indigo-500 to-indigo-600',
    red: 'from-red-500 to-red-600'
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Core Features Everyone Uses
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed for every user type in your organization
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 group"
            >
              <div className={`bg-gradient-to-br ${colorClasses[feature.color]} w-16 h-16 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 mb-4 text-sm">
                {feature.description}
              </p>
              
              <div className="border-t pt-4 space-y-2">
                {feature.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start text-sm">
                    <span className={`bg-gradient-to-br ${colorClasses[feature.color]} text-white text-xs px-2 py-0.5 rounded mr-2 mt-0.5 font-semibold flex-shrink-0`}>
                      {detail.split(':')[0]}
                    </span>
                    <span className="text-gray-700">
                      {detail.split(':')[1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 max-w-4xl mx-auto text-white">
            <h3 className="text-3xl font-bold mb-4">
              See How It All Works Together
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Schedule a free demo to see how MemoraAI benefits everyone in your organization
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://wa.me/919948303060?text=I want to see a demo of MemoraAI for my organization"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all"
              >
                📱 WhatsApp for Demo
              </a>
              <a
                href="tel:+919948303060"
                className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold transition-all"
              >
                📞 Call Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlights;
