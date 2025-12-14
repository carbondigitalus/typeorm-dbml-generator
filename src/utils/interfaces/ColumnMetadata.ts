export default interface ColumnMetadata {
    propertyName: string;
    columnName: string;
    type: string;
    isPrimary: boolean;
    isGenerated: boolean;
    generationStrategy?: 'increment' | 'uuid' | 'rowid';
    isNullable: boolean;
    isUnique: boolean;
    length?: number;
    precision?: number;
    scale?: number;
    default?: string;
    enumName?: string;
    enumValues?: string[];
    isArray?: boolean;
    isCreateDate?: boolean;
    isUpdateDate?: boolean;
    isDeleteDate?: boolean;
    isVersion?: boolean;
    comment?: string;
}
