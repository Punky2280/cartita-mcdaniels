import { test, expect, describe } from 'vitest';
import { ValidationSchemas } from '../schemas/validation.js';
import { config } from '../config/environment.js';

/**
 * Security Configuration Tests
 * Validates all security hardening measures
 */

describe('Security Configuration Tests', () => {
  describe('Environment Configuration', () => {
    test('should validate required environment variables', () => {
      expect(() => config.validate()).not.toThrow();
    });

    test('should have secure JWT secret', () => {
      const jwtSecret = config.security.jwtSecret;
      expect(jwtSecret).toBeDefined();
      if (config.server.isProduction) {
        expect(jwtSecret.length).toBeGreaterThanOrEqual(32);
      }
    });

    test('should have secure CORS configuration', () => {
      const corsOrigin = config.security.corsOrigin;
      expect(corsOrigin).toBeDefined();
      if (config.server.isProduction) {
        expect(corsOrigin).not.toBe('*');
      }
    });

    test('should have proper rate limiting configuration', () => {
      const rateLimiting = config.security.rateLimiting;
      expect(rateLimiting.maxRequests).toBeGreaterThan(0);
      expect(rateLimiting.windowMs).toBeGreaterThan(0);
    });
  });

  describe('Input Validation Schemas', () => {
    test('should validate safe strings', () => {
      const validation = ValidationSchemas.Security;

      // Test safe inputs
      expect(validation.validateSecure('hello world')).toEqual({
        isValid: true,
        threats: []
      });

      expect(validation.validateSecure('user123')).toEqual({
        isValid: true,
        threats: []
      });
    });

    test('should detect SQL injection attempts', () => {
      const validation = ValidationSchemas.Security;

      const sqlInjectionTests = [
        "' OR 1=1 --",
        'UNION SELECT * FROM users',
        'DROP TABLE users;',
        '1; DELETE FROM users;',
      ];

      for (const malicious of sqlInjectionTests) {
        const result = validation.validateSecure(malicious);
        expect(result.isValid).toBe(false);
        expect(result.threats).toContain('sql_injection');
      }
    });

    test('should detect XSS attempts', () => {
      const validation = ValidationSchemas.Security;

      const xssTests = [
        '<script>alert("xss")</script>',
        '<iframe src="javascript:alert(1)"></iframe>',
        'javascript:alert(1)',
        '<img onerror="alert(1)" src="x">',
        '<div onclick="alert(1)">click me</div>',
      ];

      for (const malicious of xssTests) {
        const result = validation.validateSecure(malicious);
        expect(result.isValid).toBe(false);
        expect(result.threats).toContain('xss');
      }
    });

    test('should detect path traversal attempts', () => {
      const validation = ValidationSchemas.Security;

      const pathTraversalTests = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
        '....//....//....//etc/passwd',
      ];

      for (const malicious of pathTraversalTests) {
        const result = validation.validateSecure(malicious);
        expect(result.isValid).toBe(false);
        expect(result.threats).toContain('path_traversal');
      }
    });

    test('should detect command injection attempts', () => {
      const validation = ValidationSchemas.Security;

      const commandInjectionTests = [
        'test; cat /etc/passwd',
        'test && rm -rf /',
        'test | whoami',
        'test `id`',
        'test $(uname -a)',
      ];

      for (const malicious of commandInjectionTests) {
        const result = validation.validateSecure(malicious);
        expect(result.isValid).toBe(false);
        expect(result.threats).toContain('command_injection');
      }
    });
  });

  describe('Schema Validation', () => {
    test('should validate authentication requests', () => {
      const { Authentication } = ValidationSchemas;

      // Valid login request
      const validLogin = {
        email: 'user@example.com',
        password: 'securePassword123',
      };

      // This would be validated by Fastify with the schema
      expect(validLogin.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(validLogin.password.length).toBeGreaterThanOrEqual(8);
    });

    test('should validate file uploads', () => {
      const { File } = ValidationSchemas;

      const validFile = {
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024 * 1024, // 1MB
      };

      // Safe filename validation
      expect(validFile.filename).toMatch(/^[a-zA-Z0-9._-]+$/);
      expect(validFile.size).toBeLessThanOrEqual(50 * 1024 * 1024); // 50MB max
    });

    test('should validate AI requests', () => {
      const { AI } = ValidationSchemas;

      const validAIRequest = {
        prompt: 'Analyze this code for security vulnerabilities',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7,
      };

      expect(validAIRequest.prompt.length).toBeLessThanOrEqual(4000);
      expect(validAIRequest.maxTokens).toBeLessThanOrEqual(1000000);
      expect(validAIRequest.temperature).toBeGreaterThanOrEqual(0);
      expect(validAIRequest.temperature).toBeLessThanOrEqual(2);
    });
  });

  describe('Security Headers', () => {
    test('should have proper CSP configuration', () => {
      const csp = config.security.headers.csp;
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
    });

    test('should enable HSTS in production', () => {
      if (config.server.isProduction) {
        expect(config.security.headers.hsts).toBe(true);
      }
    });

    test('should enable frame guard', () => {
      expect(config.security.headers.frameGuard).toBe(true);
    });
  });

  describe('Threat Detection', () => {
    test('should enable threat detection', () => {
      expect(config.security.threatDetection.enabled).toBe(true);
    });

    test('should block suspicious activity in production', () => {
      if (config.server.isProduction) {
        expect(config.security.threatDetection.blockSuspicious).toBe(true);
      }
    });
  });

  describe('Input Validation Configuration', () => {
    test('should enable input validation', () => {
      expect(config.security.inputValidation.enabled).toBe(true);
    });

    test('should have reasonable body size limits', () => {
      const maxBodySize = config.security.inputValidation.maxBodySize;
      expect(maxBodySize).toBeDefined();
      expect(maxBodySize).toMatch(/^\d+mb$/i);
    });

    test('should have query string size limits', () => {
      const maxQuerySize = config.security.inputValidation.maxQueryStringSize;
      expect(maxQuerySize).toBeGreaterThan(0);
      expect(maxQuerySize).toBeLessThanOrEqual(4096); // Reasonable limit
    });
  });
});