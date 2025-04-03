import { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiResponse, AddServerRequest } from '../types/index.js';
import { getServersInfo, addServer, removeServer } from '../services/mcpService.js';
import { loadSettings } from '../config/index.js';

let mcpServerInstance: McpServer;

export const setMcpServerInstance = (server: McpServer): void => {
  mcpServerInstance = server;
};

export const getAllServers = (_: Request, res: Response): void => {
  try {
    const serversInfo = getServersInfo();
    const response: ApiResponse = {
      success: true,
      data: serversInfo,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get servers information',
    });
  }
};

export const getAllSettings = (_: Request, res: Response): void => {
  try {
    const settings = loadSettings();
    const response: ApiResponse = {
      success: true,
      data: settings,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get server settings',
    });
  }
};

export const createServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, config } = req.body as AddServerRequest;

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    if (!config || typeof config !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Server configuration is required',
      });
      return;
    }

    if (!config.url && (!config.command || !config.args)) {
      res.status(400).json({
        success: false,
        message: 'Server configuration must include either a URL or command with arguments',
      });
      return;
    }

    const result = await addServer(mcpServerInstance, name, config);

    if (result.success) {
      res.json({
        success: true,
        message: 'Server added successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to add server',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    const result = removeServer(name);

    if (result.success) {
      res.json({
        success: true,
        message: 'Server removed successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || 'Server not found or failed to remove',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
