/**
 * ============================================================================
 * SUB-MODULE: site-settings/menu-builder/index.ts
 * PURPOSE:    Barrel exports for the entire Menu Builder sub-module.
 * ============================================================================
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  MenuSlot,
  MenuItemType,
  MenuItemAppearance,
  MenuItemTemplate,
  MenuItemBadgeVariant,
  MenuLinkTarget,
  MenuItemBadge,
  MenuItemAutoChildren,
  MenuItemLayoutBlock,
  MenuItemLayout,
  MenuVisibility,
  MenuItemCustomStyle,
  MenuItem,
  Menu,
  MenuVersion,
  MenuStructure,
  MenuRegistryItem,
  MenuVisibilityContext,
  MenuPreset,
  MenuPresetCategory,
  AdminRegistryItem,
  MenuHistoryEntry,
  MenuBuilderPrismaClient,
} from './types';

export {
  MENU_SLOTS,
  MENU_ITEM_TYPES,
  MENU_ITEM_APPEARANCES,
  MENU_ITEM_TEMPLATES,
  MENU_ITEM_BADGE_VARIANTS,
  MENU_LINK_TARGETS,
  MENU_PRESET_CATEGORIES,
} from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

export {
  DEFAULT_MENU_STRUCTURE,
  MENU_SLOT_OPTIONS,
  ITEM_TYPE_OPTIONS,
  ITEM_APPEARANCE_OPTIONS,
  ITEM_TEMPLATE_OPTIONS,
  BADGE_VARIANT_OPTIONS,
  MENU_ICON_OPTIONS,
  MENU_ROLE_OPTIONS,
  MENU_DEVICE_OPTIONS,
  MAX_MENU_ITEMS,
  MAX_MENU_DEPTH,
  MAX_MENUS,
  MAX_MENU_HISTORY,
  MAX_CONTENT_BLOCKS,
  MAX_MEGA_COLUMNS,
} from './server/constants';

// ─── Utility Functions ──────────────────────────────────────────────────────

export {
  normalizeMenuUrl,
  normalizeMenuItem,
  normalizeMenuStructure,
  getMenusForSlot,
  getActiveSlots,
  sortMenuItems,
  buildMenuTree,
  flattenMenuTree,
  getItemDepth,
  shouldShowMenuItem,
  filterMenuTreeByVisibility,
  expandMenuTreeWithRegistry,
  generateMenuItemId,
  generateMenuId,
  countTotalItems,
  findMenuItem,
  getMenuGroups,
  reorderMenuItems,
  moveMenuItem,
  removeMenuItemCascade,
  validateMenuTree,
  duplicateMenu,
} from './server/menu-structure';

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  menuItemSchema,
  menuSchema,
  menuStructureSchema,
  addMenuItemSchema,
  removeMenuItemSchema,
  createMenuSchema,
  reorderMenuItemsSchema,
  loadPresetSchema,
  rollbackMenuSchema,
} from './server/schemas';

export type {
  MenuItemInput,
  MenuInput,
  MenuStructureInput,
  AddMenuItemInput,
  RemoveMenuItemInput,
  CreateMenuInput,
  ReorderMenuItemsInput,
  LoadPresetInput,
  RollbackMenuInput,
} from './server/schemas';

// ─── Presets ────────────────────────────────────────────────────────────────

export {
  MENU_PRESETS,
  getPresetById,
  getPresetsByCategory,
  searchPresets,
  clonePresetMenus,
} from './server/menu-presets';

// ─── Service ────────────────────────────────────────────────────────────────

export { MenuBuilderService } from './server/menu-builder.service';
