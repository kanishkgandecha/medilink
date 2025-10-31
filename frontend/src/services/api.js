import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, {
          withCredentials: true
        });
        
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  enable2FA: () => api.post('/auth/2fa/enable'),
  verify2FA: (token) => api.post('/auth/2fa/verify', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword })
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getAllUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
  deleteUser: (id) => api.delete(`/users/${id}`)
};

// Doctor API
export const doctorAPI = {
  getAllDoctors: () => api.get('/doctors'),
  getDoctorById: (id) => api.get(`/doctors/${id}`),
  updateDoctor: (id, data) => api.put(`/doctors/${id}`, data),
  getDoctorAvailability: (id, date) => api.get(`/doctors/${id}/availability?date=${date}`),
  getDoctorSchedule: (id, date) => api.get(`/doctors/${id}/schedule?date=${date}`),
  updateAvailability: (id, availability) => api.put(`/doctors/${id}/availability`, { availability })
};

// Patient API
export const patientAPI = {
  getAllPatients: () => api.get('/patients'),
  getPatientById: (id) => api.get(`/patients/${id}`),
  updatePatient: (id, data) => api.put(`/patients/${id}`, data),
  getPatientHistory: (id) => api.get(`/patients/${id}/history`),
  addMedicalHistory: (id, history) => api.post(`/patients/${id}/history`, history)
};

// Appointment API
export const appointmentAPI = {
  createAppointment: (data) => api.post('/appointments', data),
  getAllAppointments: (filters) => api.get('/appointments', { params: filters }),
  getAppointmentById: (id) => api.get(`/appointments/${id}`),
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  cancelAppointment: (id, reason) => api.patch(`/appointments/${id}/cancel`, { reason }),
  getMyAppointments: () => api.get('/appointments/my'),
  getOptimalSlot: (doctorId, date, duration) => 
    api.post('/appointments/optimal-slot', { doctorId, date, duration })
};

// Inventory API
export const inventoryAPI = {
  getAllItems: () => api.get('/inventory'),
  getItemById: (id) => api.get(`/inventory/${id}`),
  createItem: (data) => api.post('/inventory', data),
  updateItem: (id, data) => api.put(`/inventory/${id}`, data),
  deleteItem: (id) => api.delete(`/inventory/${id}`),
  getLowStock: () => api.get('/inventory/low-stock'),
  updateStock: (id, quantity) => api.patch(`/inventory/${id}/stock`, { quantity })
};

// Ward API
export const wardAPI = {
  getAllWards: () => api.get('/wards'),
  getWardById: (id) => api.get(`/wards/${id}`),
  createWard: (data) => api.post('/wards', data),
  updateWard: (id, data) => api.put(`/wards/${id}`, data),
  deleteWard: (id) => api.delete(`/wards/${id}`),
  allocatePatient: (patientId) => api.post('/wards/allocate', { patientId }),
  getWardSuggestions: () => api.get('/wards/transfer-suggestions')
};

// Prescription API
export const prescriptionAPI = {
  createPrescription: (data) => api.post('/prescriptions', data),
  getAllPrescriptions: () => api.get('/prescriptions'),
  getPrescriptionById: (id) => api.get(`/prescriptions/${id}`),
  validatePrescription: (data) => api.post('/prescriptions/validate', data),
  getPatientPrescriptions: (patientId) => api.get(`/prescriptions/patient/${patientId}`)
};

// IoT API
export const iotAPI = {
  getPatientReadings: (patientId, type, timeRange) => 
    api.get(`/iot/readings/${patientId}`, { params: { type, timeRange } }),
  getLatestReading: (patientId, type) => 
    api.get(`/iot/readings/${patientId}/latest`, { params: { type } }),
  getDeviceStatus: (deviceId) => api.get(`/iot/devices/${deviceId}/status`),
  getAllDevices: () => api.get('/iot/devices'),
  getAlerts: (patientId) => api.get(`/iot/alerts/${patientId}`)
};

export default api;
