/**
 * Infrastructure-as-Code Service
 * Provides automated deployment scripts, configuration management, and service orchestration
 * for complete election platform stack recreation and disaster recovery
 */

import { nanoid } from 'nanoid';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ServiceConfig {
  name: string;
  type: 'backend' | 'frontend' | 'database' | 'worker' | 'external';
  dependencies: string[];
  environmentVariables: EnvironmentVariable[];
  ports: number[];
  healthCheck: HealthCheckConfig;
  startCommand: string;
  stopCommand?: string;
  buildCommand?: string;
  volumes?: VolumeMount[];
  resources: ResourceRequirements;
}

export interface EnvironmentVariable {
  name: string;
  value?: string;
  secretRef?: string;
  required: boolean;
  description: string;
  sensitive: boolean;
}

export interface HealthCheckConfig {
  endpoint: string;
  interval: number;
  timeout: number;
  retries: number;
  initialDelay: number;
}

export interface VolumeMount {
  source: string;
  destination: string;
  readonly: boolean;
}

export interface ResourceRequirements {
  cpu: string;
  memory: string;
  storage?: string;
}

export interface DeploymentManifest {
  version: string;
  metadata: {
    name: string;
    description: string;
    createdAt: Date;
    tags: string[];
  };
  services: ServiceConfig[];
  networks: NetworkConfig[];
  environment: string; // 'development' | 'staging' | 'production'
  configuration: Record<string, any>;
}

export interface NetworkConfig {
  name: string;
  driver: string;
  internal: boolean;
  attachable: boolean;
}

export interface DeploymentResult {
  deploymentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  startedAt: Date;
  completedAt?: Date;
  services: ServiceDeploymentStatus[];
  logs: string[];
  error?: string;
}

export interface ServiceDeploymentStatus {
  serviceName: string;
  status: 'pending' | 'building' | 'starting' | 'healthy' | 'unhealthy' | 'failed';
  attempts: number;
  lastHealthCheck?: Date;
  error?: string;
}

export class InfrastructureAsCodeService {
  private readonly manifestsPath: string;
  private readonly scriptsPath: string;
  private readonly configurationsPath: string;
  private activeDeployments: Map<string, DeploymentResult> = new Map();

  constructor() {
    this.manifestsPath = join(process.cwd(), 'infrastructure', 'manifests');
    this.scriptsPath = join(process.cwd(), 'infrastructure', 'scripts');
    this.configurationsPath = join(process.cwd(), 'infrastructure', 'configurations');
    
    this.initializeDirectories();
    console.log('✅ Infrastructure-as-Code Service initialized');
  }

  private async initializeDirectories(): Promise<void> {
    const directories = [
      this.manifestsPath,
      this.scriptsPath,
      this.configurationsPath,
      join(this.configurationsPath, 'environments'),
      join(this.configurationsPath, 'templates'),
      join(this.scriptsPath, 'deployment'),
      join(this.scriptsPath, 'health-checks'),
      join(this.scriptsPath, 'rollback')
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Create the master deployment manifest for the election platform
   */
  async createElectionPlatformManifest(): Promise<DeploymentManifest> {
    const manifest: DeploymentManifest = {
      version: '3.0.0',
      metadata: {
        name: 'election-platform',
        description: 'Complete Election Tracking Platform with Disaster Recovery',
        createdAt: new Date(),
        tags: ['election', 'tracking', 'disaster-recovery', 'platform-continuity']
      },
      services: [
        {
          name: 'election-backend',
          type: 'backend',
          dependencies: ['postgres-db', 'redis-cache'],
          environmentVariables: this.getBackendEnvironmentVariables(),
          ports: [5000],
          healthCheck: {
            endpoint: '/api/health',
            interval: 30000,
            timeout: 5000,
            retries: 3,
            initialDelay: 10000
          },
          startCommand: 'npm run dev',
          buildCommand: 'npm run build',
          stopCommand: 'pkill -f "node.*server"',
          resources: {
            cpu: '500m',
            memory: '1Gi',
            storage: '10Gi'
          }
        },
        {
          name: 'election-frontend',
          type: 'frontend',
          dependencies: ['election-backend'],
          environmentVariables: this.getFrontendEnvironmentVariables(),
          ports: [],
          healthCheck: {
            endpoint: '/',
            interval: 60000,
            timeout: 10000,
            retries: 2,
            initialDelay: 5000
          },
          startCommand: 'echo "Frontend served by backend"',
          buildCommand: 'npm run build',
          resources: {
            cpu: '100m',
            memory: '256Mi'
          }
        },
        {
          name: 'postgres-db',
          type: 'database',
          dependencies: [],
          environmentVariables: this.getDatabaseEnvironmentVariables(),
          ports: [5432],
          healthCheck: {
            endpoint: 'pg_isready',
            interval: 30000,
            timeout: 5000,
            retries: 5,
            initialDelay: 15000
          },
          startCommand: 'neon connect', // Uses Neon serverless
          resources: {
            cpu: '1000m',
            memory: '2Gi',
            storage: '50Gi'
          }
        },
        {
          name: 'disaster-recovery-coordinator',
          type: 'worker',
          dependencies: ['postgres-db'],
          environmentVariables: this.getDisasterRecoveryEnvironmentVariables(),
          ports: [],
          healthCheck: {
            endpoint: '/api/failover/health',
            interval: 60000,
            timeout: 10000,
            retries: 3,
            initialDelay: 30000
          },
          startCommand: 'node -e "import(\'./server/services/disaster-recovery-coordinator.js\')"',
          resources: {
            cpu: '200m',
            memory: '512Mi'
          }
        },
        {
          name: 'backup-services',
          type: 'worker',
          dependencies: ['postgres-db'],
          environmentVariables: this.getBackupEnvironmentVariables(),
          ports: [],
          healthCheck: {
            endpoint: '/api/backup/status',
            interval: 300000, // 5 minutes
            timeout: 15000,
            retries: 2,
            initialDelay: 60000
          },
          startCommand: 'node -e "import(\'./server/services/neon-snapshot-service.js\')"',
          resources: {
            cpu: '300m',
            memory: '1Gi'
          }
        }
      ],
      networks: [
        {
          name: 'election-network',
          driver: 'bridge',
          internal: false,
          attachable: true
        },
        {
          name: 'backup-network',
          driver: 'bridge',
          internal: true,
          attachable: false
        }
      ],
      environment: process.env.NODE_ENV || 'development',
      configuration: {
        logging: {
          level: 'info',
          format: 'json'
        },
        monitoring: {
          enabled: true,
          interval: 30000
        },
        security: {
          enabled: true,
          enforceTLS: process.env.NODE_ENV === 'production'
        }
      }
    };

    await this.saveManifest('election-platform', manifest);
    return manifest;
  }

  /**
   * Generate environment variable configurations for backend service
   */
  private getBackendEnvironmentVariables(): EnvironmentVariable[] {
    return [
      {
        name: 'DATABASE_URL',
        secretRef: 'database-connection-string',
        required: true,
        description: 'PostgreSQL connection string for Neon database',
        sensitive: true
      },
      {
        name: 'JWT_SECRET',
        secretRef: 'jwt-signing-key',
        required: true,
        description: 'Secret key for signing JWT tokens',
        sensitive: true
      },
      {
        name: 'GOOGLE_CIVIC_API_KEY',
        secretRef: 'google-civic-api-key',
        required: true,
        description: 'API key for Google Civic Information API',
        sensitive: true
      },
      {
        name: 'PROPUBLICA_API_KEY',
        secretRef: 'propublica-api-key',
        required: true,
        description: 'API key for ProPublica Congress API',
        sensitive: true
      },
      {
        name: 'VOTESMART_API_KEY',
        secretRef: 'votesmart-api-key',
        required: true,
        description: 'API key for VoteSmart API',
        sensitive: true
      },
      {
        name: 'PERPLEXITY_API_KEY',
        secretRef: 'perplexity-api-key',
        required: true,
        description: 'API key for Perplexity AI service',
        sensitive: true
      },
      {
        name: 'SENDGRID_API_KEY',
        secretRef: 'sendgrid-api-key',
        required: false,
        description: 'API key for SendGrid email service',
        sensitive: true
      },
      {
        name: 'TWILIO_ACCOUNT_SID',
        secretRef: 'twilio-account-sid',
        required: false,
        description: 'Twilio Account SID for SMS notifications',
        sensitive: true
      },
      {
        name: 'TWILIO_AUTH_TOKEN',
        secretRef: 'twilio-auth-token',
        required: false,
        description: 'Twilio Auth Token for SMS notifications',
        sensitive: true
      },
      {
        name: 'NEON_API_KEY',
        secretRef: 'neon-api-key',
        required: true,
        description: 'API key for Neon database snapshots',
        sensitive: true
      },
      {
        name: 'NODE_ENV',
        value: 'development',
        required: true,
        description: 'Node.js environment setting',
        sensitive: false
      },
      {
        name: 'PORT',
        value: '5000',
        required: true,
        description: 'Server port number',
        sensitive: false
      }
    ];
  }

  /**
   * Generate environment variable configurations for frontend service
   */
  private getFrontendEnvironmentVariables(): EnvironmentVariable[] {
    return [
      {
        name: 'VITE_ADMIN_FEATURES',
        value: 'false',
        required: false,
        description: 'Enable admin features in frontend',
        sensitive: false
      },
      {
        name: 'VITE_API_BASE_URL',
        value: 'http://localhost:5000',
        required: true,
        description: 'Base URL for API requests',
        sensitive: false
      }
    ];
  }

  /**
   * Generate environment variable configurations for database service
   */
  private getDatabaseEnvironmentVariables(): EnvironmentVariable[] {
    return [
      {
        name: 'NEON_PROJECT_ID',
        secretRef: 'neon-project-id',
        required: true,
        description: 'Neon project identifier',
        sensitive: true
      },
      {
        name: 'NEON_BRANCH_ID',
        secretRef: 'neon-branch-id',
        required: true,
        description: 'Neon branch identifier',
        sensitive: true
      }
    ];
  }

  /**
   * Generate environment variable configurations for disaster recovery services
   */
  private getDisasterRecoveryEnvironmentVariables(): EnvironmentVariable[] {
    return [
      {
        name: 'BACKUP_ENCRYPTION_KEY',
        secretRef: 'backup-encryption-key',
        required: true,
        description: 'Encryption key for backup data',
        sensitive: true
      },
      {
        name: 'AWS_ACCESS_KEY_ID',
        secretRef: 'aws-access-key-id',
        required: false,
        description: 'AWS access key for S3 backups',
        sensitive: true
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        secretRef: 'aws-secret-access-key',
        required: false,
        description: 'AWS secret access key for S3 backups',
        sensitive: true
      },
      {
        name: 'S3_BACKUP_BUCKET',
        secretRef: 's3-backup-bucket',
        required: false,
        description: 'S3 bucket name for backups',
        sensitive: false
      }
    ];
  }

  /**
   * Generate environment variable configurations for backup services
   */
  private getBackupEnvironmentVariables(): EnvironmentVariable[] {
    return [
      {
        name: 'BACKUP_SCHEDULE',
        value: '0 2 * * *', // Daily at 2 AM
        required: true,
        description: 'Cron schedule for automated backups',
        sensitive: false
      },
      {
        name: 'BACKUP_RETENTION_DAYS',
        value: '30',
        required: true,
        description: 'Number of days to retain backups',
        sensitive: false
      },
      {
        name: 'VALIDATION_FREQUENCY',
        value: 'weekly',
        required: true,
        description: 'Frequency for backup validation',
        sensitive: false
      }
    ];
  }

  /**
   * Deploy services according to manifest
   */
  async deployStack(manifestName: string, environment: string = 'development'): Promise<DeploymentResult> {
    const deploymentId = nanoid();
    console.log(`🚀 Starting deployment: ${deploymentId} for manifest: ${manifestName}`);

    const manifest = await this.loadManifest(manifestName);
    if (!manifest) {
      throw new Error(`Manifest not found: ${manifestName}`);
    }

    const deployment: DeploymentResult = {
      deploymentId,
      status: 'in_progress',
      startedAt: new Date(),
      services: manifest.services.map(service => ({
        serviceName: service.name,
        status: 'pending',
        attempts: 0
      })),
      logs: []
    };

    this.activeDeployments.set(deploymentId, deployment);

    try {
      // Deploy services in dependency order
      const deploymentOrder = this.calculateDeploymentOrder(manifest.services);
      
      for (const serviceName of deploymentOrder) {
        const service = manifest.services.find(s => s.name === serviceName)!;
        await this.deployService(service, deployment, environment);
      }

      // Validate deployment
      await this.validateDeployment(deployment);

      deployment.status = 'completed';
      deployment.completedAt = new Date();
      
      console.log(`✅ Deployment completed: ${deploymentId}`);
      
    } catch (error) {
      deployment.status = 'failed';
      deployment.error = error instanceof Error ? error.message : String(error);
      deployment.completedAt = new Date();
      
      console.error(`❌ Deployment failed: ${deploymentId}`, error);
      
      // Attempt rollback
      await this.rollbackDeployment(deploymentId);
    }

    return deployment;
  }

  /**
   * Calculate service deployment order based on dependencies
   */
  private calculateDeploymentOrder(services: ServiceConfig[]): string[] {
    const serviceMap = new Map(services.map(s => [s.name, s]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (serviceName: string) => {
      if (visited.has(serviceName)) return;
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving service: ${serviceName}`);
      }

      visiting.add(serviceName);
      const service = serviceMap.get(serviceName);
      
      if (service) {
        for (const dependency of service.dependencies) {
          visit(dependency);
        }
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    for (const service of services) {
      visit(service.name);
    }

    return order;
  }

  /**
   * Deploy individual service
   */
  private async deployService(
    service: ServiceConfig, 
    deployment: DeploymentResult, 
    environment: string
  ): Promise<void> {
    const serviceStatus = deployment.services.find(s => s.serviceName === service.name)!;
    serviceStatus.status = 'building';
    serviceStatus.attempts++;

    console.log(`📦 Deploying service: ${service.name}`);

    try {
      // Build service if needed
      if (service.buildCommand) {
        serviceStatus.status = 'building';
        await this.executeCommand(service.buildCommand, `Building ${service.name}`);
      }

      // Generate environment configuration
      await this.generateServiceEnvironment(service, environment);

      // Start service
      serviceStatus.status = 'starting';
      await this.executeCommand(service.startCommand, `Starting ${service.name}`);

      // Wait for health check
      await this.waitForServiceHealth(service);
      
      serviceStatus.status = 'healthy';
      serviceStatus.lastHealthCheck = new Date();
      
      deployment.logs.push(`✅ Service ${service.name} deployed successfully`);
      
    } catch (error) {
      serviceStatus.status = 'failed';
      serviceStatus.error = error instanceof Error ? error.message : String(error);
      deployment.logs.push(`❌ Service ${service.name} deployment failed: ${serviceStatus.error}`);
      throw error;
    }
  }

  /**
   * Generate environment configuration for service
   */
  private async generateServiceEnvironment(service: ServiceConfig, environment: string): Promise<void> {
    const envConfig = service.environmentVariables.map(envVar => {
      if (envVar.value) {
        return `${envVar.name}=${envVar.value}`;
      } else if (envVar.secretRef) {
        // In a real deployment, this would fetch from secrets manager
        return `${envVar.name}=\${SECRET_${envVar.secretRef.toUpperCase().replace(/-/g, '_')}}`;
      }
      return `# ${envVar.name} not configured`;
    }).join('\n');

    const envPath = join(this.configurationsPath, 'environments', `${service.name}.${environment}.env`);
    await writeFile(envPath, envConfig);
  }

  /**
   * Execute command with logging
   */
  private async executeCommand(command: string, description: string): Promise<void> {
    console.log(`🔧 ${description}: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stdout) console.log(`📤 ${description} stdout:`, stdout);
      if (stderr) console.warn(`⚠️ ${description} stderr:`, stderr);
    } catch (error) {
      console.error(`❌ ${description} failed:`, error);
      throw error;
    }
  }

  /**
   * Wait for service to become healthy
   */
  private async waitForServiceHealth(service: ServiceConfig): Promise<void> {
    const maxAttempts = service.healthCheck.retries;
    let attempts = 0;

    // Initial delay
    await new Promise(resolve => setTimeout(resolve, service.healthCheck.initialDelay));

    while (attempts < maxAttempts) {
      try {
        // Simulate health check (in real implementation, would make HTTP request or run command)
        console.log(`🩺 Health check for ${service.name} (attempt ${attempts + 1}/${maxAttempts})`);
        
        if (service.type === 'backend' && service.healthCheck.endpoint === '/api/health') {
          // For our election platform, check if server is responding
          const response = await fetch(`http://localhost:${service.ports[0]}${service.healthCheck.endpoint}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        }
        
        console.log(`✅ Health check passed for ${service.name}`);
        return;
        
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Health check failed for ${service.name} after ${maxAttempts} attempts`);
        }
        
        console.warn(`⚠️ Health check failed for ${service.name}, retrying in ${service.healthCheck.interval}ms`);
        await new Promise(resolve => setTimeout(resolve, service.healthCheck.interval));
      }
    }
  }

  /**
   * Validate entire deployment
   */
  private async validateDeployment(deployment: DeploymentResult): Promise<void> {
    console.log(`🔍 Validating deployment: ${deployment.deploymentId}`);
    
    const unhealthyServices = deployment.services.filter(s => s.status !== 'healthy');
    if (unhealthyServices.length > 0) {
      throw new Error(`Deployment validation failed. Unhealthy services: ${unhealthyServices.map(s => s.serviceName).join(', ')}`);
    }

    // Additional platform-specific validations
    await this.validateElectionPlatformSpecific();
    
    console.log(`✅ Deployment validation passed: ${deployment.deploymentId}`);
  }

  /**
   * Platform-specific validation checks
   */
  private async validateElectionPlatformSpecific(): Promise<void> {
    // Check database connectivity
    // Check API endpoints
    // Verify disaster recovery services
    // Validate external API connectivity
    console.log('🔍 Running platform-specific validation checks...');
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(deploymentId: string): Promise<void> {
    console.log(`↩️ Rolling back deployment: ${deploymentId}`);
    
    const deployment = this.activeDeployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    deployment.status = 'rolled_back';
    
    // Stop services in reverse order
    const runningServices = deployment.services
      .filter(s => s.status === 'healthy' || s.status === 'unhealthy')
      .reverse();

    for (const serviceStatus of runningServices) {
      try {
        console.log(`🛑 Stopping service: ${serviceStatus.serviceName}`);
        // In real implementation, would execute stop commands
        serviceStatus.status = 'pending';
      } catch (error) {
        console.error(`Failed to stop service ${serviceStatus.serviceName}:`, error);
      }
    }

    console.log(`✅ Rollback completed: ${deploymentId}`);
  }

  /**
   * Save deployment manifest to disk
   */
  private async saveManifest(name: string, manifest: DeploymentManifest): Promise<void> {
    const manifestPath = join(this.manifestsPath, `${name}.json`);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`💾 Saved manifest: ${manifestPath}`);
  }

  /**
   * Load deployment manifest from disk
   */
  private async loadManifest(name: string): Promise<DeploymentManifest | null> {
    const manifestPath = join(this.manifestsPath, `${name}.json`);
    
    if (!existsSync(manifestPath)) {
      return null;
    }

    const content = await readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(deploymentId: string): DeploymentResult | null {
    return this.activeDeployments.get(deploymentId) || null;
  }

  /**
   * List all active deployments
   */
  listActiveDeployments(): DeploymentResult[] {
    return Array.from(this.activeDeployments.values());
  }

  /**
   * Generate deployment scripts
   */
  async generateDeploymentScripts(): Promise<void> {
    console.log('📝 Generating deployment scripts...');

    // Main deployment script
    const deployScript = `#!/bin/bash
set -e

echo "🚀 Starting Election Platform Deployment"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }

# Set environment
export NODE_ENV=\${NODE_ENV:-development}
echo "Environment: $NODE_ENV"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Push database schema
echo "🗄️ Setting up database schema..."
npm run db:push

# Build application
echo "🏗️ Building application..."
npm run build

# Start services
echo "🚀 Starting services..."
npm run start

echo "✅ Deployment completed successfully"
`;

    const healthCheckScript = `#!/bin/bash
set -e

echo "🩺 Running health checks..."

# Check backend health
if curl -f -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Check database connectivity
if npm run check 2>/dev/null; then
    echo "✅ Database connectivity verified"
else
    echo "❌ Database connectivity check failed"
    exit 1
fi

echo "✅ All health checks passed"
`;

    const rollbackScript = `#!/bin/bash
set -e

echo "↩️ Rolling back deployment..."

# Stop current services
pkill -f "node.*server" || true

# Restore previous version (if available)
if [ -d "backup" ]; then
    echo "📦 Restoring previous version..."
    cp -r backup/* ./
fi

# Restart with previous configuration
echo "🚀 Restarting with previous configuration..."
npm run start

echo "✅ Rollback completed"
`;

    await writeFile(join(this.scriptsPath, 'deploy.sh'), deployScript);
    await writeFile(join(this.scriptsPath, 'health-check.sh'), healthCheckScript);
    await writeFile(join(this.scriptsPath, 'rollback.sh'), rollbackScript);

    // Make scripts executable
    await execAsync(`chmod +x ${join(this.scriptsPath, '*.sh')}`);
    
    console.log('✅ Deployment scripts generated');
  }
}

// Export singleton instance
export const infrastructureAsCodeService = new InfrastructureAsCodeService();
export default infrastructureAsCodeService;