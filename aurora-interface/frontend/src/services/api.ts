/**
 * Aurora Interface - API Service Layer
 * Production-ready API client with error handling, retries, and type safety
 */

import { logger } from '@/utils/logger';
import { ApiResponse, ApiError } from '@/types';

export class AuroraApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, status?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AuroraApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  defaultHeaders: Record<string, string>;
}

class ApiClient {
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...config,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestConfig = {}
  ): Promise<Response> {
    const { timeout = this.config.timeout, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          ...this.config.defaultHeaders,
          ...fetchOptions.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async executeRequest<T>(
    url: string,
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      retries = this.config.retries,
      retryDelay = this.config.retryDelay,
      ...requestOptions
    } = options;

    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logger.debug(`API request attempt ${attempt + 1}`, {
          method: requestOptions.method || 'GET',
          url: fullUrl,
          attempt: attempt + 1,
          maxAttempts: retries + 1,
        });

        const response = await this.fetchWithTimeout(fullUrl, requestOptions);

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);

          // Don't retry for client errors (4xx)
          if (response.status >= 400 && response.status < 500 && attempt === 0) {
            throw new AuroraApiError(
              errorData.message || `HTTP ${response.status}: ${response.statusText}`,
              errorData.code || 'CLIENT_ERROR',
              response.status,
              errorData.details
            );
          }

          // Retry for server errors (5xx) and network issues
          if (attempt < retries && response.status >= 500) {
            logger.warn(`API request failed, retrying in ${retryDelay}ms`, {
              status: response.status,
              statusText: response.statusText,
              attempt: attempt + 1,
              maxAttempts: retries + 1,
            });

            await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }

          throw new AuroraApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            errorData.code || 'SERVER_ERROR',
            response.status,
            errorData.details
          );
        }

        const data = await response.json();

        logger.debug('API request successful', {
          method: requestOptions.method || 'GET',
          url: fullUrl,
          status: response.status,
          attempt: attempt + 1,
        });

        return {
          data,
          success: true,
          message: 'Request successful',
        };

      } catch (error) {
        if (error instanceof AuroraApiError) {
          throw error;
        }

        // Handle network errors, timeouts, etc.
        if (attempt < retries) {
          logger.warn(`API request failed, retrying in ${retryDelay}ms`, {
            error: error instanceof Error ? error.message : String(error),
            attempt: attempt + 1,
            maxAttempts: retries + 1,
          });

          await this.delay(retryDelay * Math.pow(2, attempt));
          continue;
        }

        // Final attempt failed
        const message = error instanceof Error ? error.message : 'Unknown error occurred';

        logger.error('API request failed after all retries', error instanceof Error ? error : new Error(message), {
          url: fullUrl,
          method: requestOptions.method || 'GET',
          attempts: retries + 1,
        });

        throw new AuroraApiError(
          message,
          'NETWORK_ERROR',
          undefined,
          { originalError: error }
        );
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new AuroraApiError('Unexpected error in request execution', 'UNKNOWN_ERROR');
  }

  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const errorData = await response.json();
      return {
        message: errorData.message || 'An error occurred',
        code: errorData.code || 'UNKNOWN_ERROR',
        details: errorData.details,
      };
    } catch {
      return {
        message: response.statusText || 'An error occurred',
        code: 'PARSE_ERROR',
      };
    }
  }

  public async get<T>(url: string, options: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, { ...options, method: 'GET' });
  }

  public async post<T>(
    url: string,
    data?: unknown,
    options: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async put<T>(
    url: string,
    data?: unknown,
    options: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async patch<T>(
    url: string,
    data?: unknown,
    options: Omit<RequestConfig, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async delete<T>(url: string, options: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.executeRequest<T>(url, { ...options, method: 'DELETE' });
  }

  public setAuthToken(token: string): void {
    this.config.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  public removeAuthToken(): void {
    delete this.config.defaultHeaders['Authorization'];
  }

  public setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }
}

// Create singleton API client instance
export const apiClient = new ApiClient();

// Export the client class for testing or custom instances
export { ApiClient };

export default apiClient;