import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import accessLogService from '../services/accessLogService.js';

// Get access logs
export const getAccessLogs = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    const { 
      limit = 50, 
      offset = 0, 
      username, 
      startDate, 
      endDate 
    } = req.query;

    // Non-admin users can only see their own logs
    const targetUsername = currentUser.isAdmin 
      ? (username as string) 
      : currentUser.username;

    const result = accessLogService.getLogs(
      parseInt(limit as string),
      parseInt(offset as string),
      targetUsername,
      startDate ? parseInt(startDate as string) : undefined,
      endDate ? parseInt(endDate as string) : undefined
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting access logs:', error);
    res.status(500).json({ success: false, error: 'Error getting access logs' });
  }
};

// Get system overview (admin only)
export const getSystemOverview = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const overview = accessLogService.getSystemOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('Error getting system overview:', error);
    res.status(500).json({ success: false, error: 'Error getting system overview' });
  }
};

// Clean old logs (admin only)
export const cleanOldLogs = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const { beforeTimestamp } = req.body;
    
    if (!beforeTimestamp) {
      res.status(400).json({ success: false, message: 'beforeTimestamp is required' });
      return;
    }

    const deletedCount = accessLogService.cleanOldLogs(beforeTimestamp);
    res.json({ 
      success: true, 
      message: `Deleted ${deletedCount} old log entries`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error cleaning old logs:', error);
    res.status(500).json({ success: false, error: 'Error cleaning old logs' });
  }
};

// Clear all logs (admin only)
export const clearAllLogs = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    accessLogService.clearAllLogs();
    res.json({ success: true, message: 'All access logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing all logs:', error);
    res.status(500).json({ success: false, error: 'Error clearing all logs' });
  }
};

// Export logs as JSON (admin only)
export const exportLogs = (req: Request, res: Response): void => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const { 
      username, 
      startDate, 
      endDate 
    } = req.query;

    const result = accessLogService.getLogs(
      undefined, // no limit
      undefined, // no offset
      username as string,
      startDate ? parseInt(startDate as string) : undefined,
      endDate ? parseInt(endDate as string) : undefined
    );

    // Set headers for file download
    const filename = `access_logs_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    res.json(result.logs);
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({ success: false, error: 'Error exporting logs' });
  }
}; 