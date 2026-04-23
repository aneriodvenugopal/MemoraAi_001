import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, Share2, Facebook, Linkedin, Twitter, Mail } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSelector from '../../components/LanguageSelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ArticleDetail = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '', message: '' });

  useEffect(() => {
    fetchArticle();
    trackView();
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/content/articles/${slug}`);
      const data = await response.json();
      setArticle(data);
      
      // Fetch related articles
      const relatedResponse = await fetch(`${BACKEND_URL}/api/content/articles?category_id=${data.category_id}&limit=3`);
      const relatedData = await relatedResponse.json();
      setRelatedArticles(relatedData.filter(a => a.id !== data.id).slice(0, 3));
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/content/track-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: slug, referrer: document.referrer })
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleShare = async (platform) => {
    const url = window.location.href;
    const title = article?.title || '';
    
    let shareUrl = '';
    switch(platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      
      // Track share
      try {
        await fetch(`${BACKEND_URL}/api/content/track-share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: article.id, platform })
        });
        toast.success('Thanks for sharing!');
      } catch (error) {
        console.error('Error tracking share:', error);
      }
    }
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/content/capture-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...leadData, article_id: article.id })
      });
      toast.success("Thank you! We'll contact you soon.");
      setShowLeadForm(false);
      setLeadData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-600">Article not found</p>
          <Link to="/content" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Knowledge Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Language Selector */}
      <div className="fixed top-6 right-6 z-50">
        <LanguageSelector />
      </div>

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <Link to="/content" className="inline-flex items-center text-gray-600 hover:text-blue-600">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back to Knowledge Hub
          </Link>
        </div>
      </header>

      {/* Article Content */}
      <article className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center justify-between mb-8 pb-8 border-b">
          <div className="flex items-center space-x-6 text-gray-600">
            <span className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              {article.reading_time} min read
            </span>
            <span className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              {article.view_count} views
            </span>
          </div>
          
          {/* Share Buttons */}
          <div className="flex items-center space-x-3">
            <button onClick={() => handleShare('facebook')} className="p-2 hover:bg-blue-50 rounded-full">
              <Facebook className="w-5 h-5 text-blue-600" />
            </button>
            <button onClick={() => handleShare('twitter')} className="p-2 hover:bg-blue-50 rounded-full">
              <Twitter className="w-5 h-5 text-blue-400" />
            </button>
            <button onClick={() => handleShare('linkedin')} className="p-2 hover:bg-blue-50 rounded-full">
              <Linkedin className="w-5 h-5 text-blue-700" />
            </button>
            <button onClick={() => handleShare('whatsapp')} className="p-2 hover:bg-green-50 rounded-full">
              <Share2 className="w-5 h-5 text-green-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 mb-8">
            <p className="text-lg text-gray-700">{article.excerpt}</p>
          </div>
          
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {article.content}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Real Estate Business?
          </h2>
          <p className="text-xl mb-6 opacity-90">
            See how RealApex can help you achieve 40X faster growth
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-all"
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => setShowLeadForm(true)}
              className="px-8 py-3 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 transition-all"
            >
              Talk to Sales
            </button>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  to={`/content/${related.slug}`}
                  className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 mb-2">{related.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{related.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Lead Form Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Get in Touch</h3>
            <form onSubmit={handleLeadSubmit}>
              <input
                type="text"
                placeholder="Name *"
                required
                value={leadData.name}
                onChange={(e) => setLeadData({...leadData, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg mb-3"
              />
              <input
                type="email"
                placeholder="Email *"
                required
                value={leadData.email}
                onChange={(e) => setLeadData({...leadData, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg mb-3"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={leadData.phone}
                onChange={(e) => setLeadData({...leadData, phone: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg mb-3"
              />
              <textarea
                placeholder="Message"
                value={leadData.message}
                onChange={(e) => setLeadData({...leadData, message: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">
                  Submit
                </button>
                <button type="button" onClick={() => setShowLeadForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleDetail;
