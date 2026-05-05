// lib/api/_config.ts
export const API_CONFIG = {
  BASE_URL: 'https://aptecProject.pythonanywhere.com/api/',
  TIMEOUT: 30000000,
  
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
    
    // Admin User Management
    ADMIN_USERS: '/users/',
    ADMIN_USER_DETAIL: '/users/:userId/',
    ADMIN_USER_ROLE: '/users/:userId/role/',
    ADMIN_USER_PROFILE: '/users/:userId/profile/',
    ADMIN_USERS_BY_ROLE: '/users/role/:roleType/',
    ADMIN_USER_STATS: '/users/stats/',
    
    // Admin Role Management
    ADMIN_ROLES: '/roles/',
    ADMIN_ROLE_DETAIL: '/roles/:roleId/',
    ADMIN_ROLES_BY_TYPE: '/roles/type/:roleType/',
    ADMIN_ROLES_BY_STATUS: '/roles/status/:statusType/',
    ADMIN_ROLE_STATS: '/roles/stats/',
    ADMIN_ROLE_SEARCH: '/roles/search/',
    ADMIN_ROLE_BULK_UPDATE: '/roles/bulk/update/',
    
    // Admin OTP Management
    ADMIN_OTPS: '/otps/',
    ADMIN_OTP_DETAIL: '/otps/:otpId/',
    
    // Admin Session Management
    ADMIN_SESSIONS: '/sessions/',
    ADMIN_SESSION_DETAIL: '/sessions/:sessionId/',
    
    // Admin Profile Management
    ADMIN_PROFILES: '/profiles/',
    ADMIN_PROFILE_DETAIL: '/profiles/:profileId/',
    
    // Chat endpoints
    CHATS: '/chats/',
    ARCHIVED_CHATS: '/chats/archive/',
    MESSAGES: '/chats/:chatId/messages/',
    TYPING_STATUS: '/messages/typing/',
    MESSAGE_STATUS: '/messages/status/',
    REACTIONS: '/messages/reaction/',
    STARRED: '/starred/',
    SEARCH: '/search/',
    
    // Contact endpoints
    CONTACTS: '/contacts/',
    BLOCK_CONTACT: '/contacts/:contactId/block/',
    
    // Group endpoints
    CREATE_GROUP: '/groups/create/',
    GROUP_DETAILS: '/groups/:chatId/',
    ADD_PARTICIPANTS: '/groups/:chatId/add-participants/',
    REMOVE_PARTICIPANT: '/groups/:chatId/remove/:userId/',
    GROUP_INVITES: '/groups/:chatId/invites/',
    JOIN_GROUP: '/groups/join/',
    
    // Call endpoints
    INITIATE_CALL: '/calls/initiate/',
    CALL_STATUS: '/calls/:callId/status/',
    CALL_HISTORY: '/calls/history/',
    
    // Broadcast endpoints
    BROADCASTS: '/broadcasts/',
    SEND_BROADCAST: '/broadcasts/send/',
    
    // Form endpoints
    FORMS: '/forms/',
    FORM_DETAIL: '/forms/:formId/',
    FORM_PUBLIC: '/forms/:formId/public/',
    FORM_SUBMIT: '/forms/:formId/submit/',
    FORM_RESPONSES: '/forms/:formId/responses/',
    FORM_RESPONSE_GRADE: '/forms/responses/:responseId/grade/',
    FORM_RESPONSE_DELETE: '/forms/responses/:responseId/delete/',
    FORM_SHARE: '/forms/:formId/share/',
    FORM_JOIN: '/forms/join/',
    FORM_STATS: '/forms/:formId/stats/',
  }
};

export default API_CONFIG;