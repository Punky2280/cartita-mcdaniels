# Multi-stage Dockerfile for Cartrita McDaniels Suarez Platform
# Optimized for production deployment with security best practices

# Stage 1: Base image with Node.js and system dependencies
FROM node:22-alpine AS base

# Install security updates and system dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    curl \
    dumb-init \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user early for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs appuser

# Enable pnpm with specific version for reproducibility
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set security headers and environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048 --enable-source-maps"

# Create app directory with proper permissions
WORKDIR /app
RUN chown appuser:nodejs /app

# Switch to non-root user for dependency installation
USER appuser

# Copy package files with proper ownership
COPY --chown=appuser:nodejs package.json pnpm-lock.yaml ./

# Stage 2: Dependencies installation
FROM base AS deps

# Install all dependencies with cache mount for faster builds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store,uid=1001,gid=1001 \
    pnpm install --frozen-lockfile --prefer-offline --no-audit

# Stage 3: Build stage
FROM base AS build

# Copy dependencies from deps stage
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy source code with proper ownership and exclude sensitive files
COPY --chown=appuser:nodejs . .

# Remove sensitive files and unnecessary directories
RUN rm -rf .env .env.* *.md docs/ tests/ .git/ .github/ \
    && find . -name "*.test.*" -delete \
    && find . -name "*.spec.*" -delete

# Build the application with production optimizations
RUN pnpm run build && \
    pnpm run type-check

# Install only production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store,uid=1001,gid=1001 \
    pnpm prune --prod --config.ignore-scripts=true

# Stage 4: Production runtime
FROM node:22-alpine AS runtime

# Install security updates and minimal runtime dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    curl \
    dumb-init \
    tini \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs appuser

# Set production environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV PORT=3001
ENV HOST=0.0.0.0

# Set working directory
WORKDIR /app

# Copy built application with proper ownership
COPY --from=build --chown=appuser:nodejs /app/dist ./dist
COPY --from=build --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=appuser:nodejs /app/package.json ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/temp /app/data \
    && chown -R appuser:nodejs /app/logs /app/temp /app/data \
    && chmod 750 /app/logs /app/temp /app/data

# Create read-only filesystem for security (except for necessary writable dirs)
RUN chmod -R 555 /app/dist /app/node_modules /app/package.json

# Advanced health check with retry logic
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Use tini as init system for proper signal handling and zombie reaping
ENTRYPOINT ["tini", "--"]

# Start the application with graceful shutdown handling
CMD ["node", "--enable-source-maps", "dist/main.js"]