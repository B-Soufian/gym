import axios from 'axios';
import useAuthStore from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Required for refresh token cookie
});

// Request interceptor to attach access token and gym context
api.interceptors.request.use(
  (config) => {
    const state = useAuthStore.getState();
    const token = state.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (state.selectedGymId) {
      const method = config.method?.toUpperCase();
      if (method === 'GET') {
        config.params = { ...config.params, gym_id: state.selectedGymId };
      } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
        if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
          config.data = { ...config.data, gym_id: state.selectedGymId };
        } else if (!config.data) {
          config.data = { gym_id: state.selectedGymId };
        }
      }
    }

    // Ensure POST/PUT/PATCH always have a body (Fastify rejects empty JSON bodies)
    const method = config.method?.toUpperCase();
    if (['POST', 'PUT', 'PATCH'].includes(method) && !config.data) {
      config.data = {};
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not a login/refresh request and not already retried
    if (
      error.response?.status === 401 && 
      !originalRequest.url.includes('/auth/login') && 
      !originalRequest.url.includes('/auth/refresh') && 
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { access_token, user } = response.data;

        // Update the store
        useAuthStore.getState().setAccessToken(access_token);
        useAuthStore.getState().setUser(user);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout the user
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
