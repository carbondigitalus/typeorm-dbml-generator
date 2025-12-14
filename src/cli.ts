// Core Modules
import { Command } from 'commander';
import { generateDBML } from '../../index';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program.name('typeorm-to-dbml').description('Generate DBML schema files from TypeORM entity files').version('1.0.0');

program
    .option('-i, --input <patterns...>', 'Input file patterns (glob)', ['./src/entities/**/*.entity.ts'])
    .option('-o, --output <path>', 'Output DBML file path', './schema.dbml')
    .option('-e, --exclude <patterns...>', 'Exclude file patterns (glob)')
    .option('--no-schemas', 'Exclude schema grouping')
    .option('--no-indexes', 'Exclude index definitions')
    .option('--no-notes', 'Exclude notes and comments')
    .option('--no-enums', 'Exclude enum definitions')
    .option('--project-name <name>', 'Project name for DBML header', 'Database Schema')
    .option('--table-grouping <type>', 'Table grouping strategy (schema|none)', 'schema')
    .option('-w, --watch', 'Watch mode - regenerate on file changes')
    .action(async (options) => {
        try {
            await runGeneration(options);

            if (options.watch) {
                console.log('\n👀 Watching for changes...');
                await watchMode(options);
            }
        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

/**
 * Run the DBML generation
 */
async function runGeneration(options: any) {
    console.log('🔍 Parsing TypeORM entities...');

    const config = {
        input: options.input,
        output: options.output,
        exclude: options.exclude,
        options: {
            includeSchemas: options.schemas,
            includeIndexes: options.indexes,
            includeNotes: options.notes,
            includeEnums: options.enums,
            projectName: options.projectName,
            tableGrouping: options.tableGrouping as 'schema' | 'none',
        },
    };

    const startTime = Date.now();
    const dbml = await generateDBML(config);
    const duration = Date.now() - startTime;

    // Display stats
    const lines = dbml.split('\n').length;
    const tables = (dbml.match(/^Table /gm) || []).length;
    const enums = (dbml.match(/^Enum /gm) || []).length;
    const refs = (dbml.match(/^Ref:/gm) || []).length;

    console.log('✅ DBML generated successfully!');
    console.log(`   📊 Tables: ${tables}`);
    console.log(`   🔗 Relationships: ${refs}`);
    console.log(`   📋 Enums: ${enums}`);
    console.log(`   📄 Lines: ${lines}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   💾 Output: ${options.output}`);
}

/**
 * Watch mode - regenerate on file changes
 */
async function watchMode(options: any) {
    // Dynamic import to avoid loading in non-watch mode
    const chokidar = await import('chokidar');

    const watcher = chokidar.watch(options.input, {
        ignored: options.exclude,
        persistent: true,
        ignoreInitial: true,
    });

    let timeout: NodeJS.Timeout | null = null;

    watcher.on('all', (event, filepath) => {
        console.log(`\n📝 File ${event}: ${filepath}`);

        // Debounce - wait 500ms after last change
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(async () => {
            try {
                await runGeneration(options);
                console.log('👀 Watching for changes...');
            } catch (error) {
                console.error('❌ Error:', error instanceof Error ? error.message : error);
            }
        }, 500);
    });

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('\n\n👋 Stopping watch mode...');
        watcher.close();
        process.exit(0);
    });
}

// Parse arguments
program.parse();
