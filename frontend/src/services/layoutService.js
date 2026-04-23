import apiInstance from './api';

export const layoutService = {
  // Get master layout by ID
  getMasterLayout: async (layoutId) => {
    const response = await apiInstance.get(`/layouts/${layoutId}`);
    return response.data;
  },

  // Create master layout
  createMasterLayout: async (layoutData) => {
    const response = await apiInstance.post('/layouts', layoutData);
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

  // Get public layout
  getPublicLayout: async (projectId) => {
    const response = await apiInstance.get(`/public/projects/${projectId}/layout`);
    return response.data;
  }
};

export default layoutService;
