import pg from 'pg';
const { Pool: PgPool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Load .env for local dev (Node 20+ native)
import { config } from 'dotenv';
config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  allowExitOnIdle: true,
};

export const pool = new PgPool(poolConfig);

pool.on('error', (err) => {
  console.error('Database pool error:', {
    message: err.message,
    code: (err as any).code,
    severity: (err as any).severity,
    timestamp: new Date().toISOString()
  });
});

pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('remove', () => {
  console.log('🔌 Database connection removed from pool');
});

export const db = drizzle({ client: pool, schema });

// Connection health check utility
export async function testDatabaseConnection(timeoutMs: number = 5000): Promise<{
  success: boolean;
  error?: string;
  latency?: number;
  details?: any;
}> {
  const startTime = Date.now();
  
  try {
    // Use Promise.race to enforce timeout
    const result = await Promise.race([
      db.execute('SELECT 1 as health_check, NOW() as server_time'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
      )
    ]);
    
    const latency = Date.now() - startTime;
    
    return {
      success: true,
      latency,
      details: result
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any).code,
      severity: (error as any).severity,
      constraint: (error as any).constraint,
      detail: (error as any).detail,
      hint: (error as any).hint,
      position: (error as any).position,
      internalPosition: (error as any).internalPosition,
      internalQuery: (error as any).internalQuery,
      where: (error as any).where,
      schema: (error as any).schema,
      table: (error as any).table,
      column: (error as any).column,
      dataType: (error as any).dataType,
      routine: (error as any).routine
    };
    
    return {
      success: false,
      error: errorDetails.message,
      latency,
      details: errorDetails
    };
  }
}

// Connection retry utility with exponential backoff
export async function connectWithRetry(options: {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
} = {}): Promise<{ success: boolean; attempts: number; finalError?: any }> {
  const {
    maxRetries = 5,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = true
  } = options;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const healthCheck = await testDatabaseConnection(10000);
    
    if (healthCheck.success) {
      console.log(`✅ Database connection successful on attempt ${attempt}`);
      return { success: true, attempts: attempt };
    }
    
    lastError = healthCheck.error;
    console.log(`❌ Database connection failed on attempt ${attempt}/${maxRetries}:`, {
      error: healthCheck.error,
      details: healthCheck.details,
      latency: healthCheck.latency
    });
    
    if (attempt < maxRetries) {
      // Calculate exponential backoff delay with optional jitter
      let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      
      if (jitter) {
        // Add random jitter (±25% of delay)
        const jitterAmount = delay * 0.25;
        delay += (Math.random() * 2 - 1) * jitterAmount;
      }
      
      console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { success: false, attempts: maxRetries, finalError: lastError };
}

// Graceful shutdown handler
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ Database pool closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
}

// The server lifecycle owns termination: HTTP requests drain before pool.end().
// Importing database helpers must not install competing process signal handlers.
