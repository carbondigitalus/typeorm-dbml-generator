// Custom Modules
import CheckMetadata from './CheckMetadata';
import ColumnMetadata from './ColumnMetadata';
import IndexMetadata from './IndexMetadata';
import InheritanceMetadata from './InheritanceMetadata';
import RelationMetadata from './RelationMetadata';
import UniqueMetadata from './UniqueMetadata';

export default interface EntityMetadata {
    name: string;
    tableName: string;
    schema?: string;
    columns: ColumnMetadata[];
    relations: RelationMetadata[];
    indexes: IndexMetadata[];
    checks: CheckMetadata[];
    uniques: UniqueMetadata[];
    note?: string;
    inheritance?: InheritanceMetadata;
}
