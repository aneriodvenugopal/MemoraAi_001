import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const TestimonialsCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      id: 1,
      company: "Abhinandhana Avenues",
      location: "Hyderabad",
      logo: "🏢",
      rating: 5,
      shortQuote: "MemoraAI helped us manage operations more efficiently.",
      fullQuote: "MemoraAI helped us manage our real estate operations more efficiently. The dashboard gives us better visibility and the system is easy to use.",
      person: "Managing Director",
      features: ["Multi-project management", "Better tracking", "Time saved"]
    },
    {
      id: 2,
      company: "BRR GROUP",
      location: "Telangana",
      logo: "🏗️",
      rating: 5,
      shortQuote: "Payment tracking and reporting features are helpful.",
      fullQuote: "The payment tracking and reporting features are helpful. Website integration brings regular inquiries. Overall a useful system for our needs.",
      person: "Founder & CEO",
      features: ["Payment automation", "Website inquiries", "Time savings"]
    },
    {
      id: 3,
      company: "Sri Jayam Housing",
      location: "Vijayawada",
      logo: "🏠",
      rating: 5,
      shortQuote: "Payment reminders and receipts are very useful.",
      fullQuote: "Payment reminders and receipt generation features are very useful. The commission tracking helps avoid disputes. A practical solution for real estate management.",
      person: "Director",
      features: ["Payment reminders", "Commission tracking", "Easy to use"]
    },
    {
      id: 4,
      company: "Neems Boro Group",
      location: "Hyderabad",
      logo: "🌳",
      rating: 5,
      shortQuote: "Great system for managing multiple projects.",
      fullQuote: "Great system for managing multiple real estate projects simultaneously. The reporting features help us make better decisions.",
      person: "Operations Head",
      features: ["Multi-project view", "Reports", "Decision support"]
    },
    {
      id: 5,
      company: "NTR Estates",
      location: "Vijayawada",
      logo: "🏘️",
      rating: 5,
      shortQuote: "Helpful for lead management and follow-ups.",
      fullQuote: "The lead management and follow-up system is helpful. We can track all customer interactions in one place.",
      person: "Sales Manager",
      features: ["Lead tracking", "Follow-ups", "Customer history"]
    },
    {
      id: 6,
      company: "Pudami Real Estate",
      location: "Telangana",
      logo: "🏞️",
      rating: 5,
      shortQuote: "Good platform for property management.",
      fullQuote: "Good platform for managing our properties and bookings. The visual layouts help customers understand plot locations better.",
      person: "Managing Partner",
      features: ["Property layouts", "Booking management", "Visual maps"]
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, currentIndex]);

  const getVisibleTestimonials = () => {
    const visible = [];
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + testimonials.length) % testimonials.length;
      visible.push({ ...testimonials[index], offset: i });
    }
    return visible;
  };

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            What Our Clients Say
          </h2>
          <p className="text-lg md:text-xl text-gray-600">
            Real feedback from real estate professionals
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-6xl mx-auto">
          {/* Testimonials */}
          <div 
            className="relative h-80 md:h-96 overflow-hidden"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <div className="flex items-center justify-center h-full">
              {getVisibleTestimonials().map((testimonial, idx) => {
                const isCenter = testimonial.offset === 0;
                const isLeft = testimonial.offset === -1;
                const isRight = testimonial.offset === 1;

                return (
                  <div
                    key={testimonial.id}
                    className={`absolute transition-all duration-500 ease-in-out ${
                      isCenter
                        ? 'z-20 scale-100 opacity-100 translate-x-0'
                        : isLeft
                        ? 'z-10 scale-75 opacity-50 -translate-x-full'
                        : 'z-10 scale-75 opacity-50 translate-x-full'
                    }`}
                    style={{
                      width: isCenter ? '90%' : '70%',
                      maxWidth: isCenter ? '600px' : '400px'
                    }}
                  >
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border-2 border-blue-100">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{testimonial.logo}</div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{testimonial.company}</h3>
                            <p className="text-sm text-gray-600">{testimonial.location}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-blue-400 text-blue-400" />
                          ))}
                        </div>
                      </div>

                      {/* Quote */}
                      <p className="text-gray-700 italic mb-4 text-sm md:text-base leading-relaxed">
                        "{isCenter ? testimonial.fullQuote : testimonial.shortQuote}"
                      </p>

                      {/* Features */}
                      {isCenter && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {testimonial.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t pt-4">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{testimonial.person}</p>
                          <p className="text-xs text-gray-600">{testimonial.company}</p>
                        </div>
                        {isCenter && (
                          <Link
                            to={`/testimonials/${testimonial.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
                          >
                            Read More <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-all z-30"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-all z-30"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-blue-600 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            to="/testimonials"
            className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            View All Testimonials
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;
