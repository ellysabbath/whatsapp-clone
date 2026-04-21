import { Chat,User } from './chat.types';


export interface Group {
  id: number;
  chat: number;
  chat_details: Chat;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGroupData {
  name: string;
  participant_ids: number[];
  description?: string;
  avatar?: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  avatar?: string;
}

export interface GroupInvite {
  id: number;
  group: number;
  invite_code: string;
  created_by: number;
  created_by_details: User;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface JoinGroupData {
  invite_code: string;
}