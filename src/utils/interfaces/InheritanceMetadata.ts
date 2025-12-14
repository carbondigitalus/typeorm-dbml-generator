export default interface InheritanceMetadata {
    pattern: 'STI' | 'CTI' | 'TPC'; // Single Table, Class Table, Table Per Concrete
    discriminatorColumn?: string;
    discriminatorValue?: string;
}
