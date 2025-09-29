#!/bin/bash
# Aurora Interface - Claude Agent Orchestrator
# Usage: ./scripts/agent-orchestrator.sh <agent_name> <task_description>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/claude-agents.config.json"

# Colors for output
CLAUDE_ORANGE='\033[38;5;208m'
MS_BLUE='\033[38;5;75m'
GPT_PURPLE='\033[38;5;98m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load environment if exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Validate inputs
if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 <agent_name> <task_description>${NC}"
    echo -e "${YELLOW}Available agents:${NC}"
    echo "  • frontend        - UI/UX development with React & TypeScript"
    echo "  • api            - Backend API development with Fastify"
    echo "  • documentation  - Technical writing and API docs"
    echo "  • sql           - Database design and optimization"
    echo "  • codewriter    - Business logic and utility functions"
    echo "  • backend-db    - Data access layer and caching"
    echo "  • testing       - Comprehensive testing strategy"
    echo ""
    echo -e "${CLAUDE_ORANGE}Examples:${NC}"
    echo "  $0 frontend 'Create login component with Aurora color scheme'"
    echo "  $0 api 'Implement user authentication endpoints'"
    echo "  $0 testing 'Create E2E tests for CRUD operations'"
    exit 1
fi

AGENT_NAME=$1
TASK_DESCRIPTION=$2

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required for JSON processing${NC}"
    echo "Install with: sudo apt-get install jq"
    exit 1
fi

# Check if Claude CLI is available
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: Claude CLI not found${NC}"
    echo "Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Create default config if it doesn't exist
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Creating default agent configuration...${NC}"
    cat > "$CONFIG_FILE" << 'EOF'
{
  "project": {
    "name": "Aurora Interface",
    "description": "Multi-agent frontend development with Claude Opus",
    "version": "1.0.0",
    "colorScheme": {
      "claude": ["#FF6B35", "#FF8C42", "#FFB366"],
      "microsoft": ["#E74856", "#0078D4", "#106EBE"], 
      "chatgpt": ["#6B46C1", "#8B5CF6", "#A78BFA"]
    }
  },
  "agents": {
    "frontend": {
      "model": "opus",
      "systemPrompt": "You are a senior frontend developer specializing in React, TypeScript, and modern UI/UX. Always use Context7 best practices for component development. Focus on accessibility, performance, and maintainable code. Use the Aurora color scheme: Claude orange (#FF6B35) for primary elements, Microsoft blue (#0078D4) for secondary elements, and ChatGPT purple (#6B46C1) for accent elements.",
      "allowedTools": ["Edit", "FileSearch", "Bash"],
      "workingDirectory": "./frontend"
    },
    "api": {
      "model": "opus", 
      "systemPrompt": "You are a backend API specialist using Fastify and TypeScript. Follow RESTful principles, implement comprehensive validation with Zod, and ensure security best practices. Use Context7 for API design patterns. Implement proper error handling and OpenAPI documentation.",
      "allowedTools": ["Edit", "FileSearch", "Bash"],
      "workingDirectory": "./backend"
    },
    "documentation": {
      "model": "sonnet",
      "systemPrompt": "You are a technical writer focused on clear, comprehensive documentation. Create developer-friendly docs with code examples and best practices. Follow documentation standards and maintain consistency.",
      "allowedTools": ["Edit", "FileSearch"],
      "workingDirectory": "./docs"
    },
    "sql": {
      "model": "opus",
      "systemPrompt": "You are a database architect specializing in PostgreSQL and Drizzle ORM. Design efficient schemas, optimize queries, and ensure data integrity. Use Context7 for database best practices.",
      "allowedTools": ["Edit", "FileSearch"],
      "workingDirectory": "./database"
    },
    "codewriter": {
      "model": "opus",
      "systemPrompt": "You are a senior software engineer focused on writing clean, reusable, and well-tested code. Implement business logic with Context7 best practices. Ensure type safety and performance optimization.",
      "allowedTools": ["Edit", "FileSearch", "Bash"],
      "workingDirectory": "./shared"
    },
    "backend-db": {
      "model": "opus",
      "systemPrompt": "You are a database operations specialist. Implement data access layers, optimize database performance, and manage connections efficiently. Use Drizzle ORM and implement proper caching strategies.",
      "allowedTools": ["Edit", "FileSearch", "Bash"],
      "workingDirectory": "./backend/src"
    },
    "testing": {
      "model": "sonnet",
      "systemPrompt": "You are a QA engineer specializing in comprehensive testing strategies. Create robust test suites with Playwright for E2E testing, React Testing Library for components, and ensure high coverage with reliable assertions.",
      "allowedTools": ["Edit", "FileSearch", "Bash"],
      "workingDirectory": "./tests"
    }
  }
}
EOF
fi

# Extract agent configuration using jq
AGENT_MODEL=$(jq -r ".agents.$AGENT_NAME.model" "$CONFIG_FILE" 2>/dev/null)
AGENT_PROMPT=$(jq -r ".agents.$AGENT_NAME.systemPrompt" "$CONFIG_FILE" 2>/dev/null) 
AGENT_TOOLS=$(jq -r ".agents.$AGENT_NAME.allowedTools | join(\",\")" "$CONFIG_FILE" 2>/dev/null)
AGENT_DIR=$(jq -r ".agents.$AGENT_NAME.workingDirectory" "$CONFIG_FILE" 2>/dev/null)

if [ "$AGENT_MODEL" = "null" ] || [ -z "$AGENT_MODEL" ]; then
    echo -e "${RED}Error: Agent '$AGENT_NAME' not found in configuration${NC}"
    echo -e "${YELLOW}Available agents: frontend, api, documentation, sql, codewriter, backend-db, testing${NC}"
    exit 1
fi

# Display agent activation info
echo -e "${CLAUDE_ORANGE}🤖 Activating $AGENT_NAME Agent${NC}"
echo -e "${MS_BLUE}📁 Working Directory: $AGENT_DIR${NC}"
echo -e "${GPT_PURPLE}🎯 Model: $AGENT_MODEL${NC}"
echo -e "${GREEN}📝 Task: $TASK_DESCRIPTION${NC}"
echo "----------------------------------------"

# Create working directory if it doesn't exist
FULL_AGENT_DIR="$PROJECT_ROOT/$AGENT_DIR"
if [ ! -d "$FULL_AGENT_DIR" ]; then
    echo -e "${YELLOW}Creating directory: $FULL_AGENT_DIR${NC}"
    mkdir -p "$FULL_AGENT_DIR"
fi

# Navigate to agent directory
cd "$FULL_AGENT_DIR"

# Prepare the full task with research requirements
FULL_TASK="$TASK_DESCRIPTION

MANDATORY REQUIREMENTS:
1. 🔍 Research Phase: Use Context7 to research best practices for this task
2. 🎨 Design System: Follow Aurora color scheme (Claude orange #FF6B35, Microsoft blue #0078D4, ChatGPT purple #6B46C1)
3. 📊 Quality Standards: Ensure TypeScript strict mode, zero warnings, and comprehensive error handling
4. 🧪 Testing: Include appropriate tests for all implementations
5. 📚 Documentation: Add clear JSDoc comments and update relevant documentation

Please start with Context7 research before implementation."

# Execute Claude with agent-specific configuration
echo -e "${YELLOW}Executing Claude with $AGENT_NAME configuration...${NC}"

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}Warning: ANTHROPIC_API_KEY not set. Claude may prompt for authentication.${NC}"
fi

# Execute the Claude command
claude --model "$AGENT_MODEL" \
       --append-system-prompt "$AGENT_PROMPT" \
       --add-dir "$(pwd)" \
       "$FULL_TASK"

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Agent task completed successfully${NC}"
else
    echo -e "${RED}❌ Agent task failed or was interrupted${NC}"
    exit 1
fi

echo -e "${CLAUDE_ORANGE}🎯 Aurora Interface Agent Session Complete${NC}"