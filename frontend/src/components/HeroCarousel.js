import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      problem: "Losing 30-40% Leads Due to Poor Follow-up?",
      solution: "MemoraAI's Smart CRM ensures 0% lead leakage with automated follow-ups",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=600&fit=crop",
      benefit: "40X Faster Growth",
      cta: "Stop Lead Leakage",
      link: "/solutions/crm"
    },
    {
      problem: "Struggling to Manage Multiple Projects Simultaneously?",
      solution: "Handle unlimited projects with ease - system manages reports, payments, layouts, leads & follow-ups automatically",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=600&fit=crop",
      benefit: "Manage 10+ Projects Effortlessly",
      cta: "See How It Works",
      link: "/solutions/multi-project-management"
    },
    {
      problem: "Manual Payment Tracking Causing Revenue Loss?",
      solution: "Automated payment collection with Razorpay & Stripe integration",
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=600&fit=crop",
      benefit: "60% Faster Collections",
      cta: "Automate Payments",
      link: "/solutions/payments"
    },
    {
      problem: "Spending Hours on Manual Calculations & Reports?",
      solution: "Real-time BI dashboards with automated commission calculations",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop",
      benefit: "Save 20+ Hours/Week",
      cta: "Get Smart Analytics",
      link: "/solutions/analytics"
    },
    {
      problem: "Customers Can't Visualize Property Layouts?",
      solution: "Interactive visual property maps with real-time availability",
      image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&h=600&fit=crop",
      benefit: "3X Higher Conversions",
      cta: "Show Visual Maps",
      link: "/solutions/property-layouts",
      demoLink: "https://billingwala.kitchenschools.com/public/"
    },
    {
      problem: "Missing Revenue from Resale Opportunities?",
      solution: "Built-in resale marketplace generating additional 15-25% revenue",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=600&fit=crop",
      benefit: "+25% Revenue",
      cta: "Enable Resale",
      link: "/solutions/resale"
    },
    {
      problem: "Manual SMS/Email Costing Time & Money?",
      solution: "Bulk WhatsApp, SMS, Email automation with personalized templates",
      image: "https://images.unsplash.com/photo-1526666923127-b2970f64b422?w=1200&h=600&fit=crop",
      benefit: "80% Better Engagement",
      cta: "Automate Communication",
      link: "/solutions/communication"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000); // Changed from 5000 to 8000 (8 seconds instead of 5)

    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative w-full h-[600px] overflow-hidden bg-gradient-to-r from-blue-900 to-cyan-900">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
            <img
              src={slide.image}
              alt={slide.problem}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 to-cyan-900/90"></div>
          </div>

          {/* Content */}
          <div className="relative h-full flex items-center">
            <div className="container mx-auto px-6">
              <div className="max-w-4xl">
                {/* Problem - Clean Label Style (not button-like) */}
                <div className="mb-3">
                  <span className="text-red-400 text-sm font-medium uppercase tracking-wider">
                    ❌ The Problem
                  </span>
                </div>
                
                {/* Problem Statement */}
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  {slide.problem}
                </h2>

                {/* Solution - Clean Label Style */}
                <div className="mb-3">
                  <span className="text-green-400 text-sm font-medium uppercase tracking-wider">
                    ✅ Our Solution
                  </span>
                </div>

                {/* Solution Description */}
                <p className="text-xl md:text-2xl text-white/90 mb-6">
                  {slide.solution}
                </p>

                {/* Benefit - Clean Badge (not button-like) */}
                <div className="mb-6">
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-400 to-orange-400 text-gray-900 px-4 py-1.5 text-base font-bold">
                    🚀 {slide.benefit}
                  </span>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Link
                    to={slide.link}
                    className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-bold text-base hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                  >
                    {slide.cta} →
                  </Link>
                  {slide.demoLink ? (
                    <a
                      href={slide.demoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-base transition-all shadow-xl"
                    >
                      🚀 Quick Demo
                    </a>
                  ) : (
                    <button
                      onClick={() => window.location.href = `/demo${slide.link}`}
                      className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-base transition-all shadow-xl"
                    >
                      🚀 Quick Demo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots Navigation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className="absolute top-8 right-8 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-semibold">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  );
};

export default HeroCarousel;
