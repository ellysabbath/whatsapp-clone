import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://aptecproject.pythonanywhere.com/api';

export interface User {
  id: number;
  mobile_number: string;
  email: string;
  full_name: string;
  profile_picture?: string;
  is_online?: boolean;
  last_seen?: string;
}

export interface Contact {
  id: number;
  user: number;
  contact_user: number;
  name: string;
  is_blocked: boolean;
  is_favorite: boolean;
  created_at: string;
  user_detail?: User;
  contact_user_detail?: User;
}

export interface ChatParticipant {
  id: number;
  chat: number;
  user: number;
  role: 'member' | 'admin';
  joined_at: string;
  last_read_at?: string;
  is_muted: boolean;
  is_archived: boolean;
  pinned_at?: string;
  nickname?: string;
  user_detail?: User;
}

export interface Chat {
  id: number;
  chat_id: string;
  chat_type: 'individual' | 'group';
  name?: string;
  avatar?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  participants_details?: ChatParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: number;
  message_id: string;
  chat: number;
  sender: number;
  sender_detail?: User;
  message_type: string;
  content: string;
  media_url?: string;
  media_thumbnail?: string;
  file_size?: number;
  duration?: number;
  reply_to?: number;
  status: string;
  is_forwarded: boolean;
  is_starred: boolean;
  is_deleted_for_everyone: boolean;
  created_at: string;
  updated_at: string;
  statuses_detail?: MessageStatus[];
  reactions_detail?: MessageReaction[];
}

export interface MessageStatus {
  id: number;
  message: number;
  user: number;
  status: string;
  updated_at: string;
  user_detail?: User;
}

export interface MessageReaction {
  id: number;
  message: number;
  user: number;
  reaction: string;
  created_at: string;
  user_detail?: User;
}

export interface TypingStatus {
  id: number;
  chat: number;
  user: number;
  is_typing: boolean;
  updated_at: string;
  user_detail?: User;
}

export interface Call {
  id: number;
  call_id: string;
  chat: number;
  caller: number;
  receiver: number;
  call_type: 'voice' | 'video';
  status: string;
  started_at?: string;
  ended_at?: string;
  duration: number;
  created_at: string;
  caller_detail?: User;
  receiver_detail?: User;
}

export interface Group {
  id: number;
  chat: number;
  description: string;
  created_at: string;
  updated_at: string;
  chat_detail?: Chat;
}

export interface GroupInvite {
  id: number;
  group: number;
  invite_code: string;
  created_by: number;
  max_uses: number;
  used_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  created_by_detail?: User;
}

export interface StarredMessage {
  id: number;
  user: number;
  message: number;
  starred_at: string;
  message_detail?: Message;
  user_detail?: User;
}

export interface ArchivedChat {
  id: number;
  user: number;
  chat: number;
  archived_at: string;
  chat_detail?: Chat;
  user_detail?: User;
}

export interface BroadcastList {
  id: number;
  broadcast_id: string;
  owner: number;
  name: string;
  recipients: number[];
  created_at: string;
  updated_at: string;
  owner_detail?: User;
  recipients_detail?: User[];
}

export interface BroadcastMessage {
  id: number;
  broadcast: number;
  sender: number;
  content: string;
  media_url?: string;
  sent_at: string;
  sender_detail?: User;
}

class ManageService {
  // No token needed - direct requests
  private request = async (endpoint: string, method: string = 'GET', body?: any): Promise<any> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      // All endpoints are under /api/control/ as per your URL configuration
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`API Request: ${method} ${url}`, body);
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('API Error Response:', error);
        throw new Error(error.message || error.detail || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`API Response: ${method} ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`API Error ${endpoint}:`, error);
      throw error;
    }
  };

  // ======================== USER MANAGEMENT ========================
  // Note: User endpoints are under /api/ (not /api/control/)
  
  async getUsers(search?: string): Promise<User[]> {
    const endpoint = search ? `/users/?search=${search}` : '/users/';
    const result = await this.request(endpoint);
    return result.status === 'success' ? result.data : result;
  }

  async getUser(userId: number): Promise<User> {
    const result = await this.request(`/users/${userId}/`);
    return result.status === 'success' ? result.data : result;
  }

  async createUser(userData: any): Promise<User> {
    const result = await this.request('/users/', 'POST', userData);
    return result.status === 'success' ? result.data : result;
  }

  async updateUser(userId: number, userData: any): Promise<User> {
    const result = await this.request(`/users/${userId}/`, 'PATCH', userData);
    return result.status === 'success' ? result.data : result;
  }

  async deleteUser(userId: number): Promise<void> {
    await this.request(`/users/${userId}/`, 'DELETE');
  }

  // ======================== CONTACT MANAGEMENT ========================
  // Endpoints under /api/control/contacts/
  
  async getContacts(userId?: number): Promise<Contact[]> {
    const endpoint = userId ? `/control/contacts/?user_id=${userId}` : '/control/contacts/';
    const result = await this.request(endpoint);
    return Array.isArray(result) ? result : result.data || [];
  }

  async addContact(contactData: any): Promise<Contact> {
    const result = await this.request('/control/contacts/', 'POST', contactData);
    return result;
  }

  async updateContact(contactId: number, data: any): Promise<Contact> {
    const result = await this.request(`/control/contacts/${contactId}/`, 'PATCH', data);
    return result;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.request(`/control/contacts/${contactId}/`, 'DELETE');
  }

  async toggleBlockContact(contactId: number): Promise<any> {
    const result = await this.request(`/control/contacts/${contactId}/toggle_block/`, 'PATCH');
    return result;
  }

  async toggleFavoriteContact(contactId: number): Promise<any> {
    const result = await this.request(`/control/contacts/${contactId}/toggle_favorite/`, 'PATCH');
    return result;
  }

  // ======================== CHAT MANAGEMENT ========================
  // Endpoints under /api/control/chats/
  
  async getChats(userId?: number): Promise<Chat[]> {
    const endpoint = userId ? `/control/chats/?user_id=${userId}` : '/control/chats/';
    const result = await this.request(endpoint);
    return Array.isArray(result) ? result : result.data || [];
  }

  async getChat(chatId: string): Promise<Chat> {
    const result = await this.request(`/control/chats/${chatId}/`);
    return result;
  }

  async createIndividualChat(userId: number, currentUserId: number): Promise<Chat> {
    const result = await this.request('/control/chats/', 'POST', {
      chat_type: 'individual',
      participant_ids: [userId, currentUserId],
    });
    return result;
  }

  async createGroupChat(name: string, participantIds: number[]): Promise<Chat> {
    const result = await this.request('/control/chats/', 'POST', {
      chat_type: 'group',
      name,
      participant_ids: participantIds,
    });
    return result;
  }

  async updateChat(chatId: string, data: any): Promise<Chat> {
    const result = await this.request(`/control/chats/${chatId}/`, 'PATCH', data);
    return result;
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.request(`/control/chats/${chatId}/`, 'DELETE');
  }

  async addParticipant(chatId: string, userId: number): Promise<any> {
    const result = await this.request(`/control/chats/${chatId}/add_participant/`, 'POST', { user_id: userId });
    return result;
  }

  async removeParticipant(chatId: string, userId: number): Promise<void> {
    await this.request(`/control/chats/${chatId}/remove_participant/`, 'DELETE', { user_id: userId });
  }

  // ======================== MESSAGE MANAGEMENT ========================
  // Endpoints under /api/control/messages/
  
  async getMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const result = await this.request(`/control/messages/?chat_id=${chatId}&limit=${limit}&offset=${offset}`);
    return Array.isArray(result) ? result : result.data || [];
  }

  async sendMessage(chatId: string, content: string, senderId: number, messageType: string = 'text', replyTo?: string): Promise<Message> {
    const result = await this.request('/control/messages/', 'POST', {
      chat: chatId,
      content,
      sender: senderId,
      message_type: messageType,
      reply_to: replyTo,
    });
    return result;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.request(`/control/messages/${messageId}/`, 'DELETE');
  }

  async addReaction(messageId: string, userId: number, reaction: string): Promise<any> {
    const result = await this.request(`/control/messages/${messageId}/add_reaction/`, 'POST', { user_id: userId, reaction });
    return result;
  }

  async removeReaction(messageId: string, userId: number): Promise<void> {
    await this.request(`/control/messages/${messageId}/remove_reaction/`, 'DELETE', { user_id: userId });
  }

  async starMessage(messageId: string, userId: number): Promise<any> {
    const result = await this.request(`/control/messages/${messageId}/star/`, 'POST', { user_id: userId });
    return result;
  }

  async unstarMessage(messageId: string, userId: number): Promise<any> {
    await this.request(`/control/messages/${messageId}/unstar/`, 'DELETE', { user_id: userId });
  }

  // ======================== MESSAGE STATUS ========================
  // Endpoints under /api/control/message-statuses/
  
  async markMessagesAsRead(messageIds: string[], userId: number): Promise<void> {
    await this.request('/control/message-statuses/mark_as_read/', 'POST', {
      message_ids: messageIds,
      user_id: userId,
    });
  }

  // ======================== TYPING STATUS ========================
  // Endpoints under /api/control/typing-statuses/
  
  async updateTypingStatus(chatId: string, userId: number, isTyping: boolean): Promise<any> {
    const result = await this.request('/control/typing-statuses/update_typing/', 'POST', {
      chat_id: chatId,
      user_id: userId,
      is_typing: isTyping,
    });
    return result;
  }

  // ======================== CALL MANAGEMENT ========================
  // Endpoints under /api/control/calls/
  
  async initiateCall(chatId: string, callerId: number, receiverId: number, callType: 'voice' | 'video'): Promise<Call> {
    const result = await this.request('/control/calls/', 'POST', {
      chat: chatId,
      caller: callerId,
      receiver: receiverId,
      call_type: callType,
    });
    return result;
  }

  async updateCallStatus(callId: string, status: string): Promise<Call> {
    const result = await this.request(`/control/calls/${callId}/update_status/`, 'PATCH', { status });
    return result;
  }

  async getCallHistory(userId?: number): Promise<Call[]> {
    const endpoint = userId ? `/control/calls/?user_id=${userId}` : '/control/calls/';
    const result = await this.request(endpoint);
    return Array.isArray(result) ? result : result.data || [];
  }

  // ======================== GROUP MANAGEMENT ========================
  // Endpoints under /api/control/groups/
  
  async getGroupInfo(chatId: string): Promise<Group> {
    const result = await this.request(`/control/groups/?chat_id=${chatId}`);
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  async updateGroupDescription(chatId: string, description: string): Promise<Group> {
    const group = await this.getGroupInfo(chatId);
    if (!group) throw new Error('Group not found');
    const result = await this.request(`/control/groups/${group.id}/`, 'PATCH', { description });
    return result;
  }

  async createGroupInvite(groupId: number, createdBy: number, maxUses: number = 0, expiresInHours?: number): Promise<GroupInvite> {
    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString() : null;
    const result = await this.request(`/control/groups/${groupId}/create_invite/`, 'POST', {
      max_uses: maxUses,
      expires_at: expiresAt,
      created_by: createdBy,
    });
    return result;
  }

  async joinGroupByInvite(inviteCode: string, userId: number): Promise<any> {
    const invites = await this.request(`/control/group-invites/?invite_code=${inviteCode}`);
    if (invites && invites.length > 0) {
      const result = await this.request(`/control/group-invites/${invites[0].id}/use_invite/`, 'POST', { user_id: userId });
      return result;
    }
    throw new Error('Invalid invite code');
  }

  // ======================== STARRED MESSAGES ========================
  // Endpoints under /api/control/starred-messages/
  
  async getStarredMessages(userId: number): Promise<StarredMessage[]> {
    const result = await this.request(`/control/starred-messages/?user_id=${userId}`);
    return Array.isArray(result) ? result : result.data || [];
  }

  // ======================== ARCHIVED CHATS ========================
  // Endpoints under /api/control/archived-chats/
  
  async archiveChat(chatId: string, userId: number): Promise<ArchivedChat> {
    const result = await this.request('/control/archived-chats/', 'POST', {
      chat_id: chatId,
      user_id: userId,
    });
    return result;
  }

  async unarchiveChat(chatId: string, userId: number): Promise<void> {
    await this.request('/control/archived-chats/unarchive/', 'DELETE', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  async getArchivedChats(userId: number): Promise<ArchivedChat[]> {
    const result = await this.request(`/control/archived-chats/?user_id=${userId}`);
    return Array.isArray(result) ? result : result.data || [];
  }

  // ======================== BROADCAST MANAGEMENT ========================
  // Endpoints under /api/control/broadcast-lists/ and /api/control/broadcast-messages/
  
  async getBroadcastLists(ownerId?: number): Promise<BroadcastList[]> {
    const endpoint = ownerId ? `/control/broadcast-lists/?owner_id=${ownerId}` : '/control/broadcast-lists/';
    const result = await this.request(endpoint);
    return Array.isArray(result) ? result : result.data || [];
  }

  async createBroadcastList(name: string, ownerId: number, recipientIds: number[]): Promise<BroadcastList> {
    const result = await this.request('/control/broadcast-lists/', 'POST', {
      name,
      owner: ownerId,
      recipients: recipientIds,
    });
    return result;
  }

  async sendBroadcastMessage(broadcastId: number, senderId: number, content: string, mediaUrl?: string): Promise<BroadcastMessage> {
    const result = await this.request(`/control/broadcast-lists/${broadcastId}/send_message/`, 'POST', {
      sender: senderId,
      content,
      media_url: mediaUrl,
    });
    return result;
  }

  async deleteBroadcastList(broadcastId: number): Promise<void> {
    await this.request(`/control/broadcast-lists/${broadcastId}/`, 'DELETE');
  }

  async getBroadcastMessages(broadcastId?: number): Promise<BroadcastMessage[]> {
    const endpoint = broadcastId ? `/control/broadcast-messages/?broadcast_id=${broadcastId}` : '/control/broadcast-messages/';
    const result = await this.request(endpoint);
    return Array.isArray(result) ? result : result.data || [];
  }

  // ======================== SEARCH ========================
  
  async searchUsers(query: string): Promise<User[]> {
    const result = await this.request(`/users/?search=${query}`);
    return result.status === 'success' ? result.data : result;
  }

  async searchChats(query: string, userId?: number): Promise<Chat[]> {
    const endpoint = userId ? `/control/chats/?search=${query}&user_id=${userId}` : `/control/chats/?search=${query}`;
    const result = await this.request(endpoint);
    return Array.isArray(result) ? result : result.data || [];
  }

  async searchMessages(query: string, chatId?: string): Promise<Message[]> {
    const url = chatId ? `/control/messages/?search=${query}&chat_id=${chatId}` : `/control/messages/?search=${query}`;
    const result = await this.request(url);
    return Array.isArray(result) ? result : result.data || [];
  }
}

export const manageService = new ManageService();
export default manageService;