import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import {
  findUserByUsername,
  verifyPassword,
  createUser,
  updateUserPassword,
  updateLastLogin,
  getUsers,
  updateUser,
  updateUserStatus,
  deleteUser,
  generateAccessToken,
  updateAccessToken,
  revokeAccessToken,
  validateAccessToken,
} from '../models/User.js';
import { getDataService } from '../services/services.js';
import { DataService } from '../services/dataService.js';
import accessLogService from '../services/accessLogService.js';

const dataService: DataService = getDataService();

// JWT Secret key - critical for security
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your-secret-key-change-this') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment and cannot be the default value');
    }
    console.warn('WARNING: Using default JWT secret. This is ONLY acceptable in development!');
    return 'your-secret-key-change-this';
  }
  return secret;
})();
const TOKEN_EXPIRY = '24h';

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { username, password } = req.body;

  try {
    // Find user by username
    const user = findUserByUsername(username);

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Check if user is disabled
    if (user.status === 'disabled') {
      res.status(401).json({ success: false, message: 'Account is disabled' });
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Update last login time
    updateLastLogin(username);

    // Generate JWT token
    const payload = {
      user: {
        username: user.username,
        isAdmin: user.isAdmin || false,
      },
    };

    jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY }, (err, token) => {
      if (err) throw err;
      res.json({
        success: true,
        token,
        user: {
          username: user.username,
          isAdmin: user.isAdmin,
          permissions: dataService.getPermissions(user),
        },
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { username, password, isAdmin, email, fullName } = req.body;

  try {
    // Check if user is admin (only admins can create new users)
    const currentUser = (req as any).user;
    if (currentUser && !currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    // Create new user
    const newUser = await createUser({ 
      username, 
      password, 
      isAdmin,
      email,
      fullName,
      status: 'active'
    });

    if (!newUser) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        username: newUser.username,
        isAdmin: newUser.isAdmin,
        status: newUser.status,
        email: newUser.email,
        fullName: newUser.fullName,
        createdAt: newUser.createdAt,
        },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get current user
export const getCurrentUser = (req: Request, res: Response): void => {
  try {
    // User is already attached to request by auth middleware
    const currentUser = (req as any).user;

    // Get complete user info including access token
    const fullUser = findUserByUsername(currentUser.username);
    if (!fullUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Remove password from response but include access token
    const { password, ...userWithoutPassword } = fullUser;

    res.json({
      success: true,
      user: {
        ...userWithoutPassword,
        permissions: dataService.getPermissions(currentUser),
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  const username = (req as any).user.username;

  try {
    // Find user by username
    const user = findUserByUsername(username);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    // Update the password
    const updated = await updateUserPassword(username, newPassword);

    if (!updated) {
      res.status(500).json({ success: false, message: 'Failed to update password' });
      return;
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all users (admin only)
export const getAllUsers = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const users = getUsers().map(user => ({
      username: user.username,
      isAdmin: user.isAdmin,
      status: user.status,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastActivity: user.lastActivity,
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: 'Error getting users' });
  }
};

// Get all users with their tokens (admin only)
export const getUsersWithTokens = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const users = getUsers().map(user => ({
      username: user.username,
      isAdmin: user.isAdmin,
      status: user.status,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastActivity: user.lastActivity,
      accessToken: user.accessToken,
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error getting users with tokens:', error);
    res.status(500).json({ success: false, error: 'Error getting users' });
  }
};

// Update user (admin only)
export const updateUserInfo = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    const { username } = req.params;
    const updates = req.body;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    // Prevent admin from disabling themselves
    if (username === currentUser.username && updates.status === 'disabled') {
      res.status(400).json({ success: false, message: 'Cannot disable your own account' });
      return;
    }

    const updated = updateUser(username, updates);
    
    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Error updating user' });
  }
};

// Delete user (admin only)
export const deleteUserAccount = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    const { username } = req.params;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    // Prevent admin from deleting themselves
    if (username === currentUser.username) {
      res.status(400).json({ success: false, message: 'Cannot delete your own account' });
      return;
    }

    const deleted = deleteUser(username);
    
    if (!deleted) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Error deleting user' });
  }
};

// Update user status (admin only)
export const updateUserAccountStatus = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    const { username } = req.params;
    const { status } = req.body;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    // Prevent admin from disabling themselves
    if (username === currentUser.username && status === 'disabled') {
      res.status(400).json({ success: false, message: 'Cannot disable your own account' });
      return;
    }

    const updated = updateUserStatus(username, status);
    
    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, message: `User ${status} successfully` });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, error: 'Error updating user status' });
  }
};

// Generate access token for user (admin only)
export const generateUserAccessToken = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    const { username } = req.params;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const token = generateAccessToken(username);
    
    if (!token) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Access token generated successfully',
      token: token
    });
  } catch (error) {
    console.error('Error generating access token:', error);
    res.status(500).json({ success: false, error: 'Error generating access token' });
  }
};

// Update access token for user (admin only)
export const updateUserAccessToken = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    const { username } = req.params;
    const { token } = req.body;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    if (!token) {
      res.status(400).json({ success: false, message: 'Token is required' });
      return;
    }

    const updated = updateAccessToken(username, token);
    
    if (!updated) {
      res.status(400).json({ success: false, message: 'User not found or token already in use' });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Access token updated successfully'
    });
  } catch (error) {
    console.error('Error updating access token:', error);
    res.status(500).json({ success: false, error: 'Error updating access token' });
  }
};

// Revoke access token for user (admin only)
export const revokeUserAccessToken = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    const { username } = req.params;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const revoked = revokeAccessToken(username);
    
    if (!revoked) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Access token revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking access token:', error);
    res.status(500).json({ success: false, error: 'Error revoking access token' });
  }
};

// Validate access token
export const validateUserAccessToken = (req: Request, res: Response): void => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({ success: false, message: 'Token is required' });
      return;
    }

    const validation = validateAccessToken(token);
    
    res.json({ 
      success: true, 
      valid: validation.valid,
      username: validation.username,
      user: validation.user ? {
        username: validation.user.username,
        isAdmin: validation.user.isAdmin,
        status: validation.user.status,
        email: validation.user.email,
        fullName: validation.user.fullName,
      } : undefined,
      error: validation.error
    });
  } catch (error) {
    console.error('Error validating access token:', error);
    res.status(500).json({ success: false, error: 'Error validating access token' });
  }
};

// Get user statistics
export const getUserStatistics = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    const { username } = req.params;
    
    // Users can only see their own stats, admins can see any user's stats
    if (!currentUser.isAdmin && currentUser.username !== username) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const stats = accessLogService.getUserStatistics(username);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({ success: false, error: 'Error getting user statistics' });
  }
};

// Get all users statistics (admin only)
export const getAllUsersStatistics = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const users = getUsers();
    const stats = users.map(user => accessLogService.getUserStatistics(user.username));
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting users statistics:', error);
    res.status(500).json({ success: false, error: 'Error getting users statistics' });
  }
};
