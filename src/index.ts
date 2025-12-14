/**
 * typeorm-to-dbml - Main entry point
 * Programmatic API for converting TypeORM entities to DBML
 */

import { EntityParser } from './parser/EntityParser';
import { MetadataExtractor } from './parser/MetadataExtractor';
import { DBMLGenerator } from './generator/DBMLGenerator';
import { Config, DBMLSchema, GeneratorOptions } from './parser/types';

/**
 * Generate DBML from TypeORM entity files
 */
export async function generateDBML(config: Config): Promise<string> {
    // Parse entity files
    const parser = new EntityParser({
        tsConfigPath: config.options?.projectName ? undefined : './tsconfig.json',
    });

    const entities = await parser.parseEntities({
        input: config.input,
        exclude: config.exclude,
    });

    // Extract metadata
    const extractor = new MetadataExtractor();
    const schema = extractor.extractMetadata(entities);

    // Generate DBML
    const generator = new DBMLGenerator(config.options);
    const dbml = generator.generate(schema);

    // Write to file if output path specified
    if (config.output) {
        await generator.generateToFile(schema, config.output);
    }

    return dbml;
}

/**
 * Generate DBML schema metadata without converting to string
 */
export async function generateSchema(config: Config): Promise<DBMLSchema> {
    const parser = new EntityParser({
        tsConfigPath: config.options?.projectName ? undefined : './tsconfig.json',
    });

    const entities = await parser.parseEntities({
        input: config.input,
        exclude: config.exclude,
    });

    const extractor = new MetadataExtractor();
    return extractor.extractMetadata(entities);
}

/**
 * Convert schema metadata to DBML string
 */
export function schemaToDBML(schema: DBMLSchema, options?: GeneratorOptions): string {
    const generator = new DBMLGenerator(options);
    return generator.generate(schema);
}

// Export types
export * from './parser/types';

// Export classes for advanced usage
export { EntityParser } from './parser/EntityParser';
export { MetadataExtractor } from './parser/MetadataExtractor';
export { DBMLGenerator } from './generator/DBMLGenerator';
export { ColumnExtractor } from './extractor/ColumnExtractor';
export { RelationExtractor } from './extractor/RelationExtractor';
export { ConstraintExtractor } from './extractor/ConstraintExtractor';
export { TableGenerator } from './generator/TableGenerator';
export { RelationGenerator } from './generator/RelationGenerator';
export { TypeMapper } from './generator/TypeMapper';
