-- Track 3 Platform Continuity Tables Migration
-- Manual migration for platform continuity features

-- Secrets Vault Table
CREATE TABLE IF NOT EXISTS "secrets_vault" (
  "id" SERIAL PRIMARY KEY,
  "secret_id" TEXT NOT NULL UNIQUE,
  "secret_name" TEXT NOT NULL,
  "service_name" TEXT NOT NULL,
  "current_value" TEXT NOT NULL,
  "encrypted_value" TEXT,
  "last_rotation" TIMESTAMP DEFAULT NOW(),
  "next_rotation" TIMESTAMP,
  "rotation_frequency_days" INTEGER DEFAULT 90,
  "is_active" BOOLEAN DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Secrets Rotation History Table
CREATE TABLE IF NOT EXISTS "secrets_rotation_history" (
  "id" SERIAL PRIMARY KEY,
  "rotation_id" TEXT NOT NULL UNIQUE,
  "secret_id" INTEGER REFERENCES "secrets_vault"("id") ON DELETE CASCADE,
  "old_value_hash" TEXT,
  "new_value_hash" TEXT,
  "rotation_type" TEXT NOT NULL, -- 'scheduled', 'manual', 'emergency'
  "rotation_status" TEXT NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
  "initiated_by" TEXT,
  "validation_results" JSONB,
  "error_details" TEXT,
  "started_at" TIMESTAMP DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "duration_seconds" INTEGER
);

-- Artifact Storage Table
CREATE TABLE IF NOT EXISTS "artifact_storage" (
  "id" SERIAL PRIMARY KEY,
  "artifact_id" TEXT NOT NULL UNIQUE,
  "artifact_name" TEXT NOT NULL,
  "artifact_type" TEXT NOT NULL, -- 'deployment', 'configuration', 'dependency', 'backup', 'database_schema', 'environment_config'
  "version" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "storage_location" TEXT NOT NULL,
  "size_bytes" BIGINT,
  "compression_type" TEXT,
  "encryption_type" TEXT,
  "tags" TEXT[],
  "metadata" JSONB,
  "retention_date" TIMESTAMP,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Deployment History Table
CREATE TABLE IF NOT EXISTS "deployment_history" (
  "id" SERIAL PRIMARY KEY,
  "deployment_id" TEXT NOT NULL UNIQUE,
  "artifact_id" INTEGER REFERENCES "artifact_storage"("id"),
  "environment" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
  "deployment_type" TEXT NOT NULL, -- 'full', 'incremental', 'rollback'
  "triggered_by" TEXT,
  "configuration" JSONB,
  "services_affected" TEXT[],
  "started_at" TIMESTAMP DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "duration_seconds" INTEGER,
  "error_details" TEXT,
  "rollback_deployment_id" TEXT,
  "health_check_results" JSONB
);

-- Environment Configurations Table
CREATE TABLE IF NOT EXISTS "environment_configurations" (
  "id" SERIAL PRIMARY KEY,
  "config_id" TEXT NOT NULL UNIQUE,
  "environment" TEXT NOT NULL,
  "config_type" TEXT NOT NULL, -- 'environment_variables', 'service_config', 'feature_flags', 'database_config'
  "config_name" TEXT NOT NULL,
  "config_value" JSONB NOT NULL,
  "is_encrypted" BOOLEAN DEFAULT false,
  "is_active" BOOLEAN DEFAULT true,
  "version" TEXT,
  "description" TEXT,
  "tags" TEXT[],
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Platform Continuity Events Table
CREATE TABLE IF NOT EXISTS "platform_continuity_events" (
  "id" SERIAL PRIMARY KEY,
  "event_id" TEXT NOT NULL UNIQUE,
  "event_type" TEXT NOT NULL, -- 'deployment', 'rollback', 'secret_rotation', 'artifact_cleanup', 'environment_bootstrap'
  "event_category" TEXT NOT NULL, -- 'operational', 'security', 'disaster_recovery', 'maintenance'
  "severity" TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'
  "status" TEXT NOT NULL, -- 'started', 'in_progress', 'completed', 'failed'
  "source_service" TEXT,
  "related_entity_type" TEXT,
  "related_entity_id" TEXT,
  "event_data" JSONB,
  "error_details" TEXT,
  "started_at" TIMESTAMP DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "duration_seconds" INTEGER
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS "secrets_vault_secret_name_idx" ON "secrets_vault"("secret_name");
CREATE INDEX IF NOT EXISTS "secrets_vault_service_name_idx" ON "secrets_vault"("service_name");
CREATE INDEX IF NOT EXISTS "secrets_vault_next_rotation_idx" ON "secrets_vault"("next_rotation");

CREATE INDEX IF NOT EXISTS "artifact_storage_name_version_idx" ON "artifact_storage"("artifact_name", "version");
CREATE INDEX IF NOT EXISTS "artifact_storage_type_idx" ON "artifact_storage"("artifact_type");
CREATE INDEX IF NOT EXISTS "artifact_storage_environment_idx" ON "artifact_storage"("environment");
CREATE INDEX IF NOT EXISTS "artifact_storage_content_hash_idx" ON "artifact_storage"("content_hash");

CREATE INDEX IF NOT EXISTS "deployment_history_deployment_id_idx" ON "deployment_history"("deployment_id");
CREATE INDEX IF NOT EXISTS "deployment_history_status_idx" ON "deployment_history"("status");
CREATE INDEX IF NOT EXISTS "deployment_history_environment_idx" ON "deployment_history"("environment");
CREATE INDEX IF NOT EXISTS "deployment_history_started_at_idx" ON "deployment_history"("started_at");

-- Set updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_secrets_vault_updated_at BEFORE UPDATE ON secrets_vault
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_artifact_storage_updated_at BEFORE UPDATE ON artifact_storage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_environment_configurations_updated_at BEFORE UPDATE ON environment_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();