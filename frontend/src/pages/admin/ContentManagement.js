import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const ContentManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('articles'); // articles, categories, analytics
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  
  // Form state
  const [articleForm, setArticleForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category_id: '',
    tags: [],
    problem_statement: '',
    impact_analysis: '',
    solution_description: '',
    roi_benefits: '',
    success_metrics: '',
    cta_text: 'Start Free Trial',
    cta_link: '/register',
    status: 'draft',
    reading_time: 5
  });

  useEffect(() => {
    // Check if user is admin
    if (!user || !['super_admin', 'admin'].includes(user.role_id)) {
      alert('Admin access required');
      navigate('/dashboard');
      return;
    }
    
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadArticles(),
        loadCategories(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/content/articles`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/content/categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/content/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleCreateArticle = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/content/articles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(articleForm)
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Article created successfully!');
        setShowArticleForm(false);
        resetForm();
        loadArticles();
      } else {
        alert('Failed to create article');
      }
    } catch (error) {
      console.error('Error creating article:', error);
      alert('Error creating article');
    }
  };

  const handleUpdateArticle = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/content/articles/${editingArticle.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(articleForm)
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Article updated successfully!');
        setShowArticleForm(false);
        setEditingArticle(null);
        resetForm();
        loadArticles();
      } else {
        alert('Failed to update article');
      }
    } catch (error) {
      console.error('Error updating article:', error);
      alert('Error updating article');
    }
  };

  const handleDeleteArticle = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/content/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Article deleted successfully!');
        loadArticles();
      } else {
        alert('Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error deleting article');
    }
  };

  const handlePublishToggle = async (article) => {
    const endpoint = article.status === 'published' ? 'unpublish' : 'publish';
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/content/articles/${article.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        loadArticles();
      } else {
        alert('Failed to update article status');
      }
    } catch (error) {
      console.error('Error updating article status:', error);
      alert('Error updating article status');
    }
  };

  const startEditArticle = (article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      featured_image: article.featured_image || '',
      category_id: article.category_id,
      tags: article.tags || [],
      problem_statement: article.problem_statement,
      impact_analysis: article.impact_analysis,
      solution_description: article.solution_description,
      roi_benefits: article.roi_benefits,
      success_metrics: article.success_metrics,
      cta_text: article.cta_text,
      cta_link: article.cta_link,
      status: article.status,
      reading_time: article.reading_time
    });
    setShowArticleForm(true);
  };

  const resetForm = () => {
    setArticleForm({
      title: '',
      excerpt: '',
      content: '',
      featured_image: '',
      category_id: '',
      tags: [],
      problem_statement: '',
      impact_analysis: '',
      solution_description: '',
      roi_benefits: '',
      success_metrics: '',
      cta_text: 'Start Free Trial',
      cta_link: '/register',
      status: 'draft',
      reading_time: 5
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              📝 Content Management
            </h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('articles')}
              className={`${
                activeTab === 'articles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Articles ({articles.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Categories ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Articles Tab */}
        {activeTab === 'articles' && !showArticleForm && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Articles</h2>
              <button
                onClick={() => {
                  resetForm();
                  setEditingArticle(null);
                  setShowArticleForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Create New Article
              </button>
            </div>

            {/* Articles Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {articles.map((article) => (
                  <li key={article.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{article.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">{article.excerpt}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            article.status === 'published' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {article.status}
                          </span>
                          <span>👁 {article.view_count} views</span>
                          <span>🔄 {article.share_count} shares</span>
                          <span>📝 {article.lead_count} leads</span>
                          <span>{article.category?.name || 'No Category'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePublishToggle(article)}
                          className={`px-3 py-1 text-sm rounded ${
                            article.status === 'published'
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {article.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => startEditArticle(article)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Article Form */}
        {activeTab === 'articles' && showArticleForm && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingArticle ? 'Edit Article' : 'Create New Article'}
              </h2>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({...articleForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Article title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                <textarea
                  value={articleForm.excerpt}
                  onChange={(e) => setArticleForm({...articleForm, excerpt: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({...articleForm, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  rows="10"
                  placeholder="Full article content (supports markdown)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={articleForm.category_id}
                    onChange={(e) => setArticleForm({...articleForm, category_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image URL</label>
                  <input
                    type="text"
                    value={articleForm.featured_image}
                    onChange={(e) => setArticleForm({...articleForm, featured_image: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Problem-Solution Framework */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Problem-Solution Framework</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Problem Statement</label>
                    <textarea
                      value={articleForm.problem_statement}
                      onChange={(e) => setArticleForm({...articleForm, problem_statement: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Impact Analysis</label>
                    <textarea
                      value={articleForm.impact_analysis}
                      onChange={(e) => setArticleForm({...articleForm, impact_analysis: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Solution Description</label>
                    <textarea
                      value={articleForm.solution_description}
                      onChange={(e) => setArticleForm({...articleForm, solution_description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ROI Benefits</label>
                    <textarea
                      value={articleForm.roi_benefits}
                      onChange={(e) => setArticleForm({...articleForm, roi_benefits: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Success Metrics</label>
                    <textarea
                      value={articleForm.success_metrics}
                      onChange={(e) => setArticleForm({...articleForm, success_metrics: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* CTA & Status */}
              <div className="border-t pt-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTA Text</label>
                  <input
                    type="text"
                    value={articleForm.cta_text}
                    onChange={(e) => setArticleForm({...articleForm, cta_text: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTA Link</label>
                  <input
                    type="text"
                    value={articleForm.cta_link}
                    onChange={(e) => setArticleForm({...articleForm, cta_link: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={articleForm.status}
                    onChange={(e) => setArticleForm({...articleForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reading Time (minutes)</label>
                  <input
                    type="number"
                    value={articleForm.reading_time}
                    onChange={(e) => setArticleForm({...articleForm, reading_time: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowArticleForm(false);
                    setEditingArticle(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingArticle ? handleUpdateArticle : handleCreateArticle}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {editingArticle ? 'Update Article' : 'Create Article'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Content Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Articles</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{analytics.total_articles}</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500">Published</div>
                <div className="text-3xl font-bold text-green-600 mt-2">{analytics.published_articles}</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Views</div>
                <div className="text-3xl font-bold text-blue-600 mt-2">{analytics.total_views}</div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Leads</div>
                <div className="text-3xl font-bold text-purple-600 mt-2">{analytics.total_leads}</div>
              </div>
            </div>

            {/* Top Articles */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Top Performing Articles</h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {analytics.top_articles.map((article, index) => (
                  <li key={article.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{article.title}</h4>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span>👁 {article.view_count}</span>
                            <span>🔄 {article.share_count}</span>
                            <span>📝 {article.lead_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories</h2>
            <p className="text-gray-600">Category management coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentManagement;
