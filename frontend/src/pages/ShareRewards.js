import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const ShareRewards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, leads, leaderboard

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAnalytics(),
        loadLeads(),
        loadLeaderboard()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/share-referral/my-analytics`, {
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

  const loadLeads = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/share-referral/my-leads?limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/share-referral/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎁 Share & Earn Rewards
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Share content and earn credits when people engage
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {analytics && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Credits Earned</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    ₹{analytics.total_credits_earned?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Shares</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {analytics.total_shares || 0}
                  </p>
                </div>
                <div className="text-4xl">🔄</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Views</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {analytics.total_views || 0}
                  </p>
                </div>
                <div className="text-4xl">👁️</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Leads</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {analytics.total_leads || 0}
                  </p>
                </div>
                <div className="text-4xl">📝</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`${
                  activeTab === 'leads'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                My Leads ({leads.length})
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`${
                  activeTab === 'leaderboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Leaderboard
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Platform Stats */}
              <div className="bg-white shadow-lg rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(analytics.platform_stats || {}).map(([platform, stats]) => (
                    <div key={platform} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 capitalize">{platform}</h4>
                        <span className="text-xl">
                          {platform === 'whatsapp' && '💬'}
                          {platform === 'facebook' && '👥'}
                          {platform === 'linkedin' && '💼'}
                          {platform === 'email' && '📧'}
                          {platform === 'twitter' && '🐦'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Shares: {stats.count}</p>
                        <p>Views: {stats.views}</p>
                        <p>Leads: {stats.leads}</p>
                        <p className="font-medium text-green-600">Credits: ₹{stats.credits?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Shares */}
              <div className="bg-white shadow-lg rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Shares</h3>
                <div className="space-y-3">
                  {analytics.recent_shares?.slice(0, 5).map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Share #{share.share_code}</p>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span>👁 {share.view_count} views</span>
                          <span>🖱 {share.click_count} clicks</span>
                          <span>📝 {share.lead_count} leads</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">₹{share.credits_earned?.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 capitalize">{share.platform}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {(!analytics.recent_shares || analytics.recent_shares.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No shares yet</p>
                    <button
                      onClick={() => navigate('/content')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Start Sharing Content
                    </button>
                  </div>
                )}
              </div>

              {/* How It Works */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">💡 How to Earn More</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="font-medium mb-2">📚 Share Articles</p>
                    <p className="text-sm opacity-90">Share content from our library to your network via WhatsApp, Email, or Social Media</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="font-medium mb-2">👥 Get Views</p>
                    <p className="text-sm opacity-90">Earn ₹1 for every person who views content via your link</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="font-medium mb-2">📝 Capture Leads</p>
                    <p className="text-sm opacity-90">Earn ₹100 when someone fills a form from your shared content</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="font-medium mb-2">🔥 Go Viral</p>
                    <p className="text-sm opacity-90">Get ₹1000 bonus when your share reaches 100+ views</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leads Tab */}
          {activeTab === 'leads' && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Leads from Your Shares</h3>
              </div>
              {leads.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <li key={lead.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{lead.name}</h4>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            {lead.email && <span>📧 {lead.email}</span>}
                            {lead.phone && <span>📱 {lead.phone}</span>}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              lead.status === 'converted' 
                                ? 'bg-green-100 text-green-800'
                                : lead.status === 'contacted'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.status}
                            </span>
                          </div>
                          {lead.article && (
                            <p className="mt-1 text-xs text-gray-400">From: {lead.article.title}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">₹{lead.credit_awarded?.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No leads yet</p>
                  <p className="text-sm text-gray-400 mt-2">Start sharing content to generate leads!</p>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">🏆 Top Sharers</h3>
              </div>
              {leaderboard.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => (
                    <li key={entry._id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-600' :
                            'text-gray-300'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{entry.sharer_name}</h4>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>🔄 {entry.total_shares} shares</span>
                              <span>👁 {entry.total_views} views</span>
                              <span>📝 {entry.total_leads} leads</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">₹{entry.total_credits?.toFixed(2)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No leaderboard data yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShareRewards;
