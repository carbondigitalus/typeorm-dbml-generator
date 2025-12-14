/**
 * DBMLGenerator - Generates DBML syntax from entity metadata
 */

import { DBMLSchema, GeneratorOptions, EntityMetadata, EnumMetadata } from '../parser/types';
import { TableGenerator } from './TableGenerator';
import { RelationGenerator } from './RelationGenerator';

export class DBMLGenerator {
    private tableGenerator: TableGenerator;
    private relationGenerator: RelationGenerator;
    private options: Required<GeneratorOptions>;

    constructor(options?: GeneratorOptions) {
        this.options = {
            includeSchemas: options?.includeSchemas ?? true,
            includeIndexes: options?.includeIndexes ?? true,
            includeNotes: options?.includeNotes ?? true,
            includeEnums: options?.includeEnums ?? true,
            tableGrouping: options?.tableGrouping ?? 'schema',
            projectName: options?.projectName ?? 'Database Schema',
        };

        this.tableGenerator = new TableGenerator(this.options);
        this.relationGenerator = new RelationGenerator();
    }

    /**
     * Generate complete DBML from schema metadata
     */
    generate(schema: DBMLSchema): string {
        const sections: string[] = [];

        // Project header
        if (this.options.projectName) {
            sections.push(this.generateProjectHeader());
        }

        // Enums
        if (this.options.includeEnums && schema.enums.length > 0) {
            sections.push(this.generateEnums(schema.enums));
        }

        // Tables
        const tablesSection = this.generateTables(schema.entities);
        if (tablesSection) {
            sections.push(tablesSection);
        }

        // Relationships
        const relationsSection = this.relationGenerator.generateRelations(schema.entities);
        if (relationsSection) {
            sections.push(relationsSection);
        }

        // Table groups (by schema)
        if (this.options.includeSchemas && this.options.tableGrouping === 'schema') {
            const tableGroupsSection = this.generateTableGroups(schema.entities);
            if (tableGroupsSection) {
                sections.push(tableGroupsSection);
            }
        }

        return sections.filter((s) => s.trim()).join('\n\n');
    }

    /**
     * Generate project header
     */
    private generateProjectHeader(): string {
        return `Project ${this.escapeIdentifier(this.options.projectName)} {
  database_type: 'PostgreSQL'
  Note: 'Generated from TypeORM entities'
}`;
    }

    /**
     * Generate enum definitions
     */
    private generateEnums(enums: EnumMetadata[]): string {
        const enumDefs = enums.map((enumMeta) => {
            const values = enumMeta.values.map((v) => `  ${this.escapeIdentifier(v)}`).join('\n');
            return `Enum ${this.escapeIdentifier(enumMeta.name)} {
${values}
}`;
        });

        return enumDefs.join('\n\n');
    }

    /**
     * Generate all table definitions
     */
    private generateTables(entities: EntityMetadata[]): string {
        const tableDefs = entities.map((entity) => this.tableGenerator.generateTable(entity));

        return tableDefs.join('\n\n');
    }

    /**
     * Generate table groups by schema
     */
    private generateTableGroups(entities: EntityMetadata[]): string {
        // Group entities by schema
        const schemaGroups = new Map<string, string[]>();

        for (const entity of entities) {
            const schema = entity.schema || 'public';
            if (!schemaGroups.has(schema)) {
                schemaGroups.set(schema, []);
            }
            schemaGroups.get(schema)!.push(entity.tableName);
        }

        // Generate TableGroup for each schema
        const groups: string[] = [];
        for (const [schema, tables] of schemaGroups) {
            if (tables.length > 0) {
                const tableList = tables.map((t) => `  ${this.escapeIdentifier(t)}`).join('\n');
                groups.push(`TableGroup ${this.escapeIdentifier(schema)} {
${tableList}
}`);
            }
        }

        return groups.join('\n\n');
    }

    /**
     * Escape identifiers that need quoting
     */
    private escapeIdentifier(identifier: string): string {
        // If identifier contains spaces or special characters, quote it
        if (/[^a-zA-Z0-9_]/.test(identifier)) {
            return `"${identifier}"`;
        }
        return identifier;
    }

    /**
     * Generate DBML and write to file
     */
    async generateToFile(schema: DBMLSchema, outputPath: string): Promise<void> {
        const dbml = this.generate(schema);
        const fs = await import('fs/promises');
        await fs.writeFile(outputPath, dbml, 'utf-8');
    }

    /**
     * Get the current options
     */
    getOptions(): Required<GeneratorOptions> {
        return { ...this.options };
    }
}
