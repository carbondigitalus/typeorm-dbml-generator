/**
 * TableGenerator - Generates DBML table definitions from entity metadata
 */

import { EntityMetadata, ColumnMetadata, GeneratorOptions } from '../parser/types';
import { TypeMapper } from './TypeMapper';

export class TableGenerator {
    private typeMapper: TypeMapper;
    private options: Required<GeneratorOptions>;

    constructor(options: Required<GeneratorOptions>) {
        this.options = options;
        this.typeMapper = new TypeMapper();
    }

    /**
     * Generate a complete table definition
     */
    generateTable(entity: EntityMetadata): string {
        const lines: string[] = [];

        // Table declaration with optional schema and note
        const tableDeclaration = this.generateTableDeclaration(entity);
        lines.push(tableDeclaration);

        // Columns
        const columns = entity.columns.map((col) => this.generateColumn(col));
        lines.push(...columns.map((c) => `  ${c}`));

        // Indexes (if enabled)
        if (this.options.includeIndexes && entity.indexes.length > 0) {
            lines.push('');
            lines.push('  Indexes {');

            for (const index of entity.indexes) {
                lines.push(`    ${this.generateIndex(index)}`);
            }

            lines.push('  }');
        }

        lines.push('}');

        return lines.join('\n');
    }

    /**
     * Generate table declaration line
     */
    private generateTableDeclaration(entity: EntityMetadata): string {
        let declaration = `Table ${this.escapeIdentifier(entity.tableName)}`;

        const options: string[] = [];

        // Add schema if present and enabled
        if (this.options.includeSchemas && entity.schema) {
            options.push(`schema: "${entity.schema}"`);
        }

        // Add note if present and enabled
        if (this.options.includeNotes && entity.note) {
            const escapedNote = this.escapeNote(entity.note);
            options.push(`note: '${escapedNote}'`);
        }

        // Add as header note if present
        if (options.length > 0) {
            declaration += ` [${options.join(', ')}]`;
        }

        declaration += ' {';

        return declaration;
    }

    /**
     * Generate a column definition
     */
    private generateColumn(column: ColumnMetadata): string {
        const parts: string[] = [];

        // Column name
        parts.push(this.escapeIdentifier(column.columnName));

        // Column type
        const dbmlType = this.typeMapper.mapType(column);
        parts.push(dbmlType);

        // Column settings
        const settings = this.generateColumnSettings(column);
        if (settings) {
            parts.push(settings);
        }

        return parts.join(' ');
    }

    /**
     * Generate column settings (constraints and options)
     */
    private generateColumnSettings(column: ColumnMetadata): string {
        const settings: string[] = [];

        // Primary key
        if (column.isPrimary) {
            if (column.isGenerated && column.generationStrategy === 'increment') {
                settings.push('pk');
                settings.push('increment');
            } else if (column.isGenerated && column.generationStrategy === 'uuid') {
                settings.push('pk');
            } else {
                settings.push('pk');
            }
        }

        // Unique
        if (column.isUnique && !column.isPrimary) {
            settings.push('unique');
        }

        // Not null
        if (!column.isNullable) {
            settings.push('not null');
        }

        // Default value
        if (column.default !== undefined) {
            const defaultValue = this.formatDefaultValue(column.default, column);
            settings.push(`default: ${defaultValue}`);
        }

        // Special date columns
        if (column.isCreateDate || column.isUpdateDate) {
            settings.push('default: `now()`');
        }

        // Note/comment
        if (this.options.includeNotes && column.comment) {
            const escapedNote = this.escapeNote(column.comment);
            settings.push(`note: '${escapedNote}'`);
        }

        return settings.length > 0 ? `[${settings.join(', ')}]` : '';
    }

    /**
     * Format default value for DBML
     */
    private formatDefaultValue(defaultValue: string, column: ColumnMetadata): string {
        // Check if it's a function call
        if (defaultValue.includes('(') || defaultValue.toLowerCase().includes('now')) {
            return `\`${defaultValue}\``;
        }

        // String values
        if (column.type === 'varchar' || column.type === 'text' || column.enumName) {
            return `'${defaultValue}'`;
        }

        // Boolean values
        if (column.type === 'boolean') {
            return defaultValue.toLowerCase();
        }

        // Numeric values
        return defaultValue;
    }

    /**
     * Generate an index definition
     */
    private generateIndex(index: any): string {
        const parts: string[] = [];

        // Column(s)
        if (index.columns.length === 1) {
            parts.push(this.escapeIdentifier(index.columns[0]));
        } else {
            const columns = index.columns.map((c) => this.escapeIdentifier(c)).join(', ');
            parts.push(`(${columns})`);
        }

        // Index settings
        const settings: string[] = [];

        if (index.isUnique) {
            settings.push('unique');
        }

        if (index.name) {
            settings.push(`name: '${index.name}'`);
        }

        if (index.type) {
            settings.push(`type: ${index.type}`);
        }

        if (index.where) {
            settings.push(`where: '${index.where}'`);
        }

        if (settings.length > 0) {
            parts.push(`[${settings.join(', ')}]`);
        }

        return parts.join(' ');
    }

    /**
     * Escape identifier if needed
     */
    private escapeIdentifier(identifier: string): string {
        // If identifier contains spaces or special characters, quote it
        if (/[^a-zA-Z0-9_]/.test(identifier)) {
            return `"${identifier}"`;
        }
        return identifier;
    }

    /**
     * Escape note text
     */
    private escapeNote(note: string): string {
        // Escape single quotes
        return note.replace(/'/g, "\\'");
    }
}
