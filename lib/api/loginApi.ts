import axiosInstance from './axiosInstance';
import API_CONFIG from './_config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    mobile_number: string;
    email: string;
    full_name: string;
    date_joined: string;
    is_active: boolean;
    bio?: string;
    location?: string;
    avatar?: string | null;
  };
  tokens: {
    refresh: string;
    access: string;
  };
  errors?: any;
}

export interface CheckPhoneResponse {
  valid: boolean;
  user_exists: boolean;
  mobile_number: string;
  message?: string;
}

class LoginAPI {
  /**
   * Check if phone number exists and is valid
   * @param mobileNumber - The phone number with country code
   */
  async checkPhoneNumber(mobileNumber: string): Promise<CheckPhoneResponse> {
    try {
      const response = await axiosInstance.post(API_CONFIG.ENDPOINTS.CHECK_PHONE, {
        mobile_number: mobileNumber,
      });
      return response.data;
    } catch (error: any) {
      console.error('Check phone number error:', error);
      if (error.response) {
        return error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Login with phone number only
   * @param mobileNumber - The phone number with country code
   */
  async login(mobileNumber: string): Promise<LoginResponse> {
    try {
      const response = await axiosInstance.post(API_CONFIG.ENDPOINTS.LOGIN, {
        mobile_number: mobileNumber,
      });
      
      if (response.data.success) {
        // Store tokens
        await AsyncStorage.setItem('access_token', response.data.tokens.access);
        await AsyncStorage.setItem('refresh_token', response.data.tokens.refresh);
        
        // Store user data
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response) {
        return error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await axiosInstance.post(API_CONFIG.ENDPOINTS.LOGOUT, {
          refresh_token: refreshToken,
        });
      }
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if API call fails
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      return false;
    }
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser(): Promise<any> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const user = await this.getCurrentUser();
      return !!(token && user);
    } catch (error) {
      return false;
    }
  }
}

export default new LoginAPI();