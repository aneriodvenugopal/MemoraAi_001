import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ChevronRight, ArrowLeft } from 'lucide-react';
import StickyNavbar from '../../components/StickyNavbar';

const TestimonialDetail = () => {
  const { id } = useParams();

  const testimonials = [
    {
      id: 1,
      company: "Abhinandhana Avenues",
      location: "Hyderabad, Telangana",
      logo: "🏢",
      rating: 5,
      person: "Managing Director",
      fullQuote: "RealApex helped us manage our real estate operations more efficiently. The dashboard gives us better visibility and the system is easy to use.",
      challenges: [
        "Managing multiple projects with Excel was chaotic",
        "No centralized view of all projects",
        "Difficulty tracking leads across projects"
      ],
      solutions: [
        "Multi-project dashboard for complete visibility",
        "Centralized lead management",
        "Better tracking and reporting"
      ],
      results: [
        "Improved project visibility",
        "Better lead tracking",
        "Time saved on reporting"
      ]
    },
    {
      id: 2,
      company: "BRR GROUP",
      location: "Telangana",
      logo: "🏗️",
      rating: 5,
      person: "Founder & CEO",
      fullQuote: "The payment tracking and reporting features are helpful. Website integration brings regular inquiries. Overall a useful system for our needs.",
      challenges: [
        "Payment tracking was manual and time-consuming",
        "Generating reports took days",
        "No online presence for lead generation"
      ],
      solutions: [
        "Automated payment tracking",
        "One-click report generation",
        "Integrated website with inquiry forms"
      ],
      results: [
        "Payment tracking automated",
        "Regular website inquiries",
        "Time saved on reporting"
      ]
    },
    {
      id: 3,
      company: "Sri Jayam Housing",
      location: "Vijayawada, Andhra Pradesh",
      logo: "🏠",
      rating: 5,
      person: "Director",
      fullQuote: "Payment reminders and receipt generation features are very useful. The commission tracking helps avoid disputes. A practical solution for real estate management.",
      challenges: [
        "Manual payment reminders",
        "Commission calculation disputes",
        "Receipt generation was slow"
      ],
      solutions: [
        "Automated payment reminders via WhatsApp",
        "Transparent commission tracking",
        "Instant receipt generation"
      ],
      results: [
        "Better payment collection",
        "Zero commission disputes",
        "Good ROI"
      ]
    }
  ];

  const testimonial = testimonials.find(t => t.id === parseInt(id)) || testimonials[0];
  const otherTestimonials = testimonials.filter(t => t.id !== testimonial.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <StickyNavbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-8"
        >
          <ArrowLeft size={20} />
          Back to Home
        </Link>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-6xl">{testimonial.logo}</div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {testimonial.company}
                </h1>
                <p className="text-lg text-gray-600 mb-3">{testimonial.location}</p>
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </div>

            <blockquote className="text-xl text-gray-700 italic border-l-4 border-blue-500 pl-6 py-2 mb-6">
              "{testimonial.fullQuote}"
            </blockquote>

            <div className="flex items-center gap-2 text-gray-600">
              <span className="font-semibold">{testimonial.person}</span>
              <span>•</span>
              <span>{testimonial.company}</span>
            </div>
          </div>

          {/* Challenge, Solution, Results */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Challenges */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4">Challenges</h3>
              <ul className="space-y-3">
                {testimonial.challenges.map((challenge, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-blue-600 mb-4">Solutions</h3>
              <ul className="space-y-3">
                {testimonial.solutions.map((solution, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-500 mt-1">→</span>
                    <span>{solution}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Results */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-green-600 mb-4">Results</h3>
              <ul className="space-y-3">
                {testimonial.results.map((result, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{result}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl shadow-xl p-8 text-center text-white mb-8">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Business?</h3>
            <p className="text-lg mb-6 opacity-90">Join successful real estate companies using RealApex</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-all"
              >
                Start Free Trial
              </Link>
              <Link
                to="/contact"
                className="px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition-all border-2 border-white/30"
              >
                Schedule Demo
              </Link>
            </div>
          </div>

          {/* Other Testimonials */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">More Success Stories</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {otherTestimonials.map((other) => (
                <Link
                  key={other.id}
                  to={`/testimonials/${other.id}`}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{other.logo}</div>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {other.company}
                      </h4>
                      <p className="text-sm text-gray-600">{other.location}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">"{other.fullQuote}"</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {[...Array(other.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-blue-600 text-sm font-semibold flex items-center gap-1">
                      Read More <ChevronRight size={16} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialDetail;
