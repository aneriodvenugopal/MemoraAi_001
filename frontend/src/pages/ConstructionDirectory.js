import React, { useState } from 'react';
import { Search, MapPin, Phone, Mail, User, Award, Clock, Star, Briefcase } from 'lucide-react';
import StickyNavbar from '../components/StickyNavbar';

const ConstructionDirectory = () => {
  const [searchSkill, setSearchSkill] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  // Mock database - Replace with API call
  const constructionWorkers = [
    {
      id: 1, name: "Rajesh Kumar", skill: "Mason", location: "Hyderabad", phone: "9876543210", 
      experience: "15 years", rating: 4.8, projects: 120, hourlyRate: "₹500-800",
      description: "Expert in brick work, plastering, and tile installation. Completed 120+ projects.",
      availability: "Available", languages: "Telugu, Hindi, English"
    },
    {
      id: 2, name: "Venkat Reddy", skill: "Electrician", location: "Hyderabad", phone: "9123456789",
      experience: "10 years", rating: 4.9, projects: 85, hourlyRate: "₹600-900",
      description: "Licensed electrician specializing in wiring, panel installation, and repairs.",
      availability: "Available", languages: "Telugu, English"
    },
    {
      id: 3, name: "Suresh Babu", skill: "Plumber", location: "Hyderabad", phone: "9988776655",
      experience: "12 years", rating: 4.7, projects: 95, hourlyRate: "₹450-750",
      description: "Expert in pipeline installation, bathroom fittings, and water systems.",
      availability: "Available", languages: "Telugu, Hindi"
    },
    {
      id: 4, name: "Ramesh Yadav", skill: "Carpenter", location: "Bangalore", phone: "9871234567",
      experience: "18 years", rating: 4.9, projects: 150, hourlyRate: "₹700-1000",
      description: "Specialized in furniture making, door/window fitting, and custom woodwork.",
      availability: "Busy till next week", languages: "Hindi, Kannada, English"
    },
    {
      id: 5, name: "Prakash Singh", skill: "Painter", location: "Hyderabad", phone: "9765432198",
      experience: "8 years", rating: 4.6, projects: 70, hourlyRate: "₹400-650",
      description: "Interior and exterior painting, texture work, and wall finishes.",
      availability: "Available", languages: "Hindi, Telugu"
    },
    {
      id: 6, name: "Kumar Swamy", skill: "Mason", location: "Bangalore", phone: "9654321987",
      experience: "20 years", rating: 4.9, projects: 200, hourlyRate: "₹600-900",
      description: "Master mason with expertise in structural work and high-quality finishing.",
      availability: "Available", languages: "Kannada, Tamil, English"
    },
    {
      id: 7, name: "Naresh Kumar", skill: "Electrician", location: "Chennai", phone: "9543219876",
      experience: "14 years", rating: 4.8, projects: 110, hourlyRate: "₹550-850",
      description: "Industrial and residential electrical work, solar panel installation.",
      availability: "Available", languages: "Tamil, English"
    },
    {
      id: 8, name: "Abdul Rahman", skill: "Plumber", location: "Bangalore", phone: "9432198765",
      experience: "9 years", rating: 4.7, projects: 80, hourlyRate: "₹500-800",
      description: "Specializing in drainage systems, water heaters, and leak repairs.",
      availability: "Available", languages: "Kannada, Urdu, Hindi"
    }
  ];

  const handleSearch = () => {
    const filtered = constructionWorkers.filter(worker => {
      const matchSkill = !searchSkill || worker.skill.toLowerCase().includes(searchSkill.toLowerCase());
      const matchLocation = !searchLocation || worker.location.toLowerCase().includes(searchLocation.toLowerCase());
      return matchSkill && matchLocation;
    });
    setResults(filtered);
    setSearched(true);
  };

  const skills = ["Mason", "Electrician", "Plumber", "Carpenter", "Painter", "Welder", "AC Technician", "Tile Worker"];
  const locations = ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Pune"];

  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      
      <div className="pt-24 pb-8 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="container mx-auto px-6">
          <div className="text-center text-white mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              FREE Construction Worker Directory
            </h1>
            <p className="text-xl opacity-90">
              Find skilled workers instantly - Faster than JustDial, completely FREE
            </p>
          </div>

          {/* Quick Search */}
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Skill Needed</label>
                <select
                  value={searchSkill}
                  onChange={(e) => setSearchSkill(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Skills</option>
                  {skills.map(skill => <option key={skill} value={skill}>{skill}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Location</label>
                <select
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Search Now
                </button>
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-600 mt-4">
              ✓ Direct contacts • ✓ Verified workers • ✓ 100% FREE service
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-6 py-12">
        {!searched ? (
          <div className="text-center text-gray-600 py-12">
            <Briefcase className="w-20 h-20 mx-auto mb-4 text-gray-400" />
            <p className="text-xl">Select skill and location to find workers instantly</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-xl">No workers found. Try different search criteria.</p>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Found {results.length} Worker{results.length !== 1 ? 's' : ''}
              </h2>
              <p className="text-gray-600">Contact them directly - FREE service</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map(worker => (
                <div key={worker.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all border-l-4 border-orange-500">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{worker.name}</h3>
                      <p className="text-orange-600 font-semibold text-lg">{worker.skill}</p>
                    </div>
                    <div className="bg-green-100 px-3 py-1 rounded-full">
                      <p className="text-sm font-semibold text-green-700">{worker.availability}</p>
                    </div>
                  </div>

                  {/* Rating & Experience */}
                  <div className="grid grid-cols-3 gap-4 mb-4 bg-orange-50 p-3 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        <span className="ml-1 font-bold text-gray-900">{worker.rating}</span>
                      </div>
                      <p className="text-xs text-gray-600">Rating</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{worker.experience}</p>
                      <p className="text-xs text-gray-600">Experience</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{worker.projects}+</p>
                      <p className="text-xs text-gray-600">Projects</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 mb-4 text-sm">{worker.description}</p>

                  {/* Details */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                      <span><strong>Location:</strong> {worker.location}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <Award className="w-4 h-4 mr-2 text-orange-500" />
                      <span><strong>Rate:</strong> {worker.hourlyRate}/hour</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <User className="w-4 h-4 mr-2 text-orange-500" />
                      <span><strong>Languages:</strong> {worker.languages}</span>
                    </div>
                  </div>

                  {/* Contact Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`tel:+91${worker.phone}`}
                      className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-all"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      Call Now
                    </a>
                    <a
                      href={`https://wa.me/91${worker.phone}?text=Hi ${worker.name}, I found your profile on RealApex. I need a ${worker.skill} in ${worker.location}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 py-12">
        <div className="container mx-auto px-6 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Want to List Your Workers?</h3>
          <p className="text-lg mb-6 opacity-90">
            Add your skilled workers to this FREE directory and get more projects
          </p>
          <a
            href="https://wa.me/919948303060?text=I want to list construction workers on RealApex directory"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all"
          >
            List Your Workers - FREE
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConstructionDirectory;
