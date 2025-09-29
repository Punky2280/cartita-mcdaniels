import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import zxcvbn from 'zxcvbn';
import type { FastifyRequest } from 'fastify';

// Security configuration
interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    saltLength: number;
  };
  auth: {
    bcryptRounds: number;
    jwtSecret: string;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  audit: {
    enableLogging: boolean;
    logLevel: 'info' | 'warning' | 'error' | 'critical';
    retentionDays: number;
  };
}

// Security event types
type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'api_key_created'
  | 'api_key_used'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'data_access'
  | 'data_modification'
  | 'permission_denied'
  | 'mcp_connection'
  | 'encryption_key_rotated';

interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
}

interface ThreatDetectionRule {
  name: string;
  pattern: RegExp;
  threshold: number;
  timeWindow: number; // in milliseconds
  action: 'log' | 'block' | 'alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface EncryptionKeyPair {
  keyId: string;
  algorithm: string;
  key: Buffer;
  iv: Buffer;
  createdAt: Date;
  expiresAt?: Date;
}

type MCPConfig = {
  timeout?: number;
  retryAttempts?: number;
  security?: Record<string, unknown>;
  auth?: Record<string, unknown>;
  [key: string]: unknown;
};

const getHeaderValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
};

class SecurityService {
  private config: SecurityConfig;
  private threatRules: Map<string, ThreatDetectionRule> = new Map();
  private encryptionKeys: Map<string, EncryptionKeyPair> = new Map();
  private auditBuffer: SecurityEvent[] = [];
  private rateLimitCache: Map<string, { count: number; resetTime: number }> = new Map();
  private suspiciousIPs: Set<string> = new Set();

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        saltLength: 32,
      },
      auth: {
        bcryptRounds: 12,
  jwtSecret: process.env['JWT_SECRET'] || 'development-secret-change-in-production',
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
      },
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        skipSuccessfulRequests: false,
      },
      audit: {
        enableLogging: true,
        logLevel: 'info',
        retentionDays: 90,
      },
      ...config,
    };

    this.initializeThreatDetection();
    this.initializeEncryptionKeys();
  }

  // === ENCRYPTION & HASHING ===

  /**
   * Generate a secure hash for passwords
   */
  async hashPassword(password: string): Promise<string> {
    this.validatePassword(password);
    return bcrypt.hash(password, this.config.auth.bcryptRounds);
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, keyId?: string): Promise<{ encrypted: string; keyId: string; iv: string }> {
    const keyPair = keyId ? this.encryptionKeys.get(keyId) : this.getDefaultEncryptionKey();
    if (!keyPair) {
      throw new Error('Encryption key not found');
    }

    const cipher = createCipheriv(keyPair.algorithm, keyPair.key, keyPair.iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      keyId: keyPair.keyId,
      iv: keyPair.iv.toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: string, keyId: string, iv: string): Promise<string> {
    const keyPair = this.encryptionKeys.get(keyId);
    if (!keyPair) {
      throw new Error('Decryption key not found');
    }

    const decipher = createDecipheriv(keyPair.algorithm, keyPair.key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate secure API key
   */
  generateApiKey(): string {
    return `cms_${randomBytes(32).toString('hex')}`;
  }

  /**
   * Hash API key for storage
   */
  hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  // === INPUT VALIDATION & SANITIZATION ===

  /**
   * Validate and sanitize user input
   */
  validateAndSanitizeInput(input: unknown, type: 'email' | 'url' | 'alphanumeric' | 'json' | 'sql'): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Basic sanitization
    let sanitized = validator.escape(input.trim());

    switch (type) {
      case 'email':
        if (!validator.isEmail(sanitized)) {
          throw new Error('Invalid email format');
        }
        break;
      case 'url':
        if (!validator.isURL(sanitized)) {
          throw new Error('Invalid URL format');
        }
        break;
      case 'alphanumeric':
        if (!validator.isAlphanumeric(sanitized)) {
          throw new Error('Input must be alphanumeric');
        }
        break;
      case 'json':
        try {
          JSON.parse(sanitized);
        } catch {
          throw new Error('Invalid JSON format');
        }
        break;
      case 'sql':
        // Detect potential SQL injection patterns
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
          /(--|\/\*|\*\/|;|'|"|`)/,
          /(\bOR\b|\bAND\b).*=.*=/i,
        ];

        if (sqlPatterns.some(pattern => pattern.test(sanitized))) {
          throw new Error('Potential SQL injection detected');
        }
        break;
    }

    return sanitized;
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { valid: boolean; score: number; feedback: string[] } {
    const result = zxcvbn(password);

    const feedback: string[] = [];
    if (result.score < 3) {
      feedback.push('Password is too weak');
    }
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    }

    if (feedback.length > 0) {
      throw new Error(`Password validation failed: ${feedback.join(', ')}`);
    }

    return {
      valid: result.score >= 3 && feedback.length === 0,
      score: result.score,
      feedback: result.feedback.suggestions,
    };
  }

  // === RATE LIMITING ===

  /**
   * Check if request should be rate limited
   */
  checkRateLimit(key: string, customLimit?: { windowMs: number; maxRequests: number }): boolean {
    const limit = customLimit || this.config.rateLimit;
    const now = Date.now();

    const existing = this.rateLimitCache.get(key);

    if (!existing || existing.resetTime <= now) {
      // New window
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + limit.windowMs,
      });
      return true;
    }

    if (existing.count >= limit.maxRequests) {
      return false; // Rate limited
    }

    existing.count++;
    return true;
  }

  // === THREAT DETECTION ===

  /**
   * Analyze request for suspicious activity
   */
  analyzeRequest(request: FastifyRequest): {
    isSuspicious: boolean;
    threats: string[];
    riskScore: number
  } {
    const threats: string[] = [];
    let riskScore = 0;

    const ip = this.getClientIP(request);
    const userAgent = getHeaderValue(request.headers['user-agent']);
    const url = request.url;

    // Check against threat detection rules
    for (const [name, rule] of this.threatRules) {
      if (rule.pattern.test(url) || rule.pattern.test(userAgent)) {
        threats.push(name);
        riskScore += this.getSeverityScore(rule.severity);
      }
    }

    // Check for suspicious IP
    if (this.suspiciousIPs.has(ip)) {
      threats.push('suspicious_ip');
      riskScore += 5;
    }

    // Check for common attack patterns
    if (this.detectCommonAttacks(request)) {
      threats.push('common_attack_pattern');
      riskScore += 8;
    }

    return {
      isSuspicious: riskScore > 5,
      threats,
      riskScore,
    };
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: Partial<SecurityEvent>, request?: FastifyRequest): Promise<void> {
    if (!this.config.audit.enableLogging) return;

    if (!event.type) {
      throw new Error('Security event type is required');
    }

    const userAgentHeader = request ? getHeaderValue(request.headers['user-agent']) : undefined;
    const ipAddress = event.ipAddress ?? (request ? this.getClientIP(request) : undefined);
    const metadata = event.metadata ? { ...event.metadata } : {};

    const securityEvent: SecurityEvent = {
      type: event.type,
      metadata,
      severity: event.severity ?? 'info',
      timestamp: new Date(),
    };

    if (event.userId !== undefined) {
      securityEvent.userId = event.userId;
    }

    if (event.apiKeyId !== undefined) {
      securityEvent.apiKeyId = event.apiKeyId;
    }

    if (ipAddress !== undefined) {
      securityEvent.ipAddress = ipAddress;
    }

    const resolvedUserAgent = event.userAgent ?? userAgentHeader;
    if (resolvedUserAgent !== undefined) {
      securityEvent.userAgent = resolvedUserAgent;
    }

    if (event.resource !== undefined) {
      securityEvent.resource = event.resource;
    }

    if (event.resourceId !== undefined) {
      securityEvent.resourceId = event.resourceId;
    }

    this.auditBuffer.push(securityEvent);

    // Flush buffer if it gets too large
    if (this.auditBuffer.length > 100) {
      await this.flushAuditBuffer();
    }
  }

  // === MCP SECURITY ===

  /**
   * Secure MCP server configuration
   */
  secureMCPConfig(serverName: string, config: MCPConfig): MCPConfig {
    const timeout = typeof config.timeout === 'number' ? config.timeout : 30000;
    const retryAttempts = typeof config.retryAttempts === 'number' ? config.retryAttempts : 3;
    const securityOverrides = config.security ?? {};
    const authOverrides = config.auth ?? {};

    const secureConfig: MCPConfig = {
      ...config,
      security: {
        enableTLS: true,
        certificateValidation: true,
        timeout: Math.min(timeout, 60000), // Max 60s timeout
        retryAttempts: Math.min(retryAttempts, 5), // Max 5 retries
        ...securityOverrides,
      },
      auth: {
        required: true,
        method: 'api_key', // Default to API key auth
        ...authOverrides,
      },
    };

    // Log MCP connection attempt
    void this.logSecurityEvent({
      type: 'mcp_connection',
      severity: 'info',
      resource: 'mcp_server',
      resourceId: serverName,
      metadata: { config: secureConfig },
    });

    return secureConfig;
  }

  // === UTILITY METHODS ===

  private initializeThreatDetection(): void {
    // SQL Injection patterns
    this.threatRules.set('sql_injection', {
      name: 'SQL Injection',
      pattern: /(union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+set|exec\s*\()/i,
      threshold: 1,
      timeWindow: 60000,
      action: 'block',
      severity: 'critical',
    });

    // XSS patterns
    this.threatRules.set('xss_attack', {
      name: 'XSS Attack',
      pattern: /(<script|javascript:|on\w+\s*=|eval\s*\(|expression\s*\()/i,
      threshold: 1,
      timeWindow: 60000,
      action: 'block',
      severity: 'high',
    });

    // Path traversal
    this.threatRules.set('path_traversal', {
      name: 'Path Traversal',
      pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
      threshold: 3,
      timeWindow: 300000,
      action: 'alert',
      severity: 'medium',
    });

    // Brute force patterns
    this.threatRules.set('brute_force', {
      name: 'Brute Force',
      pattern: /(login|auth|signin)/i,
      threshold: 10,
      timeWindow: 300000,
      action: 'block',
      severity: 'high',
    });
  }

  private initializeEncryptionKeys(): void {
    // Create default encryption key
    const defaultKey: EncryptionKeyPair = {
      keyId: 'default',
      algorithm: this.config.encryption.algorithm,
      key: randomBytes(this.config.encryption.keyLength),
      iv: randomBytes(this.config.encryption.ivLength),
      createdAt: new Date(),
    };

    this.encryptionKeys.set('default', defaultKey);
  }

  private getDefaultEncryptionKey(): EncryptionKeyPair | undefined {
    return this.encryptionKeys.get('default');
  }

  private detectCommonAttacks(request: FastifyRequest): boolean {
    const url = request.url.toLowerCase();
    const headers = request.headers;

    // Check for common attack patterns
    const attackPatterns = [
      /phpinfo|eval|base64_decode|system|exec|shell_exec/i,
      /wp-admin|wp-login|administrator|admin/i,
      /\.(php|asp|aspx|jsp)$/i,
    ];

    return attackPatterns.some(pattern =>
      pattern.test(url) ||
      pattern.test(getHeaderValue(headers['user-agent'])) ||
      pattern.test(getHeaderValue(headers['referer']))
    );
  }

  private getSeverityScore(severity: string): number {
    switch (severity) {
      case 'low': return 1;
      case 'medium': return 3;
      case 'high': return 5;
      case 'critical': return 10;
      default: return 1;
    }
  }

  private getClientIP(request: FastifyRequest): string {
    const forwarded = getHeaderValue(request.headers['x-forwarded-for']);
    const realIp = getHeaderValue(request.headers['x-real-ip']);
    const remoteAddress = request.socket?.remoteAddress ?? 'unknown';
    const rawIp = forwarded || realIp || remoteAddress;
    return rawIp.split(',')[0]?.trim() || 'unknown';
  }

  private async flushAuditBuffer(): Promise<void> {
    // In a real implementation, this would write to database or external logging service
    const events = [...this.auditBuffer];
    this.auditBuffer = [];

    // For now, just log to console in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log(`[SECURITY AUDIT] Flushing ${events.length} security events:`, events);
    }
  }

  // === PUBLIC API ===

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Add custom threat detection rule
   */
  addThreatRule(name: string, rule: ThreatDetectionRule): void {
    this.threatRules.set(name, rule);
  }

  /**
   * Get audit events
   */
  getAuditEvents(): SecurityEvent[] {
    return [...this.auditBuffer];
  }

  /**
   * Clear audit buffer
   */
  async clearAuditBuffer(): Promise<void> {
    await this.flushAuditBuffer();
  }
}

// Singleton instance
export const securityService = new SecurityService();
export { SecurityService, type SecurityEvent, type SecurityEventType };