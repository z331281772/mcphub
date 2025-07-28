import fs from 'fs';
import path from 'path';
import { McpSettings } from '../types/index.js';
import { getSettingsPath, loadOriginalSettings, clearSettingsCache } from './index.js';
import { backupManager, BackupInfo } from './backupManager.js';

// 简化的验证器，避免引入额外依赖
interface ValidationError {
  instancePath: string;
  message: string;
}

class SimpleValidator {
  validate(schema: any, data: any): { valid: boolean; errors?: ValidationError[] } {
    // 基础的类型检查实现
    const errors: ValidationError[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push({ instancePath: '', message: 'must be object' });
      return { valid: false, errors };
    }
    
    // 检查必需字段
    if (!data.mcpServers) {
      errors.push({ instancePath: '/mcpServers', message: 'is required' });
    }
    
    if (!data.users || !Array.isArray(data.users)) {
      errors.push({ instancePath: '/users', message: 'must be array' });
    }
    
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }
}

// JSON Schema for settings validation
const settingsSchema = {
  type: "object",
  required: ["mcpServers", "users"],
  properties: {
    mcpServers: {
      type: "object",
      patternProperties: {
        "^[a-zA-Z0-9_-]+$": {
          type: "object",
          required: ["command", "args"],
          properties: {
            command: { type: "string" },
            args: { type: "array", items: { type: "string" } },
            enabled: { type: "boolean" },
            type: { type: "string" },
            url: { type: "string" },
            env: { type: "object" }
          }
        }
      }
    },
    users: {
      type: "array",
      items: {
        type: "object",
        required: ["username", "password", "isAdmin"],
        properties: {
          username: { type: "string", minLength: 1 },
          password: { type: "string", minLength: 1 },
          isAdmin: { type: "boolean" },
          status: { type: "string", enum: ["active", "disabled"] },
          email: { type: "string" },
          fullName: { type: "string" },
          accessToken: { type: "string" },
          createdAt: { type: "number" },
          lastLoginAt: { type: "number" },
          lastActivity: { type: "number" }
        }
      }
    },
    groups: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          servers: { type: "array", items: { type: "string" } },
          owner: { type: "string" }
        }
      }
    },
    systemConfig: {
      type: "object",
      properties: {
        routing: {
          type: "object",
          properties: {
            enableGlobalRoute: { type: "boolean" },
            enableGroupNameRoute: { type: "boolean" },
            enableBearerAuth: { type: "boolean" },
            bearerAuthKey: { type: "string" },
            skipAuth: { type: "boolean" },
            requireMcpAuth: { type: "boolean" }
          }
        }
      }
    }
  }
};

export class SafeConfigManager {
  private validator: SimpleValidator;
  private readonly lockTimeout = 30000; // 30 seconds
  private activeLocks = new Set<string>();

  constructor() {
    this.validator = new SimpleValidator();
  }

  /**
   * 验证配置数据的有效性
   */
  public validateSettings(settings: any): { valid: boolean; errors?: string[] } {
    const validation = this.validator.validate(settingsSchema, settings);
    
    if (!validation.valid) {
      const errors = validation.errors?.map((err: ValidationError) => 
        `${err.instancePath} ${err.message}`
      ) || ['Unknown validation error'];
      return { valid: false, errors };
    }
    
    // 额外的业务逻辑验证
    const businessValidation = this.validateBusinessRules(settings);
    if (!businessValidation.valid) {
      return businessValidation;
    }
    
    return { valid: true };
  }

  /**
   * 业务规则验证
   */
  private validateBusinessRules(settings: McpSettings): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    // 检查用户名唯一性
    const usernames = settings.users?.map(u => u.username) || [];
    const uniqueUsernames = new Set(usernames);
    if (usernames.length !== uniqueUsernames.size) {
      errors.push('Duplicate usernames found');
    }
    
    // 检查至少有一个管理员
    const hasAdmin = settings.users?.some(u => u.isAdmin) || false;
    if (!hasAdmin) {
      errors.push('At least one admin user is required');
    }
    
    // 检查服务器名称唯一性
    const serverNames = Object.keys(settings.mcpServers || {});
    const uniqueServerNames = new Set(serverNames);
    if (serverNames.length !== uniqueServerNames.size) {
      errors.push('Duplicate server names found');
    }
    
    // 检查访问令牌唯一性
    const tokens = settings.users?.map(u => u.accessToken).filter(Boolean) || [];
    const uniqueTokens = new Set(tokens);
    if (tokens.length !== uniqueTokens.size) {
      errors.push('Duplicate access tokens found');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 安全保存配置（原子写入 + 备份 + 验证）
   */
  public async saveSettingsSafely(settings: McpSettings): Promise<{
    success: boolean;
    error?: string;
    backupInfo?: BackupInfo;
  }> {
    const settingsPath = getSettingsPath();
    const lockKey = `save_settings_${settingsPath}`;
    
    // 防止并发写入
    if (this.activeLocks.has(lockKey)) {
      return { success: false, error: 'Another save operation is in progress' };
    }
    
    this.activeLocks.add(lockKey);
    
    try {
      // 1. 验证新配置
      const validation = this.validateSettings(settings);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors?.join(', ')}`
        };
      }
      
      // 2. 创建当前配置的备份
      const backupInfo = backupManager.createBackup();
      if (!backupInfo) {
        console.warn('Failed to create backup, proceeding anyway...');
      }
      
      // 3. 原子写入新配置
      const writeResult = await this.atomicWrite(settingsPath, settings);
      if (!writeResult.success) {
        return {
          success: false,
          error: writeResult.error,
          backupInfo: backupInfo || undefined
        };
      }
      
      // 4. 验证写入的文件
      const verifyResult = this.verifyWrittenFile(settingsPath, settings);
      if (!verifyResult) {
        // 验证失败，尝试恢复备份
        if (backupInfo) {
          console.error('Written file verification failed, restoring backup...');
          backupManager.restoreFromBackup(backupInfo.path);
        }
        return {
          success: false,
          error: 'File verification failed after write',
          backupInfo: backupInfo || undefined
        };
      }
      
      // 5. 清除缓存，强制重新加载
      clearSettingsCache();
      
      console.log('Settings saved successfully with backup protection');
      return {
        success: true,
        backupInfo: backupInfo || undefined
      };
      
    } catch (error) {
      console.error('Error during safe settings save:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.activeLocks.delete(lockKey);
    }
  }

  /**
   * 原子写入文件
   */
  private async atomicWrite(filePath: string, data: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    
    try {
      // 写入到临时文件
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, jsonData, 'utf8');
      
      // 验证临时文件
      const tempData = fs.readFileSync(tempPath, 'utf8');
      JSON.parse(tempData); // 确保JSON格式正确
      
      // 原子重命名
      fs.renameSync(tempPath, filePath);
      
      return { success: true };
    } catch (error) {
      // 清理临时文件
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown write error'
      };
    }
  }

  /**
   * 验证写入的文件是否与预期一致
   */
  private verifyWrittenFile(filePath: string, expectedData: any): boolean {
    try {
      const writtenData = fs.readFileSync(filePath, 'utf8');
      const parsedData = JSON.parse(writtenData);
      
      // 简单的数据一致性检查
      const expectedJson = JSON.stringify(expectedData);
      const writtenJson = JSON.stringify(parsedData);
      
      return expectedJson === writtenJson;
    } catch (error) {
      console.error('File verification error:', error);
      return false;
    }
  }

  /**
   * 恢复到最新备份
   */
  public restoreToLatestBackup(): { success: boolean; error?: string; backupInfo?: BackupInfo } {
    const latestBackup = backupManager.getLatestBackup();
    
    if (!latestBackup) {
      return { success: false, error: 'No backup available' };
    }
    
    const success = backupManager.restoreFromBackup(latestBackup.path);
    
    if (success) {
      clearSettingsCache();
      return { success: true, backupInfo: latestBackup };
    } else {
      return { success: false, error: 'Failed to restore backup' };
    }
  }

  /**
   * 获取配置健康状态
   */
  public getConfigHealth(): {
    configValid: boolean;
    backupCount: number;
    lastBackup?: BackupInfo;
    errors?: string[];
  } {
    try {
      const currentSettings = loadOriginalSettings();
      const validation = this.validateSettings(currentSettings);
      const backupStatus = backupManager.getBackupStatus();
      
      return {
        configValid: validation.valid,
        backupCount: backupStatus.totalBackups,
        lastBackup: backupStatus.latestBackup || undefined,
        errors: validation.errors
      };
    } catch (error) {
      return {
        configValid: false,
        backupCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * 列出所有可用备份
   */
  public listAvailableBackups(): BackupInfo[] {
    return backupManager.listBackups();
  }

  /**
   * 恢复到指定备份
   */
  public restoreToSpecificBackup(backupPath: string): { success: boolean; error?: string } {
    const success = backupManager.restoreFromBackup(backupPath);
    
    if (success) {
      clearSettingsCache();
      return { success: true };
    } else {
      return { success: false, error: 'Failed to restore from specified backup' };
    }
  }
}

// 导出单例实例
export const safeConfigManager = new SafeConfigManager(); 