# typeorm-to-dbml

Generate DBML (Database Markup Language) schema files from your TypeORM entities. Perfect for documentation, visualization with [dbdiagram.io](https://dbdiagram.io), and keeping your database schema in sync with your code.

## Features

✨ **Comprehensive TypeORM Support**

-   All column decorators (`@Column`, `@PrimaryGeneratedColumn`, `@CreateDateColumn`, etc.)
-   All relationship types (`@OneToOne`, `@ManyToOne`, `@OneToMany`, `@ManyToMany`)
-   Indexes, unique constraints, and check constraints
-   Enums and custom types
-   Table inheritance
-   Schema support

🚀 **Easy Integration**

-   CLI tool for manual generation or CI/CD
-   Programmatic API for custom workflows
-   Watch mode for development
-   TypeScript support

📊 **Rich Output**

-   Clean, readable DBML
-   Proper type mapping for all databases
-   Relationship visualization
-   Comments and documentation

## Installation

```bash
npm install --save-dev typeorm-to-dbml
# or
yarn add -D typeorm-to-dbml
```

## Quick Start

### CLI Usage

```bash
# Basic usage
npx typeorm-to-dbml --input "./src/entities/**/*.entity.ts" --output schema.dbml

# With options
npx typeorm-to-dbml \
  -i "./src/entities/**/*.ts" \
  -o ./docs/database.dbml \
  --project-name "My App" \
  --watch
```

### Add to package.json

```json
{
    "scripts": {
        "generate-dbml": "typeorm-to-dbml -i ./src/entities -o ./schema.dbml",
        "dbml:watch": "typeorm-to-dbml -i ./src/entities -o ./schema.dbml --watch"
    }
}
```

### Programmatic API

```typescript
import { generateDBML } from 'typeorm-to-dbml';

const dbml = await generateDBML({
    input: './src/entities/**/*.entity.ts',
    output: './schema.dbml',
    options: {
        includeSchemas: true,
        includeIndexes: true,
        includeNotes: true,
        projectName: 'My Application',
    },
});

console.log(dbml);
```

## CLI Options

| Option                    | Alias | Default                         | Description                        |
| ------------------------- | ----- | ------------------------------- | ---------------------------------- |
| `--input <patterns...>`   | `-i`  | `./src/entities/**/*.entity.ts` | Input file patterns (glob)         |
| `--output <path>`         | `-o`  | `./schema.dbml`                 | Output DBML file path              |
| `--exclude <patterns...>` | `-e`  | -                               | Exclude file patterns              |
| `--no-schemas`            | -     | enabled                         | Exclude schema grouping            |
| `--no-indexes`            | -     | enabled                         | Exclude index definitions          |
| `--no-notes`              | -     | enabled                         | Exclude notes and comments         |
| `--no-enums`              | -     | enabled                         | Exclude enum definitions           |
| `--project-name <n>`      | -     | `Database Schema`               | Project name for DBML header       |
| `--table-grouping <type>` | -     | `schema`                        | Table grouping (schema\|none)      |
| `--watch`                 | `-w`  | disabled                        | Watch mode - regenerate on changes |

## Examples

### Example Entity

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

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Post, (post) => post.author)
    posts: Post[];

    @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}
```

### Generated DBML

```dbml
Project "Database Schema" {
  database_type: 'PostgreSQL'
  Note: 'Generated from TypeORM entities'
}

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
  updated_at timestamp [not null, default: `now()`]
  tenant_id uuid [not null]

  Indexes {
    (email, tenant_id) [unique]
  }
}

Ref: users.tenant_id > tenants.id [delete: cascade]
Ref: posts.author_id > users.id
```

## Supported TypeORM Features

### Column Decorators

-   `@PrimaryColumn()`
-   `@PrimaryGeneratedColumn()` (increment, uuid, rowid)
-   `@Column()` (all types)
-   `@CreateDateColumn()`
-   `@UpdateDateColumn()`
-   `@DeleteDateColumn()`
-   `@VersionColumn()`

### Relationships

-   `@OneToOne()` with `@JoinColumn()`
-   `@ManyToOne()` with `@JoinColumn()`
-   `@OneToMany()`
-   `@ManyToMany()` with `@JoinTable()`

### Constraints

-   `@Index()` (single and composite)
-   `@Unique()`
-   `@Check()`

### Column Options

-   Type mapping (varchar, int, boolean, json, etc.)
-   Length and precision
-   Nullable, unique, default values
-   Enums
-   Arrays (PostgreSQL)
-   Comments

### Advanced Features

-   Table inheritance
-   Schema names
-   Custom table names
-   Custom column names
-   Cascade actions (onDelete, onUpdate)

## Type Mapping

TypeORM types are automatically mapped to appropriate DBML types:

| TypeORM Type            | DBML Type         |
| ----------------------- | ----------------- |
| `varchar`, `string`     | `varchar`         |
| `int`, `integer`        | `integer`         |
| `bigint`                | `bigint`          |
| `decimal`, `numeric`    | `decimal`         |
| `boolean`               | `boolean`         |
| `timestamp`, `datetime` | `timestamp`       |
| `date`                  | `date`            |
| `uuid`                  | `uuid`            |
| `json`                  | `json`            |
| `jsonb`                 | `jsonb`           |
| `enum`                  | Custom enum type  |
| And many more...        | See TypeMapper.ts |

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate Database Schema

on:
    push:
        paths:
            - 'src/entities/**'

jobs:
    generate-dbml:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: '18'
            - run: npm ci
            - run: npm run generate-dbml
            - uses: actions/upload-artifact@v3
              with:
                  name: schema
                  path: schema.dbml
```

### Pre-commit Hook

```json
{
    "husky": {
        "hooks": {
            "pre-commit": "npm run generate-dbml && git add schema.dbml"
        }
    }
}
```

## Advanced Usage

### Custom Schema Generation

```typescript
import { generateSchema, schemaToDBML } from 'typeorm-to-dbml';

// Generate schema metadata
const schema = await generateSchema({
    input: './src/entities/**/*.ts',
});

// Manipulate schema
schema.entities = schema.entities.filter((e) => !e.tableName.startsWith('temp_'));

// Convert to DBML
const dbml = schemaToDBML(schema, {
    includeIndexes: true,
    projectName: 'Production Database',
});
```

### Using Individual Components

```typescript
import { EntityParser, MetadataExtractor, DBMLGenerator } from 'typeorm-to-dbml';

const parser = new EntityParser();
const entities = await parser.parseEntities({
    input: './src/entities/**/*.ts',
});

const extractor = new MetadataExtractor();
const schema = extractor.extractMetadata(entities);

const generator = new DBMLGenerator({ projectName: 'My App' });
const dbml = generator.generate(schema);
```

## Visualization

Once you have your DBML file, you can:

1. **Upload to dbdiagram.io**: Paste your DBML into [dbdiagram.io](https://dbdiagram.io) for interactive visualization
2. **Use dbdocs**: Generate documentation with [dbdocs](https://dbdocs.io)
3. **Version control**: Track schema changes in git
4. **Generate diagrams**: Use DBML CLI tools to generate PNG/SVG diagrams

## Troubleshooting

### "Cannot find module" errors

Make sure your `tsconfig.json` is properly configured and all dependencies are installed.

### Entity not detected

Ensure your entity classes are decorated with `@Entity()`.

### Wrong types generated

Check your TypeORM column type definitions. You can explicitly set types with `@Column({ type: 'varchar' })`.

### Relationships missing

Make sure both sides of the relationship are properly decorated. For `@ManyToMany`, ensure `@JoinTable()` is on one side.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Credits

Built with:

-   [ts-morph](https://github.com/dsherret/ts-morph) - TypeScript AST manipulation
-   [commander](https://github.com/tj/commander.js) - CLI framework
-   [glob](https://github.com/isaacs/node-glob) - File pattern matching
-   [chokidar](https://github.com/paulmillr/chokidar) - File watching

Inspired by the need for better database documentation tools in the TypeScript ecosystem.
