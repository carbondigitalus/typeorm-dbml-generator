export default interface GeneratorOptions {
    includeSchemas?: boolean;
    includeIndexes?: boolean;
    includeNotes?: boolean;
    includeEnums?: boolean;
    tableGrouping?: 'schema' | 'none';
    projectName?: string;
}
