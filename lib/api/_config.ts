// API Configuration
export const API_CONFIG = {
  // For Android Emulator
  // BASE_URL: 'http://10.0.2.2:8000/api',
  
  // For iOS Simulator, use:
  // BASE_URL: 'http://localhost:8000/api',
  
  // For Physical Device (replace with your computer's IP)
  BASE_URL: 'http://192.168.137.1:8000/api',
  
 TIMEOUT: 30000,
  ENDPOINTS: {
    // Registration endpoints
    CHECK_PHONE: '/register/check-phone/',
    SEND_OTP: '/register/send-otp/',
    VERIFY_OTP: '/register/verify-otp/',
    RESEND_OTP: '/register/resend-otp/',
    
    // Auth endpoints
    LOGIN: '/login/',
    LOGOUT: '/logout/',
    
    // Profile endpoints
    PROFILE: '/profile/',
    PROFILE_UPDATE: '/profile/update/',
    UPDATE_PROFILE_PICTURE: '/profile/update-picture/',
    DELETE_PROFILE_FIELD: '/profile/field/',
    DELETE_ACCOUNT: '/profile/delete-account/',
  }
};

export default API_CONFIG;