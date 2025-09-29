/**
 * Cartrita Interface - User Service
 * Type-safe user management with comprehensive error handling
 */

import { apiClient } from './api';
import { User, CreateUserRequest, UpdateUserRequest, PaginatedResponse, ApiResponse } from '@/types';
import { logger } from '@/utils/logger';

export class UserService {
  private readonly baseEndpoint = '/users';

  public async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  } = {}): Promise<PaginatedResponse<User>> {
    try {
      logger.info('Fetching users', { params });

      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.role) queryParams.append('role', params.role);
      if (params.status) queryParams.append('status', params.status);

      const url = `${this.baseEndpoint}?${queryParams.toString()}`;
      const response = await apiClient.get<PaginatedResponse<User>>(url);

      logger.info('Users fetched successfully', {
        totalUsers: response.data.pagination.total,
        page: response.data.pagination.page,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch users', error instanceof Error ? error : new Error(String(error)), { params });
      throw error;
    }
  }

  public async getUserById(id: string): Promise<User> {
    try {
      logger.info('Fetching user by ID', { userId: id });

      const response = await apiClient.get<User>(`${this.baseEndpoint}/${id}`);

      logger.info('User fetched successfully', { userId: id });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user', error instanceof Error ? error : new Error(String(error)), { userId: id });
      throw error;
    }
  }

  public async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      logger.info('Creating new user', { email: userData.email, role: userData.role });

      // Validate required fields
      this.validateCreateUserData(userData);

      const response = await apiClient.post<User>(this.baseEndpoint, userData);

      logger.info('User created successfully', {
        userId: response.data.id,
        email: response.data.email,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create user', error instanceof Error ? error : new Error(String(error)), {
        email: userData.email,
        role: userData.role,
      });
      throw error;
    }
  }

  public async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    try {
      logger.info('Updating user', { userId: id, updates: Object.keys(userData) });

      // Validate update data
      this.validateUpdateUserData(userData);

      const response = await apiClient.put<User>(`${this.baseEndpoint}/${id}`, userData);

      logger.info('User updated successfully', { userId: id });

      return response.data;
    } catch (error) {
      logger.error('Failed to update user', error instanceof Error ? error : new Error(String(error)), {
        userId: id,
        updates: Object.keys(userData),
      });
      throw error;
    }
  }

  public async deleteUser(id: string): Promise<void> {
    try {
      logger.info('Deleting user', { userId: id });

      await apiClient.delete(`${this.baseEndpoint}/${id}`);

      logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      logger.error('Failed to delete user', error instanceof Error ? error : new Error(String(error)), { userId: id });
      throw error;
    }
  }

  public async changeUserStatus(id: string, status: User['status']): Promise<User> {
    try {
      logger.info('Changing user status', { userId: id, newStatus: status });

      const response = await apiClient.patch<User>(`${this.baseEndpoint}/${id}/status`, { status });

      logger.info('User status changed successfully', { userId: id, newStatus: status });

      return response.data;
    } catch (error) {
      logger.error('Failed to change user status', error instanceof Error ? error : new Error(String(error)), {
        userId: id,
        newStatus: status,
      });
      throw error;
    }
  }

  public async resetUserPassword(id: string): Promise<{ tempPassword: string }> {
    try {
      logger.info('Resetting user password', { userId: id });

      const response = await apiClient.post<{ tempPassword: string }>(`${this.baseEndpoint}/${id}/reset-password`);

      logger.info('User password reset successfully', { userId: id });

      return response.data;
    } catch (error) {
      logger.error('Failed to reset user password', error instanceof Error ? error : new Error(String(error)), { userId: id });
      throw error;
    }
  }

  private validateCreateUserData(userData: CreateUserRequest): void {
    const errors: string[] = [];

    if (!userData.name?.trim()) {
      errors.push('Name is required');
    }

    if (!userData.email?.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(userData.email)) {
      errors.push('Email format is invalid');
    }

    if (!userData.password?.trim()) {
      errors.push('Password is required');
    } else if (userData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!userData.role) {
      errors.push('Role is required');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  private validateUpdateUserData(userData: UpdateUserRequest): void {
    const errors: string[] = [];

    if (userData.name !== undefined && !userData.name?.trim()) {
      errors.push('Name cannot be empty');
    }

    if (userData.email !== undefined) {
      if (!userData.email?.trim()) {
        errors.push('Email cannot be empty');
      } else if (!this.isValidEmail(userData.email)) {
        errors.push('Email format is invalid');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Create singleton service instance
export const userService = new UserService();

export default userService;