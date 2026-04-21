import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from './_config';
import { Platform } from 'react-native';

// ======================== CONFIGURATION ========================

/**
 * Get the correct base URL for the platform
 * Ensures trailing slash for proper URL concatenation
 */
const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine
      return 'http://192.168.137.1:8000/api/';
    }
    // iOS simulator or physical device - use your computer's IP
    return 'http://192.168.137.1:8000/api/';
  }
  // Production URL
  return API_CONFIG.BASE_URL.endsWith('/') ? API_CONFIG.BASE_URL : `${API_CONFIG.BASE_URL}/`;
};

/**
 * Get the base WebSocket URL
 */
const getWebSocketBaseUrl = (): string => {
  const baseUrl = getBaseUrl().replace('/api/', '');
  return baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
};

/**
 * Get WebSocket URL with path
 */
export const getWebSocketUrl = (path: string): string => {
  const wsBaseUrl = getWebSocketBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${wsBaseUrl}${cleanPath}`;
  console.log('🔌 WebSocket URL:', fullUrl);
  return fullUrl;
};

// ======================== AXIOS INSTANCE ========================

const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ======================== REQUEST INTERCEPTOR ========================

/**
 * Request interceptor - Adds authentication token to every request
 */
axiosInstance.interceptors.request.use(
  async (config) => {
    // Get token from storage
    const token = await AsyncStorage.getItem('access_token');
    
    // Add token to headers if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (__DEV__) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      if (config.data) {
        console.log('📦 Request data:', config.data);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ======================== RESPONSE INTERCEPTOR ========================

/**
 * Response interceptor - Handles token refresh on 401 errors
 */
axiosInstance.interceptors.response.use(
  (response) => {
    // Log response in development
    if (__DEV__) {
      console.log(`📥 Response from ${response.config.url}:`, response.status);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error details in development
    if (__DEV__) {
      console.error('❌ Response error:', error.message);
      if (error.response) {
        console.error('📊 Error status:', error.response.status);
        console.error('📄 Error data:', error.response.data);
      }
    }
    
    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Attempt to refresh the token
        const response = await axios.post(
          `${getBaseUrl()}auth/token/refresh/`,
          { refresh: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        const { access } = response.data;
        
        // Store new access token
        await AsyncStorage.setItem('access_token', access);
        
        // Update the original request's Authorization header
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Retry the original request
        return axiosInstance(originalRequest);
        
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // Clear all tokens and user data
        await AsyncStorage.multiRemove([
          'access_token',
          'refresh_token',
          'user',
          'profile'
        ]);
        
        // You can dispatch a logout event here if needed
        // For React Native, you might want to redirect to login screen
      }
    }
    
    // Handle other common errors
    if (error.response?.status === 403) {
      console.error('🔒 Forbidden access - insufficient permissions');
    }
    
    if (error.response?.status === 404) {
      console.error('🔍 Resource not found:', error.config?.url);
    }
    
    if (error.response?.status === 500) {
      console.error('💥 Server error - please try again later');
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timeout - server took too long to respond');
    }
    
    if (!error.response) {
      console.error('🌐 Network error - check your internet connection');
    }
    
    return Promise.reject(error);
  }
);

// ======================== HELPER FUNCTIONS ========================

/**
 * Check if the user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  } catch (error) {
    return false;
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      'access_token',
      'refresh_token',
      'user',
      'profile'
    ]);
    console.log('🔐 Auth data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
};

/**
 * Get the current access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('❌ Error getting access token:', error);
    return null;
  }
};

/**
 * Set authorization header manually
 */
export const setAuthHeader = (token: string | null): void => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

// ======================== EXPORTS ========================

export default axiosInstance;