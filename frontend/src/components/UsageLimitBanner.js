import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, X } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Usage Limit Banner - Shows when user attempts action exceeding plan limits
 * 
 * Usage:
 * const [limitError, setLimitError] = useState(null);
 * 
 * // In API call catch block:
 * if (error.response?.data?.detail?.code === 'LIMIT_EXCEEDED') {
 *   setLimitError(error.response.data.detail);
 * }
 * 
 * // In render:
 * {limitError && <UsageLimitBanner error={limitError} onDismiss={() => setLimitError(null)} />}
 */
const UsageLimitBanner = ({ error, onDismiss }) => {
  const navigate = useNavigate();

  if (!error || error.code !== 'LIMIT_EXCEEDED') return null;

  const getLimitTypeLabel = (type) => {
    const labels = {
      'projects': 'Projects',
      'users': 'Team Members',
      'properties': 'Properties',
      'leads_per_month': 'Monthly Leads',
      'sms_credits': 'SMS Credits',
      'email_credits': 'Email Credits'
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-semibold text-lg">Plan Limit Reached</h3>
          </div>
          <button 
            onClick={onDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">{error.message}</p>

          {/* Usage Stats */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{getLimitTypeLabel(error.limit_type)}</span>
              <span className="font-medium text-gray-900">
                {error.current_usage} / {error.limit}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
            <p className="text-xs text-red-600">100% of limit used</p>
          </div>

          {/* Benefits of upgrading */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Upgrade to unlock:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Higher limits for all resources
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                More SMS & Email credits
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Priority support
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={() => navigate(error.upgrade_url || '/billing')}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Inline Usage Warning Banner - Shows near-limit warnings
 */
export const UsageWarningBanner = ({ warningType, used, limit, percentage }) => {
  const navigate = useNavigate();

  if (percentage < 80) return null;

  const getLimitTypeLabel = (type) => {
    const labels = {
      'projects': 'projects',
      'users': 'team members',
      'properties': 'properties',
      'leads_per_month': 'leads this month',
      'sms_credits': 'SMS credits',
      'email_credits': 'email credits'
    };
    return labels[type] || type;
  };

  return (
    <div className={`rounded-lg p-3 flex items-center justify-between ${
      percentage >= 100 
        ? 'bg-red-50 border border-red-200' 
        : 'bg-amber-50 border border-amber-200'
    }`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className={`w-4 h-4 ${percentage >= 100 ? 'text-red-500' : 'text-amber-500'}`} />
        <span className={`text-sm ${percentage >= 100 ? 'text-red-700' : 'text-amber-700'}`}>
          {percentage >= 100 
            ? `You've reached your ${getLimitTypeLabel(warningType)} limit (${used}/${limit})`
            : `You're using ${percentage}% of your ${getLimitTypeLabel(warningType)} (${used}/${limit})`
          }
        </span>
      </div>
      <Button
        size="sm"
        variant={percentage >= 100 ? 'destructive' : 'outline'}
        onClick={() => navigate('/billing')}
        className="text-xs"
      >
        Upgrade
      </Button>
    </div>
  );
};

/**
 * Helper function to check if error is a limit exceeded error
 */
export const isLimitExceededError = (error) => {
  return error?.response?.data?.detail?.code === 'LIMIT_EXCEEDED' ||
         error?.detail?.code === 'LIMIT_EXCEEDED';
};

/**
 * Extract limit error details from API error
 */
export const extractLimitError = (error) => {
  if (error?.response?.data?.detail?.code === 'LIMIT_EXCEEDED') {
    return error.response.data.detail;
  }
  if (error?.detail?.code === 'LIMIT_EXCEEDED') {
    return error.detail;
  }
  return null;
};

export default UsageLimitBanner;
