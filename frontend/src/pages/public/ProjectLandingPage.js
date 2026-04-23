import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiInstance from '../../services/api';
import PublicLayoutViewer from '../../components/PublicLayoutViewer';
import PublicLayoutViewerEnhanced from '../../components/PublicLayoutViewerEnhanced';
import { 
  Building2, MapPin, Phone, Mail, Home, Calendar, ArrowRight, 
  ExternalLink, CheckCircle, Waves, Trees, Dumbbell, Shield,
  Car, Zap, Heart, Star, MessageCircle
} from 'lucide-react';

function ProjectLandingPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const response = await apiInstance.get(`/public/project/${projectId}`);
      if (response.data.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
    scrollToSection('enquiry');
  };

  const handleEnquirySubmit = (e) => {
    e.preventDefault();
    // TODO: Submit enquiry via API
    alert(`Thank you! We'll contact you soon regarding ${selectedPlot ? `Plot ${selectedPlot.display_name}` : 'this project'}.`);
    setEnquiryForm({ name: '', email: '', phone: '', message: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Project not found</p>
        </div>
      </div>
    );
  }

  const { project, tenant, layout, properties, statistics, price_range } = data;

  // Default amenities if not in project data
  const amenities = project.amenities || [
    { icon: 'Waves', name: 'Water Supply', description: '24/7 water supply' },
    { icon: 'Zap', name: 'Electricity', description: 'Underground cabling' },
    { icon: 'Trees', name: 'Landscaping', description: 'Green spaces' },
    { icon: 'Shield', name: 'Security', description: '24/7 security' },
    { icon: 'Car', name: 'Wide Roads', description: '40ft & 30ft roads' },
    { icon: 'Dumbbell', name: 'Park', description: 'Children play area' }
  ];

  const iconMap = { Waves, Trees, Dumbbell, Shield, Car, Zap };

  // Mock testimonials
  const testimonials = [
    { name: 'Rajesh Kumar', rating: 5, text: 'Excellent project with great location and amenities. Highly recommended!' },
    { name: 'Priya Sharma', rating: 5, text: 'Very transparent dealing and professional team. Happy with my investment.' },
    { name: 'Vikram Reddy', rating: 5, text: 'Best value for money. The layout and planning is exceptional.' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header / Navigation */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.company_name} className="h-12 w-12 object-contain" />
              ) : (
                <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {tenant?.company_name?.charAt(0) || 'P'}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-600">{tenant?.company_name}</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => scrollToSection('home')}
                className={`text-sm font-medium transition ${
                  activeSection === 'home' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('gallery')}
                className={`text-sm font-medium transition ${
                  activeSection === 'gallery' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Gallery
              </button>
              <button
                onClick={() => scrollToSection('amenities')}
                className={`text-sm font-medium transition ${
                  activeSection === 'amenities' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Amenities
              </button>
              <button
                onClick={() => scrollToSection('location')}
                className={`text-sm font-medium transition ${
                  activeSection === 'location' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Location
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className={`text-sm font-medium transition ${
                  activeSection === 'testimonials' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Testimonials
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className={`text-sm font-medium transition ${
                  activeSection === 'contact' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Contact
              </button>
              <button
                onClick={() => scrollToSection('enquiry')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Enquire Now
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">{project.name}</h2>
            <div className="flex items-center justify-center gap-2 text-xl text-blue-100 mb-8">
              <MapPin size={24} />
              <p>{project.location || 'Prime Location'}</p>
            </div>
            {project.description && (
              <p className="text-xl text-blue-50 max-w-3xl mx-auto mb-8">
                {project.description}
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
              <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold">{statistics.total_properties}</p>
                <p className="text-blue-100 text-sm">Total Plots</p>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold text-green-300">{statistics.available}</p>
                <p className="text-blue-100 text-sm">Available</p>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold">₹{(price_range.min / 100000).toFixed(1)}L+</p>
                <p className="text-blue-100 text-sm">Starting Price</p>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold">RERA</p>
                <p className="text-blue-100 text-sm">Approved</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => scrollToSection('enquiry')}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition text-lg font-semibold shadow-lg flex items-center gap-2"
              >
                Book Now <ArrowRight size={20} />
              </button>
              <button
                onClick={() => scrollToSection('gallery')}
                className="px-8 py-4 bg-blue-500 bg-opacity-30 backdrop-blur text-white rounded-xl hover:bg-opacity-40 transition text-lg font-semibold border-2 border-white"
              >
                View Layout
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Layout Section */}
      <section id="gallery" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Interactive Layout Plan</h2>
            <p className="text-xl text-gray-600">Click on available plots to view details and book</p>
          </div>

          {layout ? (
            <div className="h-[600px] rounded-xl overflow-hidden shadow-2xl border-2 border-gray-200">
              <PublicLayoutViewerEnhanced
                layout={layout}
                project={project}
                onPlotSelect={handlePlotClick}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Building2 size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Layout plan coming soon</p>
            </div>
          )}
        </div>
      </section>

      {/* Amenities Section */}
      <section id="amenities" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">World-Class Amenities</h2>
            <p className="text-xl text-gray-600">Everything you need for a perfect lifestyle</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {amenities.map((amenity, idx) => {
              const IconComponent = iconMap[amenity.icon] || Home;
              return (
                <div key={idx} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 text-center hover:shadow-xl transition transform hover:scale-105">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <IconComponent className="text-blue-600" size={32} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{amenity.name}</h3>
                  <p className="text-xs text-gray-600">{amenity.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Prime Location</h2>
            <p className="text-xl text-gray-600">Strategically located with excellent connectivity</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Map Placeholder */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-96">
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={64} className="mx-auto text-blue-600 mb-4" />
                  <p className="text-gray-700 font-semibold">{project.location}</p>
                  <p className="text-sm text-gray-500 mt-2">Interactive map coming soon</p>
                </div>
              </div>
            </div>

            {/* Location Highlights */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <CheckCircle className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Connectivity</h3>
                    <p className="text-gray-600 text-sm">Easy access to main highway and public transport</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Building2 className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Schools & Hospitals</h3>
                    <p className="text-gray-600 text-sm">Reputed educational institutions and healthcare nearby</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Car className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Shopping & Entertainment</h3>
                    <p className="text-gray-600 text-sm">Malls, restaurants, and entertainment hubs within reach</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">Trusted by hundreds of happy property owners</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={20} className="text-blue-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">Property Owner</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-xl text-gray-600">Our team is ready to assist you</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Phone className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600">{tenant?.phone || 'Contact via enquiry'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Mail className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">{tenant?.email || 'Submit enquiry below'}</p>
                </div>
              </div>

              {project.location && (
                <div className="flex items-start gap-4 md:col-span-2">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <MapPin className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Project Location</h3>
                    <p className="text-gray-600">{project.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry Form Section */}
      <section id="enquiry" className="py-16 bg-gradient-to-br from-blue-600 to-cyan-600">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Enquire Now</h2>
            {selectedPlot ? (
              <p className="text-xl text-blue-100">
                Interested in Plot {selectedPlot.display_name}? Fill in your details
              </p>
            ) : (
              <p className="text-xl text-blue-100">Get in touch with us for more information</p>
            )}
          </div>

          <form onSubmit={handleEnquirySubmit} className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={enquiryForm.name}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="10-digit mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea
                  value={enquiryForm.message}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder={selectedPlot ? `I'm interested in Plot ${selectedPlot.display_name}` : "Tell us about your requirements"}
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition text-lg font-semibold flex items-center justify-center gap-2"
              >
                <MessageCircle size={20} />
                Submit Enquiry
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} {project.name} by {tenant?.company_name}. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-2">Powered by MemoraAI</p>
        </div>
      </footer>

      {/* Selected Plot Modal */}
      {selectedPlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-bold text-gray-900">
                  Plot {selectedPlot.display_name || selectedPlot.plot_number}
                </h3>
                {selectedPlot.block && (
                  <p className="text-gray-600 mt-1">Block {selectedPlot.block}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedPlot(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">PRICE</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{selectedPlot.price ? (selectedPlot.price / 100000).toFixed(2) : 'N/A'}L
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">AREA</p>
                <p className="text-xl font-bold">{selectedPlot.area || 'N/A'} sq.ft</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">STATUS</p>
                <p className="text-lg font-bold text-green-600">Available</p>
              </div>
            </div>

            {selectedPlot.price && selectedPlot.area && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Price per sq.ft</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{(selectedPlot.price / selectedPlot.area).toFixed(0)}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => scrollToSection('enquiry')}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
              >
                Enquire Now
              </button>
              <button
                onClick={() => setSelectedPlot(null)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectLandingPage;
