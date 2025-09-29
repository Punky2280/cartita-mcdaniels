# Troubleshooting Guide

Comprehensive troubleshooting guide for the Cartrita McDaniels AI Development System.

## Common Issues and Solutions

### Installation and Setup Issues

#### Issue: `pnpm install` fails with dependency conflicts

**Symptoms:**
- Dependency resolution errors during installation
- Version conflict messages
- Module not found errors

**Solution:**
```bash
# Clear all caches
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml

# Reinstall dependencies
pnpm install --frozen-lockfile=false
```

**Prevention:**
- Always use `pnpm install --frozen-lockfile` in production
- Keep dependencies up to date regularly
- Use exact versions for critical dependencies

#### Issue: Database connection fails

**Symptoms:**
- "Connection refused" errors
- "Database does not exist" errors
- Authentication failures

**Diagnostic Steps:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check database connectivity
psql -h localhost -U postgres -d cartrita -c "SELECT 1;"

# Verify environment variables
echo $DATABASE_URL
```

**Solution:**
```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Create database if missing
createdb -U postgres cartrita

# Run migrations
pnpm db:migrate

# Seed database with test data
pnpm db:seed
```

#### Issue: Environment variables not loaded

**Symptoms:**
- Default values being used instead of configured values
- "Environment variable not found" errors
- Incorrect service URLs or API keys

**Solution:**
```bash
# Check .env file exists and has correct permissions
ls -la .env
cat .env

# Verify environment loading in application
node -e "console.log(process.env.NODE_ENV)"

# Load environment variables explicitly
source .env
export $(cat .env | xargs)
```

### Runtime Issues

#### Issue: High memory usage / Memory leaks

**Symptoms:**
- Gradually increasing memory usage over time
- Out of memory errors
- Slow response times

**Diagnostic Commands:**
```bash
# Monitor memory usage
htop
# or
ps aux --sort=-%mem | head

# Check Node.js heap usage
node --inspect --inspect-port=9229 dist/main.js
# Then connect Chrome DevTools to localhost:9229
```

**Solution:**
```typescript
// Add memory monitoring to your application
class MemoryMonitor {
  private interval: NodeJS.Timeout;
  
  start() {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      console.log('Memory Usage:', {
        rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(usage.external / 1024 / 1024) + ' MB'
      });
      
      // Force garbage collection if heap usage is high
      if (usage.heapUsed / usage.heapTotal > 0.9) {
        global.gc && global.gc();
      }
    }, 30000); // Check every 30 seconds
  }
  
  stop() {
    clearInterval(this.interval);
  }
}
```

**Prevention:**
- Implement proper cleanup in agents
- Use weak references for large data structures
- Implement timeout for long-running operations
- Use streaming for large file processing

#### Issue: Slow API responses

**Symptoms:**
- Response times > 5 seconds
- Timeout errors
- High CPU usage

**Diagnostic Steps:**
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/v1/health"

# Monitor CPU usage
top -p $(pgrep -f "node.*main.js")

# Check database query performance
EXPLAIN ANALYZE SELECT * FROM workflows WHERE status = 'running';
```

**Performance Tuning:**
```typescript
// Add response time monitoring
import express from 'express';

const app = express();

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
    
    if (duration > 5000) {
      console.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
});
```

**Optimization Solutions:**
```typescript
// Implement caching
class ResponseCache {
  private cache = new Map<string, { data: unknown; expiry: number }>();
  
  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  set(key: string, data: unknown, ttl = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }
}

// Use connection pooling
const pool = new Pool({
  max: 20,
  min: 4,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000
});
```

### AI Integration Issues

#### Issue: AI model requests fail or timeout

**Symptoms:**
- "Model not available" errors
- Request timeouts
- Rate limit exceeded errors
- Invalid API responses

**Diagnostic Steps:**
```bash
# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Check rate limits
curl -v -H "Authorization: Bearer $API_KEY" \
  https://api.example.com/v1/endpoint 2>&1 | grep -i rate

# Monitor API usage
tail -f logs/api-requests.log | grep -E "(error|timeout|rate_limit)"
```

**Solution:**
```typescript
// Implement robust API client with retries
class RobustAIClient {
  private rateLimiter = new RateLimiter(10, 60); // 10 requests per minute
  
  async callAPI(request: APIRequest): Promise<APIResponse> {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        // Wait for rate limiter
        await this.rateLimiter.acquire();
        
        const response = await this.makeRequest(request);
        return response;
        
      } catch (error) {
        attempt++;
        
        if (error.status === 429) { // Rate limit
          const retryAfter = error.headers['retry-after'] || 60;
          console.warn(`Rate limited, waiting ${retryAfter}s`);
          await this.sleep(retryAfter * 1000);
          continue;
        }
        
        if (error.status >= 500 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`Server error, retrying in ${delay}ms`);
          await this.sleep(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error(`API request failed after ${maxRetries} attempts`);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Issue: Context7 service unavailable

**Symptoms:**
- Context7 API errors
- Documentation requests failing
- Library resolution errors

**Diagnostic Steps:**
```bash
# Test Context7 connectivity
curl -X POST "https://api.context7.com/resolve" \
  -H "Content-Type: application/json" \
  -d '{"libraryName": "fastify"}'

# Check service status
curl https://status.context7.com/api/v2/status.json
```

**Fallback Implementation:**
```typescript
class ResilientContext7Service {
  private fallbackDocs = new Map<string, Documentation>();
  
  async getDocumentation(libraryId: string, topic?: string): Promise<Documentation> {
    try {
      return await this.context7Client.getDocumentation(libraryId, topic);
    } catch (error) {
      console.warn('Context7 unavailable, using fallback documentation');
      
      // Try local cache first
      const cached = await this.getFromCache(libraryId, topic);
      if (cached) return cached;
      
      // Use built-in documentation
      const fallback = this.fallbackDocs.get(libraryId);
      if (fallback) return fallback;
      
      // Return generic documentation template
      return this.generateGenericDocumentation(libraryId, topic);
    }
  }
  
  private generateGenericDocumentation(libraryId: string, topic?: string): Documentation {
    return {
      libraryId,
      topic: topic || 'general',
      content: `Documentation for ${libraryId} is temporarily unavailable. Please refer to the official documentation.`,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Database Issues

#### Issue: Database queries are slow

**Symptoms:**
- Query execution time > 1 second
- High database CPU usage
- Connection pool exhaustion

**Diagnostic Queries:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
AND n_distinct > 100;

-- Monitor connection usage
SELECT count(*) as connection_count, state 
FROM pg_stat_activity 
GROUP BY state;
```

**Optimization Solutions:**
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_workflows_status_created_at 
ON workflows(status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_executions_workflow_agent 
ON executions(workflow_id, agent_id);

-- Analyze table statistics
ANALYZE workflows;
ANALYZE executions;
ANALYZE agents;
```

#### Issue: Database connection pool exhausted

**Symptoms:**
- "No more connections available" errors
- Hanging requests
- Connection timeouts

**Solution:**
```typescript
// Implement connection pool monitoring
class PoolMonitor {
  constructor(private pool: Pool) {}
  
  startMonitoring() {
    setInterval(() => {
      const stats = {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount
      };
      
      console.log('Pool stats:', stats);
      
      if (stats.waiting > 5) {
        console.warn('High number of waiting connections:', stats.waiting);
      }
      
      if (stats.idle < 2) {
        console.warn('Low number of idle connections:', stats.idle);
      }
    }, 30000);
  }
}

// Implement proper connection cleanup
class DatabaseService {
  async executeQuery<T>(query: string, params: unknown[]): Promise<T[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release(); // Always release connections
    }
  }
}
```

### CLI Issues

#### Issue: CLI commands not working or not found

**Symptoms:**
- "Command not found" errors
- Permission denied errors
- Unexpected command behavior

**Diagnostic Steps:**
```bash
# Check if CLI is properly installed
which cartrita-ai
ls -la $(which cartrita-ai)

# Check permissions
ls -la /usr/local/bin/cartrita-ai

# Test basic functionality
cartrita-ai --help
cartrita-ai version
```

**Solution:**
```bash
# Reinstall CLI globally
npm uninstall -g cartrita-ai
npm install -g .

# Or use local installation
npx cartrita-ai --help

# Fix permissions if needed
chmod +x ./dist/cli/cartrita-ai.js
```

#### Issue: CLI hangs or doesn't respond

**Symptoms:**
- Commands never complete
- No output after running command
- Process consuming high CPU

**Debugging:**
```bash
# Run with debug output
DEBUG=* cartrita-ai workflow code-review --context "test"

# Check for hanging processes
ps aux | grep cartrita-ai
kill -9 <process_id> # If needed

# Use timeout to prevent hanging
timeout 300 cartrita-ai workflow code-review --context "test"
```

**Solution:**
```typescript
// Add timeout handling to CLI commands
import { setTimeout } from 'timers/promises';

class CLICommand {
  async executeWithTimeout<T>(
    operation: () => Promise<T>, 
    timeoutMs = 300000 // 5 minutes
  ): Promise<T> {
    try {
      const result = await Promise.race([
        operation(),
        setTimeout(timeoutMs, 'timeout').then(() => {
          throw new Error(`Operation timed out after ${timeoutMs}ms`);
        })
      ]);
      
      return result as T;
    } catch (error) {
      if (error.message.includes('timeout')) {
        console.error('Command timed out. This might indicate a system issue.');
        process.exit(1);
      }
      throw error;
    }
  }
}
```

### Monitoring and Debugging

#### Issue: Logs not appearing or incomplete

**Symptoms:**
- Missing log entries
- Logs not rotating properly
- Unable to trace request flow

**Solution:**
```typescript
// Implement structured logging with correlation IDs
import { v4 as uuidv4 } from 'uuid';

class CorrelatedLogger {
  private correlationId: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId || uuidv4();
  }
  
  log(level: string, message: string, data?: unknown): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      level,
      message,
      data
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  createChild(additionalContext?: Record<string, unknown>): CorrelatedLogger {
    const child = new CorrelatedLogger(this.correlationId);
    if (additionalContext) {
      child.log('info', 'Child logger created', additionalContext);
    }
    return child;
  }
}

// Use in request handlers
app.use((req, res, next) => {
  req.logger = new CorrelatedLogger();
  req.logger.log('info', 'Request received', {
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent']
  });
  next();
});
```

#### Issue: Health checks failing intermittently

**Symptoms:**
- Sporadic health check failures
- Load balancer removing healthy instances
- False positive alerts

**Enhanced Health Check:**
```typescript
class ComprehensiveHealthCheck {
  private checks = new Map<string, HealthChecker>();
  
  constructor() {
    this.checks.set('database', new DatabaseHealthChecker());
    this.checks.set('ai-services', new AIServicesHealthChecker());
    this.checks.set('context7', new Context7HealthChecker());
    this.checks.set('cache', new CacheHealthChecker());
  }
  
  async performHealthCheck(): Promise<HealthStatus> {
    const results = await Promise.allSettled(
      Array.from(this.checks.entries()).map(async ([name, checker]) => {
        const startTime = Date.now();
        const result = await checker.check();
        const duration = Date.now() - startTime;
        
        return {
          name,
          status: result.healthy ? 'healthy' : 'unhealthy',
          message: result.message,
          responseTime: duration
        };
      })
    );
    
    const components: Record<string, ComponentHealth> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    results.forEach((result, index) => {
      const name = Array.from(this.checks.keys())[index];
      
      if (result.status === 'fulfilled') {
        components[name] = result.value;
        if (result.value.status !== 'healthy') {
          overallStatus = 'degraded';
        }
      } else {
        components[name] = {
          name,
          status: 'unhealthy',
          message: result.reason.message,
          responseTime: 0
        };
        overallStatus = 'unhealthy';
      }
    });
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      components
    };
  }
}
```

### Performance Issues

#### Issue: High CPU usage during AI operations

**Symptoms:**
- CPU usage constantly > 80%
- System becomes unresponsive
- Other applications slow down

**Solution:**
```typescript
// Implement CPU throttling for AI operations
class CPUThrottledAIService {
  private operationQueue: AIOperation[] = [];
  private isProcessing = false;
  private maxConcurrentOperations = 2;
  private currentOperations = 0;
  
  async executeAIOperation(operation: AIOperation): Promise<AIResult> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        ...operation,
        resolve,
        reject
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.currentOperations >= this.maxConcurrentOperations) {
      return;
    }
    
    const operation = this.operationQueue.shift();
    if (!operation) return;
    
    this.isProcessing = true;
    this.currentOperations++;
    
    try {
      // Add artificial delays to prevent CPU saturation
      await this.sleep(100);
      
      const result = await this.performAIOperation(operation);
      operation.resolve(result);
      
    } catch (error) {
      operation.reject(error);
    } finally {
      this.currentOperations--;
      this.isProcessing = false;
      
      // Process next operation after a small delay
      setTimeout(() => this.processQueue(), 50);
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Error Codes Reference

### System Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| SYS001 | Database connection failed | Check database connectivity and credentials |
| SYS002 | Environment variable missing | Set required environment variables |
| SYS003 | Service initialization failed | Check service dependencies and configuration |
| SYS004 | Memory limit exceeded | Increase memory allocation or optimize usage |
| SYS005 | Disk space insufficient | Clean up logs and temporary files |

### API Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| API001 | 400 | Invalid request format | Check request body format and required fields |
| API002 | 401 | Authentication failed | Verify API key or JWT token |
| API003 | 403 | Insufficient permissions | Check user roles and permissions |
| API004 | 404 | Resource not found | Verify resource ID and existence |
| API005 | 429 | Rate limit exceeded | Implement request throttling |
| API006 | 500 | Internal server error | Check server logs and system health |

### Workflow Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| WF001 | Workflow not found | Verify workflow name exists |
| WF002 | Agent not available | Check agent status and configuration |
| WF003 | Input validation failed | Verify input format and required parameters |
| WF004 | Execution timeout | Increase timeout or optimize workflow |
| WF005 | Resource allocation failed | Check system resources and limits |

### AI Integration Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| AI001 | Model not available | Check model status and API connectivity |
| AI002 | Token limit exceeded | Reduce input size or use different model |
| AI003 | API quota exceeded | Check API usage limits and billing |
| AI004 | Invalid model response | Check model configuration and input format |
| AI005 | Context7 service unavailable | Use fallback documentation or retry later |

## Emergency Procedures

### System Recovery Steps

1. **Immediate Assessment**
   ```bash
   # Check system status
   systemctl status cartrita-ai
   docker ps -a
   kubectl get pods
   
   # Check resources
   df -h
   free -m
   top
   ```

2. **Service Restart**
   ```bash
   # Restart application
   sudo systemctl restart cartrita-ai
   
   # Or for Docker
   docker-compose restart
   
   # Or for Kubernetes
   kubectl rollout restart deployment/cartrita-ai
   ```

3. **Database Recovery**
   ```bash
   # Check database status
   sudo systemctl status postgresql
   
   # Restart if needed
   sudo systemctl restart postgresql
   
   # Run integrity check
   psql -d cartrita -c "SELECT pg_database_size('cartrita');"
   ```

4. **Log Analysis**
   ```bash
   # Check recent errors
   tail -n 100 /var/log/cartrita-ai/error.log
   
   # Search for specific errors
   grep -i "error\|exception\|failed" /var/log/cartrita-ai/app.log | tail -20
   ```

### Escalation Contacts

- **Level 1 Support**: System Administrator
- **Level 2 Support**: Development Team Lead
- **Level 3 Support**: Architecture Team
- **Emergency Contact**: On-call Engineer (24/7)

---

*Last updated: September 27, 2025*