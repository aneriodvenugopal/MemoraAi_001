import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Clock, Eye, Heart, Share2, 
  Twitter, Facebook, Linkedin, Link as LinkIcon,
  Tag, User
} from 'lucide-react';
import { api } from '../../services';
import ReactMarkdown from 'react-markdown';

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/public/articles/slug/${slug}`);
      if (response.data.success) {
        setArticle(response.data.article);
        
        // Fetch related articles
        const relatedResponse = await api.get(`/public/articles?category=${response.data.article.category}&limit=3`);
        if (relatedResponse.data.success) {
          // Filter out current article
          const filtered = relatedResponse.data.articles.filter(a => a.id !== response.data.article.id);
          setRelatedArticles(filtered.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (liked || !article) return;
    
    try {
      await api.post(`/public/articles/${article.id}/like`);
      setArticle({ ...article, likes: article.likes + 1 });
      setLiked(true);
    } catch (error) {
      console.error('Error liking article:', error);
    }
  };

  const shareArticle = (platform) => {
    const url = window.location.href;
    const title = article?.title || '';
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Category Badge */}
          {article.category && (
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${
              article.category === 'saas' ? 'bg-blue-100 text-blue-700' :
              article.category === 'tenant' ? 'bg-green-100 text-green-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {article.category.toUpperCase()}
            </span>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-gray-600 mb-6">
            {article.excerpt}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{article.author || article.author_name || 'MemoraAI Team'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(article.published_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{article.reading_time || 5} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{article.views || article.view_count || 0} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Article Content */}
          <div className="prose prose-lg max-w-none mb-8">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="border-t border-gray-200 pt-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 cursor-pointer transition"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 pt-6 flex items-center justify-between">
            <button
              onClick={handleLike}
              disabled={liked}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
                liked 
                  ? 'bg-pink-100 text-pink-700 cursor-not-allowed' 
                  : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span className="font-medium">{article.likes || 0} Likes</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 mr-2 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share:
              </span>
              <button
                onClick={() => shareArticle('twitter')}
                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
              >
                <Twitter className="w-5 h-5" />
              </button>
              <button
                onClick={() => shareArticle('facebook')}
                className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                <Facebook className="w-5 h-5" />
              </button>
              <button
                onClick={() => shareArticle('linkedin')}
                className="p-2 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 transition"
              >
                <Linkedin className="w-5 h-5" />
              </button>
              <button
                onClick={() => shareArticle('copy')}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <LinkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <div
                  key={related.id}
                  onClick={() => navigate(`/article/${related.slug}`)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition"
                >
                  {related.category && (
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                      related.category === 'saas' ? 'bg-blue-100 text-blue-700' :
                      related.category === 'tenant' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {related.category.toUpperCase()}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {related.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {related.excerpt}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {related.reading_time || 5} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {related.views || related.view_count || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleDetail;
