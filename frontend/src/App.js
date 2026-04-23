import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import "./App.css";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import AuthCallback from "./components/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectLayoutPage from "./pages/ProjectLayoutPage";
import ProjectLayoutEditor from "./pages/ProjectLayoutEditor";
import LayoutCreatorTool from "./pages/LayoutCreatorTool";
import LayoutCreatorToolStandalone from "./pages/LayoutCreatorToolStandalone";
import HybridLayoutCreator from "./pages/HybridLayoutCreator";
import LayoutsLibrary from "./pages/LayoutsLibrary";
import AdvancedLayoutViewer from "./pages/AdvancedLayoutViewer";
import LayoutEditor from "./pages/LayoutEditor";
import PublicLayoutView from "./pages/PublicLayoutView";
import EnhancedLayoutEditor from "./pages/EnhancedLayoutEditor";
import Leads from "./pages/Leads";
import CalendarPage from "./pages/CalendarPage";
import Bookings from "./pages/Bookings";
import AIAgentsHub from "./pages/AIAgentsHub";
import AIAgents from "./pages/AIAgents";
import Financials from "./pages/Financials";
import SMSManagement from "./pages/SMSManagement";
import Reports from "./pages/Reports";
import UsersManagement from "./pages/UsersManagement";
import CustomerDashboard from "./pages/CustomerDashboard";
import ProjectManagerDashboard from "./pages/ProjectManagerDashboard";
import MarketingAgentDashboard from "./pages/MarketingAgentDashboard";
import ShareRewards from "./pages/ShareRewards";
import ResaleRequests from "./pages/ResaleRequests";
import PrivateRoute from "./components/PrivateRoute";

// PWA Pages
import PWALogin from "./pages/pwa/PWALogin";
import PWADashboard from "./pages/pwa/PWADashboard";
import PWANotifications from "./pages/pwa/PWANotifications";

// Marketing Pages
import Home from "./pages/marketing/Home";
import Pricing from "./pages/marketing/Pricing";
import About from "./pages/marketing/About";
import Features from "./pages/marketing/Features";
import Contact from "./pages/marketing/Contact";
import TestimonialDetail from "./pages/marketing/TestimonialDetail";
import LandingPage from "./pages/LandingPage";
import TenantPublicPage from "./pages/TenantPublicPage";
import ProjectPublicPage from "./pages/ProjectPublicPage";

// Content Pages
import ContentLibrary from "./pages/content/ContentLibrary";
import ArticleDetail from "./pages/content/ArticleDetail";

// Advisory Pages
import AdvisoryHub from "./pages/advisory/AdvisoryHub";
import AdvisoryChat from "./pages/advisory/AdvisoryChat";

// Admin Pages
import ContentManagement from "./pages/admin/ContentManagement";
import ResaleManagement from "./pages/admin/ResaleManagement";
import EnhancedSaaSDashboard from "./pages/admin/EnhancedSaaSDashboard";
import ArticleManagement from "./pages/admin/ArticleManagement";
import PackageManagement from "./pages/admin/PackageManagement";
import TenantManagement from "./pages/admin/TenantManagement";
import TenantModuleManagement from "./pages/admin/TenantModuleManagement";
import ChatManagement from "./pages/admin/ChatManagement";
import IncomeLandsAdminDashboard from "./pages/admin/IncomeLandsAdminDashboard";
import AgentApexAdminDashboard from "./pages/admin/AgentApexAdminDashboard";
import MasterCategoryManagement from "./pages/admin/MasterCategoryManagement";
import TenantCategoryManagement from "./pages/admin/TenantCategoryManagement";
import TutorAIAdmin from "./pages/TutorAIAdmin";
import MemoraAIDemos from "./pages/RealApexDemos";
import WhatsAppSimulator from "./pages/WhatsAppSimulator";
import WhatsAppCRM from "./pages/WhatsAppCRM";

// Settings Pages
import RoleAssignments from "./pages/settings/RoleAssignments";
import MasterCategories from "./pages/settings/MasterCategories";
import MasterSubcategories from "./pages/settings/MasterSubcategories";
import TenantCategories from "./pages/settings/TenantCategories";
import TenantSubcategories from "./pages/settings/TenantSubcategories";
import BankAccountsSettings from "./pages/settings/BankAccountsSettings";

// Public Landing Pages
import TenantLandingPage from "./pages/public/TenantLandingPage";
import ProjectLandingPage from "./pages/public/ProjectLandingPage";
import TenantsDirectory from "./pages/public/TenantsDirectory";

// Mobile App
import IncomeLandsApp from "./pages/mobile/IncomeLandsApp";

// NEW: Incomelands 2.0 App (from GitHub repo)
import IncomelandsAppNew from "./incomelands/IncomelandsApp";

// AgentApex Mobile Property App
import AgentApexApp from "./agentapex/AgentApexApp";

// Workforce Map
import WorkforceMap from "./pages/WorkforceMap";
import WorkforceManagement from "./pages/WorkforceManagement";

// Policy Pages
import PrivacyPolicy from "./pages/policies/PrivacyPolicy";
import TermsConditions from "./pages/policies/TermsConditions";
import RefundPolicy from "./pages/policies/RefundPolicy";
import ShippingPolicy from "./pages/policies/ShippingPolicy";
import FAQRealEstate from "./pages/FAQRealEstate";

// Solution Pages
import CRMSolution from "./pages/solutions/CRMSolution";
import PaymentsSolution from "./pages/solutions/PaymentsSolution";
import PropertyLayoutsSolution from "./pages/solutions/PropertyLayoutsSolution";
import AnalyticsSolution from "./pages/solutions/AnalyticsSolution";
import CommunicationSolution from "./pages/solutions/CommunicationSolution";
import ResaleSolution from "./pages/solutions/ResaleSolution";
import MultiProjectManagement from "./pages/solutions/MultiProjectManagement";

// Example Pages
import LeadLeakageExample from "./pages/examples/LeadLeakageExample";
import SlowProcessesExample from "./pages/examples/SlowProcessesExample";
import RevenueLossExample from "./pages/examples/RevenueLossExample";

// Demo Pages
import CRMDemo from "./pages/demos/CRMDemo";

// Payment & Commission Pages
import CustomerPayments from "./pages/payments/CustomerPayments";
import BankAccounts from "./pages/banking/BankAccounts";
import VendorsManagement from "./pages/vendors/VendorsManagement";
import VendorBills from "./pages/vendors/VendorBills";
import PaymentTransfer from "./pages/vendors/PaymentTransfer";
import CommissionDashboard from "./pages/commissions/CommissionDashboard";
import PaymentSchemes from "./pages/schemes/PaymentSchemes";
import StaffHierarchy from "./pages/staff/StaffHierarchy";
import AgentPayouts from "./pages/payouts/AgentPayouts";

// Document & Greetings Pages
import DocumentLocker from "./pages/DocumentLocker";
import FestivalGreetings from "./pages/FestivalGreetings";
import SiteVisits from "./pages/SiteVisits";
import BookingQueue from "./pages/BookingQueue";
import CustomersManagement from "./pages/CustomersManagement";
import ResaleReleaseManagement from "./pages/ResaleReleaseManagement";
import EMIPaymentManagement from "./pages/EMIPaymentManagement";
import VendorManagement from "./pages/VendorManagement";
import ReferralWalletManagement from "./pages/ReferralWalletManagement";
import ComplaintManagement from "./pages/ComplaintManagement";
import PaymentsDashboard from "./pages/PaymentsDashboard";
import CommissionAnalyticsDashboard from "./pages/CommissionAnalyticsDashboard";

// Stripe Payment Pages
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import StripePayments from "./pages/StripePayments";

// Email Management
import EmailManagement from "./pages/EmailManagement";

// Billing & Subscriptions
import Billing from "./pages/Billing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";

// Certified Property
import CertifiedPropertyPage from "./pages/CertifiedPropertyPage";
import BlockLocationEditor from "./pages/BlockLocationEditor";
import PropertyCertifiedSettings from "./pages/PropertyCertifiedSettings";

// Customer Portal
import CustomerPortal from "./pages/CustomerPortal";

// Project Pricing Settings
import ProjectPricingSettings from "./pages/ProjectPricingSettings";

// Voters List
import VotersList from "./pages/VotersList";
import VotersImport from "./pages/VotersImport";
import VotersListImport from "./pages/VotersListImport";

// Marketing Agents Management
import MarketingAgentsManagement from "./pages/MarketingAgentsManagement";
import VotersAdmin from "./pages/VotersAdmin";
import VotersBulkUpdate from "./pages/VotersBulkUpdate";

// Settings Page
import SettingsPage from "./pages/SettingsPage";

// MemoraAI Pages
import CategorySetup from "./pages/CategorySetup";
import HotSalesMode from "./pages/HotSalesMode";
import WABASetup from "./pages/WABASetup";
import AppointmentsManager from "./pages/AppointmentsManager";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import TemplateWorkflow from "./pages/TemplateWorkflow";

// SEO Articles
import ArticlesListing from "./pages/ArticlesListing";
import SEOArticle from "./pages/SEOArticle";

// PWA Components
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import AvatarAssistant from "./components/AvatarAssistant";
import PropertyChatbot from "./components/PropertyChatbot";

// Custom Hooks
import useScrollToTop from "./hooks/useScrollToTop";

// Scroll to top component wrapper
function ScrollToTop() {
  useScrollToTop();
  return null;
}

// Conditional Assistant Renderer
function ConditionalAssistant() {
  const location = useLocation();
  
  // Hide chatbot completely on AgentApex app routes
  if (location.pathname.startsWith('/agentapex')) {
    return null;
  }
  
  // Check if on tenant or project detail pages
  const isTenantOrProjectPage = 
    location.pathname.startsWith('/public/tenant/') || 
    location.pathname.startsWith('/public/project/');
  
  // Show Property Chatbot on tenant/project pages, MemoraAI Assistant on ALL other pages (including homepage)
  if (isTenantOrProjectPage) {
    return <PropertyChatbot />;
  } else {
    return <AvatarAssistant />;
  }
}

function App() {
  return (
    <HelmetProvider>
    <AuthProvider>
      <CurrencyProvider>
        <LanguageProvider>
          <div className="App">
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* SaaS Landing Page - Public */}
                <Route path="/saas" element={<LandingPage />} />
                
                {/* Tenant Public Page - Custom branded pages */}
                <Route path="/t/:tenantId" element={<TenantPublicPage />} />
                <Route path="/p/:projectId" element={<ProjectPublicPage />} />
                
                {/* Marketing Routes - Public */}
                <Route path="/" element={<Home />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<About />} />
                <Route path="/features" element={<Features />} />
                <Route path="/testimonials/:id" element={<TestimonialDetail />} />
                <Route path="/contact" element={<Contact />} />
                
                {/* Content Routes - Public */}
                <Route path="/content" element={<ContentLibrary />} />
                <Route path="/content/:slug" element={<ArticleDetail />} />
                <Route path="/learn" element={<ContentLibrary />} />
                
                {/* SEO Articles - Public */}
                <Route path="/articles" element={<ArticlesListing />} />
                <Route path="/articles/:slug" element={<SEOArticle />} />
                
                {/* Advisory Routes - Public */}
                <Route path="/advisory" element={<AdvisoryHub />} />
                <Route path="/advisory/:category" element={<AdvisoryChat />} />
                
                {/* Policy Routes - Public */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-conditions" element={<TermsConditions />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/faq" element={<FAQRealEstate />} />
                
                {/* Certified Property - Public */}
                <Route path="/property/:propertyId/certified" element={<CertifiedPropertyPage />} />
                
                {/* Customer Self-Service Portal - Public */}
                <Route path="/customer-portal" element={<CustomerPortal />} />
                <Route path="/my-property" element={<CustomerPortal />} />
                
                {/* Voters List - Public with password */}
                <Route path="/voters-list" element={<VotersList />} />
                <Route path="/voterslist" element={<VotersList />} />
                <Route path="/voterslist/:village" element={<VotersList />} />
                <Route path="/voterslist/:village/ward/:wardNo" element={<VotersList />} />
                <Route path="/voters-import" element={<VotersImport />} />
                <Route path="/voterslist-import" element={<VotersListImport />} />
                <Route path="/voters-admin" element={<VotersAdmin />} />
                <Route path="/voters-bulk-update" element={<VotersBulkUpdate />} />
                
                {/* Solution Routes - Public */}
                <Route path="/solutions/crm" element={<CRMSolution />} />
                <Route path="/solutions/multi-project-management" element={<MultiProjectManagement />} />
                <Route path="/solutions/payments" element={<PaymentsSolution />} />
                <Route path="/solutions/property-layouts" element={<PropertyLayoutsSolution />} />
                <Route path="/solutions/analytics" element={<AnalyticsSolution />} />
                <Route path="/solutions/communication" element={<CommunicationSolution />} />
                <Route path="/solutions/resale" element={<ResaleSolution />} />
                
                {/* Example Routes - Public */}
                <Route path="/examples/lead-leakage" element={<LeadLeakageExample />} />
                <Route path="/examples/slow-processes" element={<SlowProcessesExample />} />
                <Route path="/examples/revenue-loss" element={<RevenueLossExample />} />
                
                {/* Demo Routes - Public */}
                <Route path="/demo/solutions/crm" element={<CRMDemo />} />
                <Route path="/demo/solutions/payments" element={<CRMDemo />} />
                <Route path="/demo/solutions/analytics" element={<CRMDemo />} />
                <Route path="/demo/solutions/property-layouts" element={<CRMDemo />} />
                <Route path="/demo/solutions/communication" element={<CRMDemo />} />
                <Route path="/demo/solutions/resale" element={<CRMDemo />} />
                
                {/* Public Landing Pages */}
                <Route path="/tenants" element={<TenantsDirectory />} />
                <Route path="/public/tenant/:tenantId" element={<TenantLandingPage />} />
                <Route path="/public/project/:projectId" element={<ProjectLandingPage />} />
                
                {/* IncomeLands Mobile App (OLD) */}
                <Route path="/incomelands" element={<IncomeLandsApp />} />
                
                {/* IncomeLands App 2.0 (NEW - from GitHub) */}
                <Route path="/incomelandsapp/*" element={<IncomelandsAppNew />} />
                
                {/* AgentApex Mobile Property App */}
                <Route path="/agentapex/*" element={<AgentApexApp />} />
                
                {/* Workforce Map - Public */}
                <Route path="/workforce-map" element={<WorkforceMap />} />
                
                {/* Admin Routes - Protected */}
                <Route 
                  path="/admin/content" 
                  element={
                    <PrivateRoute>
                      <ContentManagement />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/admin/resale" 
                  element={
                    <PrivateRoute>
                      <ResaleManagement />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/block-locations" 
                  element={
                    <PrivateRoute>
                      <BlockLocationEditor />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/property/:propertyId/settings" 
                  element={
                    <PrivateRoute>
                      <PropertyCertifiedSettings />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/resale" 
                  element={
                    <PrivateRoute>
                      <ResaleRequests />
                    </PrivateRoute>
                  } 
                />
                
                {/* PWA Routes */}
                <Route path="/pwa/login" element={<PWALogin />} />
                <Route path="/pwa/dashboard" element={<PWADashboard />} />
                <Route path="/pwa/notifications" element={<PWANotifications />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <PrivateRoute>
                    <Projects />
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects/:projectId"
                element={
                  <PrivateRoute>
                    <ProjectDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects/:projectId/layout"
                element={
                  <PrivateRoute>
                    <ProjectLayoutPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects/:projectId/layout/edit"
                element={
                  <PrivateRoute>
                    <ProjectLayoutEditor />
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects/:projectId/pricing"
                element={
                  <PrivateRoute>
                    <ProjectPricingSettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/public/layout/:projectId"
                element={<PublicLayoutView />}
              />
              <Route
                path="/public/projects/:projectId/layout"
                element={<PublicLayoutView />}
              />
              <Route
                path="/public/layout-view/:layoutId"
                element={<PublicLayoutView />}
              />
              <Route
                path="/article/:slug"
                element={<ArticleDetail />}
              />
              <Route
                path="/content/:slug"
                element={<ArticleDetail />}
              />
              <Route
                path="/leads"
                element={
                  <PrivateRoute>
                    <Leads />
                  </PrivateRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <PrivateRoute>
                    <CalendarPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <PrivateRoute>
                    <Bookings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/financials"
                element={
                  <PrivateRoute>
                    <Financials />
                  </PrivateRoute>
                }
              />
              <Route
                path="/ai-agents"
                element={
                  <PrivateRoute>
                    <AIAgents />
                  </PrivateRoute>
                }
              />
              <Route
                path="/ai-agents-docs"
                element={
                  <PrivateRoute>
                    <AIAgentsHub />
                  </PrivateRoute>
                }
              />
              <Route
                path="/sms"
                element={
                  <PrivateRoute>
                    <SMSManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <PrivateRoute>
                    <CustomerPayments />
                  </PrivateRoute>
                }
              />
              <Route
                path="/bank-accounts"
                element={
                  <PrivateRoute>
                    <BankAccounts />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vendors"
                element={
                  <PrivateRoute>
                    <VendorsManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vendors/payment-transfer"
                element={
                  <PrivateRoute>
                    <PaymentTransfer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vendors/bills"
                element={
                  <PrivateRoute>
                    <VendorBills />
                  </PrivateRoute>
                }
              />
              <Route
                path="/document-locker"
                element={
                  <PrivateRoute>
                    <DocumentLocker />
                  </PrivateRoute>
                }
              />
              <Route
                path="/festival-greetings"
                element={
                  <PrivateRoute>
                    <FestivalGreetings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/site-visits"
                element={
                  <PrivateRoute>
                    <SiteVisits />
                  </PrivateRoute>
                }
              />
              <Route
                path="/booking-queue"
                element={
                  <PrivateRoute>
                    <BookingQueue />
                  </PrivateRoute>
                }
              />
              <Route
                path="/customers-management"
                element={
                  <PrivateRoute>
                    <CustomersManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/resale-release"
                element={
                  <PrivateRoute>
                    <ResaleReleaseManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/emi-payments"
                element={
                  <PrivateRoute>
                    <EMIPaymentManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vendor-management"
                element={
                  <PrivateRoute>
                    <VendorManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/referral-wallet"
                element={
                  <PrivateRoute>
                    <ReferralWalletManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/complaints"
                element={
                  <PrivateRoute>
                    <ComplaintManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/payments-dashboard"
                element={
                  <PrivateRoute>
                    <PaymentsDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/commission-analytics"
                element={
                  <PrivateRoute>
                    <CommissionAnalyticsDashboard />
                  </PrivateRoute>
                }
              />
              {/* Stripe Payment Routes */}
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancelled" element={<PaymentCancelled />} />
              <Route
                path="/stripe-payments"
                element={
                  <PrivateRoute>
                    <StripePayments />
                  </PrivateRoute>
                }
              />
              <Route
                path="/email-management"
                element={
                  <PrivateRoute>
                    <EmailManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <PrivateRoute>
                    <Billing />
                  </PrivateRoute>
                }
              />
              <Route
                path="/subscription-success"
                element={
                  <PrivateRoute>
                    <SubscriptionSuccess />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vendor-bills"
                element={
                  <PrivateRoute>
                    <VendorBills />
                  </PrivateRoute>
                }
              />
              <Route
                path="/payment-transfer"
                element={
                  <PrivateRoute>
                    <PaymentTransfer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/commissions"
                element={
                  <PrivateRoute>
                    <CommissionDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/marketing-agents"
                element={
                  <PrivateRoute>
                    <MarketingAgentsManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/schemes"
                element={
                  <PrivateRoute>
                    <PaymentSchemes />
                  </PrivateRoute>
                }
              />
              <Route
                path="/staff-hierarchy"
                element={
                  <PrivateRoute>
                    <StaffHierarchy />
                  </PrivateRoute>
                }
              />
              <Route
                path="/payouts"
                element={
                  <PrivateRoute>
                    <AgentPayouts />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <PrivateRoute>
                    <Reports />
                  </PrivateRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <PrivateRoute>
                    <UsersManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/customer-dashboard"
                element={
                  <PrivateRoute>
                    <CustomerDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/project-manager-dashboard"
                element={
                  <PrivateRoute>
                    <ProjectManagerDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/marketing-agent-dashboard"
                element={
                  <PrivateRoute>
                    <MarketingAgentDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/share-rewards"
                element={
                  <PrivateRoute>
                    <ShareRewards />
                  </PrivateRoute>
                }
              />
              {/* 
                REMOVED: Standalone Layouts Library
                Layouts are now created ONLY from Projects
                Users should access layouts via: /projects/:projectId/layout/edit
              */}
              {/* Redirect old /layouts routes to projects page */}
              <Route
                path="/layouts"
                element={<Navigate to="/projects" replace />}
              />
              <Route
                path="/layouts/create"
                element={<Navigate to="/projects" replace />}
              />
              <Route
                path="/layouts/create-manual"
                element={<Navigate to="/projects" replace />}
              />
              {/* Keep view routes for backwards compatibility with shared links */}
              <Route
                path="/layouts/:layoutId/view"
                element={
                  <PrivateRoute>
                    <AdvancedLayoutViewer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/layouts/:layoutId/edit"
                element={
                  <PrivateRoute>
                    <LayoutEditor />
                  </PrivateRoute>
                }
              />
              {/* DEPRECATED: Old standalone layout editor - Use ProjectLayoutEditor instead */}
              <Route
                path="/layout-editor/:layoutId"
                element={
                  <PrivateRoute>
                    <LayoutEditor />
                  </PrivateRoute>
                }
              />
              <Route
                path="/layouts/enhanced/:layoutId"
                element={
                  <PrivateRoute>
                    <EnhancedLayoutEditor />
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects/:projectId/layout/create"
                element={
                  <PrivateRoute>
                    <LayoutCreatorTool />
                  </PrivateRoute>
                }
              />
              
              {/* SaaS Admin Routes */}
              <Route
                path="/admin/saas-dashboard"
                element={
                  <PrivateRoute>
                    <EnhancedSaaSDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/packages"
                element={
                  <PrivateRoute>
                    <PackageManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/articles"
                element={
                  <PrivateRoute>
                    <ArticleManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/tenants"
                element={
                  <PrivateRoute>
                    <TenantManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/tenants/:tenantId/modules"
                element={
                  <PrivateRoute>
                    <TenantModuleManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/chats"
                element={
                  <PrivateRoute>
                    <ChatManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/master-categories"
                element={
                  <PrivateRoute>
                    <MasterCategoryManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/categories"
                element={
                  <PrivateRoute>
                    <TenantCategoryManagement />
                  </PrivateRoute>
                }
              />
              
              {/* Main Settings Page */}
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <SettingsPage />
                  </PrivateRoute>
                }
              />
              
              {/* TutorAI Admin - Protected Admin Route */}
              <Route
                path="/tutorai/admin"
                element={
                  <PrivateRoute>
                    <TutorAIAdmin />
                  </PrivateRoute>
                }
              />
              
              <Route
                path="/realapex-demos"
                element={
                  <PrivateRoute>
                    <MemoraAIDemos />
                  </PrivateRoute>
                }
              />
              
              {/* Settings Routes */}
              <Route
                path="/settings/role-assignments"
                element={
                  <PrivateRoute>
                    <RoleAssignments />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/master-categories"
                element={
                  <PrivateRoute>
                    <MasterCategories />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/master-subcategories"
                element={
                  <PrivateRoute>
                    <MasterSubcategories />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/tenant-categories"
                element={
                  <PrivateRoute>
                    <TenantCategories />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/tenant-subcategories"
                element={
                  <PrivateRoute>
                    <TenantSubcategories />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/bank-accounts"
                element={
                  <PrivateRoute>
                    <BankAccountsSettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings/system-roles"
                element={
                  <PrivateRoute>
                    <MasterCategories />
                  </PrivateRoute>
                }
              />
              
              <Route
                path="/admin/incomelands"
                element={
                  <PrivateRoute>
                    <IncomeLandsAdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/agentapex"
                element={
                  <PrivateRoute>
                    <AgentApexAdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/workforce"
                element={
                  <PrivateRoute>
                    <WorkforceManagement />
                  </PrivateRoute>
                }
              />
              
              {/* WhatsApp AI Simulator - Test all 7 agents */}
              <Route
                path="/whatsapp-simulator"
                element={
                  <PrivateRoute>
                    <WhatsAppSimulator />
                  </PrivateRoute>
                }
              />
              
              {/* WhatsApp CRM Dashboard */}
              <Route
                path="/whatsapp-crm"
                element={
                  <PrivateRoute>
                    <WhatsAppCRM />
                  </PrivateRoute>
                }
              />

              {/* MemoraAI Routes */}
              <Route
                path="/category-setup"
                element={
                  <PrivateRoute>
                    <CategorySetup />
                  </PrivateRoute>
                }
              />
              <Route
                path="/hot-sales"
                element={
                  <PrivateRoute>
                    <HotSalesMode />
                  </PrivateRoute>
                }
              />
              <Route
                path="/waba-setup"
                element={
                  <PrivateRoute>
                    <WABASetup />
                  </PrivateRoute>
                }
              />
              <Route
                path="/memoraai-appointments"
                element={
                  <PrivateRoute>
                    <AppointmentsManager />
                  </PrivateRoute>
                }
              />
              <Route
                path="/memoraai-analytics"
                element={
                  <PrivateRoute>
                    <AnalyticsDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/memoraai-templates"
                element={
                  <PrivateRoute>
                    <TemplateWorkflow />
                  </PrivateRoute>
                }
              />
            </Routes>
            <ConditionalAssistant />
          </BrowserRouter>
          <Toaster position="top-right" richColors />
          <PWAInstallPrompt />
        </div>
        </LanguageProvider>
      </CurrencyProvider>
    </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
