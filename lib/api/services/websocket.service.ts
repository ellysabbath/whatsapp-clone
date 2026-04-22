import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWebSocketUrl } from '../axiosInstance';
import { Platform } from 'react-native';

type WebSocketEventType =
  | 'message'
  | 'new_message'
  | 'typing'
  | 'read_receipt'
  | 'delivered_receipt'
  | 'reaction'
  | 'message_deleted'
  | 'user_status'
  | 'incoming_call'
  | 'call_status_update'
  | 'connect'
  | 'disconnect'
  | 'pong';

interface WebSocketEvent {
  type: WebSocketEventType;
  [key: string]: any;
}

type EventHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<WebSocketEventType, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private pingInterval: NodeJS.Timeout | null = null;
  private chatId: string | null = null;
  private userId: number | null = null;
  private isConnecting = false;
  private connectionStatusListeners: Set<(connected: boolean) => void> = new Set();

  async connectToChat(chatId: string): Promise<boolean> {
    if (this.isConnecting) {
      console.log('⏳ Already connecting, waiting...');
      return false;
    }
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return true;
    }
    
    this.disconnect();
    this.chatId = chatId;
    this.isConnecting = true;
    
    const token = await this.getToken();
    if (!token) {
      console.error('❌ No token available for WebSocket connection');
      this.isConnecting = false;
      return false;
    }
    
    const wsPath = `ws/chat/${chatId}/`;
    const wsUrl = getWebSocketUrl(wsPath);
    const fullUrl = `${wsUrl}?token=${token}`;
    
    console.log('🔌 Connecting to WebSocket:', fullUrl);
    console.log('📱 Platform:', Platform.OS);
    
    return new Promise((resolve) => {
      this.connect(fullUrl, resolve);
    });
  }

  private connect(url: string, onComplete?: (success: boolean) => void): void {
    try {
      this.ws = new WebSocket(url);
      
      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.log('❌ Connection timeout');
          this.ws?.close();
          this.isConnecting = false;
          if (onComplete) onComplete(false);
        }
      }, 5000);
      
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.startPingInterval();
        
        // Emit connection event
        this.handleEvent({ type: 'connect' });
        this.connectionStatusListeners.forEach(listener => listener(true));
        
        if (onComplete) onComplete(true);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data.type);
          this.handleEvent(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
        if (onComplete) onComplete(false);
      };
      
      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.stopPingInterval();
        this.isConnecting = false;
        this.connectionStatusListeners.forEach(listener => listener(false));
        this.handleEvent({ type: 'disconnect' });
        
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.isConnecting = false;
      if (onComplete) onComplete(false);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.chatId) {
          this.connectToChat(this.chatId);
        } else if (this.userId) {
          this.connectToUser(this.userId);
        }
      }, delay);
    } else {
      console.log('❌ Max reconnection attempts reached');
      this.connectionStatusListeners.forEach(listener => listener(false));
    }
  }

  private async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('🔑 Token available:', !!token);
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async connectToUser(userId: number): Promise<void> {
    this.disconnect();
    this.userId = userId;
    
    const token = await this.getToken();
    if (!token) {
      console.error('No token available for WebSocket connection');
      return;
    }
    
    const wsPath = `ws/user/${userId}/`;
    const wsUrl = getWebSocketUrl(wsPath);
    const fullUrl = `${wsUrl}?token=${token}`;
    
    console.log('🔌 Connecting to User WebSocket:', fullUrl);
    this.connect(fullUrl);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        console.log('💓 Ping sent');
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleEvent(event: WebSocketEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  on(eventType: WebSocketEventType, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  onConnectionStatus(listener: (connected: boolean) => void): () => void {
    this.connectionStatusListeners.add(listener);
    return () => {
      this.connectionStatusListeners.delete(listener);
    };
  }

  sendMessage(chatId: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'message',
        chat_id: chatId,
        ...data,
      });
      this.ws.send(message);
      console.log('📤 Message sent:', data);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }

  sendTyping(chatId: string, isTyping: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        chat_id: chatId,
        is_typing: isTyping,
      }));
    }
  }

  sendReadReceipt(chatId: string, messageIds: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'read_receipt',
        chat_id: chatId,
        message_ids: messageIds,
      }));
    }
  }

  sendDeliveredReceipt(chatId: string, messageIds: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'delivered_receipt',
        chat_id: chatId,
        message_ids: messageIds,
      }));
    }
  }

  sendReaction(chatId: string, messageId: string, reaction: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'reaction',
        chat_id: chatId,
        message_id: messageId,
        reaction: reaction,
      }));
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket');
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.chatId = null;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;