import axiosInstance from '../axiosInstance';
import {
  Chat,
  Group,
  CreateGroupData,
  UpdateGroupData,
  GroupInvite,
  ApiError,
} from '../types';

class GroupService {
  async createGroup(data: CreateGroupData): Promise<Chat> {
    try {
      const response = await axiosInstance.post<Chat>('groups/create/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getGroupDetails(chatId: string): Promise<Group> {
    try {
      const response = await axiosInstance.get<Group>(`groups/${chatId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateGroup(chatId: string, data: UpdateGroupData): Promise<Group> {
    try {
      const response = await axiosInstance.patch<Group>(`groups/${chatId}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async addParticipants(chatId: string, participantIds: number[]): Promise<{ added_participants: number[] }> {
    try {
      const response = await axiosInstance.post(`groups/${chatId}/add-participants/`, {
        participant_ids: participantIds,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async removeParticipant(chatId: string, userId: number): Promise<void> {
    try {
      await axiosInstance.delete(`groups/${chatId}/remove/${userId}/`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async createInvite(chatId: string, maxUses: number = 0, expiresAt?: string): Promise<GroupInvite> {
    try {
      const response = await axiosInstance.post<GroupInvite>(`groups/${chatId}/invites/`, {
        max_uses: maxUses,
        expires_at: expiresAt,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getInvites(chatId: string): Promise<GroupInvite[]> {
    try {
      const response = await axiosInstance.get<GroupInvite[]>(`groups/${chatId}/invites/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async joinGroup(inviteCode: string): Promise<Chat> {
    try {
      const response = await axiosInstance.post<Chat>('groups/join/', { invite_code: inviteCode });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async leaveGroup(chatId: string): Promise<void> {
    try {
      await axiosInstance.delete(`chats/${chatId}/`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): ApiError {
    if (error.response) {
      return {
        message: error.response.data?.message || error.response.data?.error || 'An error occurred',
        status: error.response.status,
        errors: error.response.data?.errors,
      };
    } else if (error.request) {
      return {
        message: 'Network error. Please check your connection.',
        status: 0,
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
      };
    }
  }
}

export const groupService = new GroupService();
export default groupService;