import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { getSettingsPath } from './index.js';

export interface BackupInfo {
  timestamp: number;
  hash: string;
  size: number;
  path: string;
}

export class BackupManager {
  private maxBackups: number = 10;
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(path.dirname(getSettingsPath()), 'backups');
    this.ensureBackupDirectoryExists();
  }

  private ensureBackupDirectoryExists(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 创建配置文件备份
   */
  public createBackup(): BackupInfo | null {
    const settingsPath = getSettingsPath();
    
    if (!fs.existsSync(settingsPath)) {
      console.warn('Settings file does not exist, cannot create backup');
      return null;
    }

    try {
      const timestamp = Date.now();
      const data = fs.readFileSync(settingsPath);
      const hash = createHash('sha256').update(data).digest('hex').substring(0, 16);
      const backupFileName = `mcp_settings.${timestamp}.${hash}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);

      fs.copyFileSync(settingsPath, backupPath);

      const backupInfo: BackupInfo = {
        timestamp,
        hash,
        size: data.length,
        path: backupPath
      };

      console.log(`Created backup: ${backupFileName} (${data.length} bytes)`);
      
      // 清理旧备份
      this.cleanOldBackups();
      
      return backupInfo;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return null;
    }
  }

  /**
   * 恢复到指定备份
   */
  public restoreFromBackup(backupPath: string): boolean {
    const settingsPath = getSettingsPath();
    
    try {
      if (!fs.existsSync(backupPath)) {
        console.error(`Backup file not found: ${backupPath}`);
        return false;
      }

      // 验证备份文件的完整性
      if (!this.validateBackupFile(backupPath)) {
        console.error('Backup file validation failed');
        return false;
      }

      // 在恢复前创建当前状态的备份
      this.createBackup();

      // 恢复备份
      fs.copyFileSync(backupPath, settingsPath);
      console.log(`Restored from backup: ${backupPath}`);
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * 验证备份文件的有效性
   */
  private validateBackupFile(backupPath: string): boolean {
    try {
      const data = fs.readFileSync(backupPath, 'utf-8');
      JSON.parse(data); // 验证JSON格式
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清理旧备份文件
   */
  private cleanOldBackups(): void {
    try {
      const backups = this.listBackups();
      
      if (backups.length > this.maxBackups) {
        // 按时间戳排序，保留最新的
        backups.sort((a, b) => b.timestamp - a.timestamp);
        
        const toDelete = backups.slice(this.maxBackups);
        toDelete.forEach(backup => {
          try {
            fs.unlinkSync(backup.path);
            console.log(`Deleted old backup: ${path.basename(backup.path)}`);
          } catch (error) {
            console.warn(`Failed to delete backup: ${backup.path}`, error);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to clean old backups:', error);
    }
  }

  /**
   * 获取所有备份列表
   */
  public listBackups(): BackupInfo[] {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups: BackupInfo[] = [];

      files.forEach(fileName => {
        if (fileName.startsWith('mcp_settings.') && fileName.endsWith('.json')) {
          const filePath = path.join(this.backupDir, fileName);
          const stats = fs.statSync(filePath);
          
          // 解析文件名获取时间戳和哈希
          const parts = fileName.replace('mcp_settings.', '').replace('.json', '').split('.');
          if (parts.length >= 2) {
            const timestamp = parseInt(parts[0]);
            const hash = parts[1];
            
            if (!isNaN(timestamp)) {
              backups.push({
                timestamp,
                hash,
                size: stats.size,
                path: filePath
              });
            }
          }
        }
      });

      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * 获取最新备份
   */
  public getLatestBackup(): BackupInfo | null {
    const backups = this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * 检查备份状态
   */
  public getBackupStatus(): {
    totalBackups: number;
    latestBackup: BackupInfo | null;
    totalSize: number;
    oldestBackup: BackupInfo | null;
  } {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    
    return {
      totalBackups: backups.length,
      latestBackup: backups.length > 0 ? backups[0] : null,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1] : null,
      totalSize
    };
  }
}

// 导出单例实例
export const backupManager = new BackupManager(); 