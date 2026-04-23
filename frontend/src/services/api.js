import axios from 'axios'

const isDevelopment = import.meta.env.MODE === 'development'

// Dev  → use Vite proxy (/api → localhost:5001), no CORS issues
// Prod → full deployed backend URL
const BASE_URL = isDevelopment
  ? '/api'
  : `${import.meta.env.VITE_BACKEND_URL || 'https://medilink-g1wy.onrender.com'}/api`

const api = axios.create({
  baseURL: BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Handle responses and auth errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      error.message = 'Cannot connect to server. Make sure the backend is running.'
      return Promise.reject(error)
    }

    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    if (status === 429) {
      error.message = 'Too many requests. Please wait a moment before trying again.'
    }

    if (status === 403) {
      error.message = 'You do not have permission to perform this action.'
    }

    return Promise.reject(error)
  }
)

export default api
