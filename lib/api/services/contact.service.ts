import axiosInstance from '../axiosInstance';
import { Contact, AddContactData, ApiError } from '../types';

class ContactService {
  async getContacts(): Promise<Contact[]> {
    try {
      const response = await axiosInstance.get<Contact[]>('contacts/');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async addContact(data: AddContactData): Promise<Contact> {
    try {
      const response = await axiosInstance.post<Contact>('contacts/', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateContact(contactId: number, data: Partial<AddContactData>): Promise<Contact> {
    try {
      const response = await axiosInstance.patch<Contact>(`contacts/${contactId}/`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteContact(contactId: number): Promise<void> {
    try {
      await axiosInstance.delete(`contacts/${contactId}/`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async blockContact(contactId: number): Promise<{ message: string }> {
    try {
      const response = await axiosInstance.post(`contacts/${contactId}/block/`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async unblockContact(contactId: number): Promise<{ message: string }> {
    try {
      await axiosInstance.delete(`contacts/${contactId}/block/`);
      return { message: 'Contact unblocked successfully' };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getFavoriteContacts(): Promise<Contact[]> {
    try {
      const contacts = await this.getContacts();
      return contacts.filter(contact => contact.is_favorite);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getBlockedContacts(): Promise<Contact[]> {
    try {
      const contacts = await this.getContacts();
      return contacts.filter(contact => contact.is_blocked);
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

export const contactService = new ContactService();
export default contactService;