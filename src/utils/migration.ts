// filepath: /Users/sunmeng/code/github/mcphub/src/utils/migration.ts
import fs from 'fs';
import path from 'path';
import { loadSettings, saveSettings } from '../config/index.js';
import { IUser } from '../types/index.js';

/**
 * Migrates user data from the old users.json file to mcp_settings.json
 * This is a one-time migration to support the refactoring from separate
 * users.json to integrated user data in mcp_settings.json
 */
export const migrateUserData = (): void => {
  const oldUsersFilePath = path.join(process.cwd(), 'data', 'users.json');
  
  // Check if the old users file exists
  if (fs.existsSync(oldUsersFilePath)) {
    try {
      // Read users from the old file
      const usersData = fs.readFileSync(oldUsersFilePath, 'utf8');
      const users = JSON.parse(usersData) as IUser[];
      
      if (users && Array.isArray(users) && users.length > 0) {
        console.log(`Migrating ${users.length} users from users.json to mcp_settings.json`);
        
        // Load current settings
        const settings = loadSettings();
        
        // Merge users, giving priority to existing settings users
        const existingUsernames = new Set((settings.users || []).map(u => u.username));
        const newUsers = users.filter(u => !existingUsernames.has(u.username));
        
        settings.users = [...(settings.users || []), ...newUsers];
        
        // Save updated settings
        if (saveSettings(settings)) {
          console.log('User data migration completed successfully');
          
          // Rename the old file as backup
          const backupPath = `${oldUsersFilePath}.bak.${Date.now()}`;
          fs.renameSync(oldUsersFilePath, backupPath);
          console.log(`Renamed old users file to ${backupPath}`);
        }
      } else {
        console.log('No users found in users.json, skipping migration');
      }
    } catch (error) {
      console.error('Error during user data migration:', error);
    }
  } else {
    console.log('users.json not found, no migration needed');
  }
};