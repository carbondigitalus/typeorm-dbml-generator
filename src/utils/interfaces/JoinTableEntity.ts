// Custom Modules
import ColumnMetadata from './ColumnMetadata';
import IndexMetadata from './IndexMetadata';

export default interface JoinTableEntity {
    name: string;
    schema?: string;
    columns: ColumnMetadata[];
    indexes: IndexMetadata[];
}
