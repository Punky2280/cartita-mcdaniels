#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load environment variables
require('dotenv').config();

async function testMCPServer(serverName, serverConfig) {
    console.log(`\n🧪 Testing ${serverName} MCP Server...`);
    
    try {
        const process = spawn(serverConfig.command, serverConfig.args, {
            env: { ...process.env, ...serverConfig.env },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Send initialization request
        const initRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                    name: "test-client",
                    version: "1.0.0"
                }
            }
        };

        process.stdin.write(JSON.stringify(initRequest) + '\n');

        // Handle response
        let responseData = '';
        process.stdout.on('data', (data) => {
            responseData += data.toString();
            
            try {
                const response = JSON.parse(responseData.trim());
                if (response.result) {
                    console.log(`✅ ${serverName}: Connected successfully`);
                    console.log(`   Protocol: ${response.result.protocolVersion}`);
                    console.log(`   Server: ${response.result.serverInfo?.name || 'Unknown'}`);
                } else if (response.error) {
                    console.log(`❌ ${serverName}: Error - ${response.error.message}`);
                }
            } catch (e) {
                // Response might be incomplete, continue collecting data
            }
        });

        process.stderr.on('data', (data) => {
            console.log(`⚠️  ${serverName} stderr:`, data.toString().trim());
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            process.kill();
        }, 5000);

    } catch (error) {
        console.log(`❌ ${serverName}: Failed to start - ${error.message}`);
    }
}

async function main() {
    console.log('🚀 Testing MCP Server Configuration...\n');

    // Load MCP configuration
    const configPath = './mcp_config.json';
    if (!fs.existsSync(configPath)) {
        console.log('❌ MCP configuration file not found:', configPath);
        return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const servers = config.mcpServers;

    console.log('📋 Found MCP Servers:');
    Object.keys(servers).forEach(name => {
        console.log(`   - ${name}`);
    });

    // Test each server
    for (const [serverName, serverConfig] of Object.entries(servers)) {
        await testMCPServer(serverName, serverConfig);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
    }

    console.log('\n✅ MCP Server testing complete!');
}

if (require.main === module) {
    main().catch(console.error);
}
