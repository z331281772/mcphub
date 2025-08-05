#!/usr/bin/env node

/**
 * 用户统计检查脚本
 * 用于验证MCP使用统计中的用户名显示是否正确
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // 管理员token

async function checkUserStats() {
  console.log('📊 开始检查MCP用户统计...\n');

  if (!ADMIN_TOKEN) {
    console.log('❌ 错误: 需要设置ADMIN_TOKEN环境变量');
    console.log('   export ADMIN_TOKEN="your-admin-jwt-token"');
    return;
  }

  try {
    // 获取MCP使用统计
    console.log('📋 获取MCP使用统计...');
    const response = await fetch(`${BASE_URL}/api/mcp-usage/stats?days=30`, {
      headers: {
        'x-auth-token': ADMIN_TOKEN
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ 获取统计数据失败:', error.message);
      return;
    }

    const data = await response.json();
    const stats = data.data;

    console.log('✅ 统计数据获取成功\n');

    // 显示总体统计
    console.log('📈 总体统计:');
    console.log(`   总调用次数: ${stats.totalCalls}`);
    console.log(`   唯一用户数: ${stats.uniqueUsers}`);
    console.log(`   唯一服务器数: ${stats.uniqueServers}`);
    console.log(`   唯一工具数: ${stats.uniqueTools}\n`);

    // 显示最活跃用户
    console.log('👥 最活跃用户:');
    if (stats.mostActiveUsers && stats.mostActiveUsers.length > 0) {
      stats.mostActiveUsers.forEach((user, index) => {
        const indicator = user.username === 'mcphub' ? '⚠️ ' : '✅ ';
        console.log(`   ${index + 1}. ${indicator}${user.username} (${user.count} 次调用)`);
      });
      
      // 检查是否存在mcphub用户
      const mcphubUser = stats.mostActiveUsers.find(u => u.username === 'mcphub');
      if (mcphubUser) {
        console.log('\n🚨 发现问题: 检测到 "mcphub" 用户');
        console.log('   这可能表示用户名设置存在问题');
      } else {
        console.log('\n✅ 用户名设置正常，未发现 "mcphub" 用户');
      }
    } else {
      console.log('   暂无用户使用记录');
    }

    console.log('');

    // 显示最近的调用记录
    console.log('📝 最近的调用记录:');
    if (stats.recentCalls && stats.recentCalls.length > 0) {
      console.log('   时间                     用户名         服务器     工具');
      console.log('   ================================================');
      
      stats.recentCalls.slice(0, 10).forEach(call => {
        const time = new Date(call.timestamp).toLocaleString();
        const indicator = call.username === 'mcphub' ? '⚠️ ' : '  ';
        console.log(`   ${time} ${indicator}${call.username.padEnd(12)} ${call.serverName.padEnd(10)} ${call.toolName}`);
      });
    } else {
      console.log('   暂无调用记录');
    }

  } catch (error) {
    console.log('🔥 检查过程中发生错误:', error.message);
  }

  console.log('\n💡 说明:');
  console.log('   ✅ = 正常用户名');
  console.log('   ⚠️  = 可能存在问题的用户名');
  console.log('\n🔧 如果看到 "mcphub" 用户，请检查:');
  console.log('   1. 用户上下文中间件是否正确设置');
  console.log('   2. token认证是否正常工作');
  console.log('   3. 是否有代码路径错误地使用了服务器名称作为用户名');
}

// 执行检查
if (require.main === module) {
  checkUserStats().catch(console.error);
}

module.exports = checkUserStats;