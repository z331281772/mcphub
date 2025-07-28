import { getApiUrl } from '../utils/runtime';
import { getToken } from './authService';
import { User, ApiResponse } from './userService';

export interface TokenValidation {
  valid: boolean;
  username?: string;
  error?: string;
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

// Generate access token for user (admin only)
export const generateUserToken = async (username: string): Promise<string> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl(`/auth/users/${username}/token`), {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate access token');
    }
    
    const data: ApiResponse<{ token: string }> = await response.json();
    if (!data.data?.token) {
      throw new Error('Invalid response data');
    }
    
    return data.data.token;
  } catch (error) {
    console.error('Error generating user token:', error);
    throw error;
  }
};

// Update user access token (admin only)
export const updateUserToken = async (username: string, token: string): Promise<void> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl(`/auth/users/${username}/token`), {
      method: 'PUT',
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update access token');
    }
  } catch (error) {
    console.error('Error updating user token:', error);
    throw error;
  }
};

// Revoke user access token (admin only)
export const revokeUserToken = async (username: string): Promise<void> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl(`/auth/users/${username}/token`), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to revoke access token');
    }
  } catch (error) {
    console.error('Error revoking user token:', error);
    throw error;
  }
};

// Validate access token
export const validateToken = async (token: string): Promise<TokenValidation> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl('/auth/validate-token'), {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        valid: false,
        error: errorData.message || 'Token validation failed',
      };
    }
    
    const data: ApiResponse<TokenValidation> = await response.json();
    return data.data || { valid: false, error: 'Invalid response' };
  } catch (error) {
    console.error('Error validating token:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
    };
  }
};

// Get all users with their tokens (admin only)
export const getUsersWithTokens = async (): Promise<User[]> => {
  try {
    const response = await makeAuthenticatedRequest(getApiUrl('/auth/users-with-tokens'));
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch users with tokens');
    }
    
    const data: ApiResponse<User[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching users with tokens:', error);
    throw error;
  }
};

// Utility functions for token display
export const maskToken = (token: string, showLength: number = 20): string => {
  if (!token) return '';
  if (token.length <= showLength) return token;
  return `${token.substring(0, showLength)}...`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}; 