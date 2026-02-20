// src/shared/prisma-delegate.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generic Prisma model delegate interfaces for DI boundaries.
// Replaces per-module `any`-typed delegates with a single reusable generic.
//
// T = the model entity type (defaults to Record<string, unknown>).
// Args use Record<string, unknown> for maximum flexibility without `any`.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base Prisma model delegate — covers the 9 standard CRUD + count methods.
 *
 * @typeParam T - Entity shape returned by queries (default Record<string, unknown>).
 */
export interface PrismaDelegate<T = Record<string, unknown>> {
  findUnique(args: Record<string, unknown>): Promise<T | null>;
  findFirst(args?: Record<string, unknown>): Promise<T | null>;
  findMany(args?: Record<string, unknown>): Promise<T[]>;
  create(args: Record<string, unknown>): Promise<T>;
  update(args: Record<string, unknown>): Promise<T>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  delete(args: Record<string, unknown>): Promise<T>;
  deleteMany(args: Record<string, unknown>): Promise<{ count: number }>;
  count(args?: Record<string, unknown>): Promise<number>;
}

/**
 * Extends {@link PrismaDelegate} with `aggregate` support.
 */
export interface PrismaDelegateWithAggregate<
  T = Record<string, unknown>,
> extends PrismaDelegate<T> {
  aggregate(args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/**
 * Extends {@link PrismaDelegate} with `groupBy` support.
 */
export interface PrismaDelegateWithGroupBy<
  T = Record<string, unknown>,
> extends PrismaDelegate<T> {
  groupBy(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}

/**
 * Extends {@link PrismaDelegate} with both `aggregate` and `groupBy`.
 */
export interface PrismaDelegateFull<
  T = Record<string, unknown>,
> extends PrismaDelegate<T> {
  aggregate(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  groupBy(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}
