/**
 * ============================================================================
 * SUB-MODULE: site-settings/menu-builder/schemas.ts
 * PURPOSE:    Zod validation schemas for menu CRUD operations.
 * ============================================================================
 */

import { z } from 'zod';
import {
  MENU_SLOTS,
  MENU_ITEM_TYPES,
  MENU_ITEM_APPEARANCES,
  MENU_ITEM_TEMPLATES,
  MENU_ITEM_BADGE_VARIANTS,
  MENU_LINK_TARGETS,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const optStr = z.string().optional();
const optBool = z.boolean().optional();
const nullableStr = (max: number) => z.string().max(max).nullable().optional();

// ─── Sub-schemas ────────────────────────────────────────────────────────────

const menuItemBadgeSchema = z.object({
  text: z.string().max(30),
  variant: z.enum(MENU_ITEM_BADGE_VARIANTS).optional(),
}).optional();

const menuItemAutoChildrenSchema = z.object({
  categories: optBool,
  posts: optBool,
  maxItems: z.number().int().min(1).max(100).optional(),
}).optional();

const menuItemLayoutBlockSchema = z.object({
  title: nullableStr(200),
  description: nullableStr(500),
  image: nullableStr(500),
  ctaLabel: nullableStr(100),
  ctaUrl: nullableStr(500),
});

const menuItemLayoutSchema = z.object({
  type: z.enum(['standard', 'mega']).optional(),
  columns: z.number().int().min(1).max(6).optional(),
  contentBlocks: z.array(menuItemLayoutBlockSchema).max(6).optional(),
  showDividers: optBool,
  fullWidth: optBool,
}).optional();

const menuVisibilitySchema = z.object({
  roles: z.array(z.string().max(50)).max(20).optional(),
  locales: z.array(z.string().max(10)).max(50).optional(),
  requireAuth: optBool,
  guestOnly: optBool,
  devices: z.array(z.enum(['desktop', 'mobile', 'tablet'])).optional(),
  timeWindow: z.object({
    start: z.string().max(5).optional(),
    end: z.string().max(5).optional(),
    timezone: z.string().max(50).optional(),
  }).optional(),
  excludePaths: z.array(z.string().max(200)).max(20).optional(),
  includePaths: z.array(z.string().max(200)).max(20).optional(),
}).optional();

const menuItemCustomStyleSchema = z.object({
  className: z.string().max(200).optional(),
  color: z.string().max(30).optional(),
  backgroundColor: z.string().max(30).optional(),
  fontWeight: z.string().max(20).optional(),
  fontSize: z.string().max(20).optional(),
  borderRadius: z.string().max(20).optional(),
}).optional();

// ─── Menu Item Schema ───────────────────────────────────────────────────────

export const menuItemSchema = z.object({
  id: z.string().max(100),
  type: z.enum(MENU_ITEM_TYPES),
  label: z.string().max(200),
  url: z.string().max(2000),
  order: z.number().int().min(0).max(999),

  refId: z.string().max(100).optional(),
  parentId: z.string().max(100).optional(),

  appearance: z.enum(MENU_ITEM_APPEARANCES).optional(),
  template: z.enum(MENU_ITEM_TEMPLATES).optional(),
  icon: z.string().max(50).optional(),
  badge: menuItemBadgeSchema,
  customStyle: menuItemCustomStyleSchema,

  target: z.enum(MENU_LINK_TARGETS).optional(),
  rel: z.string().max(100).optional(),
  ariaLabel: z.string().max(200).optional(),
  analyticsTag: z.string().max(100).optional(),
  tooltip: z.string().max(200).optional(),

  description: nullableStr(500),
  image: nullableStr(500),
  group: z.string().max(100).optional(),
  column: z.number().int().min(1).max(6).optional(),

  layout: menuItemLayoutSchema,
  autoChildren: menuItemAutoChildrenSchema,
  visibility: menuVisibilitySchema,
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;

// ─── Menu Schema ────────────────────────────────────────────────────────────

export const menuSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  slots: z.array(z.enum(MENU_SLOTS)).min(1).max(5),
  items: z.array(menuItemSchema).max(200),
  description: z.string().max(500).optional(),
  enabled: optBool,
  containerClass: z.string().max(200).optional(),
});

export type MenuInput = z.infer<typeof menuSchema>;

// ─── Full Menu Structure Schema ─────────────────────────────────────────────

export const menuStructureSchema = z.object({
  version: z.number().int().optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().max(100).optional(),
  menus: z.array(menuSchema).max(20),
  maxHistory: z.number().int().min(1).max(50).optional(),
  versionNote: z.string().max(500).optional(),
});

export type MenuStructureInput = z.infer<typeof menuStructureSchema>;

// ─── Convenience Schemas ────────────────────────────────────────────────────

/** Schema for adding a single menu item to an existing menu. */
export const addMenuItemSchema = z.object({
  menuId: z.string().max(100),
  item: menuItemSchema,
});
export type AddMenuItemInput = z.infer<typeof addMenuItemSchema>;

/** Schema for removing a menu item. */
export const removeMenuItemSchema = z.object({
  menuId: z.string().max(100),
  itemId: z.string().max(100),
  cascade: z.boolean().optional(),
});
export type RemoveMenuItemInput = z.infer<typeof removeMenuItemSchema>;

/** Schema for creating a new menu. */
export const createMenuSchema = z.object({
  name: z.string().max(200),
  slots: z.array(z.enum(MENU_SLOTS)).min(1).max(5),
  description: z.string().max(500).optional(),
  enabled: optBool,
});
export type CreateMenuInput = z.infer<typeof createMenuSchema>;

/** Schema for reordering items within a menu. */
export const reorderMenuItemsSchema = z.object({
  menuId: z.string().max(100),
  itemOrder: z.array(
    z.object({
      id: z.string().max(100),
      order: z.number().int().min(0),
      parentId: z.string().max(100).optional(),
    }),
  ).max(200),
});
export type ReorderMenuItemsInput = z.infer<typeof reorderMenuItemsSchema>;

/** Schema for loading a preset. */
export const loadPresetSchema = z.object({
  presetId: z.string().max(100),
  replaceExisting: z.boolean().optional(),
  targetSlot: z.enum(MENU_SLOTS).optional(),
});
export type LoadPresetInput = z.infer<typeof loadPresetSchema>;

/** Schema for menu version rollback. */
export const rollbackMenuSchema = z.object({
  versionId: z.string().max(100),
  note: z.string().max(500).optional(),
});
export type RollbackMenuInput = z.infer<typeof rollbackMenuSchema>;
