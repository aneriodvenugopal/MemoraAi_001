/**
 * AuthenticatedLayout - Common layout wrapper for authenticated pages
 * Provides consistent header with user info, role, and logout across all pages
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LogOut, FileText, User, ChevronDown, 
  Settings, HelpCircle, Bell
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationCenter from './notifications/NotificationCenter';
import MemoraAILogo from './MemoraAILogo';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  tenant_admin: 'Tenant Admin',
  staff: 'Staff',
  customer: 'Customer',
  marketing_agent: 'Marketing Agent',
  project_manager: 'Project Manager'
};

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-800',
  tenant_admin: 'bg-blue-100 text-blue-800',
  staff: 'bg-green-100 text-green-800',
  customer: 'bg-orange-100 text-orange-800',
  marketing_agent: 'bg-cyan-100 text-cyan-800',
  project_manager: 'bg-indigo-100 text-indigo-800'
};

// Pages that have their own header (should not show the layout header)
const PAGES_WITH_OWN_HEADER = [
  '/dashboard',
  '/customer-dashboard',
  '/admin/saas-dashboard',
  '/admin/incomelands',
  '/admin/chats',
  '/marketing-agent-dashboard',
  '/project-manager-dashboard',
  '/projects/', // Project detail and layout editor pages have their own headers
  // All tenant pages inside BusinessAdminLayout / WithSidebar have their own sidebar+header
  '/own-business-gpt',
  '/memoraai-leads',
  '/memoraai-contacts',
  '/memoraai-broadcast',
  '/memoraai-automation',
  '/memoraai-appointments',
  '/memoraai-analytics',
  '/memoraai-logs',
  '/staff-members',
  '/team-inbox',
  '/waba-setup',
  '/business-rules',
  '/calendar-sync',
  '/chat-corrections',
  '/hot-sales-mode',
  '/content-library',
  '/templates',
  '/settings',
];

const AuthenticatedLayout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show header for certain pages that have their own
  const hasOwnHeader = PAGES_WITH_OWN_HEADER.some(path => location.pathname.startsWith(path));

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  const roleLabel = ROLE_LABELS[user?.role] || user?.role?.replace('_', ' ') || 'User';
  const roleColor = ROLE_COLORS[user?.role] || 'bg-gray-100 text-gray-800';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // If page has its own header, just render children
  if (hasOwnHeader) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left side - Logo */}
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              data-testid="header-logo"
            >
              <MemoraAILogo size="xs" showCaption={false} showBrand={true} />
            </button>

            {/* Right side - User Info & Actions */}
            <div className="flex items-center gap-2">
              {/* Notification Center */}
              <NotificationCenter />

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 py-1.5 h-auto" data-testid="user-menu-trigger">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-900 leading-tight">{user?.name || 'User'}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleColor}`}>
                        {roleLabel}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.name}</span>
                      <span className="text-xs text-gray-500">{user?.email || user?.phone}</span>
                      <span className={`text-xs mt-1 px-2 py-0.5 rounded-full w-fit ${roleColor}`}>
                        {roleLabel}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="menu-dashboard">
                    <FileText className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="text-red-600 focus:text-red-600"
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Logout Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="md:hidden text-gray-600 hover:text-red-600 px-2"
                data-testid="mobile-logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main>
        {children}
      </main>
    </div>
  );
};

export default AuthenticatedLayout;
