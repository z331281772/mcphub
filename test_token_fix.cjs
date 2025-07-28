const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读取配置获取用户token
function getTestToken() {
  try {
    const settingsPath = path.join(__dirname, 'mcp_settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // 查找zhangyt03用户的token
    const users = settings.users || {};
    for (const [username, userConfig] of Object.entries(users)) {
      if (username === 'zhangyt03' && userConfig.accessToken) {
        return {
          username,
          token: userConfig.accessToken
        };
      }
    }
    
    // 如果没有找到zhangyt03，返回admin的token
    if (users.admin && users.admin.accessToken) {
      return {
        username: 'admin',
        token: users.admin.accessToken
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to read test token:', error.message);
    return null;
  }
}

// 启动服务器
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting MCPHub server...');
    
    const serverProcess = spawn('node', ['dist/server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let serverReady = false;
    let output = '';

    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('[SERVER]', text.trim());
      
      if (text.includes('Server started') || text.includes('listening on port')) {
        serverReady = true;
        setTimeout(() => resolve(serverProcess), 2000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const text = data.toString();
      console.error('[SERVER ERROR]', text.trim());
    });

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      if (!serverReady) {
        reject(new Error(`Server failed to start, exit code: ${code}`));
      }
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    // 如果10秒后还没启动完成，认为启动失败
    setTimeout(() => {
      if (!serverReady) {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 10000);
  });
}

// 调用MCP工具
function callMcpTool(token, username) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      "jsonrpc": "2.0",
      "id": 1,
      "method": "tools/call",
      "params": {
        "name": "amap-mcp_amap_maps_weather",
        "arguments": {
          "city": "Beijing"
        }
      }
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/mcp/amap?token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'mcp-session-id': 'test-session-' + Date.now()
      }
    };

    console.log(`\n🧪 Testing MCP tool call with ${username} token...`);
    console.log(`URL: http://localhost:3000${options.path}`);

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`\n📊 MCP Tool Call Response (Status: ${res.statusCode}):`);
        try {
          const parsed = JSON.parse(responseData);
          console.log(JSON.stringify(parsed, null, 2));
          resolve({
            statusCode: res.statusCode,
            data: parsed
          });
        } catch (error) {
          console.log('Raw response:', responseData);
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 检查使用日志
function checkUsageLogs() {
  try {
    const logPath = path.join(__dirname, 'mcp_usage_logs', 'mcp_usage.json');
    if (fs.existsSync(logPath)) {
      const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      console.log('\n📋 Recent MCP Usage Logs:');
      
      // 显示最后3条记录
      const recentLogs = logs.slice(-3);
      recentLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.toolName} by ${log.username}:`);
        console.log(`   Success: ${log.success}`);
        console.log(`   Server: ${log.serverName}`);
        console.log(`   SessionId: ${log.sessionId}`);
        console.log(`   Timestamp: ${new Date(log.timestamp).toISOString()}`);
      });
      
      return recentLogs;
    } else {
      console.log('No usage logs found');
      return [];
    }
  } catch (error) {
    console.error('Failed to read usage logs:', error.message);
    return [];
  }
}

// 主测试函数
async function runTest() {
  let serverProcess = null;
  
  try {
    // 获取测试token
    const tokenInfo = getTestToken();
    if (!tokenInfo) {
      throw new Error('No test token found in mcp_settings.json');
    }
    
    console.log(`Using token for user: ${tokenInfo.username}`);
    
    // 启动服务器
    serverProcess = await startServer();
    console.log('✅ Server started successfully');
    
    // 等待一下让服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 调用MCP工具
    const response = await callMcpTool(tokenInfo.token, tokenInfo.username);
    
    // 等待日志写入
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查使用日志
    const logs = checkUsageLogs();
    
    // 分析结果
    console.log('\n🔍 Test Analysis:');
    if (logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      if (latestLog.username === tokenInfo.username) {
        console.log(`✅ SUCCESS: Username correctly recorded as "${latestLog.username}"`);
      } else {
        console.log(`❌ FAILED: Username recorded as "${latestLog.username}", expected "${tokenInfo.username}"`);
      }
    } else {
      console.log('❌ FAILED: No logs found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // 清理：关闭服务器
    if (serverProcess) {
      console.log('\n🧹 Cleaning up...');
      serverProcess.kill();
      
      // 等待进程关闭
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// 运行测试
runTest().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 