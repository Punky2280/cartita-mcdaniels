/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;

// Global type augmentations for Aurora Interface
declare global {
  interface Window {
    __AURORA_PERFORMANCE_OBSERVER__?: PerformanceObserver;
    __AURORA_ERROR_HANDLER__?: (error: Error, errorInfo?: React.ErrorInfo) => void;
  }
}

export {};