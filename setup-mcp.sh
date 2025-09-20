#!/bin/bash

echo "Setting up MCP Servers..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Create MCP servers directory if it doesn't exist
mkdir -p mcp-servers

# Setup Sequential Thinking MCP Server
echo "Setting up Sequential Thinking MCP Server..."
if [ ! -d "mcp-servers/sequential-thinking" ]; then
    mkdir -p mcp-servers/sequential-thinking/src
    
    # Create the sequential thinking server
    cat > mcp-servers/sequential-thinking/src/server.py << 'EOF'
#!/usr/bin/env python3
"""
Sequential Thinking MCP Server
Provides structured thinking and reasoning capabilities
"""

import json
import sys
import asyncio
from typing import Dict, List, Any
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SequentialThinkingServer:
    def __init__(self):
        self.thinking_sessions = {}
        
    async def handle_request(self, request: Dict) -> Dict:
        """Handle incoming MCP requests"""
        method = request.get("method")
        params = request.get("params", {})
        
        if method == "tools/list":
            return {
                "tools": [
                    {
                        "name": "sequential_thinking",
                        "description": "Break down complex problems into sequential thinking steps",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "problem": {
                                    "type": "string",
                                    "description": "The problem or question to think through"
                                },
                                "context": {
                                    "type": "string",
                                    "description": "Additional context for the problem"
                                }
                            },
                            "required": ["problem"]
                        }
                    },
                    {
                        "name": "thinking_session",
                        "description": "Start or continue a thinking session",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "session_id": {
                                    "type": "string",
                                    "description": "Session identifier"
                                },
                                "action": {
                                    "type": "string",
                                    "enum": ["start", "continue", "summarize"],
                                    "description": "Action to perform"
                                },
                                "content": {
                                    "type": "string",
                                    "description": "Content for the session"
                                }
                            },
                            "required": ["session_id", "action"]
                        }
                    }
                ]
            }
            
        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            if tool_name == "sequential_thinking":
                return await self.sequential_thinking(arguments)
            elif tool_name == "thinking_session":
                return await self.thinking_session(arguments)
                
        return {"error": "Method not supported"}
    
    async def sequential_thinking(self, args: Dict) -> Dict:
        """Perform sequential thinking on a problem"""
        problem = args.get("problem", "")
        context = args.get("context", "")
        
        steps = [
            f"🤔 **Problem Analysis**: {problem}",
            f"📋 **Context**: {context}" if context else "",
            "🔍 **Step 1: Understanding**",
            "- What are the key components?",
            "- What are the constraints?",
            "- What is the desired outcome?",
            "",
            "🧠 **Step 2: Breaking Down**",
            "- Identify sub-problems",
            "- Determine dependencies",
            "- Prioritize components",
            "",
            "💡 **Step 3: Solution Approach**",
            "- Explore possible solutions",
            "- Evaluate trade-offs",
            "- Select best approach",
            "",
            "✅ **Step 4: Implementation Plan**",
            "- Define concrete steps",
            "- Set success criteria",
            "- Identify potential risks"
        ]
        
        thinking_result = "\n".join(filter(None, steps))
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": thinking_result
                }
            ]
        }
    
    async def thinking_session(self, args: Dict) -> Dict:
        """Manage thinking sessions"""
        session_id = args.get("session_id")
        action = args.get("action")
        content = args.get("content", "")
        
        if action == "start":
            self.thinking_sessions[session_id] = {
                "created": datetime.now().isoformat(),
                "steps": [],
                "current_step": 0
            }
            result = f"Started thinking session '{session_id}'"
            
        elif action == "continue":
            if session_id in self.thinking_sessions:
                self.thinking_sessions[session_id]["steps"].append({
                    "step": len(self.thinking_sessions[session_id]["steps"]) + 1,
                    "content": content,
                    "timestamp": datetime.now().isoformat()
                })
                result = f"Added step to session '{session_id}': {content}"
            else:
                result = f"Session '{session_id}' not found"
                
        elif action == "summarize":
            if session_id in self.thinking_sessions:
                session = self.thinking_sessions[session_id]
                steps_summary = "\n".join([
                    f"Step {step['step']}: {step['content']}" 
                    for step in session["steps"]
                ])
                result = f"Session Summary for '{session_id}':\n{steps_summary}"
            else:
                result = f"Session '{session_id}' not found"
        else:
            result = "Invalid action"
            
        return {
            "content": [
                {
                    "type": "text", 
                    "text": result
                }
            ]
        }

async def main():
    """Main server loop"""
    server = SequentialThinkingServer()
    
    # Initialize server
    init_response = {
        "jsonrpc": "2.0",
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "sequential-thinking",
                "version": "1.0.0"
            }
        }
    }
    
    print(json.dumps(init_response))
    sys.stdout.flush()
    
    # Handle requests
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
                
            request = json.loads(line.strip())
            response = await server.handle_request(request)
            
            result = {
                "jsonrpc": "2.0",
                "id": request.get("id"),
                "result": response
            }
            
            print(json.dumps(result))
            sys.stdout.flush()
            
        except Exception as e:
            logger.error(f"Error handling request: {e}")
            error_response = {
                "jsonrpc": "2.0",
                "id": request.get("id") if 'request' in locals() else None,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
            print(json.dumps(error_response))
            sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(main())
EOF

    chmod +x mcp-servers/sequential-thinking/src/server.py
fi

echo "Installing required MCP server dependencies..."

# Install Node.js MCP servers globally
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github  
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-web-search
npm install -g @modelcontextprotocol/server-openai
npm install -g @modelcontextprotocol/server-anthropic
npm install -g @modelcontextprotocol/server-memory
npm install -g @modelcontextprotocol/server-brave-search
npm install -g @modelcontextprotocol/server-everart

echo "MCP Servers setup complete!"
echo "Configuration file: mcp_config.json"
echo "Sequential Thinking Server: mcp-servers/sequential-thinking/src/server.py"
echo ""
echo "Next steps:"
echo "1. Configure your IDE/editor to use the MCP configuration"
echo "2. Test the servers with: node test-mcp.js"
echo "3. Update any missing API keys in .env file"
