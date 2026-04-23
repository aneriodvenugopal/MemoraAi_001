import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Eye, Share2, TrendingUp, Filter } from 'lucide-react';
import LanguageSelector from '../../components/LanguageSelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ContentLibrary = () => {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/content/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      
      // Try new API first, fallback to old API
      let url = `${BACKEND_URL}/api/public/articles?limit=50`;
      if (selectedCategory) {
        url += `&category=${selectedCategory}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      // New API returns data in {success, articles} format
      if (data.success && data.articles) {
        setArticles(data.articles);
      } else {
        // Fallback to old API format
        setArticles(data);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Language Selector */}
      <div className="fixed top-6 right-6 z-50">
        <LanguageSelector />
      </div>

      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6 text-gray-600 hover:text-blue-600 transition-colors font-medium">
              ← Back to Home
            </Link>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Real Estate Growth
              <span className="block text-blue-600 mt-2">
                Knowledge Hub
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Learn how to grow your real estate business 40X faster with proven strategies
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-5 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              <Filter className="inline mr-2 w-4 h-4" />
              All Articles
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-5 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Articles Grid */}
      <section className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center text-gray-600 text-xl py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Loading amazing content...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center text-gray-600 text-xl py-20">
            <p>No articles found. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                to={`/article/${article.slug}`}
                className="group"
              >
                <div className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 h-full">
                  {/* Featured Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl">
                        {categories.find(c => c.id === article.category_id)?.icon}
                      </span>
                    </div>
                    
                    {/* Category Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">
                        {article.category || categories.find(c => c.id === article.category_id)?.name || 'Article'}
                      </span>
                    </div>

                    {/* Trending Badge */}
                    {(article.views || article.view_count || 0) > 100 && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 bg-blue-600 rounded-full text-xs font-bold text-white shadow-sm flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Trending
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {article.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                      {article.excerpt}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-gray-500 text-xs pt-4 border-t">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {article.reading_time || 5} min
                        </span>
                        <span className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {article.views || article.view_count || 0}
                        </span>
                      </div>
                      <span className="text-blue-600 font-medium">Read →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Real Estate Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of real estate companies achieving 40X faster growth
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 shadow-lg transition-all"
          >
            Start Free Trial Now →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ContentLibrary;