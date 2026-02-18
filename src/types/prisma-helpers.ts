/**
 * Shared types for Prisma query results used across pages.
 * Needed because Prisma 7 + driver adapter sometimes loses type inference
 * through complex queries (Promise.all, dynamic where clauses, etc.)
 */

export interface PostListItem {
  id: string;
  postNumber: number;
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  publishedAt: Date | null;
  readingTime: number;
  viewCount: number;
  status: string;
  createdAt: Date;
  isFeatured: boolean;
  author: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
  tags: TagItem[];
  categories?: CategoryItem[];
}

export interface TagItem {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export interface TagDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  parentId: string | null;
  path: string | null;
  label: string | null;
  level: number;
  usageCount: number;
  featured: boolean;
  trending: boolean;
  locked: boolean;
  protected: boolean;
  synonyms: string[];
  synonymHits: number;
  linkedTagIds: string[];
  mergeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentItem {
  id: string;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  status: string;
  createdAt: Date;
  post: { id: string; title: string; slug: string } | null;
  user: { id: string; username: string; displayName: string | null } | null;
}

export interface AdminPostItem {
  id: string;
  postNumber: number;
  title: string;
  slug: string;
  status: string;
  createdAt: Date;
  viewCount: number;
}

export interface AdminCommentItem {
  id: string;
  content: string;
  authorName: string | null;
  status: string;
  createdAt: Date;
  post: { title: string; slug: string } | null;
}
