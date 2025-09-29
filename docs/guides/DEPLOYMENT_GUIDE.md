# Production Deployment Guide

## Overview

This guide covers comprehensive production deployment strategies for the Cartrita AI Agents platform, including infrastructure setup, security hardening, monitoring, and operational procedures.

## Table of Contents

1. [Infrastructure Requirements](#1-infrastructure-requirements)
2. [Environment Configuration](#2-environment-configuration)
3. [Docker Deployment](#3-docker-deployment)
4. [Kubernetes Deployment](#4-kubernetes-deployment)
5. [Database Setup](#5-database-setup)
6. [Security Hardening](#6-security-hardening)
7. [Monitoring & Logging](#7-monitoring--logging)
8. [Backup & Recovery](#8-backup--recovery)
9. [Load Balancing](#9-load-balancing)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Operational Procedures](#11-operational-procedures)
12. [Troubleshooting](#12-troubleshooting)

## 1. Infrastructure Requirements

### Minimum Requirements

**Single Server Deployment:**
- **CPU**: 4 cores (8 recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 100GB SSD (500GB recommended)
- **Network**: 1Gbps connection
- **OS**: Ubuntu 22.04 LTS or RHEL 9

**Multi-Server Deployment:**
- **Application Servers**: 2+ instances (auto-scaling)
- **Database Server**: PostgreSQL 17 with pgvector
- **Cache Server**: Redis 7+
- **Load Balancer**: nginx or AWS ALB
- **Monitoring**: Prometheus + Grafana stack

### Cloud Provider Recommendations

**AWS:**
```yaml
Application Tier:
  - EC2: t3.large or c5.xlarge
  - ECS/EKS for container orchestration
  - Application Load Balancer

Database Tier:
  - RDS PostgreSQL 17 with Multi-AZ
  - ElastiCache for Redis
  - S3 for backups and static assets

Monitoring:
  - CloudWatch for basic metrics
  - Custom Prometheus/Grafana on EC2
```

**Google Cloud:**
```yaml
Application Tier:
  - Compute Engine: n2-standard-4
  - Google Kubernetes Engine (GKE)
  - Cloud Load Balancing

Database Tier:
  - Cloud SQL for PostgreSQL
  - Memorystore for Redis
  - Cloud Storage for backups

Monitoring:
  - Cloud Monitoring
  - Cloud Logging
```

**Azure:**
```yaml
Application Tier:
  - Virtual Machines: Standard_D4s_v3
  - Azure Kubernetes Service (AKS)
  - Application Gateway

Database Tier:
  - Azure Database for PostgreSQL
  - Azure Cache for Redis
  - Blob Storage for backups

Monitoring:
  - Azure Monitor
  - Application Insights
```

## 2. Environment Configuration

### Production Environment Variables

```bash
# Core Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://username:password@db-host:5432/cartrita_prod
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Cache Configuration
REDIS_URL=redis://redis-host:6379/0
REDIS_TTL=3600

# API Keys (Use secrets management)
OPENAI_API_KEY=${OPENAI_API_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}
GITHUB_TOKEN=${GITHUB_TOKEN}

# Security
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
ALLOWED_ORIGINS=https://app.cartrita.com,https://admin.cartrita.com

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=60000

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
PROMETHEUS_METRICS=true
ENABLE_TRACING=true
JAEGER_ENDPOINT=${JAEGER_ENDPOINT}

# Feature Flags
COMPUTER_USE_ENABLED=true
VECTOR_SEARCH_ENABLED=true
STREAMING_ENABLED=true
```

### Secrets Management

**AWS Secrets Manager:**
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "cartrita/prod/api-keys" \
  --description "Production API keys for Cartrita platform" \
  --secret-string '{
    "OPENAI_API_KEY": "sk-proj-...",
    "ANTHROPIC_API_KEY": "sk-ant-api03-...",
    "JWT_SECRET": "your-super-secure-secret"
  }'

# Retrieve in application startup
aws secretsmanager get-secret-value \
  --secret-id "cartrita/prod/api-keys" \
  --query SecretString --output text
```

**Kubernetes Secrets:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cartrita-secrets
type: Opaque
stringData:
  OPENAI_API_KEY: "sk-proj-..."
  ANTHROPIC_API_KEY: "sk-ant-api03-..."
  JWT_SECRET: "your-super-secure-secret"
  DATABASE_URL: "postgresql://..."
```

## 3. Docker Deployment

### Production Dockerfile

```dockerfile
# Multi-stage production build
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

# Production stage
FROM base AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@database:5432/cartrita_prod
      REDIS_URL: redis://redis:6379/0
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  database:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_DB: cartrita_prod
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-prod-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c work_mem=4MB
      -c maintenance_work_mem=64MB
      -c max_connections=100

  redis:
    image: redis:7.4-alpine
    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    depends_on:
      - app
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  nginx_cache:
  prometheus_data:
  grafana_data:

networks:
  default:
    driver: bridge
```

### Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    server {
        listen 80;
        server_name api.cartrita.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.cartrita.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Authentication endpoints
        location /auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://app;
        }

        # Documentation
        location /docs {
            proxy_pass http://app;
        }
    }
}
```

## 4. Kubernetes Deployment

### Namespace and ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cartrita-prod

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cartrita-config
  namespace: cartrita-prod
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  RATE_LIMIT_MAX: "1000"
  RATE_LIMIT_WINDOW: "60000"
  PROMETHEUS_METRICS: "true"
  ENABLE_TRACING: "true"
```

### Application Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cartrita-app
  namespace: cartrita-prod
  labels:
    app: cartrita-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: cartrita-app
  template:
    metadata:
      labels:
        app: cartrita-app
    spec:
      containers:
      - name: cartrita-app
        image: cartrita/ai-agents:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cartrita-secrets
              key: DATABASE_URL
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: cartrita-secrets
              key: OPENAI_API_KEY
        envFrom:
        - configMapRef:
            name: cartrita-config
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cartrita-app-service
  namespace: cartrita-prod
spec:
  selector:
    app: cartrita-app
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: ClusterIP

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cartrita-app-hpa
  namespace: cartrita-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cartrita-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cartrita-ingress
  namespace: cartrita-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.cartrita.com
    secretName: cartrita-tls
  rules:
  - host: api.cartrita.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: cartrita-app-service
            port:
              number: 80
```

## 5. Database Setup

### PostgreSQL Production Configuration

```sql
-- Production database initialization
-- scripts/init-prod-db.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Performance tuning
ALTER SYSTEM SET shared_buffers = '25% of RAM';
ALTER SYSTEM SET effective_cache_size = '75% of RAM';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET max_connections = 100;

-- Logging configuration
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Vector search optimization
ALTER SYSTEM SET hnsw.ef_construction = 64;
ALTER SYSTEM SET hnsw.m = 16;

-- Apply configuration
SELECT pg_reload_conf();
```

### Database Monitoring

```sql
-- Create monitoring views
CREATE OR REPLACE VIEW db_performance AS
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats
WHERE schemaname = 'public';

-- Monitor slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;

-- Monitor database size
CREATE OR REPLACE VIEW db_size_info AS
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

## 6. Security Hardening

### Application Security

```typescript
// Security middleware configuration
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';

// Security headers
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
await fastify.register(cors, {
  origin: [
    'https://app.cartrita.com',
    'https://admin.cartrita.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
});

// Rate limiting with Redis store
await fastify.register(rateLimit, {
  global: true,
  max: 1000,
  timeWindow: '1 minute',
  redis: redisClient,
  keyGenerator: (req) => {
    return req.headers.authorization || req.ip;
  },
  errorResponseBuilder: (req, context) => ({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
      retryAfter: Math.round(context.ttl / 1000)
    }
  })
});
```

### Infrastructure Security

```bash
# Server hardening script
#!/bin/bash

# Update system
apt update && apt upgrade -y

# Configure firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from 10.0.0.0/8 to any port 3000  # Internal load balancer
ufw --force enable

# Secure SSH
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart ssh

# Install fail2ban
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Configure automatic security updates
apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Set up log monitoring
apt install -y logwatch
echo "logwatch --output html --format html --range 'between -7 days and -1 days' --service all --mailto admin@cartrita.com" | crontab -
```

## 7. Monitoring & Logging

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'cartrita-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']
    scrape_interval: 30s

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s
```

### Application Metrics

```typescript
// Prometheus metrics setup
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  // HTTP request metrics
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  }),

  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),

  // Agent execution metrics
  agentExecutions: new Counter({
    name: 'agent_executions_total',
    help: 'Total number of agent executions',
    labelNames: ['agent_name', 'status']
  }),

  agentExecutionDuration: new Histogram({
    name: 'agent_execution_duration_seconds',
    help: 'Duration of agent executions',
    labelNames: ['agent_name'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
  }),

  // Database metrics
  dbConnectionsActive: new Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections'
  }),

  dbQueriesTotal: new Counter({
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['type']
  }),

  dbQueryDuration: new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
  }),

  // Vector search metrics
  vectorSearchLatency: new Histogram({
    name: 'vector_search_duration_seconds',
    help: 'Vector similarity search latency',
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
  }),

  vectorSearchRequests: new Counter({
    name: 'vector_search_requests_total',
    help: 'Total number of vector search requests',
    labelNames: ['status']
  })
};

// Middleware to collect metrics
export const metricsMiddleware = async (request, reply) => {
  const start = Date.now();

  reply.addHook('onSend', async () => {
    const duration = (Date.now() - start) / 1000;
    const route = request.routerPath || request.url;

    metrics.httpRequestDuration
      .labels(request.method, route, reply.statusCode.toString())
      .observe(duration);

    metrics.httpRequestsTotal
      .labels(request.method, route, reply.statusCode.toString())
      .inc();
  });
};
```

### Structured Logging

```typescript
// Enhanced logging configuration
import winston from 'winston';
import 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'cartrita-ai-agents',
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV,
      ...meta
    });
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'cartrita-ai-agents',
    version: process.env.npm_package_version
  },
  transports: [
    // Error logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: 'logs/.audit/error.json'
    }),

    // Combined logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: 'logs/.audit/combined.json'
    }),

    // Console output for development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

// Request logging middleware
export const requestLogger = (request, reply, done) => {
  const start = Date.now();

  // Log request
  logger.info('HTTP Request', {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
    requestId: request.id
  });

  reply.addHook('onSend', async () => {
    const duration = Date.now() - start;

    logger.info('HTTP Response', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      requestId: request.id
    });
  });

  done();
};
```

### Alert Rules

```yaml
# monitoring/alert_rules.yml
groups:
  - name: cartrita_alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      # Database connection issues
      - alert: DatabaseConnectionHigh
        expr: db_connections_active > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "Active connections: {{ $value }}"

      # Memory usage
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 1024
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"

      # Agent execution failures
      - alert: AgentExecutionFailures
        expr: rate(agent_executions_total{status="error"}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High agent execution failure rate"
          description: "Agent execution failure rate is {{ $value }} per second"
```

## 8. Backup & Recovery

### Database Backup Strategy

```bash
#!/bin/bash
# scripts/backup-database.sh

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-cartrita_prod}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-cartrita-backups}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cartrita_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="$BACKUP_FILE.gz"

echo "Starting backup: $BACKUP_FILE"

# Create backup
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --verbose \
  --no-password \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE_COMPRESSED" "s3://$S3_BUCKET/database/"

# Verify backup
if aws s3 ls "s3://$S3_BUCKET/database/$(basename $BACKUP_FILE_COMPRESSED)" > /dev/null; then
  echo "Backup uploaded successfully"
else
  echo "ERROR: Backup upload failed"
  exit 1
fi

# Clean up local backup
rm "$BACKUP_FILE_COMPRESSED"

# Clean up old backups from S3
aws s3 ls "s3://$S3_BUCKET/database/" | \
  awk '{print $4}' | \
  sort | \
  head -n -$RETENTION_DAYS | \
  while read file; do
    if [ ! -z "$file" ]; then
      aws s3 rm "s3://$S3_BUCKET/database/$file"
      echo "Deleted old backup: $file"
    fi
  done

echo "Backup completed: $(basename $BACKUP_FILE_COMPRESSED)"
```

### Automated Backup Cron

```bash
# Add to crontab
# Daily backup at 2 AM
0 2 * * * /opt/cartrita/scripts/backup-database.sh >> /var/log/cartrita-backup.log 2>&1

# Weekly full backup on Sunday at 1 AM
0 1 * * 0 /opt/cartrita/scripts/backup-full.sh >> /var/log/cartrita-backup.log 2>&1
```

### Disaster Recovery Procedure

```bash
#!/bin/bash
# scripts/restore-database.sh

set -euo pipefail

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-cartrita_prod}"
DB_USER="${DB_USER:-postgres}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Available backups:"
  aws s3 ls s3://cartrita-backups/database/ | tail -10
  exit 1
fi

echo "WARNING: This will replace the current database!"
echo "Database: $DB_NAME on $DB_HOST"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Download backup from S3
echo "Downloading backup..."
aws s3 cp "s3://cartrita-backups/database/$BACKUP_FILE" "/tmp/$BACKUP_FILE"

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip "/tmp/$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

# Stop application
echo "Stopping application..."
docker-compose stop app

# Drop and recreate database
echo "Recreating database..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS $DB_NAME;"

PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d postgres \
  -c "CREATE DATABASE $DB_NAME;"

# Restore backup
echo "Restoring backup..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --verbose \
  --no-password \
  "/tmp/$BACKUP_FILE"

# Start application
echo "Starting application..."
docker-compose start app

# Clean up
rm "/tmp/$BACKUP_FILE"

echo "Restore completed successfully"
```

## 9. Load Balancing

### HAProxy Configuration

```haproxy
# /etc/haproxy/haproxy.cfg
global
    log stdout local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    mode http
    log global
    option httplog
    option dontlognull
    option forwardfor
    timeout connect 5000
    timeout client 50000
    timeout server 50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

frontend api_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/cartrita.pem
    redirect scheme https if !{ ssl_fc }

    # Rate limiting
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request reject if { sc_http_req_rate(0) gt 100 }

    # Security headers
    http-response set-header X-Frame-Options DENY
    http-response set-header X-Content-Type-Options nosniff
    http-response set-header X-XSS-Protection "1; mode=block"
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains"

    default_backend api_backend

backend api_backend
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200

    server app1 10.0.1.10:3000 check
    server app2 10.0.1.11:3000 check
    server app3 10.0.1.12:3000 check

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
```

### AWS Application Load Balancer

```yaml
# infrastructure/aws-alb.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Application Load Balancer for Cartrita AI Agents'

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
  CertificateArn:
    Type: String

Resources:
  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: cartrita-alb
      Scheme: internet-facing
      Type: application
      IpAddressType: ipv4
      Subnets: !Ref SubnetIds
      SecurityGroups:
        - !Ref ALBSecurityGroup

  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for ALB
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: cartrita-targets
      Port: 3000
      Protocol: HTTP
      VpcId: !Ref VpcId
      TargetType: ip
      HealthCheckPath: /health
      HealthCheckProtocol: HTTP
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3

  HTTPSListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref TargetGroup
      LoadBalancerArn: !Ref ApplicationLoadBalancer
      Port: 443
      Protocol: HTTPS
      Certificates:
        - CertificateArn: !Ref CertificateArn

  HTTPListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      DefaultActions:
        - Type: redirect
          RedirectConfig:
            Protocol: HTTPS
            Port: 443
            StatusCode: HTTP_301
      LoadBalancerArn: !Ref ApplicationLoadBalancer
      Port: 80
      Protocol: HTTP
```

## 10. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm run type-check

      - name: Lint
        run: pnpm run check

      - name: Test
        run: pnpm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Build
        run: pnpm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Security scan
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: security-scan.sarif

      - name: Dependency check
        run: |
          npm audit --audit-level high
          pnpm audit --audit-level high

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Output image
        id: image
        run: echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.meta.outputs.version }}" >> $GITHUB_OUTPUT

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying ${{ needs.build.outputs.image }} to staging"
          # Add staging deployment logic

  deploy-production:
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    environment: production
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to ECS
        run: |
          # Update ECS service with new image
          aws ecs update-service \
            --cluster cartrita-prod \
            --service cartrita-app \
            --task-definition cartrita-app:${{ github.run_number }} \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster cartrita-prod \
            --services cartrita-app

      - name: Run health check
        run: |
          curl -f https://api.cartrita.com/health || exit 1

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

## 11. Operational Procedures

### Deployment Checklist

```markdown
## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Code review approved
- [ ] Documentation updated

### Infrastructure
- [ ] Database migrations tested
- [ ] Environment variables updated
- [ ] SSL certificates valid
- [ ] Load balancer health checks configured

### Monitoring
- [ ] Alerts configured
- [ ] Dashboards updated
- [ ] Log aggregation working
- [ ] Health checks responding

### Security
- [ ] Secrets rotated if needed
- [ ] Access permissions reviewed
- [ ] Network security groups updated
- [ ] Compliance requirements met

## Deployment Steps

1. **Announce Maintenance Window**
   - Notify users via status page
   - Post in team channels
   - Update documentation

2. **Pre-deployment Backup**
   ```bash
   ./scripts/backup-database.sh
   ```

3. **Deploy to Staging**
   ```bash
   docker-compose -f docker-compose.staging.yml up -d
   ```

4. **Run Integration Tests**
   ```bash
   pnpm run test:integration:staging
   ```

5. **Deploy to Production**
   ```bash
   kubectl apply -f k8s/
   kubectl rollout status deployment/cartrita-app
   ```

6. **Verify Deployment**
   ```bash
   curl -f https://api.cartrita.com/health
   kubectl get pods
   ```

7. **Monitor for Issues**
   - Check error rates in Grafana
   - Monitor response times
   - Review application logs
   - Verify all services healthy

## Post-Deployment Checklist

- [ ] Health checks passing
- [ ] Response times normal
- [ ] Error rates within threshold
- [ ] All services responding
- [ ] Database connections stable
- [ ] Cache hit rates normal
- [ ] User-facing features working
- [ ] Monitoring alerts normal
```

### Incident Response Procedure

```markdown
## Incident Response Playbook

### Severity Levels

**Critical (P0)**
- Complete service outage
- Data loss or corruption
- Security breach
- Response time: Immediate

**High (P1)**
- Major feature unavailable
- Significant performance degradation
- Response time: 30 minutes

**Medium (P2)**
- Minor feature issues
- Moderate performance impact
- Response time: 2 hours

**Low (P3)**
- Cosmetic issues
- Minor performance impact
- Response time: Next business day

### Response Steps

1. **Acknowledge Incident**
   ```bash
   # Post in incident channel
   /incident start "Brief description"
   ```

2. **Assess Severity**
   - Check monitoring dashboards
   - Review error logs
   - Determine impact scope

3. **Form Response Team**
   - Incident Commander
   - Technical Lead
   - Communications Lead
   - Subject Matter Expert

4. **Initial Investigation**
   ```bash
   # Check system health
   kubectl get pods
   curl https://api.cartrita.com/health

   # Review logs
   kubectl logs -f deployment/cartrita-app

   # Check metrics
   # Access Grafana dashboards
   ```

5. **Implement Fix**
   - Identify root cause
   - Implement mitigation
   - Test fix in staging
   - Deploy to production

6. **Verify Resolution**
   - Monitor key metrics
   - Test affected functionality
   - Confirm user experience

7. **Post-Incident**
   - Document timeline
   - Conduct retrospective
   - Implement improvements
   - Update playbooks

### Emergency Procedures

**Database Emergency**
```bash
# Check database health
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT version();"

# Emergency read-only mode
kubectl patch configmap app-config --patch '{"data":{"READ_ONLY_MODE":"true"}}'

# Restore from backup
./scripts/restore-database.sh latest
```

**Application Emergency**
```bash
# Scale down to single instance
kubectl scale deployment cartrita-app --replicas=1

# Rollback to previous version
kubectl rollout undo deployment/cartrita-app

# Emergency maintenance mode
kubectl patch configmap app-config --patch '{"data":{"MAINTENANCE_MODE":"true"}}'
```
```

### Performance Optimization

```markdown
## Performance Optimization Guide

### Database Optimization

1. **Query Performance**
   ```sql
   -- Monitor slow queries
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY total_time DESC
   LIMIT 10;

   -- Check index usage
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE tablename = 'messages';

   -- Vector search optimization
   SET hnsw.ef_search = 100;
   ```

2. **Connection Pooling**
   ```typescript
   // Optimize connection pool
   const pool = new Pool({
     max: 20,
     min: 5,
     idle_timeout: 30000,
     connection_timeout: 60000
   });
   ```

### Application Optimization

1. **Memory Usage**
   ```bash
   # Monitor memory usage
   node --max-old-space-size=4096 dist/main.js

   # Enable garbage collection logging
   node --trace-gc dist/main.js
   ```

2. **Caching Strategy**
   ```typescript
   // Redis caching
   const cached = await redis.get(`agent:${agentId}`);
   if (cached) return JSON.parse(cached);

   // Set with TTL
   await redis.setex(`agent:${agentId}`, 3600, JSON.stringify(result));
   ```

### Infrastructure Optimization

1. **Load Balancing**
   ```nginx
   upstream app {
     least_conn;
     server app1:3000 weight=3;
     server app2:3000 weight=2;
     server app3:3000 weight=1;
   }
   ```

2. **Auto Scaling**
   ```yaml
   # HPA configuration
   spec:
     minReplicas: 3
     maxReplicas: 10
     metrics:
     - type: Resource
       resource:
         name: cpu
         target:
           type: Utilization
           averageUtilization: 70
   ```
```

## 12. Troubleshooting

### Common Production Issues

#### High Memory Usage
```bash
# Check memory usage
kubectl top pods
docker stats

# Analyze heap dump
node --inspect dist/main.js
# Visit chrome://inspect

# Optimize garbage collection
node --max-old-space-size=4096 --optimize-for-size dist/main.js
```

#### Database Connection Issues
```bash
# Check connections
kubectl exec -it postgres-0 -- psql -U postgres -c "
  SELECT count(*) as connections,
         usename,
         application_name
  FROM pg_stat_activity
  GROUP BY usename, application_name
  ORDER BY connections DESC;
"

# Reset connections
kubectl delete pod postgres-0
kubectl rollout restart deployment/cartrita-app
```

#### High Response Times
```bash
# Check application metrics
curl https://api.cartrita.com/metrics | grep http_request_duration

# Profile application
node --prof dist/main.js
node --prof-process isolate-*.log > processed.txt
```

#### Agent Execution Failures
```bash
# Check agent health
curl https://api.cartrita.com/api/v1/agents/health

# Review agent logs
kubectl logs -f deployment/cartrita-app | grep "agent"

# Test individual agents
curl -X POST https://api.cartrita.com/api/v1/agents/test \
  -H "Content-Type: application/json" \
  -d '{"agentName": "research-agent", "query": "test"}'
```

### Emergency Contacts

```yaml
# Emergency escalation
Primary On-Call: +1-555-0123
Secondary On-Call: +1-555-0124
Engineering Manager: +1-555-0125
DevOps Lead: +1-555-0126

# Vendor Support
AWS Support: Enterprise Support Case
MongoDB Atlas: Priority Support
OpenAI: Enterprise Support Portal
```

This comprehensive deployment guide provides everything needed to deploy and operate the Cartrita AI Agents platform in production. Follow the procedures systematically and maintain documentation for your specific environment.

---

**Next Steps:**
1. Review and customize configurations for your environment
2. Set up monitoring and alerting systems
3. Test deployment procedures in staging
4. Train operations team on procedures
5. Establish incident response protocols