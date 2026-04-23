import React, { useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';

const SuccessStories = () => {
  const [expandedStory, setExpandedStory] = useState(null);

  const stories = [
    {
      company: "Abhinandhana Avenues",
      location: "Hyderabad",
      logo: "🏢",
      color: "blue",
      results: ["Better Tracking", "Multi-project", "Time Saved"],
      shortQuote: "MemoraAI helped us manage operations more efficiently.",
      fullQuote: "MemoraAI helped us manage our real estate operations more efficiently. The dashboard gives us better visibility and the system is easy to use.",
      person: "Managing Director",
      rating: 5
    },
    {
      company: "BRR GROUP",
      location: "Telangana",
      logo: "🏗️",
      color: "green",
      results: ["Automated", "Website Inquiries", "Saves Time"],
      shortQuote: "Payment tracking and reporting features are helpful.",
      fullQuote: "The payment tracking and reporting features are helpful. Website integration brings regular inquiries. Overall a useful system for our needs.",
      person: "Founder & CEO",
      rating: 5
    },
    {
      company: "Sri Jayam Housing",
      location: "Vijayawada",
      logo: "🏠",
      color: "purple",
      results: ["Improved", "Good ROI", "Easy to Use"],
      shortQuote: "Payment reminders and commission tracking are useful.",
      fullQuote: "Payment reminders and receipt generation features are very useful. The commission tracking helps avoid disputes. A practical solution for real estate management.",
      person: "Director",
      rating: 5
    }
  ];

  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200'
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200'
    }
  };

  return (
    <section className="py-12 md:py-20 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4">
              Real Results from Real Estate Companies
            </h2>
            <p className="text-base md:text-xl text-gray-600">
              See how leading developers are growing with MemoraAI
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto mt-4 md:mt-6 rounded-full"></div>
          </div>

          {/* Compact Success Stories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16">
            {stories.map((story, index) => {
              const colors = colorClasses[story.color];
              const isExpanded = expandedStory === index;
              
              return (
                <div 
                  key={index}
                  className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all border-2 ${colors.border} overflow-hidden group`}
                >
                  {/* Compact Header */}
                  <div className={`bg-gradient-to-r ${colors.gradient} p-4 md:p-5 text-white`}>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl md:text-4xl">{story.logo}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-bold truncate">{story.company}</h3>
                        <p className="text-xs md:text-sm text-white/90">{story.location}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(story.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-blue-300 text-blue-300" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Compact Content */}
                  <div className="p-4 md:p-5">
                    {/* Results Pills */}
                    <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                      {story.results.map((result, idx) => (
                        <span
                          key={idx}
                          className={`px-2 md:px-3 py-1 ${colors.bg} ${colors.text} text-xs font-semibold rounded-full`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-sm md:text-base text-gray-700 italic mb-3 md:mb-4 leading-relaxed">
                      "{isExpanded ? story.fullQuote : story.shortQuote}"
                    </p>

                    {/* Expand/Collapse Button */}
                    {story.fullQuote.length > story.shortQuote.length && (
                      <button
                        onClick={() => setExpandedStory(isExpanded ? null : index)}
                        className={`text-xs md:text-sm ${colors.text} font-semibold flex items-center gap-1 hover:underline mb-3`}
                      >
                        {isExpanded ? 'Show Less' : 'Read More'}
                        <ChevronRight className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    )}

                    {/* Footer */}
                    <div className={`flex items-center gap-2 md:gap-3 pt-3 border-t ${colors.border}`}>
                      <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br ${colors.gradient} rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base`}>
                        {story.person.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-xs md:text-sm truncate">{story.person}</p>
                        <p className="text-xs text-gray-600 truncate">{story.company}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Trust Badges */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 md:p-8 border border-blue-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="text-center p-3 md:p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-lg md:text-xl font-bold">10+</span>
                </div>
                <p className="text-xs md:text-sm font-semibold text-gray-700">Years Experience</p>
              </div>
              
              <div className="text-center p-3 md:p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-lg md:text-xl font-bold">50+</span>
                </div>
                <p className="text-xs md:text-sm font-semibold text-gray-700">Projects Delivered</p>
              </div>
              
              <div className="text-center p-3 md:p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-lg md:text-xl font-bold">30+</span>
                </div>
                <p className="text-xs md:text-sm font-semibold text-gray-700">Websites Built</p>
              </div>
              
              <div className="text-center p-3 md:p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-lg md:text-xl font-bold">25+</span>
                </div>
                <p className="text-xs md:text-sm font-semibold text-gray-700">CRM Systems</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center italic border-t border-gray-200 pt-4 mt-4 md:mt-6">
              *Based on work done by parent company Eloniot Software Solutions over 10+ years. MemoraAI is our SaaS product launched in 2024.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;
