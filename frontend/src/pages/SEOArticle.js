import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, Share2, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import api from '../services/api';

const SEOArticle = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadArticle();
  }, [slug]);

  const loadArticle = async () => {
    try {
      const response = await api.get(`/realapex-demos/seo-article/${slug}`);
      if (response.data.success) {
        setArticle(response.data.article);
      }
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareArticle = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.topic,
          text: `Check out this article: ${article?.topic}`,
          url: window.location.href
        });
      } catch (err) {
        if (err.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  };

  // Parse markdown-like content
  const renderContent = (content) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const elements = [];
    
    lines.forEach((line, index) => {
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-xl font-semibold text-gray-800 mt-6 mb-3">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={index} className="font-bold text-gray-900 mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      } else if (line.startsWith('- ') || line.startsWith('• ')) {
        elements.push(
          <li key={index} className="ml-6 text-gray-700 leading-relaxed">
            {line.replace(/^[-•]\s/, '')}
          </li>
        );
      } else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <li key={index} className="ml-6 text-gray-700 leading-relaxed list-decimal">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      } else if (line.trim()) {
        elements.push(
          <p key={index} className="text-gray-700 leading-relaxed mb-4">
            {line}
          </p>
        );
      }
    });
    
    return elements;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h1>
          <p className="text-gray-600 mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/articles" className="text-blue-600 hover:underline">
            ← Back to Articles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.topic} | MemoraAI</title>
        <meta name="description" content={article.content?.substring(0, 160)} />
        <meta property="og:title" content={article.topic} />
        <meta property="og:description" content={article.content?.substring(0, 160)} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.topic} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/articles" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span>All Articles</span>
            </Link>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Copy link"
              >
                {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
              <button
                onClick={shareArticle}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Article Content */}
        <article className="max-w-4xl mx-auto px-4 py-8">
          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {article.category}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              {article.language}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
            {article.topic}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(article.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {renderContent(article.content)}
          </div>

          {/* Footer CTA */}
          <div className="mt-12 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white text-center">
            <h3 className="text-xl font-bold mb-2">Looking for Property?</h3>
            <p className="text-blue-100 mb-4">Download AgentApex - The best app for finding and posting properties</p>
            <Link
              to="/agentapex"
              className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Try AgentApex Free
            </Link>
          </div>
        </article>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p>&copy; {new Date().getFullYear()} MemoraAI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SEOArticle;
