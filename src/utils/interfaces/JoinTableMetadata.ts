// Custom Modules
import JoinColumnMetadata from './JoinColumnMetadata';

export default interface JoinTableMetadata {
    name?: string;
    joinColumns?: JoinColumnMetadata[];
    inverseJoinColumns?: JoinColumnMetadata[];
}
