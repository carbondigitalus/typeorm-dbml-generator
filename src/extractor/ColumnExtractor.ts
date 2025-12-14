/**
 * ColumnExtractor - Extracts column metadata from TypeORM entity properties
 */

import { ClassDeclaration, PropertyDeclaration, SyntaxKind } from 'ts-morph';
import { ColumnMetadata, EnumMetadata } from '../parser/types';

export class ColumnExtractor {
    /**
     * Extract all columns from an entity class
     */
    extractColumns(classDecl: ClassDeclaration, enumsMap: Map<string, EnumMetadata>): ColumnMetadata[] {
        const columns: ColumnMetadata[] = [];
        const properties = classDecl.getProperties();

        for (const property of properties) {
            const columnMetadata = this.extractColumnFromProperty(property, enumsMap);
            if (columnMetadata) {
                columns.push(columnMetadata);
            }
        }

        return columns;
    }

    /**
     * Extract column metadata from a single property
     */
    private extractColumnFromProperty(
        property: PropertyDeclaration,
        enumsMap: Map<string, EnumMetadata>,
    ): ColumnMetadata | null {
        const decorators = property.getDecorators();
        const propertyName = property.getName();

        // Check for column decorators
        const columnDecorator = decorators.find((d) =>
            [
                'Column',
                'PrimaryColumn',
                'PrimaryGeneratedColumn',
                'CreateDateColumn',
                'UpdateDateColumn',
                'DeleteDateColumn',
                'VersionColumn',
            ].includes(d.getName()),
        );

        if (!columnDecorator) {
            // Not a column (might be a relation)
            return null;
        }

        const decoratorName = columnDecorator.getName();

        // Initialize metadata
        const metadata: ColumnMetadata = {
            propertyName,
            columnName: this.toSnakeCase(propertyName),
            type: 'varchar',
            isPrimary: false,
            isGenerated: false,
            isNullable: true,
            isUnique: false,
            isCreateDate: decoratorName === 'CreateDateColumn',
            isUpdateDate: decoratorName === 'UpdateDateColumn',
            isDeleteDate: decoratorName === 'DeleteDateColumn',
            isVersion: decoratorName === 'VersionColumn',
        };

        // Handle primary columns
        if (decoratorName === 'PrimaryColumn' || decoratorName === 'PrimaryGeneratedColumn') {
            metadata.isPrimary = true;
            metadata.isNullable = false;
        }

        // Handle generated columns
        if (decoratorName === 'PrimaryGeneratedColumn') {
            metadata.isGenerated = true;

            const args = columnDecorator.getArguments();
            if (args.length > 0) {
                const firstArg = args[0].getText().replace(/['"]/g, '');
                if (firstArg === 'uuid') {
                    metadata.generationStrategy = 'uuid';
                    metadata.type = 'uuid';
                } else if (firstArg === 'increment') {
                    metadata.generationStrategy = 'increment';
                    metadata.type = 'integer';
                } else if (firstArg === 'rowid') {
                    metadata.generationStrategy = 'rowid';
                    metadata.type = 'integer';
                }
            } else {
                // Default is increment
                metadata.generationStrategy = 'increment';
                metadata.type = 'integer';
            }
        }

        // Handle special date columns
        if (['CreateDateColumn', 'UpdateDateColumn', 'DeleteDateColumn'].includes(decoratorName)) {
            metadata.type = 'timestamp';
            metadata.isNullable = false;
        }

        // Handle version column
        if (decoratorName === 'VersionColumn') {
            metadata.type = 'integer';
            metadata.isNullable = false;
        }

        // Extract options from decorator arguments
        const args = columnDecorator.getArguments();
        for (const arg of args) {
            if (arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
                this.extractColumnOptions(arg.asKind(SyntaxKind.ObjectLiteralExpression)!, metadata, enumsMap);
            }
        }

        // Infer type from TypeScript type if not explicitly set
        if (metadata.type === 'varchar' && !metadata.isGenerated) {
            const tsType = property.getType();
            metadata.type = this.inferTypeFromTsType(tsType.getText(), metadata);
        }

        // Extract JSDoc comment
        const jsDocs = property.getJsDocs();
        if (jsDocs.length > 0) {
            const comment = jsDocs[0].getComment();
            if (typeof comment === 'string') {
                metadata.comment = comment;
            }
        }

        return metadata;
    }

    /**
     * Extract column options from decorator object literal
     */
    private extractColumnOptions(options: any, metadata: ColumnMetadata, enumsMap: Map<string, EnumMetadata>): void {
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
                    case 'type':
                        metadata.type = value.replace(/['"]/g, '');
                        break;
                    case 'name':
                        metadata.columnName = value.replace(/['"]/g, '');
                        break;
                    case 'length':
                        metadata.length = parseInt(value);
                        break;
                    case 'precision':
                        metadata.precision = parseInt(value);
                        break;
                    case 'scale':
                        metadata.scale = parseInt(value);
                        break;
                    case 'nullable':
                        metadata.isNullable = value === 'true';
                        break;
                    case 'unique':
                        metadata.isUnique = value === 'true';
                        break;
                    case 'default':
                        metadata.default = value.replace(/['"]/g, '');
                        break;
                    case 'comment':
                        metadata.comment = value.replace(/['"]/g, '');
                        break;
                    case 'array':
                        metadata.isArray = value === 'true';
                        break;
                    case 'enum':
                        this.extractEnumMetadata(initializer, metadata, enumsMap);
                        break;
                }
            }
        }
    }

    /**
     * Extract enum metadata from column options
     */
    private extractEnumMetadata(
        enumInitializer: any,
        metadata: ColumnMetadata,
        enumsMap: Map<string, EnumMetadata>,
    ): void {
        const enumText = enumInitializer.getText();

        // Try to resolve the enum
        const symbol = enumInitializer.getType().getSymbol();
        if (!symbol) return;

        const enumName = symbol.getName();
        metadata.enumName = this.toSnakeCase(enumName);
        metadata.type = metadata.enumName;

        // Check if we've already processed this enum
        if (enumsMap.has(enumName)) {
            return;
        }

        // Get enum values
        const declarations = symbol.getDeclarations();
        if (declarations.length === 0) return;

        const enumDecl = declarations[0];
        if (enumDecl.getKind() === SyntaxKind.EnumDeclaration) {
            const enumNode = enumDecl.asKind(SyntaxKind.EnumDeclaration);
            if (!enumNode) return;

            const members = enumNode.getMembers();
            const values = members.map((member) => {
                const initializer = member.getInitializer();
                if (initializer) {
                    return initializer.getText().replace(/['"]/g, '');
                }
                return member.getName();
            });

            enumsMap.set(enumName, {
                name: this.toSnakeCase(enumName),
                values,
            });

            metadata.enumValues = values;
        }
    }

    /**
     * Infer database type from TypeScript type
     */
    private inferTypeFromTsType(tsType: string, metadata: ColumnMetadata): string {
        // Remove optional/null markers
        tsType = tsType.replace(/\s*\|\s*(null|undefined)/g, '').trim();

        // Handle arrays
        if (tsType.endsWith('[]')) {
            metadata.isArray = true;
            tsType = tsType.slice(0, -2);
        }

        // Map TypeScript types to database types
        switch (tsType) {
            case 'string':
                return 'varchar';
            case 'number':
                return 'integer';
            case 'boolean':
                return 'boolean';
            case 'Date':
                return 'timestamp';
            case 'Buffer':
                return 'bytea';
            default:
                // Check if it's an enum or object type
                if (tsType.includes('{')) {
                    return 'json';
                }
                return 'varchar';
        }
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
