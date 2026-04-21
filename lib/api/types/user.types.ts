// User related types
export interface User {
  id: number;
  mobile_number: string;
  email: string | null;
  full_name: string;
  date_joined: string;
  last_login: string | null;
  is_online?: boolean;
  last_seen?: string;
}

export interface UserProfile {
  id: number;
  user: User;
  profile_picture: string | null;
  bio: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  full_name?: string;
  email?: string;
  profile_picture?: string;
  bio?: string;
  location?: string;
}

export interface LoginCredentials {
  mobile_number: string;
  password: string;
}

export interface RegisterData {
  mobile_number: string;
  email: string;
  full_name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface OTPResponse {
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}