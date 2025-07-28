const http = require('http');

// Simple fetch polyfill for our test
function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: {
                        get: (name) => res.headers[name.toLowerCase()]
                    },
                    json: () => Promise.resolve(JSON.parse(data))
                });
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

// Admin's known access token
const ADMIN_ACCESS_TOKEN = 'mcp_88693b45807d41e4ba75169737a0102a';
const BASE_URL = 'http://localhost:3000';

async function testMcpAuthFix() {
    console.log('🔍 Testing MCP Authentication Fix...\n');

    // Test 1: Verify Bearer Token works for MCP API
    console.log('📊 Test 1: Direct Bearer Token Access to MCP API');
    try {
        const response = await fetch(`${BASE_URL}/api/mcp-usage/overview`, {
            headers: {
                'Authorization': `Bearer ${ADMIN_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('✅ Bearer Token Access Result:', data.success ? 'SUCCESS' : 'FAILED');
        if (data.success) {
            console.log(`   📈 Total Calls: ${data.data.summary.totalCalls}`);
            console.log(`   👥 Unique Users: ${data.data.summary.uniqueUsers}`);
        } else {
            console.log(`   ❌ Error: ${data.error || data.message}`);
        }
    } catch (error) {
        console.log('❌ Bearer Token Test Failed:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Verify no token access is blocked (when requireMcpAuth is true)
    console.log('🔒 Test 2: No Token Access (Should be blocked)');
    try {
        const response = await fetch(`${BASE_URL}/api/mcp-usage/overview`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('🔒 No Token Access Result:', data.success ? 'FAILED (Should be blocked)' : 'SUCCESS (Correctly blocked)');
        if (!data.success) {
            console.log(`   🛡️ Block Reason: ${data.error || data.message}`);
        }
    } catch (error) {
        console.log('❌ No Token Test Failed:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Test access details API
    console.log('📋 Test 3: User Access Details API');
    try {
        const response = await fetch(`${BASE_URL}/api/mcp-usage/access-details?page=1&pageSize=3`, {
            headers: {
                'Authorization': `Bearer ${ADMIN_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('✅ Access Details API Result:', data.success ? 'SUCCESS' : 'FAILED');
        if (data.success) {
            console.log(`   📄 Records in Page: ${data.data.logs.length}`);
            console.log(`   📊 Total Records: ${data.data.pagination.totalCount}`);
            console.log(`   👥 Unique Users: ${data.data.summary.uniqueUsers}`);
        } else {
            console.log(`   ❌ Error: ${data.error || data.message}`);
        }
    } catch (error) {
        console.log('❌ Access Details Test Failed:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 4: Test export functionality
    console.log('💾 Test 4: Export Functionality');
    try {
        const response = await fetch(`${BASE_URL}/api/mcp-usage/export?format=json&pageSize=2`, {
            headers: {
                'Authorization': `Bearer ${ADMIN_ACCESS_TOKEN}`,
            }
        });
        
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            console.log('✅ Export API Result: SUCCESS');
            console.log(`   📁 Content Type: ${contentType}`);
            
            if (contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`   📊 Exported Records: ${data.totalRecords}`);
                console.log(`   📅 Export Time: ${data.exportedAt}`);
            }
        } else {
            console.log('❌ Export API Result: FAILED');
            console.log(`   🔍 Status: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.log('❌ Export Test Failed:', error.message);
    }

    console.log('\n' + '🎉 MCP Authentication Fix Test Complete! 🎉');
}

// Run the test
testMcpAuthFix().catch(console.error); 