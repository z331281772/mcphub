#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🔍 MCPHub 统计功能诊断工具');
console.log('================================');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testMcpStats() {
  console.log('\n1. 📊 检查数据文件...');
  
  // 检查日志文件
  const logFile = path.join(__dirname, 'mcp_usage_logs', 'mcp_usage.json');
  if (fs.existsSync(logFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      console.log(`✅ 日志文件存在，包含 ${data.length} 条记录`);
      
      // 分析数据
      const users = new Set(data.map(log => log.username));
      const servers = new Set(data.map(log => log.serverName));
      const tools = new Set(data.map(log => log.toolName));
      const successCount = data.filter(log => log.success).length;
      
      console.log(`   👥 用户数: ${users.size}`);
      console.log(`   🖥️ 服务器数: ${servers.size}`);
      console.log(`   🔧 工具数: ${tools.size}`);
      console.log(`   ✅ 成功调用: ${successCount}/${data.length}`);
    } catch (error) {
      console.log(`❌ 日志文件解析失败: ${error.message}`);
    }
  } else {
    console.log('❌ 日志文件不存在');
  }

  console.log('\n2. 🔐 测试登录...');
  
  try {
    const loginResponse = await makeRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      const token = loginResponse.data.token;
      console.log('✅ 登录成功');
      
      console.log('\n3. 📈 测试统计API...');
      
      // 测试统计概览
      const overviewResponse = await makeRequest('http://localhost:3000/api/mcp-usage/overview', {
        headers: { 'x-auth-token': token }
      });
      
      if (overviewResponse.status === 200 && overviewResponse.data.success) {
        console.log('✅ 统计概览API正常');
        const data = overviewResponse.data.data;
        console.log(`   📊 总调用次数: ${data.summary.totalCalls}`);
        console.log(`   👥 活跃用户: ${data.summary.uniqueUsers}`);
        console.log(`   🖥️ 使用服务器: ${data.summary.uniqueServers}`);
        console.log(`   🔧 使用工具: ${data.summary.uniqueTools}`);
      } else {
        console.log(`❌ 统计概览API失败: ${overviewResponse.status}`);
        console.log(`   响应: ${JSON.stringify(overviewResponse.data)}`);
      }
      
      // 测试用户访问详情
      const detailsResponse = await makeRequest('http://localhost:3000/api/mcp-usage/access-details', {
        headers: { 'x-auth-token': token }
      });
      
      if (detailsResponse.status === 200 && detailsResponse.data.success) {
        console.log('✅ 访问详情API正常');
        const data = detailsResponse.data.data;
        console.log(`   📝 日志条数: ${data.logs.length}`);
        console.log(`   📄 总页数: ${data.pagination.totalPages}`);
      } else {
        console.log(`❌ 访问详情API失败: ${detailsResponse.status}`);
      }
      
      // 测试用户统计
      const userStatsResponse = await makeRequest('http://localhost:3000/api/mcp-usage/users/admin', {
        headers: { 'x-auth-token': token }
      });
      
      if (userStatsResponse.status === 200 && userStatsResponse.data.success) {
        console.log('✅ 用户统计API正常');
        const data = userStatsResponse.data.data;
        console.log(`   📊 admin用户总调用: ${data.totalCalls}`);
      } else {
        console.log(`❌ 用户统计API失败: ${userStatsResponse.status}`);
      }
      
    } else {
      console.log(`❌ 登录失败: ${loginResponse.status}`);
      console.log(`   响应: ${JSON.stringify(loginResponse.data)}`);
    }
  } catch (error) {
    console.log(`❌ 网络错误: ${error.message}`);
    console.log('   请确保MCPHub服务器在localhost:3000上运行');
  }

  console.log('\n4. 🌐 检查前端路由...');
  
  try {
    const frontendResponse = await makeRequest('http://localhost:3000/');
    if (frontendResponse.status === 200) {
      console.log('✅ 前端服务正常');
      
      // 检查前端资源
      if (fs.existsSync(path.join(__dirname, 'frontend', 'dist'))) {
        console.log('✅ 前端资源已构建');
      } else {
        console.log('⚠️ 前端资源未构建，请运行 pnpm frontend:build');
      }
    } else {
      console.log(`❌ 前端服务异常: ${frontendResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ 前端服务不可用: ${error.message}`);
  }

  console.log('\n📋 访问指南:');
  console.log('1. 打开浏览器访问: http://localhost:3000');
  console.log('2. 使用admin/admin123登录');
  console.log('3. 在左侧导航中点击"MCP统计"');
  console.log('4. 查看统计概览和用户分析');
  
  console.log('\n🔧 故障排除:');
  console.log('- 如果看不到"MCP统计"菜单，请检查用户权限');
  console.log('- 如果数据为空，请先调用一些MCP工具生成数据');
  console.log('- 如果API报错，请检查服务器日志');
}

if (require.main === module) {
  testMcpStats().catch(console.error);
}

module.exports = { testMcpStats }; 