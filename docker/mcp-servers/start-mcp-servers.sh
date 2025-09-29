#!/bin/bash

# MCP Servers Startup Script
set -e

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Function to start a single MCP server
start_mcp_server() {
    local server_name="$1"
    local server_config="$2"

    log "Starting MCP server: $server_name"

    # Extract command and args from config
    local command=$(echo "$server_config" | jq -r '.command')
    local args=$(echo "$server_config" | jq -r '.args[]' | tr '\n' ' ')

    # Start the server in background with proper error handling
    nohup $command $args > "/app/logs/${server_name}.log" 2>&1 &
    local pid=$!

    echo "$pid" > "/app/logs/${server_name}.pid"
    log "Started $server_name with PID: $pid"

    # Wait a moment to ensure server starts properly
    sleep 2

    # Check if process is still running
    if kill -0 "$pid" 2>/dev/null; then
        log "$server_name started successfully"
        return 0
    else
        log "Failed to start $server_name"
        return 1
    fi
}

# Function to handle shutdown gracefully
shutdown() {
    log "Shutting down MCP servers..."

    # Kill all MCP server processes
    for pidfile in /app/logs/*.pid; do
        if [ -f "$pidfile" ]; then
            local pid=$(cat "$pidfile")
            local server_name=$(basename "$pidfile" .pid)

            if kill -0 "$pid" 2>/dev/null; then
                log "Stopping $server_name (PID: $pid)"
                kill -TERM "$pid"

                # Wait for graceful shutdown
                local count=0
                while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                    sleep 1
                    count=$((count + 1))
                done

                # Force kill if still running
                if kill -0 "$pid" 2>/dev/null; then
                    log "Force killing $server_name"
                    kill -KILL "$pid"
                fi
            fi

            rm -f "$pidfile"
        fi
    done

    log "All MCP servers stopped"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap shutdown SIGTERM SIGINT

# Create logs directory if it doesn't exist
mkdir -p /app/logs

log "Starting MCP servers orchestrator..."

# Read MCP configuration
if [ ! -f "/app/mcp_config.json" ]; then
    log "ERROR: MCP configuration file not found"
    exit 1
fi

# Parse configuration and start servers based on priority
config=$(cat /app/mcp_config.json)

# Start critical servers first (priority 1)
log "Starting critical MCP servers (priority 1)..."
for server in $(echo "$config" | jq -r '.mcpServers | to_entries[] | select(.value.config.priority == 1) | .key'); do
    server_config=$(echo "$config" | jq -c ".mcpServers.${server}")
    if ! start_mcp_server "$server" "$server_config"; then
        log "CRITICAL: Failed to start critical server $server"
        exit 1
    fi
done

# Start secondary servers (priority 2)
log "Starting secondary MCP servers (priority 2)..."
for server in $(echo "$config" | jq -r '.mcpServers | to_entries[] | select(.value.config.priority == 2) | .key'); do
    server_config=$(echo "$config" | jq -c ".mcpServers.${server}")
    start_mcp_server "$server" "$server_config" || log "WARNING: Failed to start secondary server $server"
done

# Start optional servers (priority 3)
log "Starting optional MCP servers (priority 3)..."
for server in $(echo "$config" | jq -r '.mcpServers | to_entries[] | select(.value.config.priority == 3) | .key'); do
    server_config=$(echo "$config" | jq -c ".mcpServers.${server}")
    start_mcp_server "$server" "$server_config" || log "INFO: Failed to start optional server $server"
done

log "MCP servers startup complete"

# Monitor servers and keep container running
while true; do
    # Check if any critical servers are down
    critical_down=false

    for server in $(echo "$config" | jq -r '.mcpServers | to_entries[] | select(.value.config.critical == true) | .key'); do
        pidfile="/app/logs/${server}.pid"

        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            if ! kill -0 "$pid" 2>/dev/null; then
                log "CRITICAL: Server $server is down (PID: $pid)"
                critical_down=true

                # Attempt restart
                log "Attempting to restart $server..."
                server_config=$(echo "$config" | jq -c ".mcpServers.${server}")
                if start_mcp_server "$server" "$server_config"; then
                    log "Successfully restarted $server"
                else
                    log "Failed to restart critical server $server"
                    exit 1
                fi
            fi
        else
            log "CRITICAL: PID file missing for $server"
            critical_down=true
        fi
    done

    # Sleep before next check
    sleep 30
done