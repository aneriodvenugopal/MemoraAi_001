import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, RefreshCw, DollarSign, Users, TrendingUp, ThumbsUp, Share2 } from 'lucide-react';
import EnquiryForm from '../../components/EnquiryForm';
import StickyNavbar from '../../components/StickyNavbar';

const ResaleSolution = () => {
  const features = [
    { icon: <RefreshCw className="w-8 h-8" />, title: 'Customer Requests', description: 'Customers can list their properties for resale' },
    { icon: <ThumbsUp className="w-8 h-8" />, title: 'Approval Workflow', description: 'Admin reviews and approves resale listings' },
    { icon: <Share2 className="w-8 h-8" />, title: 'Public Marketplace', description: 'Approved properties appear on your website' },
    { icon: <Users className="w-8 h-8" />, title: 'Lead Generation', description: 'Generate new buyer leads from resale properties' },
    { icon: <DollarSign className="w-8 h-8" />, title: 'Commission Tracking', description: 'Track resale commissions separately' },
    { icon: <TrendingUp className="w-8 h-8" />, title: 'Customer Retention', description: 'Keep customers engaged even after sale' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      <div className="pt-24 pb-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white hover:text-gray-200 mb-8"><ArrowLeft className="w-5 h-5 mr-2" />Back to Home</Link>
          <div className="max-w-4xl"><h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Resale Marketplace</h1><p className="text-2xl text-white/90 mb-8">Generate 15-25% additional revenue from resale transactions. Turn one-time customers into lifetime clients.</p></div>
        </div>
      </div>
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-white rounded-xl shadow-md p-8"><h2 className="text-3xl font-bold text-gray-900 mb-4">The Problem</h2><ul className="space-y-3 text-gray-700"><li className="flex items-start"><span className="text-red-500 mr-3 mt-1">❌</span><span>Losing customers after initial sale</span></li><li className="flex items-start"><span className="text-red-500 mr-3 mt-1">❌</span><span>Missing revenue from resale opportunities</span></li><li className="flex items-start"><span className="text-red-500 mr-3 mt-1">❌</span><span>No system to manage resale requests</span></li></ul></section>
            <section className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8"><h2 className="text-3xl font-bold text-gray-900 mb-6">The Solution</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{features.map((f, i) => <div key={i} className="bg-white rounded-lg p-6 shadow-sm"><div className="text-blue-600 mb-3">{f.icon}</div><h3 className="font-bold text-gray-900 mb-2">{f.title}</h3><p className="text-gray-600 text-sm">{f.description}</p></div>)}</div></section>
          </div>
          <div className="lg:col-span-1"><div className="sticky top-24"><EnquiryForm solutionName="Resale Marketplace" /></div></div>
        </div>
      </div>
    </div>
  );
};
export default ResaleSolution;