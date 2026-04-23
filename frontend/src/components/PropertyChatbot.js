import React, { useState, useEffect } from 'react';
import { Building2, X, Calendar, MapPin, Phone, Mail, User, Clock, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PropertyChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('welcome'); // welcome, projects, projectDetails, bookVisit, confirmation
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [language, setLanguage] = useState('telugu'); // telugu, english
  const [bookingForm, setBookingForm] = useState({
    name: '',
    mobile: '',
    email: '',
    date: '',
    time: '',
    query: ''
  });
  const [loading, setLoading] = useState(false);

  // Messages in Telugu and English
  const messages = {
    welcome: {
      telugu: "నమస్కారం! నేను MemoraAI ప్రాపర్టీ అసిస్టెంట్. మీకు సరైన ప్రాపర్టీ కనుగొనడంలో సహాయం చేస్తాను.",
      english: "Hello! I'm MemoraAI Property Assistant. I'll help you find your perfect property."
    },
    selectProject: {
      telugu: "దయచేసి ఒక ప్రాజెక్ట్‌ను ఎంచుకోండి:",
      english: "Please select a project:"
    },
    bookVisit: {
      telugu: "సైట్ విజిట్ బుక్ చేయడానికి వివరాలు నమోదు చేయండి:",
      english: "Enter details to book site visit:"
    },
    confirmation: {
      telugu: "✅ మీ సైట్ విజిట్ బుక్ చేయబడింది! మా ఏజెంట్ త్వరలో మిమ్మల్ని సంప్రదిస్తారు.",
      english: "✅ Your site visit is booked! Our agent will contact you shortly."
    }
  };

  // Fetch projects from backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/projects`);
        setProjects(response.data.slice(0, 6)); // Show first 6 projects
      } catch (error) {
        console.error('Error fetching projects:', error);
        // Mock projects for demo
        setProjects([
          { id: '1', name: 'Green Valley Apartments', location: 'Gachibowli, Hyderabad', type: '2,3 BHK', price: '₹65L - ₹1.2Cr' },
          { id: '2', name: 'Sunrise Villas', location: 'Kondapur, Hyderabad', type: '3,4 BHK', price: '₹1.5Cr - ₹2.5Cr' },
          { id: '3', name: 'Lake View Plots', location: 'Pocharam Lake, Hyderabad', type: '200-500 sq yards', price: '₹45L - ₹1.5Cr' }
        ]);
      }
    };

    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setStep('projectDetails');
  };

  const handleBookVisit = async () => {
    if (!bookingForm.name || !bookingForm.mobile) {
      alert(language === 'telugu' ? 'దయచేసి పేరు మరియు మొబైల్ నంబర్ నమోదు చేయండి' : 'Please enter name and mobile number');
      return;
    }

    setLoading(true);
    try {
      // Create lead and book site visit
      const leadData = {
        name: bookingForm.name,
        phone: bookingForm.mobile,
        email: bookingForm.email || '',
        project_id: selectedProject?.id,
        project_name: selectedProject?.name,
        visit_date: bookingForm.date,
        visit_time: bookingForm.time,
        query: bookingForm.query,
        source: 'Property Chatbot',
        status: 'site_visit_scheduled'
      };

      // Send to backend (you'll need to create this endpoint)
      await axios.post(`${BACKEND_URL}/api/leads`, leadData);
      
      setStep('confirmation');
      
      // Reset after 5 seconds
      setTimeout(() => {
        setIsOpen(false);
        setStep('welcome');
        setBookingForm({ name: '', mobile: '', email: '', date: '', time: '', query: '' });
      }, 5000);
    } catch (error) {
      console.error('Error booking visit:', error);
      alert(language === 'telugu' ? 'బుకింగ్‌లో సమస్య వచ్చింది. దయచేసి మళ్లీ ప్రయత్నించండి.' : 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Icon */}
      {!isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 cursor-pointer group"
          title="Find your property"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-50"></div>
            <div className="relative w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            {/* Badge */}
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {projects.length}
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6" />
                <div>
                  <h3 className="font-bold">Property Assistant</h3>
                  <p className="text-xs text-white/80">Find Your Dream Home</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage(language === 'telugu' ? 'english' : 'telugu')}
                  className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition"
                >
                  {language === 'telugu' ? 'తెలుగు' : 'English'}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setStep('welcome');
                  }}
                  className="p-1 hover:bg-white/20 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {/* Welcome Step */}
            {step === 'welcome' && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">{messages.welcome[language]}</p>
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setStep('projects')}
                    className="w-full p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition font-medium"
                  >
                    {language === 'telugu' ? '🏘️ ప్రాజెక్టులు చూడండి' : '🏘️ View Projects'}
                  </button>
                  <button
                    onClick={() => setStep('bookVisit')}
                    className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                  >
                    {language === 'telugu' ? '📅 సైట్ విజిట్ బుక్ చేయండి' : '📅 Book Site Visit'}
                  </button>
                  <a
                    href="tel:+919948303060"
                    className="block w-full p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium text-center"
                  >
                    {language === 'telugu' ? '📞 నేరుగా కాల్ చేయండి' : '📞 Call Directly'}
                  </a>
                </div>
              </div>
            )}

            {/* Projects List */}
            {step === 'projects' && (
              <div className="space-y-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">{messages.selectProject[language]}</p>
                </div>
                
                {projects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition cursor-pointer"
                  >
                    <h4 className="font-semibold text-gray-900">{project.name}</h4>
                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {project.location}
                    </p>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-blue-600 font-medium">{project.type}</span>
                      <span className="text-green-600 font-bold">{project.price}</span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setStep('welcome')}
                  className="w-full p-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  ← {language === 'telugu' ? 'వెనుకకు' : 'Back'}
                </button>
              </div>
            )}

            {/* Project Details */}
            {step === 'projectDetails' && selectedProject && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900">{selectedProject.name}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" /> {selectedProject.location}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-blue-600">📐 {selectedProject.type}</span>
                    <span className="text-green-600 font-bold">💰 {selectedProject.price}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setStep('bookVisit')}
                    className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                  >
                    {language === 'telugu' ? '📅 సైట్ విజిట్ బుక్ చేయండి' : '📅 Book Site Visit'}
                  </button>
                  <a
                    href={`https://wa.me/919948303060?text=${encodeURIComponent(`I'm interested in ${selectedProject.name}. Please share details.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-center"
                  >
                    {language === 'telugu' ? '💬 వాట్సాప్‌లో అడగండి' : '💬 Ask on WhatsApp'}
                  </a>
                  <button
                    onClick={() => setStep('projects')}
                    className="w-full p-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    ← {language === 'telugu' ? 'ఇతర ప్రాజెక్టులు చూడండి' : 'View Other Projects'}
                  </button>
                </div>
              </div>
            )}

            {/* Book Visit Form */}
            {step === 'bookVisit' && (
              <div className="space-y-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">{messages.bookVisit[language]}</p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 flex items-center gap-1">
                      <User className="w-3 h-3" /> {language === 'telugu' ? 'పేరు *' : 'Name *'}
                    </label>
                    <input
                      type="text"
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder={language === 'telugu' ? 'మీ పేరు' : 'Your name'}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {language === 'telugu' ? 'మొబైల్ *' : 'Mobile *'}
                    </label>
                    <input
                      type="tel"
                      value={bookingForm.mobile}
                      onChange={(e) => setBookingForm({ ...bookingForm, mobile: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="10-digit number"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {language === 'telugu' ? 'ఈమెయిల్' : 'Email'}
                    </label>
                    <input
                      type="email"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {language === 'telugu' ? 'తేదీ' : 'Date'}
                      </label>
                      <input
                        type="date"
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {language === 'telugu' ? 'సమయం' : 'Time'}
                      </label>
                      <input
                        type="time"
                        value={bookingForm.time}
                        onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600">{language === 'telugu' ? 'ఏదైనా ప్రశ్నలు?' : 'Any questions?'}</label>
                    <textarea
                      value={bookingForm.query}
                      onChange={(e) => setBookingForm({ ...bookingForm, query: e.target.value })}
                      rows="2"
                      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder={language === 'telugu' ? 'మీ ప్రశ్నలు రాయండి...' : 'Write your questions...'}
                    />
                  </div>

                  <button
                    onClick={handleBookVisit}
                    disabled={loading}
                    className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium disabled:opacity-50"
                  >
                    {loading 
                      ? (language === 'telugu' ? 'బుక్ చేస్తోంది...' : 'Booking...') 
                      : (language === 'telugu' ? '✅ సైట్ విజిట్ కన్ఫర్మ్ చేయండి' : '✅ Confirm Site Visit')
                    }
                  </button>

                  <button
                    onClick={() => setStep(selectedProject ? 'projectDetails' : 'welcome')}
                    className="w-full p-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    ← {language === 'telugu' ? 'వెనుకకు' : 'Back'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation */}
            {step === 'confirmation' && (
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-bold text-gray-900 mb-2">
                  {messages.confirmation[language]}
                </p>
                <p className="text-sm text-gray-600">
                  {language === 'telugu' 
                    ? `ఏజెంట్ పేరు: రాజేష్ కుమార్\nఫోన్: +91 9948303060\nసైట్ విజిట్ వివరాలు వాట్సాప్‌లో పంపబడతాయి.`
                    : `Agent: Rajesh Kumar\nPhone: +91 9948303060\nVisit details will be sent via WhatsApp.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyChatbot;
