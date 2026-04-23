import apiInstance from './api';

// Export api for direct use in admin pages
export const api = apiInstance;

export const authService = {
  // Send OTP to phone
  sendOTP: async (phone) => {
    const response = await apiInstance.post('/auth/send-otp', { phone });
    return response.data;
  },

  // Verify OTP and login
  verifyOTP: async (phone, otp) => {
    const response = await apiInstance.post('/auth/verify-otp', { phone, otp });
    return response.data;
  },

  // Login with password (NEW)
  loginWithPassword: async (credentials) => {
    const response = await apiInstance.post('/auth/login', credentials);
    return response.data;
  },

  // Register new user
  register: async (userData) => {
    const response = await apiInstance.post('/auth/register', userData);
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiInstance.get('/auth/me');
    return response.data;
  },

  // Get all roles
  getRoles: async () => {
    const response = await apiInstance.get('/auth/roles');
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};

export const currencyService = {
  // Get all currencies
  getAll: async () => {
    const response = await apiInstance.get('/currencies/');
    return response.data;
  },

  // Convert currency
  convert: async (amount, from, to) => {
    const response = await apiInstance.get('/currencies/convert', {
      params: { amount, from_currency: from, to_currency: to },
    });
    return response.data;
  },
};

export const categoryService = {
  // Get categories
  getAll: async (type, tenantId, projectId) => {
    const response = await apiInstance.get('/categories/', {
      params: { type, tenant_id: tenantId, project_id: projectId },
    });
    return response.data;
  },

  // Create category
  create: async (categoryData) => {
    const response = await apiInstance.post('/categories/', categoryData);
    return response.data;
  },

  // Dump master categories to project
  dumpToProject: async (projectId, categoryIds = null) => {
    const response = await apiInstance.post(`/categories/dump-to-project/${projectId}`, {
      category_ids: categoryIds,
    });
    return response.data;
  },

  // Get project categories
  getProjectCategories: async (projectId) => {
    const response = await apiInstance.get(`/categories/project/${projectId}`);
    return response.data;
  },

  // Get custom fields for project
  getCustomFields: async (projectId, appliesTo = null) => {
    const response = await apiInstance.get(`/categories/custom-fields/project/${projectId}`, {
      params: { applies_to: appliesTo },
    });
    return response.data;
  },

  // Create custom field
  createCustomField: async (fieldData) => {
    const response = await apiInstance.post('/categories/custom-fields', fieldData);
    return response.data;
  },
};

export const tenantService = {
  // Get all tenants
  getAll: async () => {
    const response = await apiInstance.get('/tenants/');
    return response.data;
  },

  // Get tenant by ID
  getById: async (id) => {
    const response = await apiInstance.get(`/tenants/${id}`);
    return response.data;
  },

  // Create tenant
  create: async (tenantData) => {
    const response = await apiInstance.post('/tenants/', tenantData);
    return response.data;
  },

  // Get packages
  getPackages: async () => {
    const response = await apiInstance.get('/tenants/packages/');
    return response.data;
  },
};

export const projectService = {
  // Get all projects
  getAll: async (tenantId, status) => {
    const response = await apiInstance.get('/projects/', {
      params: { tenant_id: tenantId, status },
    });
    return response.data;
  },

  // Get project by ID
  getById: async (id) => {
    const response = await apiInstance.get(`/projects/${id}`);
    return response.data;
  },

  // Get project stats
  getStats: async (id) => {
    const response = await apiInstance.get(`/projects/${id}/stats`);
    return response.data;
  },

  // Create project
  create: async (projectData) => {
    const response = await apiInstance.post('/projects/', projectData);
    return response.data;
  },

  // Update project
  update: async (id, projectData) => {
    const response = await apiInstance.put(`/projects/${id}`, projectData);
    return response.data;
  },

  // Delete project
  delete: async (id) => {
    const response = await apiInstance.delete(`/projects/${id}`);
    return response.data;
  },
};

export const propertyService = {
  // Get all properties
  getAll: async (projectId, statusId, propertyTypeId) => {
    const response = await apiInstance.get('/properties/', {
      params: {
        project_id: projectId,
        status_id: statusId,
        property_type_id: propertyTypeId,
      },
    });
    return response.data;
  },

  // Get property by ID
  getById: async (id) => {
    const response = await apiInstance.get(`/properties/${id}`);
    return response.data;
  },

  // Create property
  create: async (propertyData) => {
    const response = await apiInstance.post('/properties/', propertyData);
    return response.data;
  },

  // Update property
  update: async (id, propertyData) => {
    const response = await apiInstance.put(`/properties/${id}`, propertyData);
    return response.data;
  },

  // Block property
  block: async (propertyId, userId, durationHours = 24) => {
    const response = await apiInstance.post('/properties/block', {
      property_id: propertyId,
      user_id: userId,
      duration_hours: durationHours,
    });
    return response.data;
  },

  // Book property
  book: async (propertyId, customerId) => {
    const response = await apiInstance.post('/properties/book', {
      property_id: propertyId,
      customer_id: customerId,
    });
    return response.data;
  },

  // Delete property
  delete: async (id) => {
    const response = await apiInstance.delete(`/properties/${id}`);
    return response.data;
  },
};

export const leadService = {
  // Get all leads
  getAll: async (params = {}) => {
    const response = await apiInstance.get('/leads/', { params });
    return response.data;
  },

  // Get lead by ID
  getById: async (id) => {
    const response = await apiInstance.get(`/leads/${id}`);
    return response.data;
  },

  // Get lead details (with relations)
  getDetails: async (id) => {
    const response = await apiInstance.get(`/leads/${id}/details`);
    return response.data;
  },

  // Create lead
  create: async (leadData) => {
    const response = await apiInstance.post('/leads/', leadData);
    return response.data;
  },

  // Update lead
  update: async (id, leadData) => {
    const response = await apiInstance.put(`/leads/${id}`, leadData);
    return response.data;
  },

  // Delete lead
  delete: async (id) => {
    const response = await apiInstance.delete(`/leads/${id}`);
    return response.data;
  },

  // Get lead follow-ups
  getFollowups: async (leadId) => {
    const response = await apiInstance.get(`/leads/${leadId}/followups`);
    return response.data;
  },

  // Create follow-up
  createFollowup: async (followupData) => {
    const response = await apiInstance.post('/leads/followups', followupData);
    return response.data;
  },

  // Convert lead to customer
  convert: async (leadId, customerData) => {
    const response = await apiInstance.post('/leads/convert', {
      lead_id: leadId,
      ...customerData,
    });
    return response.data;
  },

  // Get lead stats
  getStats: async (tenantId, projectId) => {
    const response = await apiInstance.get('/leads/stats/summary', {
      params: { tenant_id: tenantId, project_id: projectId },
    });
    return response.data;
  },
};

export const bookingService = {
  // Get all bookings
  getAll: async (params = {}) => {
    const response = await apiInstance.get('/bookings/', { params });
    return response.data;
  },

  // Get booking by ID
  getById: async (id) => {
    const response = await apiInstance.get(`/bookings/${id}`);
    return response.data;
  },

  // Get booking details (with payments & schedules)
  getDetails: async (id) => {
    const response = await apiInstance.get(`/bookings/${id}/details`);
    return response.data;
  },

  // Create booking
  create: async (bookingData) => {
    const response = await apiInstance.post('/bookings/', bookingData);
    return response.data;
  },

  // Get payments for booking
  getPayments: async (bookingId) => {
    const response = await apiInstance.get(`/bookings/${bookingId}/payments`);
    return response.data;
  },

  // Create payment
  createPayment: async (bookingId, paymentData) => {
    const response = await apiInstance.post(`/bookings/${bookingId}/payments`, paymentData);
    return response.data;
  },

  // Get payment schedules
  getSchedules: async (bookingId) => {
    const response = await apiInstance.get(`/bookings/${bookingId}/schedules`);
    return response.data;
  },
};

export const commissionService = {
  // Get all commissions
  getAll: async (params = {}) => {
    const response = await apiInstance.get('/commissions/', { params });
    return response.data;
  },

  // Get commission by ID
  getById: async (id) => {
    const response = await apiInstance.get(`/commissions/${id}`);
    return response.data;
  },

  // Create commission
  create: async (commissionData) => {
    const response = await apiInstance.post('/commissions/', commissionData);
    return response.data;
  },

  // Approve commission
  approve: async (id) => {
    const response = await apiInstance.post(`/commissions/${id}/approve`);
    return response.data;
  },

  // Payout commission
  payout: async (id, payoutData) => {
    const response = await apiInstance.post(`/commissions/${id}/payout`, payoutData);
    return response.data;
  },

  // Get commission stats
  getStats: async (tenantId, projectId, staffId) => {
    const response = await apiInstance.get('/commissions/stats/summary', {
      params: { tenant_id: tenantId, project_id: projectId, staff_id: staffId },
    });
    return response.data;
  },

  // Commission Rules
  getRules: async (tenantId, projectId) => {
    const response = await apiInstance.get('/commissions/rules', {
      params: { tenant_id: tenantId, project_id: projectId },
    });
    return response.data;
  },

  createRule: async (ruleData) => {
    const response = await apiInstance.post('/commissions/rules', ruleData);
    return response.data;
  },
};

export const analyticsService = {
  // Get dashboard analytics
  getDashboard: async (tenantId, startDate, endDate) => {
    const response = await apiInstance.get('/analytics/dashboard', {
      params: {
        tenant_id: tenantId,
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  },

  // Get lead analytics
  getLeads: async (tenantId, projectId, startDate, endDate) => {
    const response = await apiInstance.get('/analytics/leads', {
      params: {
        tenant_id: tenantId,
        project_id: projectId,
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  },

  // Get sales analytics
  getSales: async (tenantId, startDate, endDate) => {
    const response = await apiInstance.get('/analytics/sales', {
      params: {
        tenant_id: tenantId,
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  },

  // Get payment analytics
  getPayments: async (tenantId, startDate, endDate) => {
    const response = await apiInstance.get('/analytics/payments', {
      params: {
        tenant_id: tenantId,
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  },

  // Get commission analytics
  getCommissions: async (tenantId, staffId, startDate, endDate) => {
    const response = await apiInstance.get('/analytics/commissions', {
      params: {
        tenant_id: tenantId,
        staff_id: staffId,
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  },
};

export const userService = {
  // Get all users
  getAll: async (params = {}) => {
    const response = await apiInstance.get('/users/', { params });
    return response.data;
  },

  // Get user by ID
  getById: async (userId) => {
    const response = await apiInstance.get(`/users/${userId}`);
    return response.data;
  },

  // Create user
  create: async (userData) => {
    const response = await apiInstance.post('/users/', userData);
    return response.data;
  },

  // Update user
  update: async (userId, userData) => {
    const response = await apiInstance.put(`/users/${userId}`, userData);
    return response.data;
  },

  // Deactivate user
  deactivate: async (userId) => {
    const response = await apiInstance.delete(`/users/${userId}`);
    return response.data;
  },

  // Activate user
  activate: async (userId) => {
    const response = await apiInstance.post(`/users/${userId}/activate`);
    return response.data;
  },

  // Get user performance
  getPerformance: async (userId) => {
    const response = await apiInstance.get(`/users/${userId}/performance`);
    return response.data;
  },

  // Get user stats
  getStats: async (tenantId) => {
    const response = await apiInstance.get('/users/stats/overview', {
      params: { tenant_id: tenantId },
    });
    return response.data;
  },
};

export const customerService = {
  // Get customer dashboard
  getDashboard: async () => {
    const response = await apiInstance.get('/customer/dashboard');
    return response.data;
  },

  // Get customer bookings
  getBookings: async () => {
    const response = await apiInstance.get('/customer/bookings');
    return response.data;
  },

  // Get booking detail
  getBookingDetail: async (bookingId) => {
    const response = await apiInstance.get(`/customer/bookings/${bookingId}`);
    return response.data;
  },

  // Get customer payments
  getPayments: async () => {
    const response = await apiInstance.get('/customer/payments');
    return response.data;
  },

  // Get payment schedules
  getPaymentSchedules: async (status = null) => {
    const response = await apiInstance.get('/customer/payment-schedules', {
      params: { status },
    });
    return response.data;
  },

  // Get customer properties
  getProperties: async () => {
    const response = await apiInstance.get('/customer/properties');
    return response.data;
  },

  // Create resale request
  createResaleRequest: async (resaleData) => {
    const response = await apiInstance.post('/customer/resale-request', resaleData);
    return response.data;
  },

  // Get resale requests
  getResaleRequests: async () => {
    const response = await apiInstance.get('/customer/resale-requests');
    return response.data;
  },
};


// Layout Service
export const layoutService = {
  // Create or update project layout
  createLayout: async (projectId, layoutData) => {
    const response = await apiInstance.post(`/layouts/projects/${projectId}/layout`, layoutData);
    return response.data;
  },

  // Get project layout (authenticated)
  getLayout: async (projectId) => {
    const response = await apiInstance.get(`/layouts/projects/${projectId}/layout`);
    return response.data;
  },

  // Get public project layout (no auth)
  getPublicLayout: async (projectId) => {
    const response = await apiInstance.get(`/layouts/public/projects/${projectId}/layout`);
    return response.data;
  },

  getPublicLayoutById: async (layoutId) => {
    const response = await apiInstance.get(`/public/layouts/${layoutId}`);
    return response.data;
  },

  // Update plot status
  updatePlotStatus: async (projectId, plotId, statusData) => {
    const response = await api.patch(`/layouts/projects/${projectId}/layout/plots/${plotId}`, statusData);
    return response.data;
  },
  
  // Update plot coordinates/boundaries
  updatePlotCoordinates: async (layoutId, plots) => {
    const response = await apiInstance.put(`/layouts/${layoutId}/plots/coordinates`, { plots });
    return response;
  },

  // Delete layout
  deleteLayout: async (projectId) => {
    const response = await apiInstance.delete(`/layouts/projects/${projectId}/layout`);
    return response.data;
  },

  // Get layout summary
  getLayoutSummary: async (projectId) => {
    const response = await apiInstance.get(`/layouts/projects/${projectId}/layout/summary`);
    return response.data;
  },
  
  // === NEW LAYOUT LIBRARY FUNCTIONS ===
  
  // Upload SVG file
  uploadSVG: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiInstance.post('/layouts/upload-svg', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Parse layout file (DXF, SVG, PDF, or Image with AI/OCR)
  parseLayoutFile: async (file, parseMethod) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('parse_method', parseMethod);
    const response = await apiInstance.post('/layouts/parse-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Create master layout
  createMasterLayout: async (layoutData) => {
    const response = await apiInstance.post('/layouts', layoutData);
    return response.data;
  },

  // Get all master layouts
  getMasterLayouts: async (layoutType = null, includeTemplates = true) => {
    const params = { include_templates: includeTemplates };
    if (layoutType) params.layout_type = layoutType;
    const response = await apiInstance.get('/layouts', { params });
    return response.data;
  },

  // Get single master layout
  getMasterLayout: async (layoutId) => {
    const response = await apiInstance.get(`/layouts/${layoutId}`);
    return response.data;
  },

  // Update master layout
  updateMasterLayout: async (layoutId, layoutData) => {
    const response = await apiInstance.put(`/layouts/${layoutId}`, layoutData);
    return response.data;
  },

  // Delete master layout
  deleteMasterLayout: async (layoutId) => {
    const response = await apiInstance.delete(`/layouts/${layoutId}`);
    return response.data;
  },

  // Assign layout to project
  assignLayoutToProject: async (projectId, layoutId, customPlots = null) => {
    const response = await apiInstance.post(`/layouts/projects/${projectId}/assign`, {
      layout_id: layoutId,
      custom_plots: customPlots,
    });
    return response.data;
  },

  // Get layout stats
  getLayoutStats: async () => {
    const response = await apiInstance.get('/layouts/stats');
    return response.data;
  },
};

export const notificationService = {
  // Get user notifications
  getNotifications: async (limit = 50, unreadOnly = false, type = null) => {
    const params = { limit, unread_only: unreadOnly };
    if (type) params.notification_type = type;
    const response = await apiInstance.get('/in-app-notifications', { params });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await apiInstance.get('/in-app-notifications/unread-count');
    return response.data;
  },

  // Mark notifications as read
  markAsRead: async (notificationIds) => {
    const response = await apiInstance.post('/in-app-notifications/mark-read', {
      notification_ids: notificationIds
    });
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async () => {
    const response = await apiInstance.post('/in-app-notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await apiInstance.delete(`/in-app-notifications/${notificationId}`);
    return response.data;
  },

  // Get notification preferences
  getPreferences: async () => {
    const response = await apiInstance.get('/in-app-notifications/preferences');
    return response.data;
  },

  // Update notification preferences
  updatePreferences: async (preferences) => {
    const response = await apiInstance.put('/in-app-notifications/preferences', preferences);
    return response.data;
  },

  // Create notification (admin only)
  createNotification: async (notificationData) => {
    const response = await apiInstance.post('/in-app-notifications', notificationData);
    return response.data;
  },
};

export const roleService = {
  // Get all system roles
  getSystemRoles: async () => {
    const response = await apiInstance.get('/roles/system-roles');
    return response.data;
  },

  // Get role by slug
  getRoleBySlug: async (slug) => {
    const response = await apiInstance.get(`/roles/system-roles/${slug}`);
    return response.data;
  },

  // Create role assignment
  createAssignment: async (assignmentData) => {
    const response = await apiInstance.post('/roles/assignments', assignmentData);
    return response.data;
  },

  // Get user assignments
  getUserAssignments: async (userId, tenantId = null, projectId = null) => {
    const params = {};
    if (tenantId) params.tenant_id = tenantId;
    if (projectId) params.project_id = projectId;
    const response = await apiInstance.get(`/roles/assignments/user/${userId}`, { params });
    return response.data;
  },

  // Delete assignment
  deleteAssignment: async (assignmentId) => {
    const response = await apiInstance.delete(`/roles/assignments/${assignmentId}`);
    return response.data;
  },

  // Get my contexts
  getMyContexts: async () => {
    const response = await apiInstance.get('/roles/my-contexts');
    return response.data;
  },

  // Get my permissions
  getMyPermissions: async (tenantId, projectId = null) => {
    const params = { tenant_id: tenantId };
    if (projectId) params.project_id = projectId;
    const response = await apiInstance.get('/roles/my-permissions', { params });
    return response.data;
  },

  // Check permission
  checkPermission: async (permission, tenantId, projectId = null) => {
    const response = await apiInstance.post('/roles/check-permission', {
      permission,
      tenant_id: tenantId,
      project_id: projectId,
    });
    return response.data;
  },

  // Get project staff
  getProjectStaff: async (projectId, roleSlug = null) => {
    const params = {};
    if (roleSlug) params.role_slug = roleSlug;
    const response = await apiInstance.get(`/roles/project/${projectId}/staff`, { params });
    return response.data;
  },
};

export const financialService = {
  // Payment Schedules
  createPaymentSchedule: async (scheduleData) => {
    const response = await apiInstance.post('/financial/payment-schedules', scheduleData);
    return response.data;
  },

  getBookingPaymentSchedules: async (bookingId) => {
    const response = await apiInstance.get(`/financial/payment-schedules/booking/${bookingId}`);
    return response.data;
  },

  getCustomerPaymentSchedules: async (customerId, status = null) => {
    const params = {};
    if (status) params.status = status;
    const response = await apiInstance.get(`/financial/payment-schedules/customer/${customerId}`, { params });
    return response.data;
  },

  // Transactions
  createTransaction: async (transactionData) => {
    const response = await apiInstance.post('/financial/transactions', transactionData);
    return response.data;
  },

  getTransactions: async (filters = {}) => {
    const response = await apiInstance.get('/financial/transactions', { params: filters });
    return response.data;
  },

  getTransaction: async (transactionId) => {
    const response = await apiInstance.get(`/financial/transactions/${transactionId}`);
    return response.data;
  },

  // Expense Categories
  createExpenseCategory: async (categoryData) => {
    const response = await apiInstance.post('/financial/expense-categories', categoryData);
    return response.data;
  },

  getExpenseCategories: async () => {
    const response = await apiInstance.get('/financial/expense-categories');
    return response.data;
  },

  // Reports
  getFinancialSummary: async (projectId = null, startDate = null, endDate = null) => {
    const params = {};
    if (projectId) params.project_id = projectId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiInstance.get('/financial/reports/summary', { params });
    return response.data;
  },
};

export const aiAgentService = {
  // Lead Follow-up Agent
  startLeadFollowup: async (leadId) => {
    const response = await apiInstance.post(`/ai-agents/lead-followup/start?lead_id=${leadId}`);
    return response.data;
  },

  sendLeadFollowupMessage: async (conversationId, sessionId, message) => {
    const response = await apiInstance.post('/ai-agents/lead-followup/message', {
      conversation_id: conversationId,
      session_id: sessionId,
      content: message,
    });
    return response.data;
  },

  // Property Recommendation Agent
  startPropertyRecommendation: async (customerId = null) => {
    const params = customerId ? `?customer_id=${customerId}` : '';
    const response = await apiInstance.post(`/ai-agents/property-recommendation/start${params}`);
    return response.data;
  },

  sendPropertyRecommendationMessage: async (conversationId, sessionId, message) => {
    const response = await apiInstance.post('/ai-agents/property-recommendation/message', {
      conversation_id: conversationId,
      session_id: sessionId,
      content: message,
    });
    return response.data;
  },

  // Conversation Management
  getConversations: async (agentType = null, limit = 20) => {
    const params = { limit };
    if (agentType) params.agent_type = agentType;
    const response = await apiInstance.get('/ai-agents/conversations', { params });
    return response.data;
  },

  getConversationMessages: async (conversationId) => {
    const response = await apiInstance.get(`/ai-agents/conversations/${conversationId}/messages`);
    return response.data;
  },
};

export const smsService = {
  // Send SMS
  sendSMS: async (smsData) => {
    const response = await apiInstance.post('/sms/send', smsData);
    return response.data;
  },

  sendLeadAcknowledgment: async (leadId, language = 'hinglish') => {
    const response = await apiInstance.post(`/sms/send-lead-acknowledgment/${leadId}?language=${language}`);
    return response.data;
  },

  sendBookingConfirmation: async (bookingId, language = 'hinglish') => {
    const response = await apiInstance.post(`/sms/send-booking-confirmation/${bookingId}?language=${language}`);
    return response.data;
  },

  sendPaymentReminder: async (scheduleId, language = 'hinglish') => {
    const response = await apiInstance.post(`/sms/send-payment-reminder/${scheduleId}?language=${language}`);
    return response.data;
  },

  // History & Stats
  getSMSHistory: async (filters = {}) => {
    const response = await apiInstance.get('/sms/history', { params: filters });
    return response.data;
  },

  getSMSStats: async () => {
    const response = await apiInstance.get('/sms/stats');
    return response.data;
  },

  // Templates
  getDefaultTemplates: async (messageType = null) => {
    const params = messageType ? `?message_type=${messageType}` : '';
    const response = await apiInstance.get(`/sms/default-templates${params}`);
    return response.data;
  },

  getCustomTemplates: async (messageType = null) => {
    const params = messageType ? { message_type: messageType } : {};
    const response = await apiInstance.get('/sms/templates', { params });
    return response.data;
  },

  createTemplate: async (templateData) => {
    const response = await apiInstance.post('/sms/templates', templateData);
    return response.data;
  },
};