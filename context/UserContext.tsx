import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../lib/api/axiosInstance';
import API_CONFIG from '../lib/api/_config';
import loginApi from '../lib/api/loginApi';
import profileApi, { MyProfileData, UserProfile } from '../lib/api/profileApi';

interface LocalUserData {
  profile_picture: string | null;
  bio: string;
  location: string;
}

interface UserContextType {
  user: UserProfile | null;
  profileData: MyProfileData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (mobileNumber: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<MyProfileData>) => Promise<boolean>;
  updateProfilePicture: (uri: string) => Promise<boolean>;
  deleteProfileField: (fieldName: string) => Promise<boolean>;
  refreshUserData: () => Promise<void>;
  clearUserData: () => Promise<void>;
  loadFromCache: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileData, setProfileData] = useState<MyProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user data from cache on mount
  useEffect(() => {
    loadFromCache();
  }, []);

  const loadFromCache = async () => {
    try {
      const cachedUser = await AsyncStorage.getItem('cached_user');
      const cachedProfile = await AsyncStorage.getItem('cached_profile');
      const token = await AsyncStorage.getItem('access_token');
      
      if (cachedUser && token) {
        setUser(JSON.parse(cachedUser));
        if (cachedProfile) {
          setProfileData(JSON.parse(cachedProfile));
        }
        setIsAuthenticated(true);
        console.log('✅ User loaded from cache');
        
        // Refresh in background
        setTimeout(() => {
          refreshUserData();
        }, 100);
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await profileApi.getProfile();
      
      if (response.success && response.data) {
        // Update user data
        const userData: UserProfile = {
          id: response.data.id,
          mobile_number: response.data.mobile_number,
          email: response.data.email,
          full_name: response.data.full_name || '',
          date_joined: response.data.date_joined,
          is_active: response.data.is_active,
        };
        
        // Update profile data
        const profileDataObj: MyProfileData = {
          profile_picture: response.data.profile?.profile_picture || null,
          bio: response.data.profile?.bio || '',
          location: response.data.profile?.location || '',
        };
        
        setUser(userData);
        setProfileData(profileDataObj);
        
        // Cache data
        await AsyncStorage.setItem('cached_user', JSON.stringify(userData));
        await AsyncStorage.setItem('cached_profile', JSON.stringify(profileDataObj));
        await AsyncStorage.setItem('cached_user_time', Date.now().toString());
        
        console.log('✅ User data refreshed');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const login = async (mobileNumber: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await loginApi.login(mobileNumber);
      
      if (response.success) {
        const userData: UserProfile = {
          id: response.user.id,
          mobile_number: response.user.mobile_number,
          email: response.user.email,
          full_name: response.user.full_name || '',
          date_joined: response.user.date_joined,
          is_active: response.user.is_active,
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        
        await AsyncStorage.setItem('cached_user', JSON.stringify(userData));
        await AsyncStorage.setItem('cached_user_time', Date.now().toString());
        
        // Fetch profile data
        await refreshUserData();
        
        console.log('✅ User logged in and cached');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await loginApi.logout();
      await AsyncStorage.multiRemove(['cached_user', 'cached_profile', 'cached_user_time']);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setProfileData(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<MyProfileData>): Promise<boolean> => {
    try {
      const response = await profileApi.updateProfile(data);
      
      if (response.success) {
        // Update local state
        setProfileData(prev => ({ ...prev, ...data } as MyProfileData));
        await refreshUserData(); // Refresh to get latest data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update profile error:', error);
      return false;
    }
  };

  const updateProfilePicture = async (uri: string): Promise<boolean> => {
    try {
      const response = await profileApi.updateProfilePicture(uri);
      
      if (response.success) {
        setProfileData(prev => ({ ...prev, profile_picture: response.profile_picture } as MyProfileData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update profile picture error:', error);
      return false;
    }
  };

  const deleteProfileField = async (fieldName: string): Promise<boolean> => {
    try {
      const response = await profileApi.deleteProfileField(fieldName);
      
      if (response.success) {
        setProfileData(prev => ({ ...prev, [fieldName]: '' } as MyProfileData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Delete profile field error:', error);
      return false;
    }
  };

  const clearUserData = async (): Promise<void> => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user', 'cached_user', 'cached_profile', 'cached_user_time']);
    setUser(null);
    setProfileData(null);
    setIsAuthenticated(false);
    console.log('✅ User data cleared');
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profileData,
        isLoading,
        isAuthenticated,
        login,
        logout,
        updateProfile,
        updateProfilePicture,
        deleteProfileField,
        refreshUserData,
        clearUserData,
        loadFromCache,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};