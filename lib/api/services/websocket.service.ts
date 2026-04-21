import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWebSocketUrl } from '../axiosInstance';

type WebSocketEventType =
  | 'message'
  | 'typing'
  | 'read_receipt'
  | 'delivered_receipt'
  | 'reaction'
  | 'message_deleted'
  | 'user_status'
  | 'incoming_call'
  | 'call_status_update'
  | 'new_message';

interface WebSocketEvent {
  type: WebSocketEventType;
  [key: string]: any;
}

type EventHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<WebSocketEventType, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private pingInterval: NodeJS.Timeout | null = null;
  private chatId: string | null = null;
  private userId: number | null = null;

  async connectToChat(chatId: string): Promise<void> {
    this.disconnect();
    this.chatId = chatId;
    
    const token = await this.getToken();
    if (!token) {
      console.error('No token available for WebSocket connection');
      return;
    }
    
    // Construct the WebSocket URL with token as query parameter
    const wsPath = `ws/chat/${chatId}/`;
    const wsUrl = getWebSocketUrl(wsPath);
    const fullUrl = `${wsUrl}?token=${token}`;
    
    console.log('🔌 Connecting to WebSocket:', fullUrl);
    this.connect(fullUrl);
  }

  async connectToUser(userId: number): Promise<void> {
    this.disconnect();
    this.userId = userId;
    
    const token = await this.getToken();
    if (!token) {
      console.error('No token available for WebSocket connection');
      return;
    }
    
    // For user-specific notifications (if you implement this consumer)
    const wsPath = `ws/user/${userId}/`;
    const wsUrl = getWebSocketUrl(wsPath);
    const fullUrl = `${wsUrl}?token=${token}`;
    
    console.log('🔌 Connecting to User WebSocket:', fullUrl);
    this.connect(fullUrl);
  }

  private async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('access_token');
  }

  private connect(url: string): void {
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.startPingInterval();
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
      };
      
      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.stopPingInterval();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
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
    }
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
      this.ws.close();
      this.ws = null;
    }
    this.chatId = null;
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;