// Broadcast related types
export interface BroadcastList {
  id: number;
  broadcast_id: string;
  owner: number;
  owner_details: User;
  name: string;
  recipients: number[];
  recipient_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBroadcastData {
  name: string;
  recipient_ids: number[];
}

export interface BroadcastMessage {
  id: number;
  broadcast: number;
  sender: number;
  sender_details: User;
  content: string;
  media_url: string | null;
  sent_at: string;
}

export interface SendBroadcastMessageData {
  broadcast_id: string;
  content?: string;
  media_url?: string;
}