/**
 * Schema Drift Detection Service
 * Monitors database schema changes and detects drift between versions
 * Provides alerts when schema changes are detected outside of planned migrations
 */

import {
  SchemaVersion,
  InsertSchemaVersion,
  BackupOperation
} from '@shared/schema';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';

export interface SchemaSnapshot {
  version: string;
  hash: string;
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  migrations: string[];
  timestamp: Date;
}

export interface TableDefinition {
  name: string;
  schema: string;
  columns: ColumnDefinition[];
  rowCount?: number;
}

export interface ColumnDefinition {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  characterMaximumLength?: number;
}

export interface IndexDefinition {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
  indexType: string;
}

export interface ConstraintDefinition {
  name: string;
  tableName: string;
  constraintType: string;
  columnNames: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface SchemaDiff {
  hasChanges: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  changes: SchemaChange[];
  summary: {
    tablesAdded: number;
    tablesRemoved: number;
    tablesModified: number;
    columnsAdded: number;
    columnsRemoved: number;
    columnsModified: number;
    indexesAdded: number;
    indexesRemoved: number;
    constraintsAdded: number;
    constraintsRemoved: number;
  };
}

export interface SchemaChange {
  type: 'table_added' | 'table_removed' | 'table_modified' | 
        'column_added' | 'column_removed' | 'column_modified' |
        'index_added' | 'index_removed' | 'index_modified' |
        'constraint_added' | 'constraint_removed' | 'constraint_modified';
  severity: 'low' | 'medium' | 'high' | 'critical';
  object: string;
  description: string;
  impact: string;
  recommendation?: string;
  before?: any;
  after?: any;
}

export interface DriftAlert {
  alertId: string;
  schemaVersion: SchemaVersion;
  diff: SchemaDiff;
  triggeredAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class SchemaDriftService {
  private lastKnownSchema: SchemaSnapshot | null = null;
  private alertThreshold: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  constructor() {
    console.log('✅ Schema Drift Detection Service initialized');
  }

  /**
   * Capture current database schema as a snapshot
   */
  async captureSchemaSnapshot(
    detectedBy: 'scheduled_check' | 'migration' | 'manual' = 'scheduled_check',
    backupOperationId?: number
  ): Promise<SchemaVersion> {
    console.log('📸 Capturing database schema snapshot');

    try {
      // Get database connection
      const { db } = await import('../db');

      // Capture schema information
      const snapshot = await this.buildSchemaSnapshot(db);
      
      // Calculate schema hash
      const schemaHash = this.calculateSchemaHash(snapshot);
      
      // Compare with previous version if available
      let changesFromPrevious: any = null;
      let isBreakingChange = false;
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (this.lastKnownSchema) {
        const diff = this.compareSchemas(this.lastKnownSchema, snapshot);
        changesFromPrevious = diff;
        isBreakingChange = this.hasBreakingChanges(diff);
        riskLevel = diff.riskLevel;

        console.log(`Schema comparison completed`, {
          hasChanges: diff.hasChanges,
          riskLevel: diff.riskLevel,
          changesCount: diff.changes.length
        });
      }

      // Create schema version record
      const { storage } = await import('../storage');
      const schemaVersionData: InsertSchemaVersion = {
        versionHash: schemaHash,
        schemaSnapshot: snapshot,
        migrationFiles: await this.getMigrationFiles(),
        tableCount: snapshot.tables.length,
        indexCount: snapshot.indexes.length,
        constraintCount: snapshot.constraints.length,
        changesFromPrevious,
        isBreakingChange,
        riskLevel,
        backupOperationId,
        detectedBy,
        detectedAt: new Date(),
        isValidated: false,
        metadata: {
          captureMethod: 'automated',
          schemaVersion: snapshot.version,
          totalObjects: snapshot.tables.length + snapshot.indexes.length + snapshot.constraints.length
        }
      };

      const schemaVersion = await storage.createSchemaVersion(schemaVersionData);

      // Update last known schema
      this.lastKnownSchema = snapshot;

      // Trigger alerts if necessary
      if (changesFromPrevious && this.shouldTriggerAlert(riskLevel)) {
        await this.triggerDriftAlert(schemaVersion, changesFromPrevious);
      }

      console.log(`✅ Schema snapshot captured`, {
        versionId: schemaVersion.id,
        hash: schemaHash.substring(0, 8),
        tables: snapshot.tables.length,
        riskLevel
      });

      return schemaVersion;

    } catch (error) {
      console.error('❌ Failed to capture schema snapshot:', error);
      throw error;
    }
  }

  /**
   * Build a comprehensive schema snapshot
   */
  private async buildSchemaSnapshot(db: any): Promise<SchemaSnapshot> {
    try {
      // Get tables and their columns
      const tablesQuery = `
        SELECT 
          t.table_name,
          t.table_schema,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position
      `;

      const tableRows = await db.execute(tablesQuery);
      
      // Group by table
      const tablesMap = new Map<string, TableDefinition>();
      
      for (const row of tableRows) {
        const tableName = row.table_name;
        
        if (!tablesMap.has(tableName)) {
          tablesMap.set(tableName, {
            name: tableName,
            schema: row.table_schema,
            columns: []
          });
        }
        
        const table = tablesMap.get(tableName)!;
        
        if (row.column_name) {
          table.columns.push({
            name: row.column_name,
            dataType: row.data_type,
            isNullable: row.is_nullable === 'YES',
            defaultValue: row.column_default,
            isPrimaryKey: row.is_primary_key,
            isForeignKey: row.is_foreign_key,
            characterMaximumLength: row.character_maximum_length
          });
        }
      }

      // Get table row counts
      const tables = Array.from(tablesMap.values());
      for (const table of tables) {
        try {
          const countResult = await db.execute(`SELECT COUNT(*) as count FROM "${table.name}"`);
          table.rowCount = countResult[0]?.count || 0;
        } catch (error) {
          console.warn(`Could not get row count for table ${table.name}:`, error);
          table.rowCount = 0;
        }
      }

      // Get indexes
      const indexesQuery = `
        SELECT 
          indexname as index_name,
          tablename as table_name,
          indexdef as index_definition
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `;

      const indexRows = await db.execute(indexesQuery);
      const indexes: IndexDefinition[] = indexRows.map((row: any) => ({
        name: row.index_name,
        tableName: row.table_name,
        columns: this.parseIndexColumns(row.index_definition),
        isUnique: row.index_definition.includes('UNIQUE'),
        isPrimary: row.index_name.endsWith('_pkey'),
        indexType: this.parseIndexType(row.index_definition)
      }));

      // Get constraints
      const constraintsQuery = `
        SELECT 
          tc.constraint_name,
          tc.table_name,
          tc.constraint_type,
          array_agg(kcu.column_name) as column_names,
          ccu.table_name as referenced_table,
          array_agg(ccu.column_name) as referenced_columns
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
        GROUP BY tc.constraint_name, tc.table_name, tc.constraint_type, ccu.table_name
        ORDER BY tc.table_name, tc.constraint_name
      `;

      const constraintRows = await db.execute(constraintsQuery);
      const constraints: ConstraintDefinition[] = constraintRows.map((row: any) => ({
        name: row.constraint_name,
        tableName: row.table_name,
        constraintType: row.constraint_type,
        columnNames: row.column_names || [],
        referencedTable: row.referenced_table,
        referencedColumns: row.referenced_columns || []
      }));

      // Get applied migrations (if migration tracking exists)
      const migrations = await this.getMigrationFiles();

      return {
        version: await this.getDatabaseVersion(),
        hash: '', // Will be calculated later
        tables,
        indexes,
        constraints,
        migrations,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Failed to build schema snapshot:', error);
      throw error;
    }
  }

  /**
   * Compare two schema snapshots and identify changes
   */
  private compareSchemas(oldSchema: SchemaSnapshot, newSchema: SchemaSnapshot): SchemaDiff {
    const changes: SchemaChange[] = [];
    
    // Compare tables
    const oldTables = new Map(oldSchema.tables.map(t => [t.name, t]));
    const newTables = new Map(newSchema.tables.map(t => [t.name, t]));

    // Find added tables
    for (const [name, table] of Array.from(newTables.entries())) {
      if (!oldTables.has(name)) {
        changes.push({
          type: 'table_added',
          severity: 'medium',
          object: name,
          description: `Table '${name}' was added`,
          impact: 'New functionality added, potential breaking change for applications expecting specific schema',
          after: table
        });
      }
    }

    // Find removed tables
    for (const [name, table] of Array.from(oldTables.entries())) {
      if (!newTables.has(name)) {
        changes.push({
          type: 'table_removed',
          severity: 'critical',
          object: name,
          description: `Table '${name}' was removed`,
          impact: 'BREAKING CHANGE: Applications using this table will fail',
          recommendation: 'Ensure all applications are updated before removing tables',
          before: table
        });
      }
    }

    // Find modified tables (compare columns)
    for (const [name, newTable] of Array.from(newTables.entries())) {
      const oldTable = oldTables.get(name);
      if (oldTable) {
        const columnChanges = this.compareTableColumns(oldTable, newTable);
        changes.push(...columnChanges);
      }
    }

    // Compare indexes
    const indexChanges = this.compareIndexes(oldSchema.indexes, newSchema.indexes);
    changes.push(...indexChanges);

    // Compare constraints
    const constraintChanges = this.compareConstraints(oldSchema.constraints, newSchema.constraints);
    changes.push(...constraintChanges);

    // Calculate summary
    const summary = {
      tablesAdded: changes.filter(c => c.type === 'table_added').length,
      tablesRemoved: changes.filter(c => c.type === 'table_removed').length,
      tablesModified: changes.filter(c => c.type === 'table_modified').length,
      columnsAdded: changes.filter(c => c.type === 'column_added').length,
      columnsRemoved: changes.filter(c => c.type === 'column_removed').length,
      columnsModified: changes.filter(c => c.type === 'column_modified').length,
      indexesAdded: changes.filter(c => c.type === 'index_added').length,
      indexesRemoved: changes.filter(c => c.type === 'index_removed').length,
      constraintsAdded: changes.filter(c => c.type === 'constraint_added').length,
      constraintsRemoved: changes.filter(c => c.type === 'constraint_removed').length
    };

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(changes);

    return {
      hasChanges: changes.length > 0,
      riskLevel,
      changes,
      summary
    };
  }

  /**
   * Compare columns between two table versions
   */
  private compareTableColumns(oldTable: TableDefinition, newTable: TableDefinition): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const oldColumns = new Map(oldTable.columns.map(c => [c.name, c]));
    const newColumns = new Map(newTable.columns.map(c => [c.name, c]));

    // Find added columns
    for (const [name, column] of Array.from(newColumns.entries())) {
      if (!oldColumns.has(name)) {
        changes.push({
          type: 'column_added',
          severity: column.isNullable ? 'low' : 'medium',
          object: `${newTable.name}.${name}`,
          description: `Column '${name}' added to table '${newTable.name}'`,
          impact: column.isNullable 
            ? 'Low impact: nullable column added'
            : 'Medium impact: non-nullable column added, may require data migration',
          after: column
        });
      }
    }

    // Find removed columns
    for (const [name, column] of Array.from(oldColumns.entries())) {
      if (!newColumns.has(name)) {
        changes.push({
          type: 'column_removed',
          severity: 'high',
          object: `${oldTable.name}.${name}`,
          description: `Column '${name}' removed from table '${oldTable.name}'`,
          impact: 'HIGH IMPACT: Applications using this column will fail',
          recommendation: 'Update all applications before removing columns',
          before: column
        });
      }
    }

    // Find modified columns
    for (const [name, newColumn] of Array.from(newColumns.entries())) {
      const oldColumn = oldColumns.get(name);
      if (oldColumn && this.hasColumnChanged(oldColumn, newColumn)) {
        changes.push({
          type: 'column_modified',
          severity: this.getColumnChangeSeverity(oldColumn, newColumn),
          object: `${newTable.name}.${name}`,
          description: `Column '${name}' in table '${newTable.name}' was modified`,
          impact: this.getColumnChangeImpact(oldColumn, newColumn),
          before: oldColumn,
          after: newColumn
        });
      }
    }

    return changes;
  }

  /**
   * Compare indexes between schema versions
   */
  private compareIndexes(oldIndexes: IndexDefinition[], newIndexes: IndexDefinition[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const oldIndexMap = new Map(oldIndexes.map(i => [i.name, i]));
    const newIndexMap = new Map(newIndexes.map(i => [i.name, i]));

    // Find added indexes
    for (const [name, index] of Array.from(newIndexMap.entries())) {
      if (!oldIndexMap.has(name)) {
        changes.push({
          type: 'index_added',
          severity: 'low',
          object: name,
          description: `Index '${name}' added to table '${index.tableName}'`,
          impact: 'Performance improvement, no breaking changes',
          after: index
        });
      }
    }

    // Find removed indexes
    for (const [name, index] of Array.from(oldIndexMap.entries())) {
      if (!newIndexMap.has(name)) {
        changes.push({
          type: 'index_removed',
          severity: index.isPrimary ? 'critical' : 'medium',
          object: name,
          description: `Index '${name}' removed from table '${index.tableName}'`,
          impact: index.isPrimary 
            ? 'CRITICAL: Primary key removed, breaking change'
            : 'Performance impact: queries may be slower',
          before: index
        });
      }
    }

    return changes;
  }

  /**
   * Compare constraints between schema versions
   */
  private compareConstraints(oldConstraints: ConstraintDefinition[], newConstraints: ConstraintDefinition[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const oldConstraintMap = new Map(oldConstraints.map(c => [c.name, c]));
    const newConstraintMap = new Map(newConstraints.map(c => [c.name, c]));

    // Find added constraints
    for (const [name, constraint] of Array.from(newConstraintMap.entries())) {
      if (!oldConstraintMap.has(name)) {
        changes.push({
          type: 'constraint_added',
          severity: this.getConstraintSeverity(constraint),
          object: name,
          description: `Constraint '${name}' added to table '${constraint.tableName}'`,
          impact: this.getConstraintImpact(constraint, 'added'),
          after: constraint
        });
      }
    }

    // Find removed constraints
    for (const [name, constraint] of Array.from(oldConstraintMap.entries())) {
      if (!newConstraintMap.has(name)) {
        changes.push({
          type: 'constraint_removed',
          severity: this.getConstraintSeverity(constraint),
          object: name,
          description: `Constraint '${name}' removed from table '${constraint.tableName}'`,
          impact: this.getConstraintImpact(constraint, 'removed'),
          before: constraint
        });
      }
    }

    return changes;
  }

  /**
   * Calculate schema hash
   */
  private calculateSchemaHash(schema: SchemaSnapshot): string {
    const hashContent = JSON.stringify({
      tables: schema.tables.map(t => ({
        name: t.name,
        columns: t.columns.map(c => ({
          name: c.name,
          dataType: c.dataType,
          isNullable: c.isNullable,
          isPrimaryKey: c.isPrimaryKey
        }))
      })),
      indexes: schema.indexes.map(i => ({
        name: i.name,
        tableName: i.tableName,
        columns: i.columns,
        isUnique: i.isUnique
      })),
      constraints: schema.constraints.map(c => ({
        name: c.name,
        tableName: c.tableName,
        constraintType: c.constraintType,
        columnNames: c.columnNames
      }))
    });

    return createHash('sha256').update(hashContent).digest('hex');
  }

  /**
   * Determine if changes contain breaking changes
   */
  private hasBreakingChanges(diff: SchemaDiff): boolean {
    return diff.changes.some(change => 
      change.severity === 'critical' ||
      (change.severity === 'high' && (
        change.type === 'table_removed' ||
        change.type === 'column_removed'
      ))
    );
  }

  /**
   * Calculate overall risk level for schema changes
   */
  private calculateRiskLevel(changes: SchemaChange[]): 'low' | 'medium' | 'high' | 'critical' {
    if (changes.some(c => c.severity === 'critical')) return 'critical';
    if (changes.some(c => c.severity === 'high')) return 'high';
    if (changes.some(c => c.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Check if a column has changed
   */
  private hasColumnChanged(oldColumn: ColumnDefinition, newColumn: ColumnDefinition): boolean {
    return (
      oldColumn.dataType !== newColumn.dataType ||
      oldColumn.isNullable !== newColumn.isNullable ||
      oldColumn.defaultValue !== newColumn.defaultValue ||
      oldColumn.isPrimaryKey !== newColumn.isPrimaryKey ||
      oldColumn.characterMaximumLength !== newColumn.characterMaximumLength
    );
  }

  /**
   * Get severity for column changes
   */
  private getColumnChangeSeverity(oldColumn: ColumnDefinition, newColumn: ColumnDefinition): 'low' | 'medium' | 'high' | 'critical' {
    // Data type change is critical
    if (oldColumn.dataType !== newColumn.dataType) return 'critical';
    
    // Nullability change from nullable to non-nullable is high
    if (oldColumn.isNullable && !newColumn.isNullable) return 'high';
    
    // Primary key changes are critical
    if (oldColumn.isPrimaryKey !== newColumn.isPrimaryKey) return 'critical';
    
    // Other changes are medium
    return 'medium';
  }

  /**
   * Get impact description for column changes
   */
  private getColumnChangeImpact(oldColumn: ColumnDefinition, newColumn: ColumnDefinition): string {
    const impacts = [];
    
    if (oldColumn.dataType !== newColumn.dataType) {
      impacts.push(`Data type changed from ${oldColumn.dataType} to ${newColumn.dataType}`);
    }
    
    if (oldColumn.isNullable !== newColumn.isNullable) {
      impacts.push(newColumn.isNullable ? 'Column now allows NULL values' : 'Column no longer allows NULL values');
    }
    
    if (oldColumn.isPrimaryKey !== newColumn.isPrimaryKey) {
      impacts.push(newColumn.isPrimaryKey ? 'Column is now primary key' : 'Column is no longer primary key');
    }
    
    return impacts.join('; ');
  }

  /**
   * Get constraint severity
   */
  private getConstraintSeverity(constraint: ConstraintDefinition): 'low' | 'medium' | 'high' | 'critical' {
    switch (constraint.constraintType) {
      case 'PRIMARY KEY': return 'critical';
      case 'FOREIGN KEY': return 'high';
      case 'UNIQUE': return 'medium';
      case 'CHECK': return 'medium';
      default: return 'low';
    }
  }

  /**
   * Get constraint impact description
   */
  private getConstraintImpact(constraint: ConstraintDefinition, action: 'added' | 'removed'): string {
    const baseDescription = `${constraint.constraintType} constraint ${action}`;
    
    switch (constraint.constraintType) {
      case 'PRIMARY KEY':
        return action === 'removed' 
          ? `${baseDescription}: CRITICAL breaking change, table has no primary key`
          : `${baseDescription}: Data integrity improved`;
      case 'FOREIGN KEY':
        return action === 'removed'
          ? `${baseDescription}: Referential integrity removed, orphaned records possible`
          : `${baseDescription}: Referential integrity enforced`;
      case 'UNIQUE':
        return action === 'removed'
          ? `${baseDescription}: Duplicate values now allowed`
          : `${baseDescription}: Unique values enforced`;
      default:
        return baseDescription;
    }
  }

  /**
   * Check if alert should be triggered
   */
  private shouldTriggerAlert(riskLevel: 'low' | 'medium' | 'high' | 'critical'): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const thresholdLevel = { low: 1, medium: 2, high: 3, critical: 4 };
    
    return severityLevels[riskLevel] >= thresholdLevel[this.alertThreshold];
  }

  /**
   * Trigger drift alert
   */
  private async triggerDriftAlert(schemaVersion: SchemaVersion, diff: SchemaDiff): Promise<void> {
    console.log(`🚨 Schema drift alert triggered: ${diff.riskLevel} risk level`);

    try {
      // Here you would integrate with your notification system
      // For now, we'll just log the alert
      const alert: DriftAlert = {
        alertId: nanoid(),
        schemaVersion,
        diff,
        triggeredAt: new Date(),
        severity: diff.riskLevel,
        acknowledged: false
      };

      console.log('Schema drift alert:', {
        alertId: alert.alertId,
        severity: alert.severity,
        changesCount: diff.changes.length,
        summary: diff.summary
      });

      // TODO: Send notification via existing notification system
      // await notificationService.sendAlert(alert);

    } catch (error) {
      console.error('Failed to trigger drift alert:', error);
    }
  }

  /**
   * Get database version
   */
  private async getDatabaseVersion(): Promise<string> {
    try {
      const { db } = await import('../db');
      const result = await db.execute('SELECT version() as version');
      const rows = Array.isArray(result) ? result : result.rows || [];
      return (rows[0] as any)?.version || 'unknown';
    } catch (error) {
      console.warn('Could not get database version:', error);
      return 'unknown';
    }
  }

  /**
   * Get applied migration files
   */
  private async getMigrationFiles(): Promise<string[]> {
    // This would typically read from a migrations table or directory
    // For now, return empty array
    return [];
  }

  /**
   * Parse index columns from index definition
   */
  private parseIndexColumns(indexDef: string): string[] {
    // Simple parser for index columns - this is a basic implementation
    const match = indexDef.match(/\((.*?)\)/);
    if (match) {
      return match[1].split(',').map(col => col.trim().replace(/"/g, ''));
    }
    return [];
  }

  /**
   * Parse index type from index definition
   */
  private parseIndexType(indexDef: string): string {
    if (indexDef.includes('USING btree')) return 'btree';
    if (indexDef.includes('USING hash')) return 'hash';
    if (indexDef.includes('USING gin')) return 'gin';
    if (indexDef.includes('USING gist')) return 'gist';
    return 'btree'; // default
  }

  /**
   * Load last known schema from database
   */
  async loadLastKnownSchema(): Promise<SchemaSnapshot | null> {
    try {
      const { storage } = await import('../storage');
      const latestVersion = await storage.getLatestSchemaVersion();
      
      if (latestVersion && latestVersion.schemaSnapshot) {
        this.lastKnownSchema = latestVersion.schemaSnapshot as SchemaSnapshot;
        return this.lastKnownSchema;
      }
      
      return null;
    } catch (error) {
      console.warn('Could not load last known schema:', error);
      return null;
    }
  }

  /**
   * Set alert threshold
   */
  setAlertThreshold(threshold: 'low' | 'medium' | 'high' | 'critical'): void {
    this.alertThreshold = threshold;
    console.log(`Schema drift alert threshold set to: ${threshold}`);
  }
}

// Export singleton instance
export const schemaDriftService = new SchemaDriftService();
export default schemaDriftService;