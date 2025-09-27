# Installation and Integration Guide

> ⚠️ **Note**: This guide references the main project setup. For the most up-to-date quick start instructions, see the [main README](../../README.md).

This document provides step-by-step instructions for installing and integrating the Cartrita AI Agents system described in the following documentation:

1. **[Main README](../../README.md)** - Quick start and overview
2. **[Agent Architecture](../architecture/agent-architecture.md)** - System design and patterns  
3. **[Engineering Playbook](ENGINEERING_PLAYBOOK.md)** - Complete technical guide
4. **[MCP Server Setup](MCP_SERVER_SETUP.md)** - External service integrations

---

## Codacy CLI Quality Checks

Our workflow requires running the Codacy CLI locally after any documentation or source edit. Install it once per machine using the helper script:

```bash
cd cartrita-mcdaniels-suarez
./.codacy/cli.sh download
```

On Linux hosts without Windows Subsystem for Linux, create a lightweight wrapper so the CLI commands invoked by tooling (`wsl .codacy/cli.sh …`) still resolve:

```bash
mkdir -p ~/.local/bin
printf '#!/usr/bin/env bash\n"$@"\n' > ~/.local/bin/wsl
chmod +x ~/.local/bin/wsl
```

After installation, run quality checks per file:

```bash
wsl .codacy/cli.sh analyze path/to/changed-file --format sarif
```

> **Tip:** If no analyzer supports the file type, the CLI exits cleanly and prints “No tools support the specified file(s). Skipping analysis.”

---

## 1. AGENTS_ARCHITECTURE.md

### Overview (AGENTS_ARCHITECTURE.md)

This file outlines the high-level architecture of the Cartrita AI OS, including its modular design and agent orchestration patterns.

### Installation Steps (AGENTS_ARCHITECTURE.md)

1. Ensure you have Node.js 20+ installed.

1. Clone the repository:

   ```bash
   git clone https://github.com/Punky2280/cartrita-ai-os.git
   cd cartrita-ai-os
   ```

1. Install dependencies:

   ```bash
   npm install
   ```

1. Start the Fastify server:

   ```bash
   npm run dev
   ```

---

## 2. agent-architecture.md

### Overview (agent-architecture.md)

This file describes the agent architecture, including the supervisor and specialized agents such as ResearchAgent, CodeAgent, and ComputerUseAgent.

### Installation Steps (agent-architecture.md)

1. Follow the steps in **AGENTS_ARCHITECTURE.md** to set up the base system.

1. Navigate to the `agents` directory:

   ```bash
   cd src/agents
   ```

1. Run the agent orchestrator:

   ```bash
   npm run agents:start
   ```

---

## 3. README.md

### Overview (README.md)

This file provides an overview of the Cartrita AI Agents Monorepo, including its structure and quick start instructions.

### Installation Steps (README.md)

1. Navigate to the monorepo directory:

   ```bash
   cd cartrita-ai-agents-monorepo
   ```

1. Install dependencies using pnpm:

   ```bash
   pnpm install
   ```

1. Start the database:

   ```bash
   pnpm run docker:up
   ```

1. Run migrations:

   ```bash
   pnpm run db:migrate
   ```

1. Start development:

   ```bash
   pnpm run dev
   ```

---

## 4. MCP_SERVER_SETUP.md

### Overview (MCP_SERVER_SETUP.md)

This file provides setup instructions for non-Python MCP servers, including Node.js, PostgreSQL, and Redis servers.

### Installation Steps (MCP_SERVER_SETUP.md)

#### Node.js MCP Server

1. Navigate to the backend directory:

   ```bash
   cd apps/backend
   ```

1. Install dependencies:

   ```bash
   pnpm install
   ```

1. Start the server:

   ```bash
   pnpm run dev
   ```

#### PostgreSQL MCP Server

1. Start the database service:

   ```bash
   pnpm run docker:up
   ```

1. Verify the database is running:

   ```bash
   docker ps
   ```

#### Redis MCP Server

1. Start the Redis service:

   ```bash
   pnpm run docker:up
   ```

1. Verify Redis is running:

   ```bash
   docker ps
   ```

---

## File Attachments

The following files are included in this package:

1. `AGENTS_ARCHITECTURE.md`

1. `agent-architecture.md`

1. `README.md`

1. `MCP_SERVER_SETUP.md`

---

## Transfer Instructions

1. Copy all files to the `C:\Users\robbi\Downloads` directory.

1. Ensure the directory structure is preserved.

---

For further assistance, refer to the documentation in each file or contact the repository maintainer.
