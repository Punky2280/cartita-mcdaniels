CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"refresh_token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "user_sessions_token_unique" UNIQUE("token"),
	CONSTRAINT "user_sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"permissions" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar(32),
	"last_login_at" timestamp with time zone,
	"login_attempts" integer DEFAULT 0,
	"locked_until" timestamp with time zone,
	"preferences" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "agent_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid,
	"workflow_id" uuid,
	"session_id" varchar(255),
	"input" jsonb NOT NULL,
	"output" jsonb,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration" integer,
	"tokens_used" integer,
	"cost" integer,
	"model" varchar(100),
	"error" text,
	"metadata" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "agent_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"content_type" varchar(50) DEFAULT 'text',
	"tags" jsonb DEFAULT '[]',
	"embedding" vector(1536),
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"permissions" jsonb DEFAULT '[]',
	"scopes" jsonb DEFAULT '[]',
	"last_used" timestamp with time zone,
	"usage_count" integer DEFAULT 0,
	"rate_limit" integer DEFAULT 100,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"api_key_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100),
	"resource_id" varchar(255),
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}',
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"scope" varchar(100),
	"findings" jsonb DEFAULT '[]',
	"recommendations" jsonb DEFAULT '[]',
	"evidence" jsonb DEFAULT '{}',
	"audited_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"next_audit_due" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "encryption_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_id" varchar(100) NOT NULL,
	"algorithm" varchar(50) NOT NULL,
	"purpose" varchar(100) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	"rotated_by" uuid,
	CONSTRAINT "encryption_keys_key_id_unique" UNIQUE("key_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_security" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_name" varchar(100) NOT NULL,
	"auth_method" varchar(50) NOT NULL,
	"encryption_enabled" boolean DEFAULT true,
	"tls_version" varchar(10) DEFAULT '1.3',
	"certificate_path" varchar(255),
	"private_key_path" varchar(255),
	"allowed_ips" jsonb DEFAULT '[]',
	"rate_limit" integer DEFAULT 100,
	"timeout_ms" integer DEFAULT 30000,
	"retry_attempts" integer DEFAULT 3,
	"health_check_interval" integer DEFAULT 60000,
	"last_health_check" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_security_server_name_unique" UNIQUE("server_name")
);
--> statement-breakpoint
CREATE TABLE "rate_limiting_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"pattern" varchar(255) NOT NULL,
	"method" varchar(10),
	"window_ms" integer NOT NULL,
	"max_requests" integer NOT NULL,
	"skip_successful_requests" boolean DEFAULT false,
	"skip_failed_requests" boolean DEFAULT false,
	"key_generator" varchar(50) DEFAULT 'ip',
	"message" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"source" varchar(100),
	"source_value" varchar(255),
	"description" text,
	"metadata" jsonb DEFAULT '{}',
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"last_activity" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"triggered_by" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration" integer,
	"input" jsonb DEFAULT '{}',
	"output" jsonb DEFAULT '{}',
	"error" text,
	"logs" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "workflow_step_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"step_id" varchar(100) NOT NULL,
	"agent_id" uuid,
	"step_name" varchar(255) NOT NULL,
	"step_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"order" integer NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration" integer,
	"input" jsonb DEFAULT '{}',
	"output" jsonb DEFAULT '{}',
	"error" text,
	"retry_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(100) NOT NULL,
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"template_id" uuid,
	"configuration" jsonb DEFAULT '{}' NOT NULL,
	"steps" jsonb DEFAULT '[]' NOT NULL,
	"triggers" jsonb DEFAULT '[]',
	"schedule" jsonb,
	"timeout_minutes" integer DEFAULT 60,
	"max_retries" integer DEFAULT 3,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500),
	"user_id" uuid,
	"knowledge_base_id" uuid,
	"type" varchar(50) DEFAULT 'chat' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"summary" text,
	"message_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"knowledge_base_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"word_count" integer,
	"character_count" integer,
	"start_position" integer,
	"end_position" integer,
	"embedding" vector(1536),
	"embedding_model" varchar(100),
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_base_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"source_url" varchar(1000),
	"source_type" varchar(100),
	"language" varchar(10) DEFAULT 'en',
	"word_count" integer,
	"character_count" integer,
	"checksum" varchar(64),
	"metadata" jsonb DEFAULT '{}',
	"tags" jsonb DEFAULT '[]',
	"is_processed" boolean DEFAULT false NOT NULL,
	"processing_error" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"indexed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "knowledge_bases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}',
	"embedding_model" varchar(100) DEFAULT 'text-embedding-3-small',
	"vector_dimensions" integer DEFAULT 1536,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_indexed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"content_type" varchar(50) DEFAULT 'text',
	"user_id" uuid,
	"agent_id" uuid,
	"parent_message_id" uuid,
	"embedding" vector(1536),
	"metadata" jsonb DEFAULT '{}',
	"tokens" integer,
	"model" varchar(100),
	"temperature" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "version" varchar(20) DEFAULT '1.0.0';--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "is_template" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "parent_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "performance" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "last_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "execution_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "success_rate" integer DEFAULT 100;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "avg_response_time" integer;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_audits" ADD CONSTRAINT "compliance_audits_audited_by_users_id_fk" FOREIGN KEY ("audited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encryption_keys" ADD CONSTRAINT "encryption_keys_rotated_by_users_id_fk" FOREIGN KEY ("rotated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_executions" ADD CONSTRAINT "workflow_step_executions_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_executions" ADD CONSTRAINT "workflow_step_executions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_token_idx" ON "user_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_sessions_active_idx" ON "user_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_login_attempts_idx" ON "users" USING btree ("login_attempts");--> statement-breakpoint
CREATE INDEX "users_locked_until_idx" ON "users" USING btree ("locked_until");--> statement-breakpoint
CREATE INDEX "users_two_factor_idx" ON "users" USING btree ("two_factor_enabled");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "agent_executions_agent_id_idx" ON "agent_executions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_executions_user_id_idx" ON "agent_executions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_executions_status_idx" ON "agent_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_executions_started_at_idx" ON "agent_executions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "agent_executions_workflow_id_idx" ON "agent_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "agent_knowledge_agent_id_idx" ON "agent_knowledge" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_knowledge_title_idx" ON "agent_knowledge" USING btree ("title");--> statement-breakpoint
CREATE INDEX "agent_knowledge_content_type_idx" ON "agent_knowledge" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "agent_knowledge_active_idx" ON "agent_knowledge" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "agent_knowledge_embedding_idx" ON "agent_knowledge" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "compliance_audits_audit_type_idx" ON "compliance_audits" USING btree ("audit_type");--> statement-breakpoint
CREATE INDEX "compliance_audits_status_idx" ON "compliance_audits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "encryption_keys_key_id_idx" ON "encryption_keys" USING btree ("key_id");--> statement-breakpoint
CREATE INDEX "encryption_keys_purpose_idx" ON "encryption_keys" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "mcp_security_server_name_idx" ON "mcp_security" USING btree ("server_name");--> statement-breakpoint
CREATE INDEX "rate_limiting_rules_pattern_idx" ON "rate_limiting_rules" USING btree ("pattern");--> statement-breakpoint
CREATE INDEX "security_incidents_type_idx" ON "security_incidents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "security_incidents_severity_idx" ON "security_incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_incidents_status_idx" ON "security_incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_incidents_detected_at_idx" ON "security_incidents" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "sessions_session_token_idx" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflow_id_idx" ON "workflow_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_executions_started_at_idx" ON "workflow_executions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "workflow_executions_triggered_by_idx" ON "workflow_executions" USING btree ("triggered_by");--> statement-breakpoint
CREATE INDEX "workflow_step_executions_execution_id_idx" ON "workflow_step_executions" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "workflow_step_executions_status_idx" ON "workflow_step_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_step_executions_agent_id_idx" ON "workflow_step_executions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "workflow_step_executions_order_idx" ON "workflow_step_executions" USING btree ("order");--> statement-breakpoint
CREATE INDEX "workflows_name_idx" ON "workflows" USING btree ("name");--> statement-breakpoint
CREATE INDEX "workflows_type_idx" ON "workflows" USING btree ("type");--> statement-breakpoint
CREATE INDEX "workflows_status_idx" ON "workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflows_created_by_idx" ON "workflows" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "workflows_template_idx" ON "workflows" USING btree ("is_template");--> statement-breakpoint
CREATE INDEX "workflows_next_run_idx" ON "workflows" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_knowledge_base_id_idx" ON "conversations" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "conversations_type_idx" ON "conversations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_last_message_at_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_chunks_knowledge_base_id_idx" ON "document_chunks" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "document_chunks_chunk_index_idx" ON "document_chunks" USING btree ("chunk_index");--> statement-breakpoint
CREATE INDEX "document_chunks_embedding_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "documents_knowledge_base_id_idx" ON "documents" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "documents_title_idx" ON "documents" USING btree ("title");--> statement-breakpoint
CREATE INDEX "documents_content_type_idx" ON "documents" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "documents_source_type_idx" ON "documents" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "documents_processed_idx" ON "documents" USING btree ("is_processed");--> statement-breakpoint
CREATE INDEX "documents_created_by_idx" ON "documents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "documents_indexed_at_idx" ON "documents" USING btree ("indexed_at");--> statement-breakpoint
CREATE INDEX "knowledge_bases_name_idx" ON "knowledge_bases" USING btree ("name");--> statement-breakpoint
CREATE INDEX "knowledge_bases_type_idx" ON "knowledge_bases" USING btree ("type");--> statement-breakpoint
CREATE INDEX "knowledge_bases_created_by_idx" ON "knowledge_bases" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "knowledge_bases_public_idx" ON "knowledge_bases" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_role_idx" ON "messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "messages_user_id_idx" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_agent_id_idx" ON "messages" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "messages_parent_message_id_idx" ON "messages" USING btree ("parent_message_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_embedding_idx" ON "messages" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_parent_agent_id_fkey" FOREIGN KEY ("parent_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_name_idx" ON "agents" USING btree ("name");--> statement-breakpoint
CREATE INDEX "agents_type_idx" ON "agents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agents_created_by_idx" ON "agents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "agents_template_idx" ON "agents" USING btree ("is_template");--> statement-breakpoint
CREATE INDEX "agents_parent_agent_idx" ON "agents" USING btree ("parent_agent_id");--> statement-breakpoint
CREATE INDEX "agents_last_active_idx" ON "agents" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "agents_performance_idx" ON "agents" USING btree ("success_rate");