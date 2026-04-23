import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import MemoraAILogo from './MemoraAILogo';

const StickyNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setSolutionsOpen(false);
  }, [location]);

  const solutions = [
    { name: 'Smart CRM & Lead Management', link: '/solutions/crm' },
    { name: 'Payment Automation', link: '/solutions/payments' },
    { name: 'Visual Property Layouts', link: '/solutions/property-layouts' },
    { name: 'Business Analytics & BI', link: '/solutions/analytics' },
    { name: 'Communication Hub', link: '/solutions/communication' },
    { name: 'Resale Marketplace', link: '/solutions/resale' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg py-2'
          : 'bg-white/95 backdrop-blur-sm py-3'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <MemoraAILogo size="sm" showCaption={true} showBrand={true} />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-5">
            <Link
              to="/"
              className="text-sm text-gray-700 hover:text-sky-600 font-medium transition-colors whitespace-nowrap"
            >
              Home
            </Link>

            {/* Solutions Dropdown */}
            <div className="relative group">
              <button
                className="flex items-center text-sm text-gray-700 hover:text-sky-600 font-medium transition-colors whitespace-nowrap"
                onMouseEnter={() => setSolutionsOpen(true)}
                onMouseLeave={() => setSolutionsOpen(false)}
              >
                Solutions
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </button>
              
              {/* Dropdown Menu */}
              <div
                className={`absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 transition-all ${
                  solutionsOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
                onMouseEnter={() => setSolutionsOpen(true)}
                onMouseLeave={() => setSolutionsOpen(false)}
              >
                {solutions.map((solution) => (
                  <Link
                    key={solution.link}
                    to={solution.link}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-sky-600 transition-colors"
                  >
                    {solution.name}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              to="/features"
              className="text-sm text-gray-700 hover:text-sky-600 font-medium transition-colors whitespace-nowrap"
            >
              Features
            </Link>

            <Link
              to="/pricing"
              className="text-sm text-gray-700 hover:text-sky-600 font-medium transition-colors whitespace-nowrap"
            >
              Pricing
            </Link>

            <Link
              to="/advisory"
              className="text-sm text-gray-700 hover:text-sky-600 font-medium transition-colors whitespace-nowrap"
            >
              FREE Expert
            </Link>

            <Link
              to="/workforce-map"
              className="text-sm text-gray-700 hover:text-sky-600 font-medium transition-colors whitespace-nowrap"
            >
              Workforce
            </Link>

            <Link
              to="/faq"
              className="text-sm text-gray-700 hover:text-sky-600 font-medium transition-colors whitespace-nowrap"
            >
              FAQ
            </Link>

            <Link
              to="/contact"
              className="text-sm text-gray-700 hover:text-sky-600 font-medium transition-colors whitespace-nowrap"
            >
              Contact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-3 flex-shrink-0">
            <Link
              to="/login"
              className="px-4 py-2 text-sm text-sky-600 font-semibold hover:text-sky-700 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-all"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-gray-700 hover:text-sky-600"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t pt-4">
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                className="text-gray-700 hover:text-sky-600 font-medium"
              >
                Home
              </Link>

              {/* Solutions Mobile */}
              <div>
                <button
                  onClick={() => setSolutionsOpen(!solutionsOpen)}
                  className="flex items-center text-gray-700 hover:text-sky-600 font-medium w-full"
                >
                  Solutions
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${solutionsOpen ? 'rotate-180' : ''}`} />
                </button>
                {solutionsOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    {solutions.map((solution) => (
                      <Link
                        key={solution.link}
                        to={solution.link}
                        className="block text-gray-600 hover:text-sky-600"
                      >
                        {solution.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/features"
                className="text-gray-700 hover:text-sky-600 font-medium"
              >
                Features
              </Link>

              <Link
                to="/pricing"
                className="text-gray-700 hover:text-sky-600 font-medium"
              >
                Pricing
              </Link>

              <Link
                to="/advisory"
                className="text-gray-700 hover:text-sky-600 font-medium"
              >
                FREE Expert Advisory
              </Link>

              <Link
                to="/faq"
                className="text-gray-700 hover:text-sky-600 font-medium"
              >
                FAQ
              </Link>

              <Link
                to="/workforce-map"
                className="text-gray-700 hover:text-sky-600 font-medium"
              >
                Workforce Map
              </Link>

              <Link
                to="/contact"
                className="text-gray-700 hover:text-sky-600 font-medium"
              >
                Contact
              </Link>

              <div className="flex flex-col space-y-2 pt-4 border-t">
                <Link
                  to="/login"
                  className="px-6 py-2 text-center text-sky-600 font-semibold border-2 border-sky-600 rounded-lg"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 text-center bg-sky-600 text-white font-semibold rounded-lg"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default StickyNavbar;
