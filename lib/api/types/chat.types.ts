// User type (matching your existing user structure)
export interface User {
  id: number;
  mobile_number: string;
  email: string | null;
  full_name: string;
  profile_picture?: string | null;
  is_online?: boolean;
  last_seen?: string;
}

export interface ChatParticipant {
  id: number;
  user: number;
  user_details: User;
  role: 'member' | 'admin';
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  is_archived: boolean;
  pinned_at: string | null;
  nickname: string | null;
}

export interface LastMessage {
  message_id: string;
  content: string;
  message_type: string;
  sender_name: string;
  sender_id: number;
  created_at: string;
  is_media: boolean;
}

export interface OtherParticipant {
  id: number;
  name: string;
  mobile_number: string;
  online: boolean;
  profile_picture?: string | null;
}

export interface Chat {
  id: number;
  chat_id: string;
  chat_type: 'individual' | 'group';
  name: string | null;
  avatar: string | null;
  participants: ChatParticipant[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  last_message: LastMessage | null;
  unread_count: number;
  is_muted: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  other_participant?: OtherParticipant;
}

export interface CreateChatData {
  participant_ids: number[];
  chat_type: 'individual' | 'group';
  name?: string;
  avatar?: string;
}

export interface MessageReaction {
  user_id: number;
  user_name: string;
  reaction: string;
}

export interface ReplyToDetails {
  message_id: string;
  content: string;
  sender_name: string;
}

export interface Message {
  id: number;
  message_id: string;
  chat: number;
  sender: number;
  sender_details: User;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker' | 'gif';
  content: string;
  media_url: string | null;
  media_thumbnail: string | null;
  file_size: number | null;
  duration: number | null;
  reply_to: number | null;
  reply_to_details: ReplyToDetails | null;
  status: 'sent' | 'delivered' | 'read' | 'deleted';
  is_forwarded: boolean;
  is_starred: boolean;
  is_deleted_for_everyone: boolean;
  created_at: string;
  reactions: MessageReaction[];
  status_for_user: string;
}

export interface SendMessageData {
  content: string;
  message_type?: string;
  media_url?: string;
  reply_to?: string;
}

export interface TypingStatus {
  chat_id: string;
  is_typing: boolean;
}

export interface MessageStatusUpdate {
  message_ids: string[];
  status: 'delivered' | 'read';
}

export interface MessageReactionData {
  message_id: string;
  reaction: string;
}

export interface SearchResult {
  contacts?: Contact[];
  chats?: Chat[];
  messages?: Message[];
}

export interface SearchParams {
  query: string;
  type?: 'all' | 'chats' | 'messages' | 'contacts';
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}