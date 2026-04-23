import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ContentCMS() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    totalViews: 0,
    totalShares: 0,
    totalLeads: 0
  });
  
  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, []);
  
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/content/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };
  
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/content/admin/articles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setArticles(data);
      
      // Calculate stats
      const stats = {
        total: data.length,
        published: data.filter(a => a.status === 'published').length,
        draft: data.filter(a => a.status === 'draft').length,
        totalViews: data.reduce((sum, a) => sum + (a.view_count || 0), 0),
        totalShares: data.reduce((sum, a) => sum + (a.share_count || 0), 0),
        totalLeads: data.reduce((sum, a) => sum + (a.lead_count || 0), 0)
      };
      setStats(stats);
    } catch (error) {
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreate = () => {
    setCurrentArticle(null);
    setShowEditor(true);
  };
  
  const handleEdit = (article) => {
    setCurrentArticle(article);
    setShowEditor(true);
  };
  
  const handleDelete = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/content/admin/articles/${articleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success('Article deleted successfully');
      fetchArticles();
    } catch (error) {
      toast.error('Failed to delete article');
    }
  };
  
  const handleSave = async (articleData) => {
    try {
      const token = localStorage.getItem('token');
      const url = currentArticle 
        ? `${BACKEND_URL}/api/content/admin/articles/${currentArticle.id}`
        : `${BACKEND_URL}/api/content/admin/articles`;
      
      const method = currentArticle ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(articleData)
      });
      
      if (response.ok) {
        toast.success(currentArticle ? 'Article updated' : 'Article created');
        setShowEditor(false);
        fetchArticles();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save article');
    }
  };
  
  // Filter articles
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || article.category_id === filterCategory;
    const matchesStatus = !filterStatus || article.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Article</span>
            </button>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Articles</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
              <div className="text-sm text-gray-600">Published</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
              <div className="text-sm text-gray-600">Drafts</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.totalViews}</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{stats.totalShares}</div>
              <div className="text-sm text-gray-600">Total Shares</div>
            </div>
            <div className="bg-cyan-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-cyan-600">{stats.totalLeads}</div>
              <div className="text-sm text-gray-600">Leads Generated</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Articles Table */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No articles found. Create your first article!
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Shares</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Leads</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredArticles.map(article => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{article.title}</div>
                      <div className="text-sm text-gray-500">{article.excerpt.substring(0, 60)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {categories.find(c => c.id === article.category_id)?.icon}{' '}
                        {categories.find(c => c.id === article.category_id)?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        article.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-900">{article.view_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-900">{article.share_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-blue-600">{article.lead_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <a
                          href={`/content/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleEdit(article)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Article Editor Modal */}
      {showEditor && (
        <ArticleEditor
          article={currentArticle}
          categories={categories}
          onSave={handleSave}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

// Article Editor Component
function ArticleEditor({ article, categories, onSave, onClose }) {
  const [formData, setFormData] = useState(article || {
    title: '',
    excerpt: '',
    content: '',
    category_id: '',
    problem_statement: '',
    impact_analysis: '',
    solution_description: '',
    roi_benefits: '',
    success_metrics: '',
    reading_time: 7,
    cta_text: 'Start Free Trial',
    cta_link: '/register',
    status: 'draft'
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {article ? 'Edit Article' : 'Create New Article'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="How to Increase Real Estate Sales by 40%"
            />
          </div>
          
          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          
          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt (Short Summary) *
            </label>
            <textarea
              required
              value={formData.excerpt}
              onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Brief summary that appears in cards..."
            />
          </div>
          
          {/* Main Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Article Content *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Write full article content here..."
            />
          </div>
          
          {/* Problem-Solution Framework */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Problem-Solution Framework</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Problem Statement *
                </label>
                <textarea
                  required
                  value={formData.problem_statement}
                  onChange={(e) => setFormData({...formData, problem_statement: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What problem does this article address?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MemoraAI Solution *
                </label>
                <textarea
                  required
                  value={formData.solution_description}
                  onChange={(e) => setFormData({...formData, solution_description: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="How MemoraAI solves this problem..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ROI & Benefits *
                </label>
                <textarea
                  required
                  value={formData.roi_benefits}
                  onChange={(e) => setFormData({...formData, roi_benefits: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What benefits and ROI can users expect?"
                />
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              {article ? 'Update Article' : 'Create Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContentCMS;
