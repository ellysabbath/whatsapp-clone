import { User } from './chat.types';

export interface Contact {
  id: number;
  contact_user: number;
  contact_user_details: User;
  name: string;
  is_blocked: boolean;
  is_favorite: boolean;
  created_at: string;
}

export interface AddContactData {
  mobile_number: string;
  name?: string;
}