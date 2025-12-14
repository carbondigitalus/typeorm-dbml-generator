// Custom Modules
import EntityMetadata from './EntityMetadata';
import EnumMetadata from './EnumMetadata';
import JoinTableEntity from './JoinTableEntity';

export default interface DBMLSchema {
    entities: EntityMetadata[];
    enums: EnumMetadata[];
    joinTables: JoinTableEntity[];
}
