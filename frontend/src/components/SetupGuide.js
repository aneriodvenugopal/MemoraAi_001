import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  CheckCircle2, 
  Circle, 
  Building2, 
  MapPin, 
  Users, 
  CreditCard,
  Settings,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SetupGuide = ({ onDismiss }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [setupStatus, setSetupStatus] = useState({
    profile: false,
    project: false,
    layout: false,
    team: false,
    payment: false
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkSetupStatus();
    
    // Check if user dismissed the guide
    const isDismissed = localStorage.getItem(`setup_guide_dismissed_${user?.id}`);
    if (isDismissed) {
      setDismissed(true);
    }
  }, [user?.id]);

  const checkSetupStatus = async () => {
    try {
      // Check projects
      const projectsRes = await fetch(`${API_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const projectsData = await projectsRes.json();
      const hasProjects = (projectsData.projects?.length || 0) > 0;

      // Check team members
      const usersRes = await fetch(`${API_URL}/api/users/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      const hasTeam = (usersData.users?.length || 0) > 1;

      // Check tenant settings
      const tenantRes = await fetch(`${API_URL}/api/tenants/my-tenant`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tenantData = await tenantRes.json();
      const hasProfile = !!(tenantData.company_name && tenantData.email);
      const hasPayment = tenantData.settings?.payu_enabled || tenantData.settings?.stripe_enabled;

      setSetupStatus({
        profile: hasProfile,
        project: hasProjects,
        layout: hasProjects, // If has project, assume layout done
        team: hasTeam,
        payment: hasPayment
      });
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(`setup_guide_dismissed_${user?.id}`, 'true');
    setDismissed(true);
    onDismiss?.();
  };

  const completedSteps = Object.values(setupStatus).filter(Boolean).length;
  const totalSteps = Object.keys(setupStatus).length;
  const progress = (completedSteps / totalSteps) * 100;

  if (dismissed || loading) return null;
  if (progress === 100) return null; // All done!

  const steps = [
    {
      key: 'profile',
      title: 'Complete Company Profile',
      description: 'Add your company details, logo, and contact info',
      icon: Building2,
      action: () => navigate('/settings'),
      buttonText: 'Go to Settings'
    },
    {
      key: 'project',
      title: 'Create Your First Project',
      description: 'Add a project/layout to start managing properties',
      icon: MapPin,
      action: () => navigate('/projects'),
      buttonText: 'Add Project'
    },
    {
      key: 'layout',
      title: 'Design Your Layout',
      description: 'Create plots/units using the layout designer tool',
      icon: Sparkles,
      action: () => navigate('/projects'),
      buttonText: 'Design Layout'
    },
    {
      key: 'team',
      title: 'Add Team Members',
      description: 'Invite sales executives and staff to collaborate',
      icon: Users,
      action: () => navigate('/staff'),
      buttonText: 'Add Team'
    },
    {
      key: 'payment',
      title: 'Setup Payment Gateway',
      description: 'Enable PayU/Stripe to collect payments online',
      icon: CreditCard,
      action: () => navigate('/settings'),
      buttonText: 'Configure Payments'
    }
  ];

  return (
    <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50" data-testid="setup-guide">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Welcome! Let's get you started 🚀</CardTitle>
              <p className="text-sm text-gray-600">Complete these steps to set up your account</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Setup Progress</span>
            <span className="text-sm font-medium text-blue-600">{completedSteps}/{totalSteps} completed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = setupStatus[step.key];
            
            return (
              <div 
                key={step.key}
                className={`p-4 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                    {!isCompleted && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto mt-2 text-blue-600"
                        onClick={step.action}
                      >
                        {step.buttonText} <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupGuide;
