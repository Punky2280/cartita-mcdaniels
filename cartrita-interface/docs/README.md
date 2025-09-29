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
