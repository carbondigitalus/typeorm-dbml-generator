/**
 * RelationGenerator - Generates DBML relationship references from entity metadata
 */

import { EntityMetadata, RelationMetadata } from '../parser/types';

export class RelationGenerator {
    /**
     * Generate all relationship references
     */
    generateRelations(entities: EntityMetadata[]): string {
        const refs: string[] = [];

        for (const entity of entities) {
            for (const relation of entity.relations) {
                const ref = this.generateRelation(entity, relation);
                if (ref) {
                    refs.push(ref);
                }
            }
        }

        return refs.length > 0 ? refs.join('\n') : '';
    }

    /**
     * Generate a single relationship reference
     */
    private generateRelation(entity: EntityMetadata, relation: RelationMetadata): string | null {
        switch (relation.type) {
            case 'many-to-one':
                return this.generateManyToOne(entity, relation);
            case 'one-to-many':
                // OneToMany is the inverse of ManyToOne, handled by the other side
                return null;
            case 'one-to-one':
                return this.generateOneToOne(entity, relation);
            case 'many-to-many':
                return this.generateManyToMany(entity, relation);
            default:
                return null;
        }
    }

    /**
     * Generate many-to-one relationship
     * Format: Ref: table1.foreign_key > table2.primary_key
     */
    private generateManyToOne(entity: EntityMetadata, relation: RelationMetadata): string {
        const fromTable = entity.tableName;
        const toTable = relation.target;

        // Get join column info
        const joinColumnName = relation.joinColumn?.name || `${this.toSnakeCase(relation.propertyName)}_id`;
        const referencedColumnName = relation.joinColumn?.referencedColumnName || 'id';

        const parts: string[] = [];
        parts.push(`Ref: ${this.escapeIdentifier(fromTable)}.${this.escapeIdentifier(joinColumnName)}`);
        parts.push('>');
        parts.push(`${this.escapeIdentifier(toTable)}.${this.escapeIdentifier(referencedColumnName)}`);

        // Add relationship options
        const options = this.generateRelationOptions(relation);
        if (options) {
            parts.push(options);
        }

        return parts.join(' ');
    }

    /**
     * Generate one-to-one relationship
     * Format: Ref: table1.foreign_key - table2.primary_key
     */
    private generateOneToOne(entity: EntityMetadata, relation: RelationMetadata): string | null {
        // Only generate from the side that has the join column
        if (!relation.joinColumn) {
            return null;
        }

        const fromTable = entity.tableName;
        const toTable = relation.target;

        // Get join column info
        const joinColumnName = relation.joinColumn.name || `${this.toSnakeCase(relation.propertyName)}_id`;
        const referencedColumnName = relation.joinColumn.referencedColumnName || 'id';

        const parts: string[] = [];
        parts.push(`Ref: ${this.escapeIdentifier(fromTable)}.${this.escapeIdentifier(joinColumnName)}`);
        parts.push('-');
        parts.push(`${this.escapeIdentifier(toTable)}.${this.escapeIdentifier(referencedColumnName)}`);

        // Add relationship options
        const options = this.generateRelationOptions(relation);
        if (options) {
            parts.push(options);
        }

        return parts.join(' ');
    }

    /**
     * Generate many-to-many relationship
     * This creates a join table representation
     */
    private generateManyToMany(entity: EntityMetadata, relation: RelationMetadata): string | null {
        // Only generate from the side that has the join table
        if (!relation.joinTable) {
            return null;
        }

        const fromTable = entity.tableName;
        const toTable = relation.target;

        // Get join table name
        const joinTableName = relation.joinTable.name || `${this.toSnakeCase(fromTable)}_${this.toSnakeCase(toTable)}`;

        // Get join column names
        const fromJoinColumn = relation.joinTable.joinColumns?.[0];
        const toJoinColumn = relation.joinTable.inverseJoinColumns?.[0];

        const fromColumnName = fromJoinColumn?.name || `${this.toSnakeCase(fromTable)}_id`;
        const fromReferencedColumn = fromJoinColumn?.referencedColumnName || 'id';

        const toColumnName = toJoinColumn?.name || `${this.toSnakeCase(toTable)}_id`;
        const toReferencedColumn = toJoinColumn?.referencedColumnName || 'id';

        // Generate two references for the join table
        const refs: string[] = [];

        // Reference from join table to first entity
        refs.push(
            `Ref: ${this.escapeIdentifier(joinTableName)}.${this.escapeIdentifier(fromColumnName)} > ` +
                `${this.escapeIdentifier(fromTable)}.${this.escapeIdentifier(fromReferencedColumn)}`,
        );

        // Reference from join table to second entity
        refs.push(
            `Ref: ${this.escapeIdentifier(joinTableName)}.${this.escapeIdentifier(toColumnName)} > ` +
                `${this.escapeIdentifier(toTable)}.${this.escapeIdentifier(toReferencedColumn)}`,
        );

        return refs.join('\n');
    }

    /**
     * Generate relationship options (delete/update actions)
     */
    private generateRelationOptions(relation: RelationMetadata): string | null {
        const options: string[] = [];

        if (relation.onDelete) {
            options.push(`delete: ${this.formatCascadeAction(relation.onDelete)}`);
        }

        if (relation.onUpdate) {
            options.push(`update: ${this.formatCascadeAction(relation.onUpdate)}`);
        }

        return options.length > 0 ? `[${options.join(', ')}]` : null;
    }

    /**
     * Format cascade action for DBML
     */
    private formatCascadeAction(action: string): string {
        const actionMap: Record<string, string> = {
            'CASCADE': 'cascade',
            'SET NULL': 'set null',
            'SET DEFAULT': 'set default',
            'RESTRICT': 'restrict',
            'NO ACTION': 'no action',
        };

        return actionMap[action] || action.toLowerCase();
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
     * Convert PascalCase/camelCase to snake_case
     */
    private toSnakeCase(str: string): string {
        return str
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, '');
    }
}
