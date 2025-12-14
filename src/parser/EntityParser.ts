/**
 * EntityParser - Parses TypeScript files to find TypeORM entities
 */

import { Project, SourceFile, ClassDeclaration, SyntaxKind } from 'ts-morph';
import { glob } from 'glob';
import * as path from 'path';
import { ParserOptions } from './types';

export class EntityParser {
    private project: Project;

    constructor(options?: { tsConfigPath?: string }) {
        this.project = new Project({
            tsConfigFilePath: options?.tsConfigPath,
            skipAddingFilesFromTsConfig: true,
        });
    }

    /**
     * Find and parse all entity files based on glob patterns
     */
    async parseEntities(options: ParserOptions): Promise<ClassDeclaration[]> {
        const inputPatterns = Array.isArray(options.input) ? options.input : [options.input];
        const excludePatterns = options.exclude
            ? Array.isArray(options.exclude)
                ? options.exclude
                : [options.exclude]
            : [];

        // Find all matching files
        const filePaths = await this.findEntityFiles(inputPatterns, excludePatterns);

        // Add files to project
        const sourceFiles = filePaths.map((filePath) => this.project.addSourceFileAtPath(filePath));

        // Extract entity classes from all source files
        const entities: ClassDeclaration[] = [];

        for (const sourceFile of sourceFiles) {
            const fileEntities = this.extractEntitiesFromFile(sourceFile);
            entities.push(...fileEntities);
        }

        return entities;
    }

    /**
     * Find all TypeScript files matching input patterns
     */
    private async findEntityFiles(inputPatterns: string[], excludePatterns: string[]): Promise<string[]> {
        const allFiles: Set<string> = new Set();

        for (const pattern of inputPatterns) {
            const files = await glob(pattern, {
                ignore: excludePatterns,
                absolute: true,
            });
            files.forEach((file) => allFiles.add(file));
        }

        return Array.from(allFiles);
    }

    /**
     * Extract entity classes from a source file
     * An entity is a class decorated with @Entity
     */
    private extractEntitiesFromFile(sourceFile: SourceFile): ClassDeclaration[] {
        const entities: ClassDeclaration[] = [];

        // Get all classes in the file
        const classes = sourceFile.getClasses();

        for (const classDecl of classes) {
            if (this.isEntityClass(classDecl)) {
                entities.push(classDecl);
            }
        }

        return entities;
    }

    /**
     * Check if a class is a TypeORM entity
     */
    private isEntityClass(classDecl: ClassDeclaration): boolean {
        const decorators = classDecl.getDecorators();

        return decorators.some((decorator) => {
            const name = decorator.getName();
            return name === 'Entity';
        });
    }

    /**
     * Get the ts-morph Project instance for advanced usage
     */
    getProject(): Project {
        return this.project;
    }

    /**
     * Parse a single file and return its entities
     */
    parseFile(filePath: string): ClassDeclaration[] {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        return this.extractEntitiesFromFile(sourceFile);
    }
}
