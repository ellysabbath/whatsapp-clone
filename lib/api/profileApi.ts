import axiosInstance from './axiosInstance';
import API_CONFIG from './_config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: number;
  mobile_number: string;
  email: string;
  full_name: string;
  date_joined: string;
  is_active: boolean;
}

export interface MyProfileData {
  id?: number;
  profile_picture: string | null;
  bio: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserWithProfileResponse {
  success: boolean;
  data: {
    id: number;
    mobile_number: string;
    email: string;
    full_name: string;
    date_joined: string;
    is_active: boolean;
    profile: MyProfileData;
  };
  error?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    mobile_number: string;
    email: string;
    full_name: string;
    date_joined: string;
    is_active: boolean;
    profile: MyProfileData;
  };
  errors?: any;
}

export interface UpdatePictureResponse {
  success: boolean;
  message: string;
  profile_picture: string;
  error?: string;
}

class ProfileAPI {
  /**
   * Get user profile with all data
   * GET /api/profile/
   */
  async getProfile(): Promise<UserWithProfileResponse> {
    try {
      const response = await axiosInstance.get(API_CONFIG.ENDPOINTS.PROFILE);
      return response.data;
    } catch (error: any) {
      console.error('Get profile error:', error);
      if (error.response) {
        return error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Update user profile (bio, location, profile_picture)
   * PUT /api/profile/update/
   */
  async updateProfile(data: Partial<MyProfileData>): Promise<UpdateProfileResponse> {
    try {
      const response = await axiosInstance.put(API_CONFIG.ENDPOINTS.PROFILE_UPDATE, data);
      
      if (response.data.success) {
        // Update cached profile data
        const cachedProfile = await AsyncStorage.getItem('cached_profile');
        if (cachedProfile) {
          const profileData = JSON.parse(cachedProfile);
          const updatedProfile = { ...profileData, ...data };
          await AsyncStorage.setItem('cached_profile', JSON.stringify(updatedProfile));
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      if (error.response) {
        return error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Update profile picture only
   * POST /api/profile/update-picture/
   */
  async updateProfilePicture(profilePictureUri: string): Promise<UpdatePictureResponse> {
    try {
      // Convert image URI to base64 or FormData
      const formData = new FormData();
      formData.append('profile_picture', {
        uri: profilePictureUri,
        type: 'image/jpeg',
        name: 'profile_picture.jpg',
      } as any);

      const response = await axiosInstance.post(API_CONFIG.ENDPOINTS.UPDATE_PROFILE_PICTURE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        // Update cached profile
        const cachedProfile = await AsyncStorage.getItem('cached_profile');
        if (cachedProfile) {
          const profileData = JSON.parse(cachedProfile);
          profileData.profile_picture = response.data.profile_picture;
          await AsyncStorage.setItem('cached_profile', JSON.stringify(profileData));
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Update profile picture error:', error);
      if (error.response) {
        return error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Delete a specific profile field
   * DELETE /api/profile/field/<field_name>/
   */
  async deleteProfileField(fieldName: string): Promise<any> {
    try {
      const response = await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.DELETE_PROFILE_FIELD}${fieldName}/`);
      
      if (response.data.success) {
        // Update cached profile
        const cachedProfile = await AsyncStorage.getItem('cached_profile');
        if (cachedProfile) {
          const profileData = JSON.parse(cachedProfile);
          profileData[fieldName] = '';
          await AsyncStorage.setItem('cached_profile', JSON.stringify(profileData));
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Delete profile field error:', error);
      if (error.response) {
        return error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Delete user account
   * DELETE /api/profile/delete-account/
   */
  async deleteAccount(): Promise<any> {
    try {
      const response = await axiosInstance.delete(API_CONFIG.ENDPOINTS.DELETE_ACCOUNT);
      
      if (response.data.success) {
        // Clear all cached data
        await AsyncStorage.multiRemove(['cached_user', 'cached_profile', 'cached_user_time']);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Delete account error:', error);
      if (error.response) {
        return error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Save profile to cache
   */
  async cacheProfile(profileData: MyProfileData): Promise<void> {
    await AsyncStorage.setItem('cached_profile', JSON.stringify(profileData));
  }

  /**
   * Load profile from cache
   */
  async loadCachedProfile(): Promise<MyProfileData | null> {
    try {
      const cachedProfile = await AsyncStorage.getItem('cached_profile');
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
      return null;
    } catch (error) {
      console.error('Error loading cached profile:', error);
      return null;
    }
  }
}

export default new ProfileAPI();