# Aurora Interface 2025 Implementation Guide

## Complete Frontend Development Guide with React 19+, TypeScript 5.7+, and Modern Best Practices

Based on Context7 integration research and the latest 2025 frontend development patterns, this comprehensive guide provides specific implementation guidance for building the Aurora Interface frontend application.

---

## Table of Contents

1. [React 19+ Features & Patterns](#react-19-features--patterns)
2. [TypeScript 5.7+ Advanced Implementation](#typescript-57-advanced-implementation)
3. [Modern UI/UX Design Systems](#modern-uiux-design-systems)
4. [Accessibility Standards (WCAG 2.2)](#accessibility-standards-wcag-22)
5. [Performance Optimization Techniques](#performance-optimization-techniques)
6. [Modern State Management](#modern-state-management)
7. [Complete Aurora Interface Architecture](#complete-aurora-interface-architecture)
8. [Implementation Examples](#implementation-examples)
9. [Build & Deployment Strategy](#build--deployment-strategy)
10. [Testing & Quality Assurance](#testing--quality-assurance)

---

## React 19+ Features & Patterns

### Server Components & Concurrent Features

```typescript
// app/layout.tsx - Server Component Layout
import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<LoadingSkeleton />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}

// app/dashboard/page.tsx - Server Component with Data Fetching
export default async function DashboardPage() {
  const data = await fetch('http://localhost:3001/api/dashboard', {
    next: { revalidate: 60 } // ISR with 60s revalidation
  });

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent data={data} />
    </Suspense>
  );
}
```

### Client Components with Concurrent Features

```typescript
// components/InteractiveForm.tsx
'use client';

import { useTransition, startTransition } from 'react';
import { useDeferredValue } from 'react';

export function InteractiveForm() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      // Non-urgent state update
      updateSearchResults(deferredQuery);
    });
  };

  return (
    <form action={handleSubmit}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {isPending && <LoadingSpinner />}
    </form>
  );
}
```

---

## TypeScript 5.7+ Advanced Implementation

### Advanced Type Patterns

```typescript
// types/aurora.ts - Advanced Type System
type Theme = 'light' | 'dark' | 'aurora';
type ComponentVariant = 'primary' | 'secondary' | 'accent';
type AuroraComponent<T extends string> = `aurora-${T}-${ComponentVariant}`;

// Template Literal Types for Design System
type AuroraClassName = AuroraComponent<'button'> | AuroraComponent<'card'> | AuroraComponent<'input'>;

// Conditional Types for Component Props
type ConditionalProps<T> = T extends 'button'
  ? { onClick: () => void; type?: 'button' | 'submit' }
  : T extends 'input'
  ? { value: string; onChange: (value: string) => void }
  : {};

// Mapped Types for Theme Configuration
type ThemeConfig<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? `var(--aurora-${K})`
    : T[K];
};
```

### Strict TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "allowImportingTsExtensions": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

---

## Modern UI/UX Design Systems

### Aurora Design Tokens

```typescript
// tokens/aurora.ts - Design Token System
export const auroraTokens = {
  colors: {
    // Aurora Primary Colors (Claude Orange)
    'aurora-primary': {
      50: '#fff7ed',
      100: '#ffedd5',
      500: '#FF6B35', // Claude Orange
      900: '#9a3412',
    },
    // Aurora Secondary (Microsoft Blue)
    'aurora-secondary': {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#0078D4', // Microsoft Blue
      900: '#1e3a8a',
    },
    // Aurora Accent (ChatGPT Purple)
    'aurora-accent': {
      50: '#f3f4f6',
      100: '#e5e7eb',
      500: '#6B46C1', // ChatGPT Purple
      900: '#4c1d95',
    },
  },
  spacing: {
    'aurora-xs': '0.25rem',
    'aurora-sm': '0.5rem',
    'aurora-md': '1rem',
    'aurora-lg': '1.5rem',
    'aurora-xl': '2rem',
  },
  typography: {
    'aurora-font-sans': ['Inter', 'system-ui', 'sans-serif'],
    'aurora-font-mono': ['Fira Code', 'Consolas', 'monospace'],
  },
} as const;
```

### Component Architecture with Radix UI

```typescript
// components/ui/AuroraButton.tsx
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        primary: "bg-aurora-primary-500 text-white hover:bg-aurora-primary-600",
        secondary: "bg-aurora-secondary-500 text-white hover:bg-aurora-secondary-600",
        accent: "bg-aurora-accent-500 text-white hover:bg-aurora-accent-600",
      },
      size: {
        sm: "h-9 px-3 rounded-md",
        md: "h-10 py-2 px-4",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface AuroraButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const AuroraButton = forwardRef<HTMLButtonElement, AuroraButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : motion.button;
    return (
      <Comp
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      />
    );
  }
);

export { AuroraButton, buttonVariants };
```

---

## Accessibility Standards (WCAG 2.2)

### Accessible Component Implementation

```typescript
// components/accessibility/AccessibleModal.tsx
import { useDialog } from '@react-aria/dialog';
import { useModal } from '@react-aria/overlays';
import { FocusScope } from '@react-aria/focus';
import * as Dialog from '@radix-ui/react-dialog';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: AccessibleModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { modalProps, underlayProps } = useModal();
  const { dialogProps, titleProps } = useDialog(
    { title, 'aria-describedby': description ? 'modal-description' : undefined },
    ref
  );

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay {...underlayProps} className="aurora-modal-overlay">
          <FocusScope contain restoreFocus autoFocus>
            <Dialog.Content
              {...modalProps}
              {...dialogProps}
              ref={ref}
              className="aurora-modal-content"
            >
              <Dialog.Title {...titleProps} className="aurora-modal-title">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description id="modal-description" className="aurora-modal-description">
                  {description}
                </Dialog.Description>
              )}
              {children}
              <Dialog.Close asChild>
                <button className="aurora-modal-close" aria-label="Close modal">
                  ×
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </FocusScope>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Screen Reader Announcements

```typescript
// hooks/useAnnouncer.ts
import { useRef, useCallback } from 'react';

export function useAnnouncer() {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
      announceRef.current.setAttribute('aria-live', priority);
    }
  }, []);

  const AnnouncerComponent = () => (
    <div
      ref={announceRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return { announce, AnnouncerComponent };
}
```

---

## Performance Optimization Techniques

### Core Web Vitals Implementation

```typescript
// utils/performance/webVitals.ts
import { onLCP, onFID, onCLS, onFCP, onTTFB } from 'web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export function initWebVitals() {
  const sendToAnalytics = (metric: WebVitalMetric) => {
    // Send to your analytics service
    console.log('Web Vital:', metric);

    // Example: Send to Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
      });
    }
  };

  onLCP(sendToAnalytics);
  onFID(sendToAnalytics);
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

### Image Optimization Component

```typescript
// components/performance/OptimizedImage.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  placeholder,
  priority = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current && !priority) {
      observer.observe(imgRef.current);
    } else {
      setIsInView(true);
    }

    return () => observer.disconnect();
  }, [priority]);

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      <AnimatePresence>
        {placeholder && !isLoaded && (
          <motion.div
            className="absolute inset-0 bg-gray-200 animate-pulse"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
```

---

## Modern State Management

### Zustand Global State

```typescript
// stores/useAuroraStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AuroraState {
  // UI State
  theme: 'light' | 'dark' | 'aurora';
  sidebarOpen: boolean;
  notifications: Notification[];

  // User State
  user: User | null;
  preferences: UserPreferences;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'aurora') => void;
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setUser: (user: User | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
}

export const useAuroraStore = create<AuroraState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        theme: 'aurora',
        sidebarOpen: false,
        notifications: [],
        user: null,
        preferences: {
          language: 'en',
          timezone: 'UTC',
          emailNotifications: true,
        },

        // Actions
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme;
          }),

        toggleSidebar: () =>
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          }),

        addNotification: (notification) =>
          set((state) => {
            state.notifications.push({
              ...notification,
              id: crypto.randomUUID(),
              timestamp: new Date(),
            });
          }),

        removeNotification: (id) =>
          set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== id);
          }),

        setUser: (user) =>
          set((state) => {
            state.user = user;
          }),

        updatePreferences: (preferences) =>
          set((state) => {
            Object.assign(state.preferences, preferences);
          }),
      })),
      {
        name: 'aurora-storage',
        partialize: (state) => ({
          theme: state.theme,
          preferences: state.preferences,
        }),
      }
    ),
    {
      name: 'aurora-store',
    }
  )
);
```

### React Query Server State

```typescript
// api/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys Factory
export const queryKeys = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
} as const;

// Custom Hooks
export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: User) => {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Optimistic update
      queryClient.setQueryData(queryKeys.user(updatedUser.id), updatedUser);
      queryClient.invalidateQueries(queryKeys.users);
    },
  });
}
```

---

## Complete Aurora Interface Architecture

### Project Structure

```
aurora-interface/
├── public/
│   ├── icons/
│   ├── images/
│   └── manifest.json
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/
│   │   ├── (auth)/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   ├── forms/              # Form components
│   │   ├── layout/             # Layout components
│   │   ├── features/           # Feature-specific components
│   │   └── providers/          # Context providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and configurations
│   ├── stores/                 # State management
│   ├── types/                  # TypeScript types
│   ├── styles/                 # CSS and styling
│   └── utils/                  # Helper functions
├── tests/                      # Test files
├── docs/                       # Documentation
├── .github/                    # GitHub workflows
├── tailwind.config.js
├── next.config.js
├── tsconfig.json
└── package.json
```

### Main Layout Implementation

```typescript
// app/layout.tsx
import { Inter, Fira_Code } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import { initWebVitals } from '@/utils/performance/webVitals';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize performance monitoring
  if (typeof window !== 'undefined') {
    initWebVitals();
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${firaCode.variable} font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Dashboard Layout

```typescript
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuroraStore } from '@/stores/useAuroraStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Implementation Examples

### Form Handling with React Hook Form

```typescript
// components/forms/ContactForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuroraButton } from '@/components/ui/AuroraButton';
import { FormField } from '@/components/ui/FormField';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      await submitContactForm(data);
      reset();
      // Show success notification
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        label="Name"
        error={errors.name?.message}
        required
      >
        <input
          {...register('name')}
          type="text"
          className="aurora-input"
          aria-invalid={errors.name ? 'true' : 'false'}
        />
      </FormField>

      <FormField
        label="Email"
        error={errors.email?.message}
        required
      >
        <input
          {...register('email')}
          type="email"
          className="aurora-input"
          aria-invalid={errors.email ? 'true' : 'false'}
        />
      </FormField>

      <FormField
        label="Message"
        error={errors.message?.message}
        required
      >
        <textarea
          {...register('message')}
          rows={4}
          className="aurora-textarea"
          aria-invalid={errors.message ? 'true' : 'false'}
        />
      </FormField>

      <AuroraButton
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </AuroraButton>
    </form>
  );
}
```

### Real-time Features with WebSockets

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { useAuroraStore } from '@/stores/useAuroraStore';

interface UseWebSocketOptions {
  url: string;
  protocols?: string | string[];
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    protocols,
    onMessage,
    onError,
    reconnectAttempts = 3,
    reconnectDelay = 1000,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const addNotification = useAuroraStore(state => state.addNotification);

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url, protocols);

      ws.current.onopen = () => {
        setIsConnected(true);
        setReconnectCount(0);
        addNotification({
          type: 'success',
          title: 'Connected',
          message: 'Real-time connection established',
        });
      };

      ws.current.onmessage = onMessage || (() => {});

      ws.current.onerror = (event) => {
        onError?.(event);
        setIsConnected(false);
      };

      ws.current.onclose = () => {
        setIsConnected(false);

        // Attempt reconnection
        if (reconnectCount < reconnectAttempts) {
          setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectDelay * Math.pow(2, reconnectCount));
        }
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, [url, protocols, onMessage, onError, reconnectCount, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
  }, []);

  const sendMessage = useCallback((message: string | object) => {
    if (ws.current && isConnected) {
      ws.current.send(typeof message === 'string' ? message : JSON.stringify(message));
    }
  }, [isConnected]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
```

---

## Build & Deployment Strategy

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
    serverComponents: true,
    ppr: true, // Partial Prerendering
  },

  images: {
    domains: ['aurora-cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // PWA configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Bundle analyzer (optional)
  ...(process.env.ANALYZE === 'true' && {
    bundleAnalyzer: {
      enabled: true,
    },
  }),
};

module.exports = nextConfig;
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm install -g pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

---

## Testing & Quality Assurance

### Testing Configuration

```typescript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### Playwright E2E Tests

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    // Check accessibility
    await expect(page.locator('h1')).toHaveText('Sign In');

    // Fill form
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');

    // Submit form
    await page.click('[data-testid="submit"]');

    // Check redirect
    await expect(page).toHaveURL('/dashboard');

    // Check Core Web Vitals
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });

    expect(lcp).toBeLessThan(2500); // LCP should be under 2.5s
  });
});
```

---

## Summary

This comprehensive guide provides everything needed to build a modern Aurora Interface frontend application using:

- **React 19+ Server Components** for optimal performance
- **TypeScript 5.7+** with advanced type patterns
- **Modern UI/UX** with Aurora design system
- **WCAG 2.2 accessibility** standards
- **Performance optimization** for Core Web Vitals
- **Modern state management** with Zustand and React Query
- **Complete architecture** with testing and deployment

The implementation focuses on 2025 best practices, providing a solid foundation for building scalable, accessible, and performant web applications.

---

*Generated using Context7 integration for up-to-date documentation and best practices.*