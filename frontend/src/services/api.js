import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:3001/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.')
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'NETWORK_ERROR') {
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
}

export const projectsAPI = {
  getAll: (params = {}) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  delete: (id) => api.delete(`/projects/${id}`),
  uploadFile: (id, formData) => api.post(`/projects/${id}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFiles: (id) => api.get(`/projects/${id}/files`),
  deleteFile: (projectId, fileId) => api.delete(`/projects/${projectId}/files/${fileId}`),
}

export const zoningAPI = {
  getLayers: () => api.get('/zoning/layers'),
  getAtPoint: (lng, lat) => api.get(`/zoning/point/${lng}/${lat}`),
  searchByAddress: (address) => api.get(`/zoning/search?address=${encodeURIComponent(address)}`),
}

export const validationAPI = {
  validate: (projectId) => api.post(`/validation/validate/${projectId}`),
  getResults: (projectId) => api.get(`/validation/results/${projectId}`),
  getHistory: (projectId) => api.get(`/validation/history/${projectId}`),
}

export const aiAPI = {
  analyzeProject: (projectId) => api.post(`/ai/analyze/${projectId}`),
  generateRecommendations: (projectId) => api.post(`/ai/recommendations/${projectId}`),
  chatWithAssistant: (message, context) => api.post('/ai/chat', { message, context }),
  predictCompliance: (projectData) => api.post('/ai/predict-compliance', projectData),
  optimizeDesign: (projectId, preferences) => api.post(`/ai/optimize/${projectId}`, preferences),
}

export const reportsAPI = {
  generate: (projectId, type) => api.post(`/reports/generate/${projectId}`, { type }),
  download: (reportId) => api.get(`/reports/download/${reportId}`, { responseType: 'blob' }),
  getHistory: () => api.get('/reports/history'),
}

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
  getComplianceMetrics: () => api.get('/dashboard/compliance-metrics'),
}

export default api