/**
 * Tenant Public Page - Custom branded landing page for each tenant
 * Accessible at /t/{tenant_id} or via custom domain
 * SEO optimized with structured data
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Building2, MapPin, Phone, Mail, Globe, Users, Home,
  CheckCircle, ArrowRight, Star, Calendar, Clock,
  ChevronRight, Loader2, AlertCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { SEOHead, generateOrganizationStructuredData, generateBreadcrumbStructuredData } from '../components/SEOHead';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TenantPublicPage = () => {
  const { tenantId } = useParams();
  const [tenantData, setTenantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenantData();
  }, [tenantId]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/public/tenant/${tenantId}`);
      
      if (!response.ok) {
        throw new Error('Company not found');
      }
      
      const data = await response.json();
      setTenantData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryForm.name || !inquiryForm.email || !inquiryForm.message) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/public/contact-inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inquiryForm,
          tenant_id: tenantId,
          subject: inquiryForm.subject || 'Website Inquiry'
        })
      });

      if (response.ok) {
        toast.success('Thank you! We\'ll get back to you soon.');
        setInquiryForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        toast.error('Failed to submit. Please try again.');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600 mb-6">The company page you're looking for doesn't exist or has been removed.</p>
            <Link to="/">
              <Button>Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tenant = tenantData?.tenant || {};
  const projects = tenantData?.projects || [];
  const stats = tenantData?.stats || {};

  // Generate SEO structured data
  const organizationData = tenantData ? generateOrganizationStructuredData(tenant) : null;
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: tenant.company_name || 'Developer', url: `/t/${tenantId}` }
  ]);

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags */}
      <SEOHead
        title={`${tenant.company_name || 'Real Estate Developer'} | ${tenant.city || 'India'} - Properties & Projects`}
        description={`${tenant.description || tenant.company_name} - ${stats.project_count || projects.length || 0} projects with ${stats.total_properties || 0}+ properties in ${tenant.city}, ${tenant.state}. ${stats.years_experience || 10}+ years of excellence in real estate.`}
        keywords={`${tenant.company_name}, real estate ${tenant.city}, property developer ${tenant.state}, buy property, plots, apartments, villas, ${projects.map(p => p.name).slice(0, 5).join(', ')}`}
        image={tenant.logo_url || tenant.banner_url}
        url={`/t/${tenantId}`}
        type="website"
        structuredData={[organizationData, breadcrumbData]}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.company_name} className="h-10 w-auto" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{tenant.company_name}</h1>
                {tenant.tagline && (
                  <p className="text-xs text-gray-500">{tenant.tagline}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="hidden md:flex items-center gap-2 text-gray-600 hover:text-blue-600">
                  <Phone className="w-4 h-4" />
                  <span>{tenant.phone}</span>
                </a>
              )}
              <Button onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}>
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4 bg-blue-100 text-blue-800">
              {tenant.business_type || 'Real Estate Developer'}
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {tenant.headline || `Welcome to ${tenant.company_name}`}
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              {tenant.description || 'Building quality homes and creating communities since establishment. Explore our projects and find your dream property.'}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-800"
                onClick={() => document.getElementById('projects').scrollIntoView({ behavior: 'smooth' })}
              >
                View Projects
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
              >
                Get in Touch
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{stats.project_count || projects.length || 0}</div>
              <div className="text-gray-600">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{stats.total_properties || 0}+</div>
              <div className="text-gray-600">Properties</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">{stats.happy_customers || '500'}+</div>
              <div className="text-gray-600">Happy Families</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">{stats.years_experience || '10'}+</div>
              <div className="text-gray-600">Years Experience</div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-100 text-purple-800">Our Projects</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Explore Our Developments
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From residential communities to commercial spaces, discover properties that match your needs.
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No projects available at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project) => (
                <Link to={`/p/${project.id}`} key={project.id}>
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer">
                    {/* Project Image */}
                    <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
                      {project.image_url ? (
                        <img 
                          src={project.image_url} 
                          alt={project.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-16 h-16 text-blue-300" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className={`${
                          project.status === 'completed' 
                            ? 'bg-green-500' 
                            : project.status === 'ongoing'
                            ? 'bg-blue-500'
                            : 'bg-orange-500'
                        } text-white`}>
                          {project.status || 'Ongoing'}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-5">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </h3>
                      
                      {project.location && (
                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                          <MapPin className="w-4 h-4" />
                          <span>{project.location || `${project.city}, ${project.state}`}</span>
                        </div>
                      )}
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {project.description || `${project.property_count || 0} properties available in this premium development.`}
                      </p>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex gap-4 text-sm">
                          <span className="text-blue-600 font-medium">
                            {project.available_count || 0} Available
                          </span>
                          <span className="text-gray-400">
                            of {project.property_count || 0} units
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-100 text-green-800">Why Choose Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Building Trust, Delivering Quality
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: CheckCircle, title: 'Quality Construction', desc: 'Premium materials and modern construction techniques for lasting value.' },
              { icon: Clock, title: 'On-Time Delivery', desc: 'We pride ourselves on meeting deadlines and delivering as promised.' },
              { icon: Users, title: 'Customer First', desc: 'Transparent processes and dedicated support throughout your journey.' }
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Contact Info */}
            <div className="text-white">
              <Badge className="mb-4 bg-white/20 text-white border-white/30">Get in Touch</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Let's Discuss Your Dream Property
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Have questions? Want to schedule a site visit? We're here to help you find your perfect home.
              </p>
              
              <div className="space-y-4">
                {tenant.address && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-200">Address</div>
                      <div className="font-medium">{tenant.address}</div>
                    </div>
                  </div>
                )}
                
                {tenant.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-200">Phone</div>
                      <a href={`tel:${tenant.phone}`} className="font-medium hover:underline">{tenant.phone}</a>
                    </div>
                  </div>
                )}
                
                {tenant.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-200">Email</div>
                      <a href={`mailto:${tenant.email}`} className="font-medium hover:underline">{tenant.email}</a>
                    </div>
                  </div>
                )}
                
                {tenant.website && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-200">Website</div>
                      <a href={tenant.website} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                        {tenant.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Form */}
            <Card className="border-0 shadow-2xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h3>
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name *</label>
                    <Input 
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      placeholder="Your name"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email *</label>
                      <Input 
                        type="email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                        placeholder="you@email.com"
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <Input 
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Subject</label>
                    <Input 
                      value={inquiryForm.subject}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })}
                      placeholder="e.g., Site Visit Request"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Message *</label>
                    <Textarea 
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      placeholder="Tell us about your requirements..."
                      className="mt-1"
                      rows={4}
                      required
                    />
                  </div>
                  <Button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.company_name} className="h-8 w-auto brightness-0 invert" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <span className="font-semibold">{tenant.company_name}</span>
            </div>
            
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {tenant.company_name}. All rights reserved.
            </p>
            
            <div className="mt-4 md:mt-0">
              <span className="text-gray-400 text-sm">Powered by </span>
              <Link to="/saas" className="text-blue-400 hover:text-blue-300">RealApex</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TenantPublicPage;
