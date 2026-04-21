import { User } from './chat.types';

export interface Call {
  id: number;
  call_id: string;
  chat: number;
  caller: number;
  caller_details: User;
  receiver: number;
  receiver_details: User;
  call_type: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'answered' | 'missed' | 'rejected' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  duration: number;
  created_at: string;
}

export interface InitiateCallData {
  chat_id: string;
  receiver_id: number;
  call_type: 'voice' | 'video';
}

export interface CallStatusData {
  status: 'answered' | 'rejected' | 'missed' | 'ended';
}