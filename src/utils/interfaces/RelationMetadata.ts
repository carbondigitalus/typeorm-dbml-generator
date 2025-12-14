// Custom Modules
import JoinColumnMetadata from './JoinColumnMetadata';
import JoinTableMetadata from './JoinTableMetadata';

export default interface RelationMetadata {
    propertyName: string;
    type: 'one-to-one' | 'many-to-one' | 'one-to-many' | 'many-to-many';
    target: string; // Entity class name
    inverseSide?: string;
    joinColumn?: JoinColumnMetadata;
    joinTable?: JoinTableMetadata;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
}
