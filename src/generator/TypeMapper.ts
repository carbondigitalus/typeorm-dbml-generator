/**
 * TypeMapper - Maps TypeORM column types to DBML types
 */

import { ColumnMetadata } from '../parser/types';

export class TypeMapper {
    /**
     * Map TypeORM column type to DBML type
     */
    mapType(column: ColumnMetadata): string {
        // If it's an enum, use the enum name
        if (column.enumName) {
            return column.enumName;
        }

        // Get base type
        let dbmlType = this.getBaseType(column.type);

        // Add array notation for PostgreSQL arrays
        if (column.isArray) {
            dbmlType += '[]';
        }

        // Add length/precision for applicable types
        if (column.length && this.supportsLength(column.type)) {
            dbmlType += `(${column.length})`;
        } else if (column.precision !== undefined) {
            if (column.scale !== undefined) {
                dbmlType += `(${column.precision},${column.scale})`;
            } else {
                dbmlType += `(${column.precision})`;
            }
        }

        return dbmlType;
    }

    /**
     * Get base DBML type from TypeORM type
     */
    private getBaseType(typeormType: string): string {
        // Normalize type to lowercase
        const type = typeormType.toLowerCase();

        // Direct mappings
        const typeMap: Record<string, string> = {
            // String types
            'varchar': 'varchar',
            'character varying': 'varchar',
            'char': 'char',
            'character': 'char',
            'text': 'text',
            'string': 'varchar',

            // Numeric types
            'int': 'integer',
            'integer': 'integer',
            'int2': 'smallint',
            'int4': 'integer',
            'int8': 'bigint',
            'smallint': 'smallint',
            'bigint': 'bigint',
            'decimal': 'decimal',
            'numeric': 'numeric',
            'real': 'real',
            'float': 'float',
            'float4': 'real',
            'float8': 'double precision',
            'double': 'double precision',
            'double precision': 'double precision',
            'money': 'money',
            'number': 'numeric',

            // Boolean
            'boolean': 'boolean',
            'bool': 'boolean',

            // Date/Time types
            'date': 'date',
            'time': 'time',
            'time without time zone': 'time',
            'time with time zone': 'timetz',
            'timestamp': 'timestamp',
            'timestamp without time zone': 'timestamp',
            'timestamp with time zone': 'timestamptz',
            'timestamptz': 'timestamptz',
            'datetime': 'timestamp',
            'interval': 'interval',

            // UUID
            'uuid': 'uuid',

            // Binary types
            'bytea': 'bytea',
            'blob': 'bytea',
            'binary': 'bytea',
            'varbinary': 'bytea',

            // JSON types
            'json': 'json',
            'jsonb': 'jsonb',

            // XML
            'xml': 'xml',

            // Network types (PostgreSQL)
            'inet': 'inet',
            'cidr': 'cidr',
            'macaddr': 'macaddr',

            // Geometric types (PostgreSQL)
            'point': 'point',
            'line': 'line',
            'lseg': 'lseg',
            'box': 'box',
            'path': 'path',
            'polygon': 'polygon',
            'circle': 'circle',

            // Range types (PostgreSQL)
            'int4range': 'int4range',
            'int8range': 'int8range',
            'numrange': 'numrange',
            'tsrange': 'tsrange',
            'tstzrange': 'tstzrange',
            'daterange': 'daterange',

            // Other PostgreSQL types
            'tsvector': 'tsvector',
            'tsquery': 'tsquery',
            'bit': 'bit',
            'varbit': 'varbit',
            'bit varying': 'varbit',

            // MySQL specific
            'tinyint': 'tinyint',
            'mediumint': 'mediumint',
            'year': 'year',
            'tinytext': 'tinytext',
            'mediumtext': 'mediumtext',
            'longtext': 'longtext',
            'enum': 'enum',
            'set': 'set',

            // SQL Server specific
            'nvarchar': 'nvarchar',
            'nchar': 'nchar',
            'ntext': 'ntext',
            'uniqueidentifier': 'uuid',

            // Oracle specific
            'number': 'number',
            'varchar2': 'varchar2',
            'nvarchar2': 'nvarchar2',
            'clob': 'clob',
            'nclob': 'nclob',
            'raw': 'raw',
            'long': 'long',
        };

        return typeMap[type] || type;
    }

    /**
     * Check if a type supports length specification
     */
    private supportsLength(type: string): boolean {
        const lengthTypes = [
            'varchar',
            'character varying',
            'char',
            'character',
            'nvarchar',
            'nchar',
            'varchar2',
            'nvarchar2',
            'bit',
            'varbit',
            'binary',
            'varbinary',
        ];

        return lengthTypes.includes(type.toLowerCase());
    }

    /**
     * Check if a type supports precision/scale
     */
    private supportsPrecision(type: string): boolean {
        const precisionTypes = [
            'decimal',
            'numeric',
            'number',
            'float',
            'real',
            'double',
            'double precision',
            'time',
            'timestamp',
        ];

        return precisionTypes.includes(type.toLowerCase());
    }

    /**
     * Get default DBML type for a TypeScript type
     */
    getDefaultTypeForTsType(tsType: string): string {
        const typeMap: Record<string, string> = {
            string: 'varchar',
            number: 'integer',
            boolean: 'boolean',
            Date: 'timestamp',
            Buffer: 'bytea',
        };

        return typeMap[tsType] || 'varchar';
    }
}
