import React from 'react';
import { Star, Building2, CheckCircle, Quote } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      company: "Abhinandhana Avenues",
      website: "https://abhinandanaavenues.com/",
      logo: "AA",
      person: "Managing Director",
      location: "Hyderabad",
      rating: 5,
      project: "Complete Real Estate Management Software + Website Development",
      testimonial: "MemoraAI has completely transformed our operations. Managing 3 projects simultaneously was chaotic with Excel sheets and WhatsApp groups. Now with MemoraAI's multi-project dashboard, we have complete visibility of leads, payments, and inventory across all projects in one place. The visual property layout system has impressed our customers immensely. Our booking conversion rate improved by 35% within 3 months. The team's dedication and support throughout implementation was exceptional. We provided official feedback on our company letterhead - that's how confident we are!",
      results: [
        "35% increase in booking conversions",
        "3 projects managed effortlessly",
        "Zero lead leakage after implementation",
        "Professional brand image elevated"
      ],
      modules: ["Multi-Project Dashboard", "Visual Property Layouts", "Lead Management", "Payment Tracking", "Website Development"],
      verified: true,
      letterhead: true
    },
    {
      company: "BRR GROUP (Janabhivrudhhi)",
      website: "https://www.facebook.com/p/BRR-GROUP-100081773772606/",
      logo: "BRR",
      person: "Founder & CEO",
      location: "Telangana",
      rating: 5,
      project: "Real Estate Management Software + Professional Website",
      testimonial: "Before MemoraAI, tracking payments and generating reports took 2 full days every month. Now everything is automated! The system generates daily, weekly, and monthly reports automatically. Payment reminders are sent via WhatsApp and SMS automatically, which improved our collection speed by 40%. The professional website they built for us brings in 15-20 genuine inquiries every week. Customer support team responds in Telugu which our staff really appreciates. Highly recommended for Telugu real estate businesses!",
      results: [
        "40% faster payment collections",
        "15-20 weekly inquiries from website",
        "Reports automated - saved 2 days/month",
        "Telugu language support for staff"
      ],
      modules: ["Payment Automation", "Automated Reports", "Website Development", "WhatsApp Integration", "Multi-language Support"],
      verified: true,
      letterhead: false
    },
    {
      company: "Sri Jayam Housing & Constructions",
      website: "https://www.facebook.com/SriJayamHousingConstructionsPvtLtd/",
      logo: "SJ",
      person: "Director",
      location: "Vijayawada",
      rating: 5,
      project: "Payment Management & Business Intelligence Reports",
      testimonial: "Payment tracking was our biggest headache. Customers would forget installment dates, we'd forget to follow up, disputes over what was paid. MemoraAI's payment module solved everything. Automated reminders go out 3 days before due date via SMS and WhatsApp. Payment receipts are generated automatically with our logo. Commission calculations are transparent - no more agent disputes! The BI reports help us understand which projects are performing well and where we need to focus. ROI was achieved in just 2 months!",
      results: [
        "Zero payment disputes",
        "90% on-time payment collection",
        "Commission calculations automated",
        "ROI achieved in 2 months"
      ],
      modules: ["Payment Management", "Automated Reminders", "Receipt Generation", "Commission Tracking", "Business Intelligence Reports"],
      verified: true,
      letterhead: false
    },
    {
      company: "Neems Boro Group",
      website: "https://www.neemsborogroup.com/",
      logo: "NB",
      person: "Managing Partner",
      location: "Hyderabad",
      rating: 5,
      project: "Visual Layout System + Multi-Project Admin Dashboard",
      testimonial: "We were looking for a solution to showcase our multiple villa and plot projects visually. MemoraAI's interactive layout system exceeded our expectations! Customers can see plot availability in real-time with color coding. Sales team can update status instantly from mobile. The multi-project admin dashboard gives us bird's eye view of all 5 projects - inventory, bookings, revenue - everything at a glance. Site visit confirmations through WhatsApp have reduced no-shows by 60%. The system has become our competitive advantage!",
      results: [
        "5 projects managed seamlessly",
        "60% reduction in site visit no-shows",
        "Real-time plot availability tracking",
        "Mobile-friendly for field sales team"
      ],
      modules: ["Visual Property Layouts", "Multi-Project Dashboard", "Real-time Inventory", "Mobile PWA App", "WhatsApp Notifications"],
      verified: true,
      letterhead: false
    },
    {
      company: "NTR Estates",
      website: "#",
      logo: "NTR",
      person: "Proprietor",
      location: "Andhra Pradesh",
      rating: 5,
      project: "Complete Real Estate Management Software + Website Development",
      testimonial: "As a growing real estate business, we needed a system that could scale with us. MemoraAI delivered exactly that. The software handles our daily operations - from lead capture to final booking. The website they developed is modern, mobile-responsive, and generates quality leads. What impressed us most was the ease of use. Our staff, who were not tech-savvy, started using the system within 2 days of training. The mobile app means our field agents can work from anywhere. Customer inquiries are responded to within minutes now!",
      results: [
        "Fully operational within 1 week",
        "Staff adapted in 2 days with training",
        "Mobile-first approach for field agents",
        "Response time under 5 minutes"
      ],
      modules: ["Complete CRM Software", "Website Development", "Mobile PWA App", "Lead Management", "Training & Support"],
      verified: true,
      letterhead: false
    },
    {
      company: "Sree Ramainfra Developers (Nisarga Project)",
      website: "#",
      logo: "SRI",
      person: "Project Director",
      location: "Hyderabad",
      rating: 5,
      project: "Project-Specific Software + Professional Website for Nisarga",
      testimonial: "For our premium Nisarga project, we wanted a dedicated software system and professional online presence. MemoraAI delivered both brilliantly! The custom website showcases our project beautifully with high-quality images, virtual tours, and interactive plot selection. The backend software manages all bookings, payment schedules, and customer communication seamlessly. We've had zero technical issues in 6 months of operation. The automated payment reminder system alone has saved our accounts team countless hours. Highly professional team!",
      results: [
        "Zero technical issues in 6 months",
        "Premium project presentation online",
        "Automated payment management",
        "Seamless booking experience"
      ],
      modules: ["Project Website", "Booking Management", "Payment Scheduling", "Customer Portal", "Visual Layouts"],
      verified: true,
      letterhead: false
    },
    {
      company: "Pudami Real Estate",
      website: "#",
      logo: "PR",
      person: "Managing Partner",
      location: "Telangana",
      rating: 5,
      project: "Real Estate Management Software + Website",
      testimonial: "We've tried 2 other real estate software before MemoraAI, and this is by far the best. The difference is that MemoraAI actually understands Indian real estate business. Features like Telugu language support, WhatsApp integration, and commission tracking are built-in, not afterthoughts. The website brings professional credibility to our business. Customers trust us more when they see our professional online presence. The software's reporting feature helps us make data-driven decisions. Setup was smooth, support is responsive. Worth every rupee!",
      results: [
        "3rd time lucky - best software choice",
        "Telugu language support built-in",
        "Professional online credibility",
        "Data-driven decision making"
      ],
      modules: ["CRM Software", "Website Development", "Telugu Interface", "WhatsApp Integration", "Commission Tracking"],
      verified: true,
      letterhead: false
    }
  ];

  return (
    <div className="py-16 bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Estate Companies Trust MemoraAI
            </h2>
            <p className="text-xl text-gray-600">
              Genuine feedback from our clients who've transformed their operations
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 font-semibold">All testimonials verified</span>
            </div>
          </div>

          {/* Testimonials Grid */}
          <div className="space-y-8">
            {testimonials.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                        {item.logo}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{item.company}</h3>
                        <p className="text-white/90">{item.person} • {item.location}</p>
                        <a 
                          href={item.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-white/80 hover:text-white underline"
                        >
                          Visit Website →
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {[...Array(item.rating)].map((_, i) => (
                        <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {item.verified && (
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified Client
                      </span>
                    )}
                    {item.letterhead && (
                      <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                        ⭐ Official Letterhead Feedback
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Project Info */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-blue-900">Project Delivered:</p>
                    <p className="text-blue-800">{item.project}</p>
                  </div>

                  {/* Testimonial Text */}
                  <div className="relative mb-6">
                    <Quote className="absolute -top-2 -left-2 w-8 h-8 text-blue-200" />
                    <p className="text-gray-700 leading-relaxed text-lg pl-6 italic">
                      "{item.testimonial}"
                    </p>
                  </div>

                  {/* Results Grid */}
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-3">Results Achieved:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.results.map((result, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-green-50 p-3 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-800 font-medium">{result}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modules Used */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Modules Implemented:</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.modules.map((module, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200">
                          {module}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center bg-white rounded-xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Join These Success Stories?
            </h3>
            <p className="text-gray-600 mb-6">
              Start your free trial today and see the difference in 7 days
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <a
                href="/register"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Start Free Trial
              </a>
              <a
                href="/contact"
                className="px-8 py-4 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold rounded-lg transition-all"
              >
                Schedule Demo
              </a>
            </div>
            <p className="text-xs text-gray-500 italic border-t border-gray-200 pt-4">
              *Testimonials are from actual clients. Individual results may vary based on business size, market conditions, and implementation. 
              Past performance does not guarantee similar results for your business.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
