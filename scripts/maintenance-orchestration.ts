#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentResult } from "../src/agents/base/BaseAgent.js";
import { Orchestrator } from "../src/agents/core/Orchestrator.js";

interface MaintenanceTask {
	id: string;
	name: string;
	agentName: string;
	description: string;
	priority: "critical" | "high" | "medium" | "low";
	category:
		| "security"
		| "performance"
		| "codebase"
		| "documentation"
		| "infrastructure";
	expectedOutput: string;
}

interface MaintenanceResult {
	task: MaintenanceTask;
	result: AgentResult | null;
	success: boolean;
	error?: string;
	startTime: Date;
	endTime: Date;
	executionTime: number;
}

class MaintenanceOrchestrator {
	private orchestrator: Orchestrator;
	private results: MaintenanceResult[] = [];
	private outputDir: string;

	constructor() {
		this.orchestrator = new Orchestrator();
		this.outputDir = join(process.cwd(), "docs/maintenance");

		// Ensure output directory exists
		try {
			mkdirSync(this.outputDir, { recursive: true });
		} catch (_error) {
			// Directory might already exist
		}
	}

	private getMaintenanceTasks(): MaintenanceTask[] {
		return [
			// Critical Security Tasks
			{
				id: "security-audit",
				name: "Comprehensive Security Audit",
				agentName: "codebase-inspector",
				description: "Perform deep security analysis of the entire codebase",
				priority: "critical",
				category: "security",
				expectedOutput:
					"Security audit report with vulnerabilities and remediation steps",
			},
			{
				id: "dependency-security-check",
				name: "Dependency Security Scan",
				agentName: "mcp-integration",
				description: "Scan all dependencies for known security vulnerabilities",
				priority: "critical",
				category: "security",
				expectedOutput:
					"Dependency security report with upgrade recommendations",
			},

			// Performance Optimization
			{
				id: "performance-analysis",
				name: "Performance Analysis & Optimization",
				agentName: "codebase-inspector",
				description: "Analyze application performance and identify bottlenecks",
				priority: "high",
				category: "performance",
				expectedOutput:
					"Performance analysis report with optimization recommendations",
			},
			{
				id: "database-optimization",
				name: "Database Performance Review",
				agentName: "api-agent",
				description:
					"Review database queries and schema for optimization opportunities",
				priority: "high",
				category: "performance",
				expectedOutput: "Database optimization report with query improvements",
			},

			// Code Quality & Architecture
			{
				id: "architecture-review",
				name: "Architecture Health Check",
				agentName: "codebase-inspector",
				description: "Review overall system architecture and design patterns",
				priority: "high",
				category: "codebase",
				expectedOutput:
					"Architecture review report with improvement recommendations",
			},
			{
				id: "code-quality-audit",
				name: "Code Quality Assessment",
				agentName: "frontend-agent",
				description:
					"Analyze TypeScript/React code quality and adherence to best practices",
				priority: "medium",
				category: "codebase",
				expectedOutput: "Code quality report with refactoring suggestions",
			},
			{
				id: "api-standards-review",
				name: "API Standards Compliance",
				agentName: "api-agent",
				description: "Review API endpoints for REST standards and consistency",
				priority: "medium",
				category: "codebase",
				expectedOutput:
					"API compliance report with standardization recommendations",
			},

			// Documentation Updates
			{
				id: "documentation-audit",
				name: "Documentation Completeness Review",
				agentName: "docs-agent",
				description:
					"Audit existing documentation for completeness and accuracy",
				priority: "medium",
				category: "documentation",
				expectedOutput: "Documentation audit report with update requirements",
			},
			{
				id: "api-documentation-update",
				name: "API Documentation Generation",
				agentName: "docs-agent",
				description:
					"Generate comprehensive API documentation from OpenAPI specs",
				priority: "medium",
				category: "documentation",
				expectedOutput: "Updated API documentation with examples",
			},

			// Infrastructure & DevOps
			{
				id: "deployment-health-check",
				name: "Deployment Pipeline Assessment",
				agentName: "mcp-integration",
				description: "Review CI/CD pipeline and deployment configurations",
				priority: "high",
				category: "infrastructure",
				expectedOutput:
					"Deployment pipeline report with improvement suggestions",
			},
			{
				id: "monitoring-setup-review",
				name: "Monitoring & Observability Review",
				agentName: "mcp-integration",
				description:
					"Assess current monitoring setup and recommend improvements",
				priority: "medium",
				category: "infrastructure",
				expectedOutput:
					"Monitoring assessment report with enhancement recommendations",
			},
		];
	}

	async executeMaintenance(): Promise<void> {
		const tasks = this.getMaintenanceTasks();
		console.log("🔧 Starting Comprehensive Maintenance Orchestration");
		console.log("==================================================");
		console.log(`📋 Total tasks: ${tasks.length}`);
		console.log(`📁 Output directory: ${this.outputDir}`);
		console.log("");

		// Sort tasks by priority
		const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
		const sortedTasks = tasks.sort(
			(a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
		);

		for (const task of sortedTasks) {
			await this.executeTask(task);
		}

		// Generate comprehensive maintenance report
		await this.generateMaintenanceReport();
		console.log("");
		console.log("✅ Maintenance orchestration completed successfully!");
		console.log(`📊 Results available in: ${this.outputDir}`);
	}

	private async executeTask(task: MaintenanceTask): Promise<void> {
		console.log(`🚀 Executing: ${task.name} (${task.priority})`);
		console.log(`   Agent: ${task.agentName}`);
		console.log(`   Category: ${task.category}`);

		const startTime = new Date();
		let result: MaintenanceResult;

		try {
			// Create maintenance-specific input for the agent
			const agentInput = {
				task: task.name,
				description: task.description,
				category: task.category,
				priority: task.priority,
				outputFormat: "detailed_report",
				includeRecommendations: true,
				includeCodeExamples: true,
			};

			const agentResult = await this.orchestrator.delegate(
				task.agentName,
				agentInput,
			);
			const endTime = new Date();

			result = {
				task,
				result: agentResult,
				success: agentResult.kind === "ok",
				error: agentResult.kind === "error" ? agentResult.message : undefined,
				startTime,
				endTime,
				executionTime: endTime.getTime() - startTime.getTime(),
			};

			if (result.success) {
				console.log(`   ✅ Completed in ${result.executionTime}ms`);

				// Save individual task result
				await this.saveTaskResult(result);
			} else {
				console.log(`   ❌ Failed: ${result.error}`);
			}
		} catch (error) {
			const endTime = new Date();
			result = {
				task,
				result: null,
				success: false,
				error: error instanceof Error ? error.message : String(error),
				startTime,
				endTime,
				executionTime: endTime.getTime() - startTime.getTime(),
			};
			console.log(`   ❌ Error: ${result.error}`);
		}

		this.results.push(result);
		console.log("");
	}

	private async saveTaskResult(result: MaintenanceResult): Promise<void> {
		const filename = `${result.task.id}_${new Date().toISOString().split("T")[0]}.md`;
		const filepath = join(this.outputDir, filename);

		const content = this.formatTaskReport(result);
		writeFileSync(filepath, content, "utf-8");
	}

	private formatTaskReport(result: MaintenanceResult): string {
		return `# ${result.task.name}

## Task Information
- **ID**: ${result.task.id}
- **Agent**: ${result.task.agentName}
- **Priority**: ${result.task.priority}
- **Category**: ${result.task.category}
- **Description**: ${result.task.description}
- **Expected Output**: ${result.task.expectedOutput}

## Execution Details
- **Start Time**: ${result.startTime.toISOString()}
- **End Time**: ${result.endTime.toISOString()}
- **Execution Time**: ${result.executionTime}ms
- **Success**: ${result.success ? "✅ Yes" : "❌ No"}
${result.error ? `- **Error**: ${result.error}` : ""}

## Agent Result

${result.success && result.result ? this.formatAgentResult(result.result) : "Task failed - no result available"}

---
*Generated by Cartrita Maintenance Orchestrator on ${new Date().toISOString()}*
`;
	}

	private formatAgentResult(agentResult: AgentResult): string {
		if (agentResult.kind === "ok") {
			const data = agentResult.data;

			if (typeof data === "string") {
				return data;
			} else if (typeof data === "object" && data !== null) {
				return JSON.stringify(data, null, 2);
			} else {
				return String(data);
			}
		} else {
			return `Error: ${agentResult.message}`;
		}
	}

	private async generateMaintenanceReport(): Promise<void> {
		const reportPath = join(
			this.outputDir,
			`maintenance_report_${new Date().toISOString().split("T")[0]}.md`,
		);

		const successfulTasks = this.results.filter((r) => r.success);
		const failedTasks = this.results.filter((r) => !r.success);
		const totalExecutionTime = this.results.reduce(
			(sum, r) => sum + r.executionTime,
			0,
		);

		// Get orchestrator metrics
		const metrics = this.orchestrator.getMetrics();

		const report = `# Comprehensive Maintenance Report
*Generated on ${new Date().toISOString()}*

## Executive Summary

🔧 **Maintenance Tasks Completed**: ${successfulTasks.length}/${this.results.length}
⏱️ **Total Execution Time**: ${totalExecutionTime}ms
📊 **Success Rate**: ${((successfulTasks.length / this.results.length) * 100).toFixed(1)}%

## System Health Overview

**Overall Status**: ${metrics.systemHealth.status.toUpperCase()}
- 🟢 Healthy Agents: ${metrics.systemHealth.healthyAgents}
- 🟡 Degraded Agents: ${metrics.systemHealth.degradedAgents}
- 🔴 Unhealthy Agents: ${metrics.systemHealth.unhealthyAgents}

${
	metrics.systemHealth.issues.length > 0
		? `
### System Issues
${metrics.systemHealth.issues.map((issue) => `- ⚠️ ${issue}`).join("\n")}
`
		: ""
}

## Task Results by Category

${this.generateCategoryResults()}

## Successful Tasks

${successfulTasks
	.map(
		(task) => `
### ✅ ${task.task.name}
- **Agent**: ${task.task.agentName}
- **Priority**: ${task.task.priority}
- **Execution Time**: ${task.executionTime}ms
- **Category**: ${task.task.category}
`,
	)
	.join("\n")}

${
	failedTasks.length > 0
		? `
## Failed Tasks

${failedTasks
	.map(
		(task) => `
### ❌ ${task.task.name}
- **Agent**: ${task.task.agentName}
- **Priority**: ${task.task.priority}
- **Error**: ${task.error}
- **Category**: ${task.task.category}
`,
	)
	.join("\n")}
`
		: ""
}

## Agent Performance Metrics

${Object.entries(metrics.agents)
	.map(
		([agentName, agentMetrics]) => `
### ${agentName}
- **Total Executions**: ${agentMetrics.totalExecutions}
- **Success Rate**: ${(agentMetrics.successRate * 100).toFixed(1)}%
- **Average Execution Time**: ${agentMetrics.averageExecutionTime.toFixed(0)}ms
- **Error Rate**: ${(agentMetrics.errorRate * 100).toFixed(1)}%
- **Last Execution**: ${agentMetrics.lastExecution?.toISOString() || "Never"}
`,
	)
	.join("\n")}

## Recommendations

Based on the maintenance results, here are the key recommendations:

### High Priority Actions
${this.generateHighPriorityRecommendations()}

### Medium Priority Actions
${this.generateMediumPriorityRecommendations()}

## Next Steps

1. **Review Failed Tasks**: Address any failed maintenance tasks
2. **Implement Critical Recommendations**: Start with high-priority security and performance items
3. **Schedule Regular Maintenance**: Set up automated maintenance schedules
4. **Monitor System Health**: Track agent performance and system metrics
5. **Update Documentation**: Ensure all maintenance documentation is current

---
*This report was generated by the Cartrita Maintenance Orchestrator*
*For detailed task results, see individual task reports in this directory*
`;

		writeFileSync(reportPath, report, "utf-8");
	}

	private generateCategoryResults(): string {
		const categories = [
			"security",
			"performance",
			"codebase",
			"documentation",
			"infrastructure",
		] as const;

		return categories
			.map((category) => {
				const categoryTasks = this.results.filter(
					(r) => r.task.category === category,
				);
				const successful = categoryTasks.filter((r) => r.success).length;
				const total = categoryTasks.length;

				return `### ${category.charAt(0).toUpperCase() + category.slice(1)}
- **Tasks**: ${successful}/${total} completed
- **Success Rate**: ${total > 0 ? ((successful / total) * 100).toFixed(1) : 0}%`;
			})
			.join("\n\n");
	}

	private generateHighPriorityRecommendations(): string {
		const criticalTasks = this.results.filter(
			(r) => r.task.priority === "critical",
		);
		const recommendations = [
			"- Review and implement security audit findings immediately",
			"- Address any critical dependency vulnerabilities",
			"- Implement performance optimization recommendations",
		];

		if (criticalTasks.some((t) => !t.success)) {
			recommendations.push(
				"- Investigate and resolve failed critical maintenance tasks",
			);
		}

		return recommendations.join("\n");
	}

	private generateMediumPriorityRecommendations(): string {
		const recommendations = [
			"- Update documentation based on audit findings",
			"- Implement code quality improvements",
			"- Enhance monitoring and observability setup",
			"- Review and update API standards compliance",
		];

		return recommendations.join("\n");
	}
}

// Execute maintenance orchestration
const maintenanceOrchestrator = new MaintenanceOrchestrator();

async function main() {
	try {
		await maintenanceOrchestrator.executeMaintenance();
		process.exit(0);
	} catch (error) {
		console.error("❌ Maintenance orchestration failed:", error);
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { MaintenanceOrchestrator };
