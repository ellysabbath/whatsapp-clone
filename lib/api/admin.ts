// lib/api/admin.ts
import axiosInstance, { getBaseUrl } from './axiosInstance';
import API_CONFIG from './_config';

export interface User {
  id: number;
  mobile_number: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
  profile?: Profile;
  user_role?: Role;
}

export interface Profile {
  id: number;
  profile_picture: string | null;
  bio: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  role: 'admin' | 'middleman' | 'user';
  role_display: string;
  status: 'active' | 'inactive';
  status_display: string;
  user: number;
  profile: number | null;
  assigned_by: number | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

export interface OTPVerification {
  id: number;
  user: number | null;
  email: string;
  otp_code: string;
  is_verified: boolean;
  created_at: string;
  expires_at: string;
}

export interface UserSession {
  id: number;
  user: number;
  device_info: string;
  ip_address: string | null;
  created_at: string;
  last_activity: string;
  is_active: boolean;
  is_online: boolean;
  last_seen: string | null;
}

export interface UserStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    staff: number;
  };
  profiles: {
    total: number;
    with_bio: number;
    with_location: number;
  };
  roles: {
    total: number;
    admin: number;
    middleman: number;
    user: number;
    active: number;
    inactive: number;
  };
  sessions: {
    total: number;
    active: number;
    online: number;
  };
  otp: {
    total: number;
    verified: number;
    unverified: number;
  };
}

// ==================== USER MANAGEMENT ====================

export const adminAPI = {
  // Get all users with optional filters
  getUsers: async (params?: {
    search?: string;
    is_active?: boolean;
    is_staff?: boolean;
    detailed?: boolean;
  }): Promise<{ status: string; count: number; data: User[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
    if (params?.is_staff !== undefined) queryParams.append('is_staff', String(params.is_staff));
    if (params?.detailed) queryParams.append('detailed', 'true');
    
    const url = `${API_CONFIG.ENDPOINTS.ADMIN_USERS}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  // Get single user by ID
  getUser: async (userId: number, detailed?: boolean): Promise<{ status: string; data: User }> => {
    const url = `${API_CONFIG.ENDPOINTS.ADMIN_USERS}${userId}/${detailed ? '?detailed=true' : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  // Create new user
  createUser: async (userData: {
    mobile_number: string;
    email: string;
    full_name?: string;
    password?: string;
    is_active?: boolean;
    is_staff?: boolean;
  }): Promise<{ status: string; message: string; data: User }> => {
    const response = await axiosInstance.post(API_CONFIG.ENDPOINTS.ADMIN_USERS, userData);
    return response.data;
  },

  // Update user
  updateUser: async (
    userId: number,
    userData: Partial<{
      mobile_number: string;
      email: string;
      full_name: string;
      is_active: boolean;
      is_staff: boolean;
    }>
  ): Promise<{ status: string; message: string; data: User }> => {
    const response = await axiosInstance.patch(`${API_CONFIG.ENDPOINTS.ADMIN_USERS}${userId}/`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: number): Promise<{ status: string; message: string }> => {
    const response = await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.ADMIN_USERS}${userId}/`);
    return response.data;
  },

  // Update user role
  updateUserRole: async (
    userId: number,
    roleData: { role: string; status: string; assigned_by?: number }
  ): Promise<{ status: string; message: string; data: User }> => {
    const response = await axiosInstance.patch(
      API_CONFIG.ENDPOINTS.ADMIN_USER_ROLE.replace(':userId', String(userId)),
      roleData
    );
    return response.data;
  },

  // Update user profile
  updateUserProfile: async (
    userId: number,
    profileData: Partial<{ profile_picture: string; bio: string; location: string }>
  ): Promise<{ status: string; message: string; data: User }> => {
    const response = await axiosInstance.patch(
      API_CONFIG.ENDPOINTS.ADMIN_USER_PROFILE.replace(':userId', String(userId)),
      profileData
    );
    return response.data;
  },

  // Get users by role
  getUsersByRole: async (roleType: string): Promise<{ status: string; count: number; data: User[] }> => {
    const response = await axiosInstance.get(
      API_CONFIG.ENDPOINTS.ADMIN_USERS_BY_ROLE.replace(':roleType', roleType)
    );
    return response.data;
  },

  // Get user statistics
  getUserStats: async (): Promise<{ status: string; data: UserStats }> => {
    const response = await axiosInstance.get(API_CONFIG.ENDPOINTS.ADMIN_USER_STATS);
    return response.data;
  },

  // ==================== ROLE MANAGEMENT ====================

  // Get all roles
  getRoles: async (params?: {
    role?: string;
    status?: string;
    user_id?: number;
    detailed?: boolean;
  }): Promise<{ status: string; count: number; data: Role[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.user_id) queryParams.append('user_id', String(params.user_id));
    if (params?.detailed) queryParams.append('detailed', 'true');
    
    const url = `${API_CONFIG.ENDPOINTS.ADMIN_ROLES}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  // Get single role
  getRole: async (roleId: number, detailed?: boolean): Promise<{ status: string; data: Role }> => {
    const url = `${API_CONFIG.ENDPOINTS.ADMIN_ROLES}${roleId}/${detailed ? '?detailed=true' : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  // Create role
  createRole: async (roleData: {
    role: string;
    status: string;
    user: number;
    profile?: number;
    assigned_by?: number;
  }): Promise<{ status: string; message: string; data: Role }> => {
    const response = await axiosInstance.post(API_CONFIG.ENDPOINTS.ADMIN_ROLES, roleData);
    return response.data;
  },

  // Update role
  updateRole: async (
    roleId: number,
    roleData: Partial<{ role: string; status: string; profile: number; assigned_by: number }>
  ): Promise<{ status: string; message: string; data: Role }> => {
    const response = await axiosInstance.patch(`${API_CONFIG.ENDPOINTS.ADMIN_ROLES}${roleId}/`, roleData);
    return response.data;
  },

  // Delete role
  deleteRole: async (roleId: number): Promise<{ status: string; message: string }> => {
    const response = await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.ADMIN_ROLES}${roleId}/`);
    return response.data;
  },

  // Get roles by type
  getRolesByType: async (roleType: string): Promise<{ status: string; role_type: string; count: number; data: Role[] }> => {
    const response = await axiosInstance.get(
      API_CONFIG.ENDPOINTS.ADMIN_ROLES_BY_TYPE.replace(':roleType', roleType)
    );
    return response.data;
  },

  // Get roles by status
  getRolesByStatus: async (statusType: string): Promise<{ status: string; status_type: string; count: number; data: Role[] }> => {
    const response = await axiosInstance.get(
      API_CONFIG.ENDPOINTS.ADMIN_ROLES_BY_STATUS.replace(':statusType', statusType)
    );
    return response.data;
  },

  // Get role statistics
  getRoleStats: async (): Promise<{ status: string; data: any }> => {
    const response = await axiosInstance.get(API_CONFIG.ENDPOINTS.ADMIN_ROLE_STATS);
    return response.data;
  },

  // Search roles
  searchRoles: async (searchTerm: string): Promise<{ status: string; search_term: string; count: number; data: Role[] }> => {
    const response = await axiosInstance.get(`${API_CONFIG.ENDPOINTS.ADMIN_ROLE_SEARCH}?q=${encodeURIComponent(searchTerm)}`);
    return response.data;
  },

  // Bulk update roles
  bulkUpdateRoles: async (updates: Array<{ id: number; role?: string; status?: string }>): Promise<{
    status: string;
    message: string;
    updated_count: number;
    errors: any[];
  }> => {
    const response = await axiosInstance.patch(API_CONFIG.ENDPOINTS.ADMIN_ROLE_BULK_UPDATE, { updates });
    return response.data;
  },

  // ==================== OTP MANAGEMENT ====================

  // Get all OTPs
  getOTPs: async (params?: { is_verified?: boolean; email?: string }): Promise<{ status: string; count: number; data: OTPVerification[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.is_verified !== undefined) queryParams.append('is_verified', String(params.is_verified));
    if (params?.email) queryParams.append('email', params.email);
    
    const url = `${API_CONFIG.ENDPOINTS.ADMIN_OTPS}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  // Get single OTP
  getOTP: async (otpId: number): Promise<{ status: string; data: OTPVerification }> => {
    const response = await axiosInstance.get(`${API_CONFIG.ENDPOINTS.ADMIN_OTPS}${otpId}/`);
    return response.data;
  },

  // Delete OTP
  deleteOTP: async (otpId: number): Promise<{ status: string; message: string }> => {
    const response = await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.ADMIN_OTPS}${otpId}/`);
    return response.data;
  },

  // ==================== SESSION MANAGEMENT ====================

  // Get all sessions
  getSessions: async (params?: { is_active?: boolean; is_online?: boolean; user_id?: number }): Promise<{ status: string; count: number; data: UserSession[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
    if (params?.is_online !== undefined) queryParams.append('is_online', String(params.is_online));
    if (params?.user_id) queryParams.append('user_id', String(params.user_id));
    
    const url = `${API_CONFIG.ENDPOINTS.ADMIN_SESSIONS}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  },

  // Get single session
  getSession: async (sessionId: number): Promise<{ status: string; data: UserSession }> => {
    const response = await axiosInstance.get(`${API_CONFIG.ENDPOINTS.ADMIN_SESSIONS}${sessionId}/`);
    return response.data;
  },

  // Update session
  updateSession: async (
    sessionId: number,
    sessionData: Partial<{ is_active: boolean; is_online: boolean; last_seen: string }>
  ): Promise<{ status: string; message: string; data: UserSession }> => {
    const response = await axiosInstance.patch(`${API_CONFIG.ENDPOINTS.ADMIN_SESSIONS}${sessionId}/`, sessionData);
    return response.data;
  },

  // Delete session
  deleteSession: async (sessionId: number): Promise<{ status: string; message: string }> => {
    const response = await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.ADMIN_SESSIONS}${sessionId}/`);
    return response.data;
  },
};

export default adminAPI;