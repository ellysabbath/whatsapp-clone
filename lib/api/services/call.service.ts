import axiosInstance from '../axiosInstance';
import { Call, InitiateCallData, CallStatusData, ApiError } from '../types';

class CallService {
  async initiateCall(data: InitiateCallData): Promise<Call> {
    try {
      const response = await axiosInstance.post<Call>('calls/initiate/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateCallStatus(callId: string, data: CallStatusData): Promise<Call> {
    try {
      const response = await axiosInstance.post<Call>(`calls/${callId}/status/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getCallHistory(): Promise<Call[]> {
    try {
      const response = await axiosInstance.get<Call[]>('calls/history/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async answerCall(callId: string): Promise<Call> {
    return this.updateCallStatus(callId, { status: 'answered' });
  }

  async rejectCall(callId: string): Promise<Call> {
    return this.updateCallStatus(callId, { status: 'rejected' });
  }

  async endCall(callId: string): Promise<Call> {
    return this.updateCallStatus(callId, { status: 'ended' });
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

export const callService = new CallService();
export default callService;