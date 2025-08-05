#!/usr/bin/env node

/**
 * 认证配置检查脚本
 * 用于验证MCP认证相关的配置是否正确
 */

const fs = require('fs');
const path = require('path');

function checkAuthConfig() {
  console.log('🔧 开始检查MCP认证配置...\n');

  // 检查mcp_settings.json文件
  const settingsPath = path.join(process.cwd(), 'mcp_settings.json');
  
  try {
    if (!fs.existsSync(settingsPath)) {
      console.log('❌ 未找到 mcp_settings.json 文件');
      console.log('   请确保在项目根目录运行此脚本');
      return;
    }

    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(settingsContent);

    console.log('✅ 找到 mcp_settings.json 文件\n');

    // 检查systemConfig
    console.log('📋 检查系统配置:');
    
    if (!settings.systemConfig) {
      console.log('⚠️  未找到 systemConfig 配置，将使用默认值');
      console.log('   默认配置:');
      console.log('   - requireMcpAuth: false');
      console.log('   - enableBearerAuth: false');
      console.log('   - enableGlobalRoute: true');
      console.log('   - enableGroupNameRoute: true');
      console.log('   - skipAuth: false');
    } else {
      const routing = settings.systemConfig.routing || {};
      
      console.log('✅ 找到 systemConfig.routing 配置:');
      console.log(`   - requireMcpAuth: ${routing.requireMcpAuth || false}`);
      console.log(`   - enableBearerAuth: ${routing.enableBearerAuth || false}`);
      console.log(`   - enableGlobalRoute: ${routing.enableGlobalRoute !== false}`);
      console.log(`   - enableGroupNameRoute: ${routing.enableGroupNameRoute !== false}`);
      console.log(`   - skipAuth: ${routing.skipAuth || false}`);
      
      if (routing.enableBearerAuth) {
        if (routing.bearerAuthKey) {
          console.log(`   - bearerAuthKey: 已设置 (长度: ${routing.bearerAuthKey.length})`);
        } else {
          console.log('   ⚠️  enableBearerAuth 为 true 但未设置 bearerAuthKey');
        }
      }
    }

    console.log('');

    // 检查用户配置
    console.log('👥 检查用户配置:');
    if (settings.users && Array.isArray(settings.users)) {
      console.log(`✅ 找到 ${settings.users.length} 个用户`);
      settings.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username} (${user.isAdmin ? '管理员' : '普通用户'})`);
      });
    } else {
      console.log('❌ 未找到用户配置');
    }

    console.log('');

    // 给出建议
    console.log('💡 配置建议:');
    
    const routing = settings.systemConfig?.routing || {};
    
    if (routing.requireMcpAuth) {
      console.log('✅ MCP强制认证已启用');
      console.log('   - 所有MCP请求都需要有效的访问token');
      console.log('   - 请确保客户端使用正确的token格式');
    } else {
      console.log('⚠️  MCP强制认证未启用');
      console.log('   - 客户端可以在没有token的情况下访问MCP服务');
      console.log('   - 建议在生产环境中启用 requireMcpAuth');
    }

    if (routing.enableBearerAuth && !routing.bearerAuthKey) {
      console.log('🚨 Bearer认证配置问题:');
      console.log('   - enableBearerAuth 为 true 但未设置 bearerAuthKey');
      console.log('   - 这将导致所有Bearer认证失败');
    }

  } catch (error) {
    console.log('🔥 读取配置文件时发生错误:', error.message);
  }

  console.log('\n🔧 如需启用MCP强制认证，请修改 mcp_settings.json:');
  console.log(`{
  "systemConfig": {
    "routing": {
      "requireMcpAuth": true,
      "enableBearerAuth": false,
      "enableGlobalRoute": true,
      "enableGroupNameRoute": true,
      "skipAuth": false
    }
  },
  ...
}`);

  console.log('\n🔑 生成访问token:');
  console.log('   1. 登录管理面板');
  console.log('   2. 进入"用户管理"页面');
  console.log('   3. 为用户生成访问token');
  console.log('   4. 客户端使用 Authorization: Bearer <token> 或 ?token=<token>');
}

// 执行检查
if (require.main === module) {
  checkAuthConfig();
}

module.exports = checkAuthConfig;