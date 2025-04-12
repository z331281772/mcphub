import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, IUser } from '../types';
import * as authService from '../services/authService';

// Initial auth state
const initialState: AuthState = {
  token: null,
  isAuthenticated: false,
  loading: true,
  user: null,
  error: null,
};

// Create auth context
const AuthContext = createContext<{
  auth: AuthState;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, isAdmin?: boolean) => Promise<boolean>;
  logout: () => void;
}>({
  auth: initialState,
  login: async () => false,
  register: async () => false,
  logout: () => {},
});

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(initialState);

  // Load user if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = authService.getToken();
      
      if (!token) {
        setAuth({
          ...initialState,
          loading: false,
        });
        return;
      }
      
      try {
        const response = await authService.getCurrentUser();
        
        if (response.success && response.user) {
          setAuth({
            token,
            isAuthenticated: true,
            loading: false,
            user: response.user,
            error: null,
          });
        } else {
          authService.removeToken();
          setAuth({
            ...initialState,
            loading: false,
          });
        }
      } catch (error) {
        authService.removeToken();
        setAuth({
          ...initialState,
          loading: false,
        });
      }
    };
    
    loadUser();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ username, password });
      
      if (response.success && response.token && response.user) {
        setAuth({
          token: response.token,
          isAuthenticated: true,
          loading: false,
          user: response.user,
          error: null,
        });
        return true;
      } else {
        setAuth({
          ...initialState,
          loading: false,
          error: response.message || 'Authentication failed',
        });
        return false;
      }
    } catch (error) {
      setAuth({
        ...initialState,
        loading: false,
        error: 'Authentication failed',
      });
      return false;
    }
  };

  // Register function
  const register = async (
    username: string, 
    password: string, 
    isAdmin = false
  ): Promise<boolean> => {
    try {
      const response = await authService.register({ username, password, isAdmin });
      
      if (response.success && response.token && response.user) {
        setAuth({
          token: response.token,
          isAuthenticated: true,
          loading: false,
          user: response.user,
          error: null,
        });
        return true;
      } else {
        setAuth({
          ...initialState,
          loading: false,
          error: response.message || 'Registration failed',
        });
        return false;
      }
    } catch (error) {
      setAuth({
        ...initialState,
        loading: false,
        error: 'Registration failed',
      });
      return false;
    }
  };

  // Logout function
  const logout = (): void => {
    authService.logout();
    setAuth({
      ...initialState,
      loading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);