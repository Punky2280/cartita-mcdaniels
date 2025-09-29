# MCP Servers Container for Cartrita AI Agents Platform
# Provides Model Context Protocol servers for various integrations

FROM node:22-alpine AS base

# Install security updates and system dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    libc6-compat \
    curl \
    git \
    python3 \
    py3-pip \
    sqlite \
    ca-certificates \
    tzdata \
    dumb-init \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup --system --gid 1001 mcp \
    && adduser --system --uid 1001 --ingroup mcp mcpuser

# Enable pnpm with specific version for reproducibility
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set production environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Create app directory with proper permissions
WORKDIR /app
RUN chown mcpuser:mcp /app

# Switch to non-root user for installation
USER mcpuser

# Stage 2: Install MCP servers and dependencies
FROM base AS mcp-runtime

# Install all required MCP servers with security audit disabled
RUN npm install -g --no-audit \
    @modelcontextprotocol/server-github \
    @modelcontextprotocol/server-memory \
    @modelcontextprotocol/server-brave-search \
    @modelcontextprotocol/server-everart \
    @modelcontextprotocol/server-gitlab \
    @modelcontextprotocol/server-filesystem \
    @modelcontextprotocol/server-sqlite

# Create necessary directories with proper permissions
USER root
RUN mkdir -p /app/logs /app/data /app/temp /app/config \
    && chown -R mcpuser:mcp /app/logs /app/data /app/temp /app/config \
    && chmod 750 /app/logs /app/data /app/temp /app/config

# Copy MCP configuration and scripts with proper ownership
COPY --chown=mcpuser:mcp mcp_config.json ./config/
COPY --chown=mcpuser:mcp docker/mcp-servers/start-mcp-servers.sh ./
COPY --chown=mcpuser:mcp docker/mcp-servers/health-check.sh ./

# Make scripts executable
RUN chmod +x start-mcp-servers.sh health-check.sh

# Advanced health check with multiple MCP servers
HEALTHCHECK --interval=15s --timeout=10s --start-period=60s --retries=5 \
    CMD ./health-check.sh || exit 1

# Switch to non-root user
USER mcpuser

# Expose MCP server ports
EXPOSE 3333 3334 3335 3336 3337 3338

# Use tini as init system for proper signal handling and zombie reaping
ENTRYPOINT ["tini", "--"]

# Start MCP servers with graceful shutdown handling
CMD ["./start-mcp-servers.sh"]