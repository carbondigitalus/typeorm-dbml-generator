/**
 * ConstraintExtractor - Extracts constraint metadata (indexes, unique, checks) from TypeORM entities
 */

import { ClassDeclaration, SyntaxKind } from 'ts-morph';
import { IndexMetadata, UniqueMetadata, CheckMetadata } from '../parser/types';

export class ConstraintExtractor {
    /**
     * Extract all constraints from an entity class
     */
    extractConstraints(classDecl: ClassDeclaration): {
        indexes: IndexMetadata[];
        uniques: UniqueMetadata[];
        checks: CheckMetadata[];
    } {
        const indexes = this.extractIndexes(classDecl);
        const uniques = this.extractUniques(classDecl);
        const checks = this.extractChecks(classDecl);

        return { indexes, uniques, checks };
    }

    /**
     * Extract index metadata from @Index decorators
     */
    private extractIndexes(classDecl: ClassDeclaration): IndexMetadata[] {
        const indexes: IndexMetadata[] = [];
        const decorators = classDecl.getDecorators();

        for (const decorator of decorators) {
            if (decorator.getName() === 'Index') {
                const indexMetadata = this.extractIndexFromDecorator(decorator);
                if (indexMetadata) {
                    indexes.push(indexMetadata);
                }
            }
        }

        // Also check properties for individual column indexes
        const properties = classDecl.getProperties();
        for (const property of properties) {
            const propertyDecorators = property.getDecorators();
            for (const decorator of propertyDecorators) {
                if (decorator.getName() === 'Index') {
                    const indexMetadata = this.extractIndexFromPropertyDecorator(decorator, property.getName());
                    if (indexMetadata) {
                        indexes.push(indexMetadata);
                    }
                }
            }
        }

        return indexes;
    }

    /**
     * Extract index metadata from class-level @Index decorator
     */
    private extractIndexFromDecorator(decorator: any): IndexMetadata | null {
        const args = decorator.getArguments();

        const metadata: IndexMetadata = {
            columns: [],
            isUnique: false,
        };

        if (args.length === 0) {
            return null;
        }

        let currentArgIndex = 0;

        // First argument could be: name (string), columns (array), or options (object)
        const firstArg = args[0];
        const firstArgKind = firstArg.getKind();

        // Case 1: @Index(['col1', 'col2'])
        if (firstArgKind === SyntaxKind.ArrayLiteralExpression) {
            metadata.columns = this.extractColumnsFromArray(firstArg);
            currentArgIndex = 1;
        }
        // Case 2: @Index('index_name', ['col1', 'col2'])
        else if (firstArgKind === SyntaxKind.StringLiteral) {
            metadata.name = firstArg.getText().replace(/['"]/g, '');
            currentArgIndex = 1;

            if (args.length > 1 && args[1].getKind() === SyntaxKind.ArrayLiteralExpression) {
                metadata.columns = this.extractColumnsFromArray(args[1]);
                currentArgIndex = 2;
            }
        }
        // Case 3: @Index({ ... }) - options only
        else if (firstArgKind === SyntaxKind.ObjectLiteralExpression) {
            this.extractIndexOptions(firstArg, metadata);
            return metadata;
        }

        // Check for options object as last argument
        if (args.length > currentArgIndex) {
            const lastArg = args[currentArgIndex];
            if (lastArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                this.extractIndexOptions(lastArg, metadata);
            }
        }

        return metadata.columns.length > 0 ? metadata : null;
    }

    /**
     * Extract index metadata from property-level @Index decorator
     */
    private extractIndexFromPropertyDecorator(decorator: any, propertyName: string): IndexMetadata | null {
        const metadata: IndexMetadata = {
            columns: [this.toSnakeCase(propertyName)],
            isUnique: false,
        };

        const args = decorator.getArguments();

        // Could have name and/or options
        for (const arg of args) {
            const argKind = arg.getKind();

            if (argKind === SyntaxKind.StringLiteral) {
                metadata.name = arg.getText().replace(/['"]/g, '');
            } else if (argKind === SyntaxKind.ObjectLiteralExpression) {
                this.extractIndexOptions(arg, metadata);
            }
        }

        return metadata;
    }

    /**
     * Extract index options from object literal
     */
    private extractIndexOptions(options: any, metadata: IndexMetadata): void {
        const properties = options.getProperties();

        for (const prop of properties) {
            if (prop.getKind() === SyntaxKind.PropertyAssignment) {
                const propAssignment = prop.asKind(SyntaxKind.PropertyAssignment);
                if (!propAssignment) continue;

                const name = propAssignment.getName();
                const initializer = propAssignment.getInitializer();
                if (!initializer) continue;

                const value = initializer.getText();

                switch (name) {
                    case 'unique':
                        metadata.isUnique = value === 'true';
                        break;
                    case 'spatial':
                        metadata.isSpatial = value === 'true';
                        break;
                    case 'fulltext':
                        metadata.isFulltext = value === 'true';
                        break;
                    case 'where':
                        metadata.where = value.replace(/['"]/g, '');
                        break;
                    case 'using':
                        const typeValue = value.replace(/['"]/g, '').toLowerCase();
                        if (['btree', 'hash', 'gist', 'gin'].includes(typeValue)) {
                            metadata.type = typeValue as IndexMetadata['type'];
                        }
                        break;
                }
            }
        }
    }

    /**
     * Extract unique constraints from @Unique decorators
     */
    private extractUniques(classDecl: ClassDeclaration): UniqueMetadata[] {
        const uniques: UniqueMetadata[] = [];
        const decorators = classDecl.getDecorators();

        for (const decorator of decorators) {
            if (decorator.getName() === 'Unique') {
                const uniqueMetadata = this.extractUniqueFromDecorator(decorator);
                if (uniqueMetadata) {
                    uniques.push(uniqueMetadata);
                }
            }
        }

        return uniques;
    }

    /**
     * Extract unique constraint metadata from @Unique decorator
     */
    private extractUniqueFromDecorator(decorator: any): UniqueMetadata | null {
        const args = decorator.getArguments();

        const metadata: UniqueMetadata = {
            columns: [],
        };

        if (args.length === 0) {
            return null;
        }

        let currentArgIndex = 0;

        // First argument could be: name (string) or columns (array)
        const firstArg = args[0];
        const firstArgKind = firstArg.getKind();

        // Case 1: @Unique(['col1', 'col2'])
        if (firstArgKind === SyntaxKind.ArrayLiteralExpression) {
            metadata.columns = this.extractColumnsFromArray(firstArg);
        }
        // Case 2: @Unique('unique_name', ['col1', 'col2'])
        else if (firstArgKind === SyntaxKind.StringLiteral) {
            metadata.name = firstArg.getText().replace(/['"]/g, '');

            if (args.length > 1 && args[1].getKind() === SyntaxKind.ArrayLiteralExpression) {
                metadata.columns = this.extractColumnsFromArray(args[1]);
            }
        }

        return metadata.columns.length > 0 ? metadata : null;
    }

    /**
     * Extract check constraints from @Check decorators
     */
    private extractChecks(classDecl: ClassDeclaration): CheckMetadata[] {
        const checks: CheckMetadata[] = [];
        const decorators = classDecl.getDecorators();

        for (const decorator of decorators) {
            if (decorator.getName() === 'Check') {
                const checkMetadata = this.extractCheckFromDecorator(decorator);
                if (checkMetadata) {
                    checks.push(checkMetadata);
                }
            }
        }

        return checks;
    }

    /**
     * Extract check constraint metadata from @Check decorator
     */
    private extractCheckFromDecorator(decorator: any): CheckMetadata | null {
        const args = decorator.getArguments();

        if (args.length === 0) {
            return null;
        }

        const metadata: CheckMetadata = {
            expression: '',
        };

        // First argument is always the expression
        const firstArg = args[0];
        metadata.expression = firstArg.getText().replace(/['"]/g, '');

        // Second argument could be name
        if (args.length > 1) {
            const secondArg = args[1];
            if (secondArg.getKind() === SyntaxKind.StringLiteral) {
                metadata.name = secondArg.getText().replace(/['"]/g, '');
            }
        }

        return metadata.expression ? metadata : null;
    }

    /**
     * Extract column names from an array literal
     */
    private extractColumnsFromArray(arrayLiteral: any): string[] {
        const columns: string[] = [];
        const array = arrayLiteral.asKind(SyntaxKind.ArrayLiteralExpression);

        if (!array) {
            return columns;
        }

        const elements = array.getElements();
        for (const element of elements) {
            if (element.getKind() === SyntaxKind.StringLiteral) {
                const columnName = element.getText().replace(/['"]/g, '');
                columns.push(columnName);
            }
        }

        return columns;
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
