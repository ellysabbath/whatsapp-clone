import axiosInstance from '../axiosInstance';
import { ApiError } from '../types';

export interface Question {
  id?: number;
  question_id?: string;
  text: string;
  question_type: 'short_answer' | 'checkbox' | 'radio' | 'accept' | 'understand' | 'learn_more';
  options?: string[];
  points: number;
  order?: number;
  is_required?: boolean;
}

export interface Form {
  id: number;
  form_id: string;
  title: string;
  description: string;
  composer: number;
  composer_name: string;
  status: 'draft' | 'active' | 'archived';
  is_public: boolean;
  total_points: number;
  created_at: string;
  updated_at: string;
  questions: Question[];
  responses?: FormResponse[];
  response_count?: number;
  pending_count?: number;
}

export interface Answer {
  answer_id?: string;
  question_id: string;
  answer_text?: string;
  answer_choices?: string[];
  answer_boolean?: boolean;
  answer_explanation?: string;
  score?: number;
  feedback?: string;
}

export interface FormResponse {
  id: number;
  response_id: string;
  form: number;
  respondent: number | null;
  respondent_name: string;
  respondent_email: string;
  respondent_phone: string;
  submitted_at: string;
  is_graded: boolean;
  graded_at: string | null;
  graded_by: number | null;
  total_score: number;
  max_possible_score: number;
  percentage: number;
  answers: Answer[];
}

export interface CreateFormData {
  title: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  is_public?: boolean;
  questions: Omit<Question, 'id' | 'question_id'>[];
}

export interface SubmitResponseData {
  respondent_name?: string;
  respondent_email?: string;
  respondent_phone?: string;
  answers: Answer[];
}

export interface GradeResponseData {
  answers: { answer_id: string; score: number; feedback?: string }[];
}

export interface ShareLinkData {
  share_code: string;
  share_url: string;
  expires_at?: string;
  max_uses?: number;
}

export interface FormStats {
  total_responses: number;
  graded_responses: number;
  pending_responses: number;
  average_score: number;
  completion_rate: number;
}

class FormService {
  // Composer endpoints (require authentication)
  async getForms(): Promise<Form[]> {
    try {
      const response = await axiosInstance.get<Form[]>('/forms/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getForm(formId: string): Promise<Form> {
    try {
      const response = await axiosInstance.get<Form>(`/forms/${formId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async createForm(data: CreateFormData): Promise<Form> {
    try {
      const response = await axiosInstance.post<Form>('/forms/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateForm(formId: string, data: Partial<CreateFormData>): Promise<Form> {
    try {
      const response = await axiosInstance.patch<Form>(`/forms/${formId}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteForm(formId: string): Promise<void> {
    try {
      await axiosInstance.delete(`/forms/${formId}/`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getFormResponses(formId: string): Promise<FormResponse[]> {
    try {
      const response = await axiosInstance.get<FormResponse[]>(`/forms/${formId}/responses/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async gradeResponse(responseId: string, data: GradeResponseData): Promise<FormResponse> {
    try {
      const response = await axiosInstance.post<FormResponse>(`/forms/responses/${responseId}/grade/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteResponse(responseId: string): Promise<void> {
    try {
      await axiosInstance.delete(`/forms/responses/${responseId}/delete/`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async createShareLink(formId: string, expiresAt?: string, maxUses?: number): Promise<ShareLinkData> {
    try {
      const response = await axiosInstance.post<ShareLinkData>(`/forms/${formId}/share/`, {
        expires_at: expiresAt,
        max_uses: maxUses
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getFormStats(formId: string): Promise<FormStats> {
    try {
      const response = await axiosInstance.get<FormStats>(`/forms/${formId}/stats/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Public endpoints (no authentication required)
  async getPublicForms(): Promise<Form[]> {
    try {
      const response = await axiosInstance.get<Form[]>('/forms/public/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getPublicForm(formId: string): Promise<Form> {
    try {
      const response = await axiosInstance.get<Form>(`/forms/public/${formId}/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async submitResponse(formId: string, data: SubmitResponseData): Promise<FormResponse> {
    try {
      const response = await axiosInstance.post<FormResponse>(`/forms/${formId}/submit/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async joinForm(shareCode: string): Promise<{ form_id: string; title: string; description: string }> {
    try {
      const response = await axiosInstance.post('/forms/join/', { share_code: shareCode });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getUserResponsesByEmail(email: string): Promise<FormResponse[]> {
    try {
      const response = await axiosInstance.get<FormResponse[]>(`/forms/responses/lookup/?email=${email}`);
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

export const formService = new FormService();
export default formService;