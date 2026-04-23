import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

const ROICalculator = () => {
  const [leads, setLeads] = useState(100);
  const [leakage, setLeakage] = useState(40);
  const [avgCommission, setAvgCommission] = useState(50000);
  const [conversionRate, setConversionRate] = useState(30);
  const [results, setResults] = useState({});

  useEffect(() => {
    calculateROI();
  }, [leads, leakage, avgCommission, conversionRate]);

  const calculateROI = () => {
    // Current state (with leakage)
    const leadsLost = (leads * leakage) / 100;
    const effectiveLeads = leads - leadsLost;
    const currentConversions = (effectiveLeads * 20) / 100; // Assume 20% conversion without automation
    const currentRevenue = currentConversions * avgCommission;
    const annualCurrentRevenue = currentRevenue * 12;

    // With MemoraAI (0% leakage, better conversion)
    const realapexLeads = leads; // No leakage
    const realapexConversions = (realapexLeads * conversionRate) / 100;
    const realapexRevenue = realapexConversions * avgCommission;
    const annualMemoraAIRevenue = realapexRevenue * 12;

    // Savings and gains
    const additionalLeads = leadsLost;
    const additionalConversions = realapexConversions - currentConversions;
    const monthlyGain = realapexRevenue - currentRevenue;
    const annualGain = monthlyGain * 12;
    const timeSaved = 20; // hours per week
    const costSaved = timeSaved * 4 * 500; // 500 per hour * 4 weeks

    setResults({
      currentRevenue: annualCurrentRevenue,
      realapexRevenue: annualMemoraAIRevenue,
      additionalLeads: additionalLeads * 12, // Annual
      additionalConversions: additionalConversions * 12,
      annualGain,
      timeSaved,
      costSaved: costSaved * 12,
      roi: ((annualGain / 500000) * 100).toFixed(0) // Assuming 5L annual cost
    });
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) {
      return '₹0';
    }
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else {
      return `₹${Math.round(amount).toLocaleString('en-IN')}`;
    }
  };

  return (
    <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <Calculator className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Calculate Your ROI with MemoraAI
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            See exactly how much revenue you're losing and how much you can gain
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold mb-6">Your Current Situation</h3>
              
              <div className="space-y-6">
                {/* Leads per month */}
                <div>
                  <label className="block mb-2 font-semibold">Leads per Month</label>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={leads}
                    onChange={(e) => setLeads(parseInt(e.target.value))}
                    className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm mt-2">
                    <span>50</span>
                    <span className="font-bold text-2xl text-yellow-400">{leads}</span>
                    <span>500</span>
                  </div>
                </div>

                {/* Lead Leakage */}
                <div>
                  <label className="block mb-2 font-semibold">Lead Leakage (%)</label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={leakage}
                    onChange={(e) => setLeakage(parseInt(e.target.value))}
                    className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm mt-2">
                    <span>0%</span>
                    <span className="font-bold text-2xl text-red-400">{leakage}%</span>
                    <span>60%</span>
                  </div>
                </div>

                {/* Average Commission */}
                <div>
                  <label className="block mb-2 font-semibold">Average Commission per Sale</label>
                  <input
                    type="range"
                    min="10000"
                    max="200000"
                    step="10000"
                    value={avgCommission}
                    onChange={(e) => setAvgCommission(parseInt(e.target.value))}
                    className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm mt-2">
                    <span>₹10K</span>
                    <span className="font-bold text-2xl text-green-400">{formatCurrency(avgCommission)}</span>
                    <span>₹2L</span>
                  </div>
                </div>

                {/* Conversion Rate with MemoraAI */}
                <div>
                  <label className="block mb-2 font-semibold">Expected Conversion Rate with Automation</label>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    step="5"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(parseInt(e.target.value))}
                    className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm mt-2">
                    <span>20%</span>
                    <span className="font-bold text-2xl text-blue-400">{conversionRate}%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              {/* Current Loss */}
              <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-red-400">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">❌ Current Annual Loss</h3>
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="text-4xl font-bold text-red-400 mb-2">
                  {formatCurrency(results.annualGain)}
                </div>
                <p className="text-sm text-white/80">
                  You're losing {results.additionalLeads?.toFixed(0)} leads and {results.additionalConversions?.toFixed(0)} sales annually
                </p>
              </div>

              {/* With MemoraAI */}
              <div className="bg-green-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-green-400">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">✅ With MemoraAI - Annual Gain</h3>
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-4xl font-bold text-green-400 mb-2">
                  {formatCurrency(results.annualGain)}
                </div>
                <p className="text-sm text-white/80">
                  Capture all {results.additionalLeads?.toFixed(0)} leads + {results.additionalConversions?.toFixed(0)} more sales
                </p>
              </div>

              {/* Time Saved */}
              <div className="bg-purple-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-purple-400">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">⏰ Time & Cost Saved</h3>
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{results.timeSaved} hrs/week</div>
                    <div className="text-sm text-white/80">Manual Work Eliminated</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{formatCurrency(results.costSaved)}</div>
                    <div className="text-sm text-white/80">Operational Cost Saved</div>
                  </div>
                </div>
              </div>

              {/* ROI */}
              <div className="bg-yellow-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-yellow-400">
                <div className="text-center">
                  <div className="text-6xl font-bold text-yellow-400 mb-2">
                    {results.roi}X
                  </div>
                  <div className="text-xl font-semibold">Return on Investment</div>
                  <p className="text-sm text-white/80 mt-2">
                    MemoraAI pays for itself in less than 1 month!
                  </p>
                </div>
              </div>

              {/* CTA */}
              <a
                href="https://wa.me/919948303060?text=I calculated my ROI and want to start with MemoraAI!"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-xl text-center transition-all transform hover:scale-105 shadow-xl"
              >
                💬 Get Started on WhatsApp Now →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ROICalculator;
