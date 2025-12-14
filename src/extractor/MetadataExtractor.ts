/**
 * MetadataExtractor - Extracts metadata from TypeORM entity classes
 */

import { ClassDeclaration } from 'ts-morph';
import { EntityMetadata, DBMLSchema, EnumMetadata } from './types';
import { ColumnExtractor } from '../extractor/ColumnExtractor';
import { RelationExtractor } from '../extractor/RelationExtractor';
import { ConstraintExtractor } from '../extractor/ConstraintExtractor';

export class MetadataExtractor {
    private columnExtractor: ColumnExtractor;
    private relationExtractor: RelationExtractor;
    private constraintExtractor: ConstraintExtractor;
    private enumsMap: Map<string, EnumMetadata>;

    constructor() {
        this.columnExtractor = new ColumnExtractor();
        this.relationExtractor = new RelationExtractor();
        this.constraintExtractor = new ConstraintExtractor();
        this.enumsMap = new Map();
    }

    /**
     * Extract metadata from all entity classes
     */
    extractMetadata(entities: ClassDeclaration[]): DBMLSchema {
        const entityMetadata: EntityMetadata[] = [];

        // First pass: extract basic entity info
        for (const entity of entities) {
            const metadata = this.extractEntityMetadata(entity);
            entityMetadata.push(metadata);
        }

        // Second pass: resolve relationships now that we have all entities
        this.resolveRelationships(entityMetadata, entities);

        return {
            entities: entityMetadata,
            enums: Array.from(this.enumsMap.values()),
            joinTables: this.extractJoinTables(entityMetadata),
        };
    }

    /**
     * Extract metadata from a single entity class
     */
    private extractEntityMetadata(classDecl: ClassDeclaration): EntityMetadata {
        const className = classDecl.getName() || 'Unknown';

        // Extract @Entity decorator info
        const { tableName, schema, note } = this.extractEntityDecorator(classDecl);

        // Extract columns
        const columns = this.columnExtractor.extractColumns(classDecl, this.enumsMap);

        // Extract relations (basic info, will resolve later)
        const relations = this.relationExtractor.extractRelations(classDecl);

        // Extract constraints
        const { indexes, uniques, checks } = this.constraintExtractor.extractConstraints(classDecl);

        // Extract inheritance info
        const inheritance = this.extractInheritance(classDecl);

        return {
            name: className,
            tableName,
            schema,
            columns,
            relations,
            indexes,
            uniques,
            checks,
            note,
            inheritance,
        };
    }

    /**
     * Extract information from @Entity decorator
     */
    private extractEntityDecorator(classDecl: ClassDeclaration): {
        tableName: string;
        schema?: string;
        note?: string;
    } {
        const className = classDecl.getName() || 'Unknown';
        let tableName = this.toSnakeCase(className);
        let schema: string | undefined;
        let note: string | undefined;

        const entityDecorator = classDecl.getDecorator('Entity');
        if (entityDecorator) {
            const args = entityDecorator.getArguments();

            if (args.length > 0) {
                const firstArg = args[0];

                // Check if first argument is a string (table name)
                if (firstArg.getKind() === 40 /* StringLiteral */) {
                    tableName = firstArg.getText().replace(/['"]/g, '');
                }
                // Check if first argument is an object (options)
                else if (firstArg.getKind() === 206 /* ObjectLiteralExpression */) {
                    const obj = firstArg.asKind(206);
                    if (obj) {
                        const props = obj.getProperties();
                        for (const prop of props) {
                            if (prop.getKind() === 296 /* PropertyAssignment */) {
                                const propAssignment = prop.asKind(296);
                                if (propAssignment) {
                                    const name = propAssignment.getName();
                                    const init = propAssignment.getInitializer();

                                    if (name === 'name' && init) {
                                        tableName = init.getText().replace(/['"]/g, '');
                                    } else if (name === 'schema' && init) {
                                        schema = init.getText().replace(/['"]/g, '');
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Extract JSDoc comment as note
        const jsDocs = classDecl.getJsDocs();
        if (jsDocs.length > 0) {
            const comment = jsDocs[0].getComment();
            if (typeof comment === 'string') {
                note = comment;
            }
        }

        return { tableName, schema, note };
    }

    /**
     * Extract inheritance metadata
     */
    private extractInheritance(classDecl: ClassDeclaration) {
        // Check for @TableInheritance decorator
        const inheritanceDecorator = classDecl.getDecorator('TableInheritance');
        if (!inheritanceDecorator) {
            return undefined;
        }

        const args = inheritanceDecorator.getArguments();
        if (args.length === 0) {
            return undefined;
        }

        const options = args[0].asKind(206); // ObjectLiteralExpression
        if (!options) {
            return undefined;
        }

        let pattern: 'STI' | 'CTI' | 'TPC' = 'STI';
        let discriminatorColumn: string | undefined;

        const props = options.getProperties();
        for (const prop of props) {
            if (prop.getKind() === 296) {
                const propAssignment = prop.asKind(296);
                if (propAssignment) {
                    const name = propAssignment.getName();
                    const init = propAssignment.getInitializer();

                    if (name === 'pattern' && init) {
                        const patternValue = init.getText().replace(/['"]/g, '');
                        pattern = patternValue as 'STI' | 'CTI' | 'TPC';
                    } else if (name === 'column' && init) {
                        discriminatorColumn = init.getText().replace(/['"]/g, '');
                    }
                }
            }
        }

        // Check for @ChildEntity decorator for discriminator value
        const childDecorator = classDecl.getDecorator('ChildEntity');
        let discriminatorValue: string | undefined;

        if (childDecorator) {
            const childArgs = childDecorator.getArguments();
            if (childArgs.length > 0) {
                discriminatorValue = childArgs[0].getText().replace(/['"]/g, '');
            }
        }

        return {
            pattern,
            discriminatorColumn,
            discriminatorValue,
        };
    }

    /**
     * Resolve relationships between entities (second pass)
     */
    private resolveRelationships(entities: EntityMetadata[], classDeclarations: ClassDeclaration[]): void {
        // Create a map of class names to table names for lookup
        const classToTable = new Map<string, string>();
        entities.forEach((e) => classToTable.set(e.name, e.tableName));

        // Update relation targets from class names to table names
        for (const entity of entities) {
            for (const relation of entity.relations) {
                const targetTable = classToTable.get(relation.target);
                if (targetTable) {
                    relation.target = targetTable;
                }
            }
        }
    }

    /**
     * Extract join tables from many-to-many relationships
     */
    private extractJoinTables(entities: EntityMetadata[]) {
        const joinTables = [];

        for (const entity of entities) {
            for (const relation of entity.relations) {
                if (relation.type === 'many-to-many' && relation.joinTable) {
                    // Join tables will be generated by the DBML generator
                    // For now, we just collect the metadata
                }
            }
        }

        return joinTables;
    }

    /**
     * Convert PascalCase to snake_case
     */
    private toSnakeCase(str: string): string {
        return str
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, '');
    }
}
