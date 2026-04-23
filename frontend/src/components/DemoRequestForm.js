import React, { useState } from 'react';
import { User, Mail, Phone, Building2, MessageSquare } from 'lucide-react';

const DemoRequestForm = ({ demoType, description }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Open WhatsApp with pre-filled message
    const whatsappMessage = `Hi! I want a demo of ${demoType}%0A%0AName: ${formData.name}%0ACompany: ${formData.company}%0APhone: ${formData.phone}%0AEmail: ${formData.email}%0A%0AMessage: ${formData.message}`;
    window.open(`https://wa.me/919948303060?text=${whatsappMessage}`, '_blank');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-green-800 mb-4">Demo Request Sent!</h3>
        <p className="text-green-700 mb-4">
          We've opened WhatsApp for you. Our team will respond within 5 minutes to schedule your personalized demo.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-blue-600 hover:underline font-semibold"
        >
          Request Another Demo
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 sticky top-24">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Request Your Free Demo
        </h3>
        <p className="text-gray-600 text-sm">
          {description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2 text-sm">
            <User className="w-4 h-4 mr-2" />
            Full Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2 text-sm">
            <Building2 className="w-4 h-4 mr-2" />
            Company Name *
          </label>
          <input
            type="text"
            required
            value={formData.company}
            onChange={(e) => setFormData({...formData, company: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your company"
          />
        </div>

        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2 text-sm">
            <Phone className="w-4 h-4 mr-2" />
            Phone Number *
          </label>
          <input
            type="tel"
            required
            pattern="[0-9]{10}"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="9876543210"
          />
        </div>

        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2 text-sm">
            <Mail className="w-4 h-4 mr-2" />
            Email Address *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label className="flex items-center text-gray-700 font-medium mb-2 text-sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            What interests you most? (Optional)
          </label>
          <textarea
            rows="3"
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tell us about your requirements..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-105 shadow-xl"
        >
          🚀 Schedule My Free Demo
        </button>

        <p className="text-xs text-gray-500 text-center">
          ✓ Free 30-min personalized demo<br/>
          ✓ Available today via video call<br/>
          ✓ No commitment required
        </p>
      </form>
    </div>
  );
};

export default DemoRequestForm;
