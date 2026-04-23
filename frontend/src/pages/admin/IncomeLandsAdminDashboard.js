import React, { useState, useEffect } from 'react';
import { api } from '../../services';
import { Users, TrendingUp, DollarSign, MapPin, PhoneCall, Target } from 'lucide-react';

const IncomeLandsAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch marketplace stats
      const statsRes = await api.get('/marketplace/stats/overview');
      setStats(statsRes.data.stats);
      
      // Fetch top agents
      const topAgents = statsRes.data.top_agents || [];
      setAgents(topAgents);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold mt-2" style={{ color }}>{value}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-4 rounded-full" style={{ backgroundColor: color + '20' }}>
          <Icon size={32} style={{ color }} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading IncomeLands Marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <MapPin size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">IncomeLands Marketplace</h1>
              <p className="text-blue-100 mt-1">Monitor agents, leads, and commissions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            title="Total Agents"
            value={stats?.total_agents || 0}
            subtitle="Active marketplace agents"
            color="#3B82F6"
          />
          <StatCard
            icon={Target}
            title="Total Leads"
            value={stats?.total_leads || 0}
            subtitle={`${stats?.converted_leads || 0} converted`}
            color="#10B981"
          />
          <StatCard
            icon={DollarSign}
            title="Total Commission"
            value={`₹${((stats?.total_agent_payout || 0) / 100000).toFixed(1)}L`}
            subtitle="Agent payouts"
            color="#F59E0B"
          />
          <StatCard
            icon={PhoneCall}
            title="Contact Unlocks"
            value={stats?.total_contact_unlocks || 0}
            subtitle={`₹${(stats?.unlock_revenue || 0).toLocaleString()} revenue`}
            color="#8B5CF6"
          />
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Conversion Rate</h3>
              <p className="text-sm text-gray-600 mt-1">Leads converted to bookings</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-green-600">
                {stats?.conversion_rate || 0}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {stats?.converted_leads || 0} / {stats?.total_leads || 0} leads
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats?.conversion_rate || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-gray-600 font-medium mb-2">Total Commission</h4>
            <p className="text-2xl font-bold text-blue-600">
              ₹{((stats?.total_commission || 0) / 100000).toFixed(2)}L
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-gray-600 font-medium mb-2">Agent Payout</h4>
            <p className="text-2xl font-bold text-green-600">
              ₹{((stats?.total_agent_payout || 0) / 100000).toFixed(2)}L
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-gray-600 font-medium mb-2">Platform Fee</h4>
            <p className="text-2xl font-bold text-purple-600">
              ₹{((stats?.total_platform_fee || 0) / 100000).toFixed(2)}L
            </p>
          </div>
        </div>

        {/* Top Performing Agents */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Top Performing Agents</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission Earned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      <MapPin className="mx-auto mb-3 text-gray-400" size={48} />
                      <p>No agents registered yet</p>
                      <p className="text-sm mt-1">Agents will appear here once they register through IncomeLands app</p>
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                              {agent.name?.charAt(0) || 'A'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                            <div className="text-sm text-gray-500">{agent.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{agent.city || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{agent.state || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.total_leads_submitted || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.converted_leads || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ₹{((agent.total_commission_earned || 0) / 1000).toFixed(1)}K
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agent.is_verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {agent.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-semibold mb-4">Quick Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/incomelands-tester.html"
              target="_blank"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all cursor-pointer"
            >
              <h4 className="font-semibold mb-1">🧪 Test APIs</h4>
              <p className="text-sm text-blue-100">Test marketplace endpoints</p>
            </a>
            <div className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all cursor-pointer">
              <h4 className="font-semibold mb-1">📊 Analytics</h4>
              <p className="text-sm text-blue-100">View detailed reports</p>
            </div>
            <div className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all cursor-pointer">
              <h4 className="font-semibold mb-1">⚙️ Settings</h4>
              <p className="text-sm text-blue-100">Configure marketplace</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeLandsAdminDashboard;
