export default interface IndexMetadata {
    name?: string;
    columns: string[];
    isUnique: boolean;
    isSpatial?: boolean;
    isFulltext?: boolean;
    where?: string;
    type?: 'btree' | 'hash' | 'gist' | 'gin';
}
