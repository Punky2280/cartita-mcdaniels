# Cartrita McDaniels AI Development System - Documentation

Welcome to the comprehensive documentation for the Cartrita McDaniels AI Development System. This system is a powerful AI automation platform designed to accelerate development workflows with intelligent task routing, comprehensive code analysis, and enhanced documentation capabilities.

## 📁 Documentation Structure

This `instructions/` folder contains complete documentation for all system capabilities:

- **[Workflows Guide](./workflows.md)** - Detailed documentation of all 8 AI workflows
- **[CLI Commands](./cli-commands.md)** - Complete CLI reference and usage examples
- **[API Endpoints](./api-endpoints.md)** - RESTful API documentation for all services
- **[Context7 Integration](./context7-integration.md)** - Enhanced documentation capabilities
- **[Development Guide](./development-guide.md)** - Setup, configuration, and development workflows
- **[Architecture Overview](./architecture.md)** - System architecture and component relationships
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## 🚀 Quick Start

### System Overview
The Cartrita McDaniels system provides:
- **8 Comprehensive AI Workflows** for automated development tasks
- **Dual-Model AI Routing** (OpenAI GPT-4 + Anthropic Claude)
- **Context7 MCP Integration** for enhanced documentation
- **RESTful API** with comprehensive endpoints
- **CLI Interface** with 15+ specialized commands
- **Intelligent Monitoring** and health checks

### Key Components
1. **Orchestrator** - Multi-step workflow coordination
2. **ModelRouter** - Intelligent AI model selection
3. **AdvancedAgents** - Specialized AI agents for different tasks
4. **Context7Service** - Enhanced documentation and library guidance
5. **AIDevTools** - Complete development automation toolkit
6. **ProjectWorkflowManager** - Project-specific workflow management

### Available Workflows
1. `code-review` - Automated code review and suggestions
2. `research-implement` - Research-driven feature implementation  
3. `full-feature-dev` - Complete feature development lifecycle
4. `bug-hunt-fix` - Intelligent bug detection and resolution
5. `intelligent-refactor` - Context-aware code refactoring
6. `api-modernization` - API enhancement and modernization
7. `deployment-pipeline` - Automated deployment workflows
8. `data-pipeline` - Data processing and analysis workflows

## 🛠️ Quick Commands

### CLI Usage
```bash
# List all available workflows
npx cartrita-ai workflow --list

# Execute a specific workflow
npx cartrita-ai workflow --workflow=code-review

# Generate code with AI
npx cartrita-ai generate --type=component --name=UserDashboard

# Analyze codebase
npx cartrita-ai analyze --type=full

# Start development server with monitoring
pnpm run dev

# Run health checks
curl http://localhost:3000/
```

### API Usage
```bash
# Get system health
curl http://localhost:3000/

# Execute workflow via API
curl -X POST http://localhost:3000/api/v1/ai/workflow \
  -H "Content-Type: application/json" \
  -d '{"workflow": "code-review", "context": "Review recent changes"}'

# Get enhanced documentation
curl http://localhost:3000/api/v1/context7/documentation/fastify?topic=authentication

# Generate implementation guidance
curl -X POST http://localhost:3000/api/v1/context7/guidance \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "Build authentication system",
    "technologies": ["fastify", "jwt", "postgresql"],
    "requirements": ["secure", "scalable", "production-ready"]
  }'
```

## 📋 System Requirements

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- PostgreSQL database
- OpenAI API key
- Anthropic API key (optional, for fallback)

### Environment Variables
```bash
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
DATABASE_URL=postgresql://user:pass@localhost/db
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=*
```

## 🎯 Use Cases

### For Developers
- **Automated Code Reviews** - Get AI-powered code analysis and suggestions
- **Feature Development** - Complete feature implementation with research and testing
- **Bug Resolution** - Intelligent bug detection, analysis, and fixing
- **Code Refactoring** - Context-aware code improvements and modernization

### For Teams
- **Deployment Automation** - Streamlined deployment pipelines with monitoring
- **API Development** - Modern API design and implementation guidance
- **Documentation Generation** - Enhanced documentation with Context7 integration
- **Project Analysis** - Comprehensive codebase analysis and metrics

### For Learning
- **Best Practices** - Learn from AI-generated code and recommendations  
- **Library Guidance** - Get detailed documentation and examples for any library
- **Implementation Patterns** - See proven patterns for common development scenarios
- **Code Quality** - Understand code quality metrics and improvements

## 🔗 Next Steps

1. **Read the [Workflows Guide](./workflows.md)** to understand all available workflows
2. **Check the [CLI Commands](./cli-commands.md)** for detailed command reference
3. **Explore the [API Endpoints](./api-endpoints.md)** for programmatic access
4. **Review the [Development Guide](./development-guide.md)** for setup instructions
5. **Try the [Context7 Integration](./context7-integration.md)** for enhanced documentation

## 📞 Support

For questions, issues, or contributions:
- Review the [Troubleshooting Guide](./troubleshooting.md)
- Check system health with `curl http://localhost:3000/`
- Examine logs in `./logs/` directory
- Run diagnostics with `npx cartrita-ai health`

---

*Last updated: September 27, 2025*
*System Version: 1.0.0*