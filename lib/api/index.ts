// Export client
export { default as axiosInstance, getWebSocketUrl } from './axiosInstance';

// Export all types
export * from './types';

// Export all services (no auth since you already have loginApi)
export { chatService } from './services/chat.service';
export { contactService } from './services/contact.service';
export { groupService } from './services/group.service';
export { callService } from './services/call.service';
export { broadcastService } from './services/broadcast.service';
export { websocketService } from './services/websocket.service';