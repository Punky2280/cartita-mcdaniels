#!/bin/bash

# MCP Servers Health Check Script
set -e

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HEALTH: $*"
}

# Function to check if a process is running
check_process() {
    local server_name="$1"
    local pidfile="/app/logs/${server_name}.pid"

    if [ ! -f "$pidfile" ]; then
        log "WARNING: PID file missing for $server_name"
        return 1
    fi

    local pid=$(cat "$pidfile")
    if ! kill -0 "$pid" 2>/dev/null; then
        log "ERROR: Process not running for $server_name (PID: $pid)"
        return 1
    fi

    return 0
}

# Function to check MCP server connectivity
check_mcp_connectivity() {
    local server_name="$1"
    local timeout=5

    # For now, we'll check if the process is running and log files are being updated
    local logfile="/app/logs/${server_name}.log"

    if [ -f "$logfile" ]; then
        # Check if log file has been updated in the last 5 minutes
        local last_modified=$(stat -c %Y "$logfile" 2>/dev/null || echo 0)
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_modified))

        if [ $time_diff -gt 300 ]; then
            log "WARNING: $server_name log file not updated in $time_diff seconds"
            return 1
        fi
    else
        log "WARNING: Log file missing for $server_name"
        return 1
    fi

    return 0
}

# Main health check function
main() {
    log "Starting MCP servers health check..."

    # Read MCP configuration
    if [ ! -f "/app/mcp_config.json" ]; then
        log "ERROR: MCP configuration file not found"
        exit 1
    fi

    config=$(cat /app/mcp_config.json)
    overall_status=0

    # Check each server
    for server in $(echo "$config" | jq -r '.mcpServers | keys[]'); do
        server_critical=$(echo "$config" | jq -r ".mcpServers.${server}.config.critical")

        log "Checking $server (critical: $server_critical)..."

        # Check if process is running
        if ! check_process "$server"; then
            if [ "$server_critical" = "true" ]; then
                log "CRITICAL: Critical server $server is down"
                overall_status=1
            else
                log "WARNING: Non-critical server $server is down"
            fi
            continue
        fi

        # Check connectivity (if applicable)
        if ! check_mcp_connectivity "$server"; then
            if [ "$server_critical" = "true" ]; then
                log "CRITICAL: Critical server $server connectivity failed"
                overall_status=1
            else
                log "WARNING: Non-critical server $server connectivity failed"
            fi
            continue
        fi

        log "OK: $server is healthy"
    done

    # Check system resources
    log "Checking system resources..."

    # Check memory usage
    memory_used=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
    memory_threshold=85.0

    if [ "$(echo "$memory_used > $memory_threshold" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        log "WARNING: High memory usage: ${memory_used}%"
    else
        log "OK: Memory usage: ${memory_used}%"
    fi

    # Check disk space
    disk_used=$(df /app | awk 'NR==2{print $5}' | sed 's/%//')
    disk_threshold=80

    if [ "$disk_used" -gt "$disk_threshold" ]; then
        log "WARNING: High disk usage: ${disk_used}%"
    else
        log "OK: Disk usage: ${disk_used}%"
    fi

    # Check if logs directory is writable
    if [ ! -w "/app/logs" ]; then
        log "ERROR: Logs directory is not writable"
        overall_status=1
    else
        log "OK: Logs directory is writable"
    fi

    if [ $overall_status -eq 0 ]; then
        log "Health check PASSED - All systems operational"
    else
        log "Health check FAILED - Critical issues detected"
    fi

    exit $overall_status
}

# Install bc if not available (for floating point arithmetic)
if ! command -v bc >/dev/null 2>&1; then
    # Use integer arithmetic fallback
    memory_used=$(free | awk 'NR==2{printf "%d", $3*100/$2}')
fi

# Run main function
main