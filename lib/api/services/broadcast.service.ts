import axiosInstance from '../axiosInstance';
import {
  BroadcastList,
  CreateBroadcastData,
  BroadcastMessage,
  SendBroadcastMessageData,
  ApiError,
} from '../types';

class BroadcastService {
  async getBroadcasts(): Promise<BroadcastList[]> {
    try {
      const response = await axiosInstance.get<BroadcastList[]>('broadcasts/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async createBroadcast(data: CreateBroadcastData): Promise<BroadcastList> {
    try {
      const response = await axiosInstance.post<BroadcastList>('broadcasts/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteBroadcast(broadcastId: string): Promise<void> {
    try {
      await axiosInstance.delete(`broadcasts/${broadcastId}/`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async sendBroadcastMessage(data: SendBroadcastMessageData): Promise<BroadcastMessage> {
    try {
      const response = await axiosInstance.post<BroadcastMessage>('broadcasts/send/', data);
      return response.data;
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

export const broadcastService = new BroadcastService();
export default broadcastService;