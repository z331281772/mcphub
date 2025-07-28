const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🧪 Simple Token Fix Test');

// 读取配置获取zhangyt03的token
function getTestToken() {
  try {
    const settingsPath = path.join(__dirname, 'mcp_settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // 查找zhangyt03用户的token
    const users = settings.users || [];
    for (const user of users) {
      if (user.username === 'zhangyt03' && user.accessToken) {
        return {
          username: user.username,
          token: user.accessToken
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to read test token:', error.message);
    return null;
  }
}

// 测试MCP工具调用
function testMcpToolCall(token, username) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      "jsonrpc": "2.0",
      "id": 1,
      "method": "tools/call",
      "params": {
        "name": "amap-mcp_amap_maps_weather",
        "arguments": {
          "city": "Shanghai"
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

    console.log(`\n🎯 Testing with ${username} token...`);
    console.log(`Token: ${token.substring(0, 8)}...`);

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`\n📊 Response Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(responseData);
          console.log('Response:', JSON.stringify(parsed, null, 2));
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
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 检查使用日志
function checkLatestUsageLog() {
  try {
    const logPath = path.join(__dirname, 'mcp_usage_logs', 'mcp_usage.json');
    if (fs.existsSync(logPath)) {
      const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      if (logs.length > 0) {
        const latestLog = logs[logs.length - 1];
        console.log('\n📋 Latest MCP Usage Log:');
        console.log(`   Username: ${latestLog.username}`);
        console.log(`   Tool: ${latestLog.toolName}`);
        console.log(`   Server: ${latestLog.serverName}`);
        console.log(`   Success: ${latestLog.success}`);
        console.log(`   Timestamp: ${new Date(latestLog.timestamp).toISOString()}`);
        return latestLog;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to read usage logs:', error.message);
    return null;
  }
}

// 主测试函数
async function runSimpleTest() {
  try {
    // 获取测试token
    const tokenInfo = getTestToken();
    if (!tokenInfo) {
      throw new Error('No zhangyt03 token found in mcp_settings.json');
    }
    
    console.log(`✅ Found token for user: ${tokenInfo.username}`);
    
    // 检查服务器是否运行
    console.log('\n🔍 Checking if server is running...');
    
    // 尝试调用MCP工具
    const response = await testMcpToolCall(tokenInfo.token, tokenInfo.username);
    
    if (response.statusCode === 200) {
      console.log('✅ MCP call successful');
      
      // 等待日志写入
      setTimeout(() => {
        const latestLog = checkLatestUsageLog();
        
        // 分析结果
        console.log('\n🔍 Test Analysis:');
        if (latestLog && latestLog.username === tokenInfo.username) {
          console.log(`✅ SUCCESS: Username correctly recorded as "${latestLog.username}"`);
          console.log('🎉 Token fix is working!');
        } else if (latestLog) {
          console.log(`❌ FAILED: Username recorded as "${latestLog.username}", expected "${tokenInfo.username}"`);
          console.log('💡 The fix may need more work');
        } else {
          console.log('❌ FAILED: No logs found');
        }
      }, 1000);
      
    } else {
      console.log(`❌ MCP call failed with status: ${response.statusCode}`);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running. Please start the server first with: npm run dev');
    } else {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// 运行测试
console.log('Starting simple test in 2 seconds...\n');
setTimeout(runSimpleTest, 2000); 