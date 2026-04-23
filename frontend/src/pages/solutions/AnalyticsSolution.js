import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, BarChart3, PieChart, TrendingUp, Download, Calendar, Users } from 'lucide-react';
import EnquiryForm from '../../components/EnquiryForm';
import StickyNavbar from '../../components/StickyNavbar';

const AnalyticsSolution = () => {
  const features = [
    { icon: <BarChart3 className="w-8 h-8" />, title: 'Real-time Dashboards', description: 'Sales, revenue, and conversion metrics at a glance' },
    { icon: <Users className="w-8 h-8" />, title: 'Team Performance', description: 'Track individual and team productivity and earnings' },
    { icon: <TrendingUp className="w-8 h-8" />, title: 'Lead Analytics', description: 'Source tracking, conversion funnels, quality scores' },
    { icon: <PieChart className="w-8 h-8" />, title: 'Revenue Reports', description: 'Booking values, collections, and outstanding amounts' },
    { icon: <Download className="w-8 h-8" />, title: 'Export Options', description: 'Download reports as PDF, Excel, or CSV' },
    { icon: <Calendar className="w-8 h-8" />, title: 'Custom Reports', description: 'Build your own reports with custom date ranges and filters' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      <div className="pt-24 pb-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white hover:text-gray-200 mb-8"><ArrowLeft className="w-5 h-5 mr-2" />Back to Home</Link>
          <div className="max-w-4xl"><h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Business Analytics & BI</h1><p className="text-2xl text-white/90 mb-8">Make data-driven decisions with comprehensive dashboards and reports. Get 30% better ROI.</p></div>
        </div>
      </div>
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-white rounded-xl shadow-md p-8"><h2 className="text-3xl font-bold text-gray-900 mb-4">The Problem</h2><ul className="space-y-3 text-gray-700"><li className="flex items-start"><span className="text-red-500 mr-3 mt-1">❌</span><span>Hours spent creating manual reports</span></li><li className="flex items-start"><span className="text-red-500 mr-3 mt-1">❌</span><span>No visibility into team performance</span></li><li className="flex items-start"><span className="text-red-500 mr-3 mt-1">❌</span><span>Decisions based on gut feeling, not data</span></li></ul></section>
            <section className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8"><h2 className="text-3xl font-bold text-gray-900 mb-6">The Solution</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{features.map((f, i) => <div key={i} className="bg-white rounded-lg p-6 shadow-sm"><div className="text-blue-600 mb-3">{f.icon}</div><h3 className="font-bold text-gray-900 mb-2">{f.title}</h3><p className="text-gray-600 text-sm">{f.description}</p></div>)}</div></section>
          </div>
          <div className="lg:col-span-1"><div className="sticky top-24"><EnquiryForm solutionName="Business Analytics & BI" /></div></div>
        </div>
      </div>
    </div>
  );
};
export default AnalyticsSolution;