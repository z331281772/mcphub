import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { IUser, ITokenValidation } from '../types/index.js';
import { loadSettings, saveSettings } from '../config/index.js';

// Simple mutex to prevent concurrent file operations
let isWriting = false;
const writeQueue: Array<() => void> = [];

// Get all users
export const getUsers = (): IUser[] => {
  try {
    const settings = loadSettings();
    return settings.users || [];
  } catch (error) {
    console.error('Error reading users from settings:', error);
    return [];
  }
};

// Save users to settings with concurrency protection
const saveUsers = (users: IUser[]): void => {
  const performWrite = () => {
    try {
      const settings = loadSettings();
      settings.users = users;
      saveSettings(settings);
    } catch (error) {
      console.error('Error saving users to settings:', error);
    } finally {
      isWriting = false;
      // Process next item in queue
      const nextWrite = writeQueue.shift();
      if (nextWrite) {
        nextWrite();
      }
    }
  };

  if (isWriting) {
    // Add to queue if currently writing
    writeQueue.push(performWrite);
  } else {
    isWriting = true;
    performWrite();
  }
};

// Create a new user
export const createUser = async (userData: IUser): Promise<IUser | null> => {
  const users = getUsers();

  // Check if username already exists
  if (users.some((user) => user.username === userData.username)) {
    return null;
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  const newUser: IUser = {
    username: userData.username,
    password: hashedPassword,
    isAdmin: userData.isAdmin || false,
    status: userData.status || 'active',
    email: userData.email,
    fullName: userData.fullName,
    createdAt: Date.now(),
    lastLoginAt: undefined,
    lastActivity: undefined,
    accessToken: userData.accessToken,
  };

  users.push(newUser);
  saveUsers(users);

  return newUser;
};

// Find user by username
export const findUserByUsername = (username: string): IUser | undefined => {
  const users = getUsers();
  return users.find((user) => user.username === username);
};

// Verify user password
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// Update user password
export const updateUserPassword = async (
  username: string,
  newPassword: string,
): Promise<boolean> => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return false;
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update the user's password
  users[userIndex].password = hashedPassword;
  saveUsers(users);

  return true;
};

// Update user information
export const updateUser = (username: string, updates: Partial<IUser>): boolean => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return false;
  }

  // Don't allow updating username, password, or sensitive fields directly
  const allowedUpdates = {
    isAdmin: updates.isAdmin,
    status: updates.status,
    email: updates.email,
    fullName: updates.fullName,
  };

  Object.assign(users[userIndex], allowedUpdates);
  saveUsers(users);

  return true;
};

// Delete user
export const deleteUser = (username: string): boolean => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return false;
  }

  users.splice(userIndex, 1);
  saveUsers(users);

  return true;
};

// Update user status
export const updateUserStatus = (username: string, status: 'active' | 'disabled'): boolean => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return false;
  }

  users[userIndex].status = status;
  saveUsers(users);

  return true;
};

// Update last login time
export const updateLastLogin = (username: string): boolean => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return false;
  }

  users[userIndex].lastLoginAt = Date.now();
  saveUsers(users);

  return true;
};

// Update last activity time
export const updateLastActivity = (username: string): boolean => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return false;
  }

  users[userIndex].lastActivity = Date.now();
  saveUsers(users);

  return true;
};

// Generate access token for user
export const generateAccessToken = (username: string): string | null => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return null;
  }

  const token = `mcp_${randomBytes(16).toString('hex')}`;
  users[userIndex].accessToken = token;
  saveUsers(users);

  return token;
};

// Update user access token
export const updateAccessToken = (username: string, token: string): boolean => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return false;
  }

  // Check if token is already used by another user
  const existingUser = users.find((user) => user.accessToken === token && user.username !== username);
  if (existingUser) {
    return false; // Token already in use
  }

  users[userIndex].accessToken = token;
  saveUsers(users);

  return true;
};

// Revoke user access token
export const revokeAccessToken = (username: string): boolean => {
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) {
    return false;
  }

  users[userIndex].accessToken = undefined;
  saveUsers(users);

  return true;
};

// Validate access token
export const validateAccessToken = (token: string): ITokenValidation => {
  if (!token) {
    return { valid: false, error: 'Token is required' };
  }

  const users = getUsers();
  const user = users.find((user) => user.accessToken === token);

  if (!user) {
    return { valid: false, error: 'Invalid access token' };
  }

  if (user.status === 'disabled') {
    return { valid: false, error: 'User account is disabled' };
  }

  return {
    valid: true,
    username: user.username,
    user: user,
  };
};

// Find user by access token
export const findUserByAccessToken = (token: string): IUser | undefined => {
  const users = getUsers();
  return users.find((user) => user.accessToken === token && user.status !== 'disabled');
};

// Initialize with default admin user if no users exist
export const initializeDefaultUser = async (): Promise<void> => {
  const users = getUsers();

  if (users.length === 0) {
    // Use environment variable for admin password, with secure fallback
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'mcphub@2024';
    
    await createUser({
      username: 'admin',
      password: defaultPassword,
      isAdmin: true,
      status: 'active',
      email: 'admin@mcphub.local',
      fullName: 'Administrator',
    });
    
    if (!process.env.DEFAULT_ADMIN_PASSWORD) {
      console.warn('🔐 SECURITY WARNING: Using default admin password!');
      console.warn('🔑 Default admin credentials:');
      console.warn('   Username: admin');
      console.warn('   Password: mcphub@2024');
      console.warn('📋 IMPORTANT: Please change this password immediately after first login!');
      console.warn('💡 For production, set DEFAULT_ADMIN_PASSWORD environment variable.');
      console.warn('   Example: DEFAULT_ADMIN_PASSWORD=your-secure-password');
    } else {
      console.log('✅ Default admin user created with custom password from environment variable');
      console.log('   Username: admin');
      console.log('   Password: [from DEFAULT_ADMIN_PASSWORD]');
    }
  }
};
