import { getApiUrl } from '../utils/runtime';
import { getToken } from './authService';

export interface User {
  username: string;
  email?: string;
  fullName?: string;
  isAdmin: boolean;
  status: 'active' | 'disabled';
  createdAt: number;
  lastLoginAt?: number;
  lastActivity?: number;
  accessToken?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  fullName?: string;
  isAdmin: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  isAdmin?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'x-auth-token': token }),
      ...options.headers,
    },
  });
};

// Get all users (admin only)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl('/auth/users'));
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch users');
    }
    
    const data: ApiResponse<User[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Create new user (admin only)
export const createUser = async (userData: CreateUserRequest): Promise<User> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl('/auth/register'), {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create user');
    }
    
    const data: ApiResponse<User> = await response.json();
    if (!data.data) {
      throw new Error('Invalid response data');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update user information (admin only)
export const updateUser = async (username: string, updates: UpdateUserRequest): Promise<User> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl(`/auth/users/${username}`), {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user');
    }
    
    const data: ApiResponse<User> = await response.json();
    if (!data.data) {
      throw new Error('Invalid response data');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user (admin only)
export const deleteUser = async (username: string): Promise<void> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl(`/auth/users/${username}`), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Update user status (admin only)
export const updateUserStatus = async (username: string, status: 'active' | 'disabled'): Promise<void> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl(`/auth/users/${username}/status`), {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user status');
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Get user statistics
export const getUserStatistics = async (username: string): Promise<any> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl(`/auth/users/${username}/statistics`));
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user statistics');
    }
    
    const data: ApiResponse<any> = await response.json();
    return data.data || {};
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
};

// Get all users statistics (admin only)
export const getAllUsersStatistics = async (): Promise<any[]> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl('/auth/users-statistics'));
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch users statistics');
    }
    
    const data: ApiResponse<any[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching users statistics:', error);
    throw error;
  }
}; 