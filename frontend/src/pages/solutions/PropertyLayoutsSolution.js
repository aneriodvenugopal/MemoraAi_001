import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Map, Eye, MousePointer, Layers, Download, Share2 } from 'lucide-react';
import EnquiryForm from '../../components/EnquiryForm';
import StickyNavbar from '../../components/StickyNavbar';

const PropertyLayoutsSolution = () => {
  const features = [
    {
      icon: <Map className="w-8 h-8" />,
      title: 'Interactive Maps',
      description: 'Visual property layouts with clickable plots and units'
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: 'Real-time Availability',
      description: 'Color-coded availability status - available, booked, sold'
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: 'DXF/SVG Import',
      description: 'Upload CAD files and convert to interactive web maps'
    },
    {
      icon: <MousePointer className="w-8 h-8" />,
      title: 'Click-to-Book',
      description: 'Customers can select and book plots directly from the map'
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: 'Brochure Generation',
      description: 'Auto-generate property brochures with availability'
    },
    {
      icon: <Share2 className="w-8 h-8" />,
      title: 'Easy Sharing',
      description: 'Share interactive maps via WhatsApp and social media'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      <div className="pt-24 pb-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white hover:text-gray-200 mb-8">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Visual Property Layouts
            </h1>
            <p className="text-2xl text-white/90 mb-8">
              Help customers visualize properties with interactive maps showing real-time availability. Increase conversions by 3X.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                🎨 Interactive Maps
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                ⚡ Real-time Updates
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                📈 3X Conversions
              </div>
            </div>
            
            {/* Quick Demo Button */}
            <div className="mt-6">
              <a
                href="https://billingwala.kitchenschools.com/public/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-xl"
              >
                🚀 View Live Demo
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">The Problem</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">❌</span>
                  <span>Customers can't visualize property layouts from static brochures</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">❌</span>
                  <span>Sales team wastes time explaining availability</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">❌</span>
                  <span>Outdated brochures showing wrong availability</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">❌</span>
                  <span>Lost sales due to poor visualization</span>
                </li>
              </ul>
            </section>

            <section className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">The Solution</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="text-blue-600 mb-3">{feature.icon}</div>
                    <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Benefits</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-lg text-gray-700">3X higher conversion rates</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-lg text-gray-700">Customers can self-select properties</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-lg text-gray-700">Real-time availability updates</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-lg text-gray-700">Save hours on property explanations</span>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <EnquiryForm solutionName="Visual Property Layouts" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyLayoutsSolution;