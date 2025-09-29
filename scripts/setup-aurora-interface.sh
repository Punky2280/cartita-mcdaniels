#!/bin/bash
# Aurora Interface Project Initialization Script
# Sets up complete development environment for multi-agent frontend development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
CLAUDE_ORANGE='\033[38;5;208m'
MS_BLUE='\033[38;5;75m'
GPT_PURPLE='\033[38;5;98m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CLAUDE_ORANGE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║               🚀 Aurora Interface Setup                       ║"
echo "║        Multi-Agent Frontend Development with Claude           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print section headers
print_section() {
    echo -e "\n${MS_BLUE}▶ $1${NC}"
    echo "----------------------------------------"
}

# Function to check and install dependencies
check_dependency() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓ $1 is installed${NC}"
        return 0
    else
        echo -e "${RED}✗ $1 is not installed${NC}"
        return 1
    fi
}

# Check system requirements
print_section "Checking System Requirements"

MISSING_DEPS=0

if ! check_dependency "node"; then
    echo "  Install Node.js 22+: https://nodejs.org/"
    MISSING_DEPS=$((MISSING_DEPS + 1))
fi

if ! check_dependency "pnpm"; then
    echo "  Install pnpm: npm install -g pnpm"
    MISSING_DEPS=$((MISSING_DEPS + 1))
fi

if ! check_dependency "git"; then
    echo "  Install Git: https://git-scm.com/"
    MISSING_DEPS=$((MISSING_DEPS + 1))
fi

if ! check_dependency "docker"; then
    echo "  Install Docker: https://docker.com/"
    MISSING_DEPS=$((MISSING_DEPS + 1))
fi

if ! check_dependency "claude"; then
    echo "  Install Claude CLI: npm install -g @anthropic-ai/claude-code"
    MISSING_DEPS=$((MISSING_DEPS + 1))
fi

if [ $MISSING_DEPS -gt 0 ]; then
    echo -e "\n${RED}Please install missing dependencies before continuing.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${YELLOW}Warning: Node.js version $NODE_VERSION detected. Recommended version is 18+${NC}"
fi

# Create project structure
print_section "Creating Project Structure"

cd "$PROJECT_ROOT"

# Create Aurora Interface directory structure
mkdir -p aurora-interface/frontend/src/{components,pages,hooks,utils,types,styles}
mkdir -p aurora-interface/frontend/{public,tests}
mkdir -p aurora-interface/backend/src/{routes,controllers,services,middleware,types}
mkdir -p aurora-interface/backend/tests
mkdir -p aurora-interface/shared/{types,utils,constants}
mkdir -p aurora-interface/docs/{api,user-guide,technical}
mkdir -p aurora-interface/database/{migrations,seeds,queries}
mkdir -p aurora-interface/tests/{e2e,integration,performance}

echo -e "${GREEN}✓ Directory structure created${NC}"

# Navigate to Aurora Interface project
cd aurora-interface

# Initialize package.json for Aurora Interface
print_section "Initializing Aurora Interface Project"

cat > package.json << EOF
{
  "name": "aurora-interface",
  "version": "1.0.0",
  "description": "Multi-agent frontend development with Claude Opus",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"pnpm run dev:frontend\" \"pnpm run dev:backend\"",
    "dev:frontend": "cd frontend && vite",
    "dev:backend": "cd backend && pnpm run dev",
    "build": "pnpm run build:frontend && pnpm run build:backend",
    "build:frontend": "cd frontend && vite build",
    "build:backend": "cd backend && pnpm run build",
    "test": "pnpm run test:unit && pnpm run test:e2e",
    "test:unit": "vitest run",
    "test:e2e": "cd tests && playwright test",
    "test:watch": "vitest",
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "type-check": "tsc --noEmit",
    "codacy:analyze": "echo 'Codacy analysis placeholder'",
    "codacy:security": "echo 'Security scan placeholder'",
    "start:frontend": "cd frontend && pnpm run preview",
    "start:backend": "cd backend && pnpm run start",
    "setup": "pnpm install && pnpm run setup:frontend && pnpm run setup:backend",
    "setup:frontend": "cd frontend && pnpm install",
    "setup:backend": "cd backend && pnpm install"
  },
  "keywords": [
    "react",
    "typescript",
    "fastify",
    "claude",
    "ai-development",
    "multi-agent",
    "frontend",
    "crud"
  ],
  "author": "Claude AI Agents",
  "license": "MIT",
  "devDependencies": {
    "@playwright/test": "^1.55.1",
    "@types/node": "^22.0.0",
    "biome": "^1.8.0",
    "concurrently": "^9.1.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "figma-js": "^1.16.1-0",
    "@figma/rest-api-spec": "^0.33.0"
  },
  "workspaces": [
    "frontend",
    "backend",
    "shared"
  ]
}
EOF

# Create TypeScript configuration
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext", 
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["shared/*"],
      "@frontend/*": ["frontend/src/*"],
      "@backend/*": ["backend/src/*"]
    }
  },
  "include": [
    "frontend/src/**/*",
    "backend/src/**/*", 
    "shared/**/*",
    "tests/**/*"
  ],
  "exclude": ["node_modules", "dist", "coverage"]
}
EOF

# Create Biome configuration
cat > biome.json << EOF
{
  "\$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      },
      "correctness": {
        "useExhaustiveDependencies": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  },
  "files": {
    "include": [
      "frontend/src/**/*.{js,ts,tsx,jsx}",
      "backend/src/**/*.{js,ts}",
      "shared/**/*.{js,ts}",
      "tests/**/*.{js,ts}"
    ],
    "ignore": [
      "node_modules/**/*",
      "dist/**/*",
      "coverage/**/*"
    ]
  }
}
EOF

echo -e "${GREEN}✓ Project configuration created${NC}"

# Setup Frontend
print_section "Setting up Frontend (React + TypeScript + Vite)"

cd frontend

cat > package.json << EOF
{
  "name": "aurora-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "biome check .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@headlessui/react": "^2.1.0",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@tailwindcss/forms": "^0.5.0",
    "@tailwindcss/typography": "^0.5.0"
  }
}
EOF

# Create Vite config
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
EOF

# Create Tailwind config
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claude Primary
        claude: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FFD6A1', 
          300: '#FFB366',
          400: '#FF8C42',
          500: '#FF6B35',
          600: '#E55A2B',
          700: '#CC4A1F',
          800: '#A63D1A',
          900: '#7C2E13'
        },
        // Microsoft Colors
        'ms-blue': {
          50: '#E6F3FF',
          100: '#CCE7FF',
          200: '#99CFFF',
          300: '#66B7FF', 
          400: '#339FFF',
          500: '#0078D4',
          600: '#106EBE',
          700: '#005A9E',
          800: '#004578',
          900: '#003152'
        },
        'ms-pink': {
          50: '#FDF2F4',
          100: '#FCE7EA',
          200: '#F9BFC7',
          300: '#F596A4',
          400: '#F16E81',
          500: '#E74856',
          600: '#D63644',
          700: '#B52D3A', 
          800: '#941F2E',
          900: '#731822'
        },
        // ChatGPT Purple
        'gpt-purple': {
          50: '#F3F4F6',
          100: '#E5E7EB',
          200: '#D1D5DB',
          300: '#A78BFA',
          400: '#8B5CF6', 
          500: '#6B46C1',
          600: '#553C9A',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Menlo', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
EOF

# Create PostCSS config
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Create index.html
cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aurora Interface</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Create basic React app structure
mkdir -p src/{components,pages,hooks,utils,types,styles}

cat > src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

cat > src/App.tsx << 'EOF'
import React from 'react'
import { Sparkles, Code2, Palette } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-claude-50 via-ms-blue-50 to-gpt-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-center items-center gap-4 mb-8">
            <Sparkles className="w-12 h-12 text-claude-500" />
            <Code2 className="w-12 h-12 text-ms-blue-500" />
            <Palette className="w-12 h-12 text-gpt-purple-500" />
          </div>
          
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-claude-500 via-ms-blue-500 to-gpt-purple-500 bg-clip-text text-transparent">
            Aurora Interface
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Multi-agent frontend development powered by Claude Opus. 
            Blending the best of Microsoft Copilot, Claude, and ChatGPT design languages.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button className="px-6 py-3 bg-claude-500 hover:bg-claude-600 text-white rounded-lg font-medium transition-colors">
              Get Started
            </button>
            <button className="px-6 py-3 bg-ms-blue-500 hover:bg-ms-blue-600 text-white rounded-lg font-medium transition-colors">
              Documentation
            </button>
            <button className="px-6 py-3 bg-gpt-purple-500 hover:bg-gpt-purple-600 text-white rounded-lg font-medium transition-colors">
              View Examples
            </button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-claude-200">
              <div className="w-12 h-12 bg-claude-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-claude-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Development</h3>
              <p className="text-gray-600">
                Claude Opus orchestrates multiple specialized agents for comprehensive frontend development.
              </p>
            </div>
            
            <div className="p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-ms-blue-200">
              <div className="w-12 h-12 bg-ms-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-ms-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Modern Tech Stack</h3>
              <p className="text-gray-600">
                React 18, TypeScript, Tailwind CSS, Fastify, and Playwright for a complete solution.
              </p>
            </div>
            
            <div className="p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-gpt-purple-200">
              <div className="w-12 h-12 bg-gpt-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Palette className="w-6 h-6 text-gpt-purple-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Beautiful Design System</h3>
              <p className="text-gray-600">
                Unified color palette combining the best elements from leading AI interfaces.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
EOF

cat > src/styles/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-claude-500 hover:bg-claude-600 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-claude-500 focus:ring-offset-2;
  }
  
  .btn-secondary {
    @apply px-4 py-2 bg-ms-blue-500 hover:bg-ms-blue-600 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ms-blue-500 focus:ring-offset-2;
  }
  
  .btn-accent {
    @apply px-4 py-2 bg-gpt-purple-500 hover:bg-gpt-purple-600 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gpt-purple-500 focus:ring-offset-2;
  }
}
EOF

cd ..
echo -e "${GREEN}✓ Frontend setup complete${NC}"

# Setup Backend
print_section "Setting up Backend (Fastify + TypeScript)"

cd backend

cat > package.json << EOF
{
  "name": "aurora-backend",
  "version": "1.0.0",
  "description": "Aurora Interface Backend API",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch --clear-screen=false src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "biome check .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "fastify": "^5.1.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/helmet": "^12.0.0",
    "@fastify/rate-limit": "^10.1.0",
    "zod": "^3.23.0",
    "drizzle-orm": "^0.36.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
EOF

cat > tsconfig.json << EOF
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

mkdir -p src/{routes,controllers,services,middleware,types}

cat > src/index.ts << 'EOF'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
})

// Security middleware
await fastify.register(helmet)
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : true
})

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
})

// Health check route
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Aurora Interface API'
  }
})

// API routes
fastify.get('/api/v1/status', async (request, reply) => {
  return {
    message: 'Aurora Interface API is running',
    version: '1.0.0',
    agents: [
      'frontend-agent',
      'api-agent', 
      'documentation-agent',
      'sql-agent',
      'codewriter-agent',
      'backend-db-agent',
      'testing-agent'
    ]
  }
})

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    fastify.log.info(`🚀 Aurora Interface API running on http://localhost:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
EOF

cd ..
echo -e "${GREEN}✓ Backend setup complete${NC}"

# Setup Testing
print_section "Setting up Testing (Playwright + Vitest)"

cd tests

cat > package.json << EOF
{
  "name": "aurora-tests",
  "version": "1.0.0",
  "description": "Aurora Interface Test Suite",
  "type": "module",
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.1"
  }
}
EOF

cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox', 
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'cd ../frontend && pnpm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
EOF

mkdir -p e2e

cat > e2e/aurora-interface.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Aurora Interface', () => {
  test('should display the main interface with Aurora branding', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.getByRole('heading', { name: 'Aurora Interface' })).toBeVisible();
    
    // Verify color scheme elements are present
    const primaryButton = page.getByRole('button', { name: 'Get Started' });
    await expect(primaryButton).toBeVisible();
    
    const secondaryButton = page.getByRole('button', { name: 'Documentation' });
    await expect(secondaryButton).toBeVisible();
    
    const accentButton = page.getByRole('button', { name: 'View Examples' });
    await expect(accentButton).toBeVisible();
  });
  
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: 'Aurora Interface' })).toBeVisible();
  });
});
EOF

cd ..
echo -e "${GREEN}✓ Testing setup complete${NC}"

# Create shared utilities
print_section "Setting up Shared Utilities"

cd shared

cat > package.json << EOF
{
  "name": "aurora-shared",
  "version": "1.0.0",
  "description": "Aurora Interface Shared Utilities",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
EOF

cat > tsconfig.json << EOF
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./"
  },
  "include": ["./**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

mkdir -p {types,utils,constants}

cat > types/index.ts << 'EOF'
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}
EOF

cat > constants/colors.ts << 'EOF'
export const AURORA_COLORS = {
  claude: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FFD6A1', 
    300: '#FFB366',
    400: '#FF8C42',
    500: '#FF6B35',
    600: '#E55A2B',
    700: '#CC4A1F',
    800: '#A63D1A',
    900: '#7C2E13'
  },
  microsoft: {
    blue: {
      50: '#E6F3FF',
      100: '#CCE7FF',
      200: '#99CFFF',
      300: '#66B7FF', 
      400: '#339FFF',
      500: '#0078D4',
      600: '#106EBE',
      700: '#005A9E',
      800: '#004578',
      900: '#003152'
    },
    pink: {
      50: '#FDF2F4',
      100: '#FCE7EA',
      200: '#F9BFC7',
      300: '#F596A4',
      400: '#F16E81',
      500: '#E74856',
      600: '#D63644',
      700: '#B52D3A', 
      800: '#941F2E',
      900: '#731822'
    }
  },
  chatgpt: {
    purple: {
      50: '#F3F4F6',
      100: '#E5E7EB',
      200: '#D1D5DB',
      300: '#A78BFA',
      400: '#8B5CF6', 
      500: '#6B46C1',
      600: '#553C9A',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81'
    }
  }
} as const;
EOF

cat > utils/index.ts << 'EOF'
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
EOF

cd ..
echo -e "${GREEN}✓ Shared utilities setup complete${NC}"

# Create documentation
print_section "Setting up Documentation"

mkdir -p docs/{api,user-guide,technical}

cat > docs/README.md << 'EOF'
# Aurora Interface Documentation

## Overview

Aurora Interface is a multi-agent frontend development project powered by Claude Opus AI. It combines the design philosophies of Microsoft Copilot, Claude's orange branding, and ChatGPT's interface elements into a cohesive, modern web application.

## Quick Start

1. **Installation**
   ```bash
   cd aurora-interface
   pnpm install
   pnpm run setup
   ```

2. **Development**
   ```bash
   pnpm run dev
   ```

3. **Testing**
   ```bash
   pnpm run test
   ```

## Agent Architecture

- **Frontend Agent**: React + TypeScript UI development
- **API Agent**: Fastify backend development  
- **Documentation Agent**: Technical writing
- **SQL Agent**: Database design and optimization
- **Code Writer Agent**: Business logic implementation
- **Backend DB Agent**: Data access layer
- **Testing Agent**: Comprehensive test coverage

## Color System

- **Claude Orange**: Primary actions and branding
- **Microsoft Blue**: Secondary elements and navigation
- **ChatGPT Purple**: Accent colors and highlights

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Fastify, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **Testing**: Playwright, Vitest
- **Quality**: Biome, TypeScript strict mode
EOF

cat > docs/technical/architecture.md << 'EOF'
# Aurora Interface Architecture

## System Design

Aurora Interface follows a multi-agent architecture where specialized AI agents handle different aspects of development:

### Agent Responsibilities

1. **Frontend Agent**
   - React component development
   - UI/UX implementation
   - Responsive design
   - Accessibility compliance

2. **API Agent** 
   - RESTful endpoint design
   - Input validation
   - Error handling
   - API documentation

3. **Testing Agent**
   - E2E test coverage
   - Unit test implementation
   - Performance testing
   - Security validation

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Headless UI for components

### Backend
- Fastify web framework
- Drizzle ORM for database
- PostgreSQL database
- Zod for validation

### Quality Assurance
- Playwright for E2E testing
- Vitest for unit testing
- Biome for linting
- TypeScript strict mode
EOF

cd ..
echo -e "${GREEN}✓ Documentation created${NC}"

# Install dependencies
print_section "Installing Dependencies"

echo -e "${YELLOW}Installing root dependencies...${NC}"
pnpm install

echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd frontend && pnpm install && cd ..

echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend && pnpm install && cd ..

echo -e "${YELLOW}Installing test dependencies...${NC}"
cd tests && pnpm install && cd ..

echo -e "${YELLOW}Installing shared dependencies...${NC}"
cd shared && pnpm install && cd ..

# Create environment file template
print_section "Creating Environment Configuration"

cat > .env.example << 'EOF'
# Aurora Interface Environment Configuration

# API Configuration  
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/aurora_interface

# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here

# Optional Integrations
FIGMA_ACCESS_TOKEN=figd_your-token-here
CODACY_PROJECT_TOKEN=your-codacy-token
EOF

echo -e "${YELLOW}Please copy .env.example to .env and configure your API keys${NC}"

# Final setup
print_section "Final Setup"

echo -e "${GREEN}✓ Aurora Interface project setup complete!${NC}"
echo -e "\n${CLAUDE_ORANGE}🚀 Next Steps:${NC}"
echo "1. Copy .env.example to .env and configure your API keys"
echo "2. Start the development environment:"
echo -e "   ${MS_BLUE}cd aurora-interface${NC}"
echo -e "   ${MS_BLUE}pnpm run dev${NC}"
echo "3. Run your first agent command:"
echo -e "   ${GPT_PURPLE}../scripts/agent-orchestrator.sh frontend 'Create a beautiful hero section'${NC}"

echo -e "\n${YELLOW}📚 Documentation available at:${NC}"
echo "   • docs/README.md - Project overview"
echo "   • docs/technical/architecture.md - Technical details"

echo -e "\n${GREEN}🎯 Aurora Interface is ready for multi-agent development!${NC}"