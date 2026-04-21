import { Contact } from './contact.types';
import { Chat, Message } from './chat.types';

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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