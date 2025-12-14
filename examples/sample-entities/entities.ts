/**
 * Example TypeORM entities for testing typeorm-to-dbml
 */

enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    MODERATOR = 'moderator',
}

enum PostStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

// User entity
class User {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    posts: Post[];
    profile: UserProfile;
}

// Post entity
class Post {
    id: number;
    title: string;
    content: string;
    status: PostStatus;
    publishedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    author: User;
    tags: Tag[];
}

// UserProfile entity (one-to-one)
class UserProfile {
    id: number;
    bio: string;
    avatarUrl: string;
    userId: string;
    user: User;
}

// Tag entity (many-to-many)
class Tag {
    id: number;
    name: string;
    posts: Post[];
}
