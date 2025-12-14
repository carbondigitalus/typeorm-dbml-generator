/**
 * RelationExtractor - Extracts relationship metadata from TypeORM entity properties
 */

import { ClassDeclaration, PropertyDeclaration, SyntaxKind } from 'ts-morph';
import { RelationMetadata, JoinColumnMetadata, JoinTableMetadata } from '../parser/types';

export class RelationExtractor {
    /**
     * Extract all relationships from an entity class
     */
    extractRelations(classDecl: ClassDeclaration): RelationMetadata[] {
        const relations: RelationMetadata[] = [];
        const properties = classDecl.getProperties();

        for (const property of properties) {
            const relationMetadata = this.extractRelationFromProperty(property);
            if (relationMetadata) {
                relations.push(relationMetadata);
            }
        }

        return relations;
    }

    /**
     * Extract relationship metadata from a single property
     */
    private extractRelationFromProperty(property: PropertyDeclaration): RelationMetadata | null {
        const decorators = property.getDecorators();

        // Check for relation decorators
        const relationDecorator = decorators.find((d) =>
            ['OneToOne', 'ManyToOne', 'OneToMany', 'ManyToMany'].includes(d.getName()),
        );

        if (!relationDecorator) {
            return null;
        }

        const decoratorName = relationDecorator.getName();
        const propertyName = property.getName();

        // Map decorator name to relation type
        let type: RelationMetadata['type'];
        switch (decoratorName) {
            case 'OneToOne':
                type = 'one-to-one';
                break;
            case 'ManyToOne':
                type = 'many-to-one';
                break;
            case 'OneToMany':
                type = 'one-to-many';
                break;
            case 'ManyToMany':
                type = 'many-to-many';
                break;
            default:
                return null;
        }

        // Extract target entity and inverse side
        const { target, inverseSide, onDelete, onUpdate } = this.extractRelationArguments(relationDecorator);

        const metadata: RelationMetadata = {
            propertyName,
            type,
            target,
            inverseSide,
            onDelete,
            onUpdate,
        };

        // Extract JoinColumn metadata (for OneToOne and ManyToOne)
        if (type === 'one-to-one' || type === 'many-to-one') {
            const joinColumnDecorator = decorators.find((d) => d.getName() === 'JoinColumn');
            if (joinColumnDecorator) {
                metadata.joinColumn = this.extractJoinColumn(joinColumnDecorator);
            } else {
                // Default join column
                metadata.joinColumn = {
                    name: `${this.toSnakeCase(propertyName)}_id`,
                    referencedColumnName: 'id',
                };
            }
        }

        // Extract JoinTable metadata (for ManyToMany)
        if (type === 'many-to-many') {
            const joinTableDecorator = decorators.find((d) => d.getName() === 'JoinTable');
            if (joinTableDecorator) {
                metadata.joinTable = this.extractJoinTable(joinTableDecorator, propertyName, target);
            }
        }

        return metadata;
    }

    /**
     * Extract target entity and inverse side from relation decorator arguments
     */
    private extractRelationArguments(decorator: any): {
        target: string;
        inverseSide?: string;
        onDelete?: RelationMetadata['onDelete'];
        onUpdate?: RelationMetadata['onUpdate'];
    } {
        let target = 'Unknown';
        let inverseSide: string | undefined;
        let onDelete: RelationMetadata['onDelete'] | undefined;
        let onUpdate: RelationMetadata['onUpdate'] | undefined;

        const args = decorator.getArguments();

        // First argument: target entity (arrow function or class reference)
        if (args.length > 0) {
            const firstArg = args[0];

            // Handle arrow function: () => TargetEntity
            if (firstArg.getKind() === SyntaxKind.ArrowFunction) {
                const arrowFunc = firstArg.asKind(SyntaxKind.ArrowFunction);
                if (arrowFunc) {
                    const body = arrowFunc.getBody();
                    target = body.getText();
                }
            }
            // Handle direct reference: TargetEntity
            else {
                target = firstArg.getText();
            }
        }

        // Second argument: inverse side (arrow function)
        if (args.length > 1) {
            const secondArg = args[1];

            if (secondArg.getKind() === SyntaxKind.ArrowFunction) {
                const arrowFunc = secondArg.asKind(SyntaxKind.ArrowFunction);
                if (arrowFunc) {
                    const body = arrowFunc.getBody();
                    // Extract property name from: entity => entity.propertyName
                    const bodyText = body.getText();
                    const match = bodyText.match(/\w+\.(\w+)/);
                    if (match) {
                        inverseSide = match[1];
                    }
                }
            }
        }

        // Third argument: options object
        if (args.length > 2) {
            const thirdArg = args[2];

            if (thirdArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                const options = thirdArg.asKind(SyntaxKind.ObjectLiteralExpression);
                if (options) {
                    const properties = options.getProperties();

                    for (const prop of properties) {
                        if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                            const propAssignment = prop.asKind(SyntaxKind.PropertyAssignment);
                            if (!propAssignment) continue;

                            const name = propAssignment.getName();
                            const initializer = propAssignment.getInitializer();
                            if (!initializer) continue;

                            const value = initializer.getText().replace(/['"]/g, '');

                            if (name === 'onDelete') {
                                onDelete = value.toUpperCase() as RelationMetadata['onDelete'];
                            } else if (name === 'onUpdate') {
                                onUpdate = value.toUpperCase() as RelationMetadata['onUpdate'];
                            }
                        }
                    }
                }
            }
        }

        return { target, inverseSide, onDelete, onUpdate };
    }

    /**
     * Extract JoinColumn metadata
     */
    private extractJoinColumn(decorator: any): JoinColumnMetadata {
        const joinColumn: JoinColumnMetadata = {};

        const args = decorator.getArguments();
        if (args.length > 0) {
            const firstArg = args[0];

            if (firstArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                const options = firstArg.asKind(SyntaxKind.ObjectLiteralExpression);
                if (options) {
                    const properties = options.getProperties();

                    for (const prop of properties) {
                        if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                            const propAssignment = prop.asKind(SyntaxKind.PropertyAssignment);
                            if (!propAssignment) continue;

                            const name = propAssignment.getName();
                            const initializer = propAssignment.getInitializer();
                            if (!initializer) continue;

                            const value = initializer.getText().replace(/['"]/g, '');

                            if (name === 'name') {
                                joinColumn.name = value;
                            } else if (name === 'referencedColumnName') {
                                joinColumn.referencedColumnName = value;
                            }
                        }
                    }
                }
            }
        }

        return joinColumn;
    }

    /**
     * Extract JoinTable metadata for ManyToMany relationships
     */
    private extractJoinTable(decorator: any, propertyName: string, targetEntity: string): JoinTableMetadata {
        const joinTable: JoinTableMetadata = {
            name: undefined,
            joinColumns: [],
            inverseJoinColumns: [],
        };

        const args = decorator.getArguments();
        if (args.length > 0) {
            const firstArg = args[0];

            if (firstArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                const options = firstArg.asKind(SyntaxKind.ObjectLiteralExpression);
                if (options) {
                    const properties = options.getProperties();

                    for (const prop of properties) {
                        if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                            const propAssignment = prop.asKind(SyntaxKind.PropertyAssignment);
                            if (!propAssignment) continue;

                            const name = propAssignment.getName();
                            const initializer = propAssignment.getInitializer();
                            if (!initializer) continue;

                            if (name === 'name') {
                                joinTable.name = initializer.getText().replace(/['"]/g, '');
                            } else if (name === 'joinColumn' || name === 'joinColumns') {
                                joinTable.joinColumns = this.extractJoinColumns(initializer);
                            } else if (name === 'inverseJoinColumn' || name === 'inverseJoinColumns') {
                                joinTable.inverseJoinColumns = this.extractJoinColumns(initializer);
                            }
                        }
                    }
                }
            }
        }

        return joinTable;
    }

    /**
     * Extract join columns from array or object
     */
    private extractJoinColumns(initializer: any): JoinColumnMetadata[] {
        const columns: JoinColumnMetadata[] = [];

        // Check if it's an array
        if (initializer.getKind() === SyntaxKind.ArrayLiteralExpression) {
            const array = initializer.asKind(SyntaxKind.ArrayLiteralExpression);
            if (array) {
                const elements = array.getElements();
                for (const element of elements) {
                    if (element.getKind() === SyntaxKind.ObjectLiteralExpression) {
                        const obj = element.asKind(SyntaxKind.ObjectLiteralExpression);
                        if (obj) {
                            columns.push(this.extractSingleJoinColumn(obj));
                        }
                    }
                }
            }
        }
        // Single object
        else if (initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
            const obj = initializer.asKind(SyntaxKind.ObjectLiteralExpression);
            if (obj) {
                columns.push(this.extractSingleJoinColumn(obj));
            }
        }

        return columns;
    }

    /**
     * Extract a single join column from object literal
     */
    private extractSingleJoinColumn(obj: any): JoinColumnMetadata {
        const joinColumn: JoinColumnMetadata = {};
        const properties = obj.getProperties();

        for (const prop of properties) {
            if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                const propAssignment = prop.asKind(SyntaxKind.PropertyAssignment);
                if (!propAssignment) continue;

                const name = propAssignment.getName();
                const initializer = propAssignment.getInitializer();
                if (!initializer) continue;

                const value = initializer.getText().replace(/['"]/g, '');

                if (name === 'name') {
                    joinColumn.name = value;
                } else if (name === 'referencedColumnName') {
                    joinColumn.referencedColumnName = value;
                }
            }
        }

        return joinColumn;
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
