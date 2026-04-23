import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ArrowRight, BookOpen } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import api from '../services/api';

const CATEGORY_COLORS = {
  property_tips: 'bg-blue-100 text-blue-700',
  area_reviews: 'bg-green-100 text-green-700',
  market_updates: 'bg-orange-100 text-orange-700',
  investment_guide: 'bg-purple-100 text-purple-700',
  legal_tips: 'bg-red-100 text-red-700',
  success_stories: 'bg-blue-100 text-blue-700'
};

const CATEGORY_NAMES = {
  property_tips: 'Property Tips',
  area_reviews: 'Area Reviews',
  market_updates: 'Market Updates',
  investment_guide: 'Investment Guide',
  legal_tips: 'Legal Tips',
  success_stories: 'Success Stories'
};

const ArticlesListing = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const response = await api.get('/realapex-demos/seo-articles');
      setArticles(response.data.articles || []);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = filter === 'all' 
    ? articles 
    : articles.filter(a => a.category === filter);

  const categories = [...new Set(articles.map(a => a.category))];

  return (
    <>
      <Helmet>
        <title>Real Estate Articles & Tips | MemoraAI</title>
        <meta name="description" content="Expert real estate tips, market updates, and investment guides for property buyers in India." />
        <meta property="og:title" content="Real Estate Articles & Tips | MemoraAI" />
        <meta property="og:description" content="Expert real estate tips, market updates, and investment guides." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 text-white py-16">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm mb-6">
              <BookOpen className="w-4 h-4" />
              <span>Real Estate Knowledge Hub</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Real Estate Articles & Tips
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Expert insights on property buying, market trends, legal tips, and investment strategies
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white border-b sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === 'all' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({articles.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === cat 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {CATEGORY_NAMES[cat] || cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Articles Yet</h2>
              <p className="text-gray-500">
                {filter !== 'all' 
                  ? 'No articles in this category yet. Try a different filter.' 
                  : 'Check back soon for expert real estate content!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.seo_slug}`}
                  className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100"
                >
                  {/* Category Badge */}
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-700'
                  }`}>
                    <Tag className="w-3 h-3" />
                    {CATEGORY_NAMES[article.category] || article.category}
                  </span>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-gray-900 mt-4 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {article.topic}
                  </h2>

                  {/* Meta */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(article.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="text-blue-600 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-gray-900 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Find Your Dream Property?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Download AgentApex and browse thousands of properties with verified listings
            </p>
            <Link
              to="/agentapex"
              className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Try AgentApex Free
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-950 text-gray-500 py-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p>&copy; {new Date().getFullYear()} MemoraAI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ArticlesListing;
