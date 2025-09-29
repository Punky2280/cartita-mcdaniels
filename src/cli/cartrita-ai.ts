#!/usr/bin/env node
import { Command } from 'commander';
import { AIDevTools, type CodeAnalysisResult } from '../core/AIDevTools.js';
import { ModelRouter } from '../core/ModelRouter.js';
import { AdvancedCodeAgent, AdvancedResearchAgent, AdvancedDocumentationAgent } from '../agents/advanced/AdvancedAgents.js';
import { Orchestrator } from '../agents/core/Orchestrator.js';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import type { AgentInput } from '../agents/base/BaseAgent.js';

type AnalysisResult = CodeAnalysisResult;
type AnalysisIssue = AnalysisResult['issues'][number];
type AnalysisMetrics = AnalysisResult['metrics'];

// Type guard functions for runtime type safety
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

const program = new Command();
const aiDevTools = new AIDevTools();
const _modelRouter = new ModelRouter();

// Initialize agents
const codeAgent = new AdvancedCodeAgent();
const researchAgent = new AdvancedResearchAgent();
const _docAgent = new AdvancedDocumentationAgent();

program
  .name('cartrita-ai')
  .description('Cartrita AI Development Tools - Automated code generation and analysis')
  .version('1.0.0');

// Schema generation command
program
  .command('generate:schema')
  .description('Generate TypeScript schema from description')
  .argument('<description>', 'Description of the schema to generate')
  .option('-o, --output <path>', 'Output file path')
  .option('--dry-run', 'Show generated code without writing to file')
  .action(async (description, options) => {
    const spinner = ora('Generating schema...').start();
    
    try {
      const schema = await aiDevTools.generateSchema(description, options.dryRun ? undefined : options.output);
      
      spinner.succeed('Schema generated successfully!');
      
      if (options.dryRun) {
        console.log(chalk.blue('\n=== Generated Schema ===\n'));
        console.log(schema);
      } else if (options.output) {
        console.log(chalk.green(`Schema saved to: ${options.output}`));
      } else {
        console.log(chalk.blue('\n=== Generated Schema ===\n'));
        console.log(schema);
      }
    } catch (error) {
      spinner.fail('Schema generation failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Route generation command
program
  .command('generate:route')
  .description('Generate Fastify route from description')
  .argument('<description>', 'Description of the route to generate')
  .option('-o, --output <path>', 'Output file path')
  .option('--dry-run', 'Show generated code without writing to file')
  .action(async (description, options) => {
    const spinner = ora('Generating route...').start();
    
    try {
      const route = await aiDevTools.generateRoute(description, options.dryRun ? undefined : options.output);
      
      spinner.succeed('Route generated successfully!');
      
      if (options.dryRun) {
        console.log(chalk.blue('\n=== Generated Route ===\n'));
        console.log(route);
      } else if (options.output) {
        console.log(chalk.green(`Route saved to: ${options.output}`));
      } else {
        console.log(chalk.blue('\n=== Generated Route ===\n'));
        console.log(route);
      }
    } catch (error) {
      spinner.fail('Route generation failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Test generation command
program
  .command('generate:tests')
  .description('Generate tests for a code file')
  .argument('<file>', 'Path to the code file')
  .option('-o, --output <path>', 'Output file path for tests')
  .action(async (file, options) => {
    const spinner = ora('Generating tests...').start();
    
    try {
      if (!existsSync(file)) {
        throw new Error(`File not found: ${file}`);
      }
      
      const _tests = await aiDevTools.generateTests(file, options.output);
      
      spinner.succeed('Tests generated successfully!');
      console.log(chalk.green(`Tests saved to: ${options.output || file.replace(/\.(ts|js)$/, '.test.$1')}`));
    } catch (error) {
      spinner.fail('Test generation failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Code analysis command
program
  .command('analyze')
  .description('Analyze code for issues and improvements')
  .argument('<file>', 'Path to the code file to analyze')
  .option('--json', 'Output results in JSON format')
  .action(async (file, options) => {
    const spinner = ora('Analyzing code...').start();
    
    try {
      if (!existsSync(file)) {
        throw new Error(`File not found: ${file}`);
      }
      
      const analysis = await aiDevTools.analyzeCode(file);
      
      spinner.succeed('Code analysis complete!');
      
      if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
      } else {
        displayAnalysisResults(analysis);
      }
    } catch (error) {
      spinner.fail('Code analysis failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Batch analysis command
program
  .command('analyze:batch')
  .description('Analyze multiple files')
  .argument('<pattern>', 'Glob pattern for files to analyze (e.g., "src/**/*.ts")')
  .option('--json', 'Output results in JSON format')
  .option('--summary-only', 'Show only summary statistics')
  .action(async (pattern, options) => {
    const spinner = ora('Analyzing files...').start();
    
    try {
      // For now, accept file paths directly (implement glob later)
      const files = pattern.split(',').map((f: string) => f.trim());
      const results = await aiDevTools.batchAnalyze(files);
      
      spinner.succeed(`Analyzed ${Object.keys(results).length} files`);
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else if (options.summaryOnly) {
        displayBatchSummary(results);
      } else {
        for (const [file, analysis] of Object.entries(results)) {
          console.log(chalk.blue(`\n=== ${file} ===`));
          displayAnalysisResults(analysis);
        }
      }
    } catch (error) {
      spinner.fail('Batch analysis failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Refactoring suggestions command
program
  .command('refactor')
  .description('Get refactoring suggestions for code')
  .argument('<file>', 'Path to the code file')
  .action(async (file) => {
    const spinner = ora('Analyzing for refactoring opportunities...').start();
    
    try {
      if (!existsSync(file)) {
        throw new Error(`File not found: ${file}`);
      }
      
      const suggestions = await aiDevTools.suggestRefactoring(file);
      
      spinner.succeed('Refactoring analysis complete!');
      
      if (suggestions.suggestions.length === 0) {
        console.log(chalk.green('No refactoring suggestions found. Code looks good!'));
      } else {
        console.log(chalk.blue('\n=== Refactoring Suggestions ===\n'));
        suggestions.suggestions.forEach((suggestion, index) => {
          console.log(chalk.yellow(`${index + 1}. ${suggestion.type}: ${suggestion.description}`));
          console.log(chalk.gray(`   Reasoning: ${suggestion.reasoning}`));
          console.log(chalk.green('   Before:'));
          console.log(chalk.dim(`   ${suggestion.before}`));
          console.log(chalk.green('   After:'));
          console.log(chalk.dim(`   ${suggestion.after}\n`));
        });
      }
    } catch (error) {
      spinner.fail('Refactoring analysis failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Documentation generation command
program
  .command('generate:docs')
  .description('Generate documentation for code')
  .argument('<file>', 'Path to the code file')
  .option('-t, --type <type>', 'Documentation type (api|readme|jsdoc)', 'jsdoc')
  .option('-o, --output <path>', 'Output file path')
  .action(async (file, options) => {
    const spinner = ora(`Generating ${options.type} documentation...`).start();
    
    try {
      if (!existsSync(file)) {
        throw new Error(`File not found: ${file}`);
      }
      
      const docs = await aiDevTools.generateDocumentation(file, options.type);
      
      spinner.succeed('Documentation generated successfully!');
      
      if (options.output) {
        await writeFile(options.output, docs, 'utf-8');
        console.log(chalk.green(`Documentation saved to: ${options.output}`));
      } else {
        console.log(chalk.blue(`\n=== Generated ${options.type.toUpperCase()} Documentation ===\n`));
        console.log(docs);
      }
    } catch (error) {
      spinner.fail('Documentation generation failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Debug command
program
  .command('debug')
  .description('Get debugging suggestions for error')
  .argument('<error>', 'Error message or description')
  .option('-f, --file <file>', 'File containing the problematic code')
  .action(async (error, options) => {
    const spinner = ora('Analyzing error...').start();
    
    try {
      let codeContext = '';
      if (options.file && existsSync(options.file)) {
        codeContext = await readFile(options.file, 'utf-8');
      }
      
      const suggestions = await aiDevTools.suggestBugFixes(error, codeContext);
      
      spinner.succeed('Error analysis complete!');
      
      console.log(chalk.blue('\n=== Error Diagnosis ===\n'));
      console.log(chalk.yellow(suggestions.diagnosis));
      
      if (suggestions.fixes.length > 0) {
        console.log(chalk.blue('\n=== Suggested Fixes ===\n'));
        suggestions.fixes.forEach((fix, index) => {
          console.log(chalk.green(`${index + 1}. ${fix.description} (Confidence: ${(fix.confidence * 100).toFixed(0)}%)`));
          console.log(chalk.dim(`${fix.code}\n`));
        });
      } else {
        console.log(chalk.red('\nNo automatic fixes available. Manual investigation required.'));
      }
    } catch (error) {
      spinner.fail('Error analysis failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Advanced code generation with agents
program
  .command('agent:code')
  .description('Use advanced code agent for complex tasks')
  .argument('<task>', 'Task type: generate|review|refactor|debug')
  .option('-d, --description <desc>', 'Task description', '')
  .option('-f, --file <file>', 'Code file for analysis/refactoring/debugging')
  .action(async (task, options) => {
    const spinner = ora(`Running advanced code agent...`).start();
    
    try {
      const input: AgentInput = { task, description: options.description };
      
      if (options.file && existsSync(options.file)) {
        input['code'] = await readFile(options.file, 'utf-8');
      }
      
      const result = await codeAgent.execute(input);
      
      if (result.kind === 'error') {
        throw new Error(result.message);
      }
      
      spinner.succeed('Code agent task complete!');
      
      console.log(chalk.blue('\n=== Agent Result ===\n'));
      console.log(JSON.stringify(result.data, null, 2));
    } catch (error) {
      spinner.fail('Code agent task failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Research agent command
program
  .command('agent:research')
  .description('Use advanced research agent')
  .argument('<query>', 'Research query')
  .action(async (query) => {
    const spinner = ora('Conducting research...').start();
    
    try {
      const result = await researchAgent.execute({ query });
      
      if (result.kind === 'error') {
        throw new Error(result.message);
      }
      
      spinner.succeed('Research complete!');
      
      console.log(chalk.blue('\n=== Research Results ===\n'));
      const data = result.data as {
        query?: string;
        searchStrategies?: unknown;
        analysis?: unknown;
        metadata?: Record<string, unknown>;
      };
      console.log(chalk.yellow('Query:'), data.query ?? 'N/A');
      console.log(chalk.yellow('\nSearch Strategies:'));
      console.log(data.searchStrategies ?? 'No strategies returned');
      console.log(chalk.yellow('\nAnalysis:'));
      console.log(data.analysis ?? 'No analysis generated');
    } catch (error) {
      spinner.fail('Research failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Model router stats
program
  .command('stats')
  .description('Show AI model statistics and performance')
  .action(async () => {
    const spinner = ora('Model statistics retrieved').start();
    
    try {
      const router = new ModelRouter();
      const stats = await router.getModelStats();
      
      spinner.succeed('Model statistics retrieved');
      
      console.log('\n=== AI Model Status ===\n');
      
      for (const [model, status] of Object.entries(stats)) {
        const icon = status.available ? '✓' : '✗';
        const statusText = status.available ? 'Available' : 'Unavailable';
        const latency = status.available ? `${status.latency}ms` : 'N/A';
        
        console.log(`${model}: ${icon} ${statusText} (${latency})`);
      }
      
    } catch (error: unknown) {
      spinner.fail('Failed to get model statistics');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('automate:feature')
  .description('Coordinate all Claude sub-agents via API to design and plan implementation for a feature')
  .argument('<description>', 'Feature description, user story, or high-level requirement')
  .option('-o, --output <file>', 'Optional path to save automation results as JSON')
  .action(async (description: string, options: { output?: string }) => {
    const spinner = ora('Running Claude API multi-agent automation...').start();
    const orchestrator = new Orchestrator();

    try {
      const results = await orchestrator.automateFeatureDevelopment(description);
      spinner.succeed('Multi-agent automation completed using Claude API');

      if (options.output) {
        await writeFile(options.output, JSON.stringify(results, null, 2), 'utf-8');
        console.log(chalk.green(`Automation results saved to ${options.output}`));
      }

      console.log(chalk.blue('\n=== Claude Multi-Agent Outputs ===\n'));
      results.forEach((result) => {
        console.log(chalk.yellow(`Agent: ${result.agent} (${result.agentKey}) · Provider: ${result.provider}`));
        if (result.usage) {
          const { inputTokens = 0, outputTokens = 0, cost = 0 } = result.usage;
          console.log(chalk.gray(`Tokens — input: ${inputTokens}, output: ${outputTokens}, est. cost: $${cost.toFixed(4)}`));
        }
        console.log(result.output.trim());
        console.log('\n');
      });

      console.log(chalk.gray('Source playbooks: instructions/claude-automation-project.md, instructions/aurora-interface-complete.md, PROJECT_LAUNCH_SUCCESS.md'));
    } catch (error: unknown) {
      spinner.fail('Claude API automation failed');
      console.error(chalk.red(getErrorMessage(error)));
      process.exit(1);
    }
  });

program
  .command('workflow')
  .description('Execute powerful AI workflows')
  .option('-l, --list', 'List available workflows')
  .option('-w, --workflow <name>', 'Workflow to execute')
  .option('-i, --input <input>', 'Input for the workflow')
  .action(async (options) => {
    const orchestrator = new Orchestrator();
    
    if (options.list) {
      const spinner = ora('Loading available workflows...').start();
      
      try {
        const metrics = orchestrator.getMetrics();
        spinner.succeed('Available workflows loaded');
        
        console.log('\n=== Available AI Workflows ===\n');
        console.log(`${chalk.blue('🔧 code-review')} - Comprehensive Code Review`);
        console.log(`${chalk.blue('🔬 research-implement')} - Research and Implementation`);
        console.log(`${chalk.blue('🚀 full-feature-dev')} - Complete Feature Development`);
        console.log(`${chalk.blue('🐛 bug-hunt-fix')} - AI Bug Detection & Repair`);
        console.log(`${chalk.blue('♻️  intelligent-refactor')} - AI-Powered Code Refactoring`);
        console.log(`${chalk.blue('🌐 api-modernization')} - API Modernization & Optimization`);
        console.log(`${chalk.blue('🚢 deployment-pipeline')} - Automated Deployment Pipeline`);
        console.log(`${chalk.blue('📊 data-pipeline')} - Intelligent Data Pipeline`);
        
  console.log(`\n${chalk.gray(`Total workflows: ${metrics.orchestrator.registeredWorkflows}`)}`);
        console.log(chalk.gray('Use --workflow <name> --input "<description>" to execute'));
      } catch (error: unknown) {
        spinner.fail('Failed to load workflows');
        console.error(chalk.red(getErrorMessage(error)));
        process.exit(1);
      }
      return;
    }
    
    if (!options.workflow || !options.input) {
      console.error(chalk.red('Please specify both --workflow and --input'));
      console.log(chalk.gray('Example: pnpm run ai:workflow --workflow code-review --input "Review my authentication system"'));
      process.exit(1);
    }
    
    const spinner = ora(`Executing workflow: ${options.workflow}`).start();
    
    try {
      const result = await orchestrator.executeWorkflow(options.workflow, {
        description: options.input,
        timestamp: new Date().toISOString()
      });
      
      if (result.kind === 'ok') {
        spinner.succeed(`Workflow completed successfully`);
        console.log('\n=== Workflow Results ===\n');
        console.log(result.data);
      } else {
        spinner.fail(`Workflow failed`);
        console.error(chalk.red(result.kind === 'error' ? result.message : 'Unknown error'));
        process.exit(1);
      }
      
    } catch (error: unknown) {
      spinner.fail('Workflow execution failed');
      console.error(chalk.red(getErrorMessage(error)));
      process.exit(1);
    }
  });

program.parse();// Helper functions
function displayAnalysisResults(analysis: AnalysisResult): void {
  console.log(chalk.blue('\n=== Code Analysis Results ===\n'));
  
  // Display metrics
  console.log(chalk.yellow('Metrics:'));
  console.log(`  Complexity: ${analysis.metrics.complexity}/10`);
  console.log(`  Maintainability: ${analysis.metrics.maintainability}/10`);
  if (analysis.metrics.testCoverage !== undefined) {
    console.log(`  Test Coverage: ${analysis.metrics.testCoverage}%`);
  }
  
  // Display issues
  if (analysis.issues.length > 0) {
    console.log(chalk.yellow('\nIssues:'));
    analysis.issues.forEach((issue: AnalysisIssue, index: number) => {
      const severityColor = issue.severity === 'error' ? chalk.red : 
                           issue.severity === 'warning' ? chalk.yellow : chalk.blue;
      
      console.log(`  ${index + 1}. ${severityColor(issue.severity.toUpperCase())} (${issue.type}): ${issue.message}`);
      if (issue.line) console.log(`     Line ${issue.line}${issue.column ? `:${issue.column}` : ''}`);
      if (issue.suggestion) console.log(`     Suggestion: ${issue.suggestion}`);
    });
  } else {
    console.log(chalk.green('\nNo issues found!'));
  }
  
  // Display suggestions
  if (analysis.suggestions.length > 0) {
    console.log(chalk.yellow('\nSuggestions:'));
    analysis.suggestions.forEach((suggestion: string, index: number) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  }
}

function displayBatchSummary(results: Record<string, AnalysisResult>): void {
  const files = Object.keys(results);
  const totalIssues = Object.values(results).reduce((sum: number, result: AnalysisResult) => sum + result.issues.length, 0);
  const avgComplexity = Object.values(results).reduce((sum: number, result: AnalysisResult) => sum + result.metrics.complexity, 0) / files.length;
  const avgMaintainability = Object.values(results).reduce((sum: number, result: AnalysisResult) => sum + result.metrics.maintainability, 0) / files.length;
  
  console.log(chalk.blue('\n=== Batch Analysis Summary ===\n'));
  console.log(`Files analyzed: ${files.length}`);
  console.log(`Total issues: ${totalIssues}`);
  console.log(`Average complexity: ${avgComplexity.toFixed(1)}/10`);
  console.log(`Average maintainability: ${avgMaintainability.toFixed(1)}/10`);
  
  // Show files with most issues
  const filesByIssues = files
    .map(file => ({ file, issues: results[file].issues.length }))
    .sort((a, b) => b.issues - a.issues)
    .slice(0, 5);
  
  if (filesByIssues.length > 0 && filesByIssues[0].issues > 0) {
    console.log(chalk.yellow('\nFiles with most issues:'));
    filesByIssues.forEach(({ file, issues }, index) => {
      if (issues > 0) {
        console.log(`  ${index + 1}. ${file}: ${issues} issues`);
      }
    });
  }
}

program.parse();