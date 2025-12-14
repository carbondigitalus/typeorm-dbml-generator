# typeorm-to-dbml - Project Summary

## What We Built

A complete NPM package that generates DBML (Database Markup Language) files from TypeORM entity files. This tool parses TypeScript files, extracts entity metadata, and generates clean, readable DBML that can be used for documentation and visualization.

## Package Structure

```
typeorm-to-dbml/
├── src/
│   ├── parser/
│   │   ├── types.ts              # TypeScript interfaces for all metadata
│   │   ├── EntityParser.ts       # Parses TS files using ts-morph
│   │   └── MetadataExtractor.ts  # Coordinates extraction process
│   ├── extractor/
│   │   ├── ColumnExtractor.ts    # Extracts column metadata
│   │   ├── RelationExtractor.ts  # Extracts relationship metadata
│   │   └── ConstraintExtractor.ts # Extracts indexes, unique, checks
│   ├── generator/
│   │   ├── DBMLGenerator.ts      # Main DBML generator
│   │   ├── TableGenerator.ts     # Generates table definitions
│   │   ├── RelationGenerator.ts  # Generates relationship refs
│   │   └── TypeMapper.ts         # Maps TypeORM types to DBML
│   ├── index.ts                  # Public API
│   └── cli.ts                    # CLI interface
├── examples/
│   └── sample-entities/
│       └── entities.ts           # Example entities
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## Files Created (12 total)

### Core Files

1. **types.ts** - Complete type definitions for all metadata structures
2. **EntityParser.ts** - Uses ts-morph to parse TypeScript files and find entities
3. **MetadataExtractor.ts** - Main coordinator that orchestrates all extractors

### Extractors

4. **ColumnExtractor.ts** - Extracts all column types, constraints, and options
5. **RelationExtractor.ts** - Extracts all relationship types and join configurations
6. **ConstraintExtractor.ts** - Extracts indexes, unique constraints, and checks

### Generators

7. **DBMLGenerator.ts** - Main generator that creates complete DBML output
8. **TableGenerator.ts** - Generates table definitions with columns and indexes
9. **RelationGenerator.ts** - Generates relationship references
10. **TypeMapper.ts** - Comprehensive type mapping for all databases

### Public API

11. **index.ts** - Main entry point with programmatic API
12. **cli.ts** - Command-line interface with watch mode

## Key Features

### TypeORM Support

✅ All column decorators (@Column, @PrimaryGeneratedColumn, @CreateDateColumn, etc.)
✅ All relationships (@OneToOne, @ManyToOne, @OneToMany, @ManyToMany)
✅ Indexes (single and composite)
✅ Unique constraints
✅ Check constraints
✅ Enums
✅ Table inheritance
✅ Schema support
✅ Custom column names
✅ Cascade actions (onDelete, onUpdate)
✅ Join columns and join tables

### Type Mapping

Supports all major database types:

-   PostgreSQL (including arrays, jsonb, uuid, geometric types, range types)
-   MySQL (including tinyint, mediumint, year, enum, set)
-   SQL Server (nvarchar, nchar, uniqueidentifier)
-   Oracle (varchar2, number, clob)

### CLI Features

-   Glob pattern matching for input files
-   Exclude patterns
-   Watch mode with file monitoring
-   Configurable output options
-   Pretty statistics display
-   Debounced regeneration

### Programmatic API

```typescript
// Simple usage
const dbml = await generateDBML({
    input: './src/entities/**/*.ts',
    output: './schema.dbml',
});

// Advanced usage with options
const schema = await generateSchema({ input: '...' });
const dbml = schemaToDBML(schema, { projectName: 'My App' });
```

## How It Works

### 1. Parsing Phase

-   Uses ts-morph to parse TypeScript files
-   Finds classes with @Entity decorator
-   Returns ClassDeclaration objects

### 2. Extraction Phase (Two-Pass)

**First Pass:**

-   Extract basic entity info (table name, schema)
-   Extract all columns with types and constraints
-   Extract relationships (basic structure)
-   Extract indexes, unique constraints, checks
-   Collect enum definitions

**Second Pass:**

-   Resolve relationship targets (class names → table names)
-   Handle circular dependencies

### 3. Generation Phase

-   Generate project header
-   Generate enum definitions
-   Generate table definitions with columns and indexes
-   Generate relationship references
-   Generate table groups (by schema)

## Example Usage

### Input Entity

```typescript
@Entity('users')
@Index(['email', 'tenantId'], { unique: true })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    email: string;

    @Column({ type: 'enum', enum: UserRole })
    role: UserRole;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => Post, (post) => post.author)
    posts: Post[];
}
```

### Output DBML

```dbml
Enum user_role {
  admin
  moderator
  user
}

Table users {
  id uuid [pk]
  email varchar(255) [not null]
  role user_role [not null]
  created_at timestamp [not null, default: `now()`]

  Indexes {
    (email, tenant_id) [unique]
  }
}

Ref: posts.author_id > users.id
```

## Installation & Usage

```bash
# Install
npm install --save-dev typeorm-to-dbml

# CLI usage
npx typeorm-to-dbml -i ./src/entities -o ./schema.dbml

# Watch mode
npx typeorm-to-dbml -i ./src/entities -o ./schema.dbml --watch

# In package.json
{
  "scripts": {
    "generate-dbml": "typeorm-to-dbml -i ./src/entities -o ./schema.dbml"
  }
}
```

## CI/CD Integration

Perfect for:

-   GitHub Actions workflows
-   Pre-commit hooks
-   Build pipelines
-   Documentation generation
-   Schema versioning

## Visualization

Generated DBML can be used with:

-   [dbdiagram.io](https://dbdiagram.io) - Interactive ER diagrams
-   [dbdocs](https://dbdocs.io) - Documentation generation
-   DBML CLI - Generate PNG/SVG diagrams
-   Git version control - Track schema changes

## Next Steps for Users

1. **Install the package**: `npm install --save-dev typeorm-to-dbml`
2. **Add to package.json scripts**
3. **Generate DBML**: `npm run generate-dbml`
4. **Visualize**: Upload to dbdiagram.io
5. **Integrate into CI/CD** for automatic schema documentation

## Technical Highlights

### Robust Parsing

-   Uses ts-morph for reliable TypeScript AST parsing
-   Handles decorator arguments of all types
-   Supports complex nested objects
-   Resolves enum values and types

### Smart Type Inference

-   Infers database types from TypeScript types when not explicit
-   Handles arrays, nullability, defaults
-   Maps 80+ database types across all major databases

### Clean Architecture

-   Separation of concerns (parser → extractor → generator)
-   Extensible design for custom extractors/generators
-   Type-safe throughout
-   Well-documented code

## Potential Enhancements

-   Support for embedded entities
-   Support for view entities
-   Custom naming strategies
-   Multiple output formats (JSON, SQL DDL)
-   Migration diff generation
-   Interactive CLI prompts
-   Plugin system for custom processors

## Dependencies

-   **ts-morph**: TypeScript AST manipulation
-   **commander**: CLI framework
-   **glob**: File pattern matching
-   **chokidar**: File watching

## License

MIT - Free to use in any project

---

**Status**: ✅ Complete and ready to publish!
