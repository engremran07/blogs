/**
 * ============================================================================
 * SUB-MODULE: site-settings/menu-builder/menu-builder.service.ts
 * PURPOSE:    Backend service for menu structure CRUD, preset loading,
 *             version history, rollback, validation, and cache management.
 *
 *             Follows the same pattern as the parent SiteSettingsService:
 *               - Constructor DI with typed Prisma delegate
 *               - In-memory cache with on-demand invalidation
 *               - ApiResponse<T> envelope for all public operations
 *               - Pure functions in menu-structure.ts for logic
 * ============================================================================
 */

import type {
  Menu,
  MenuItem,
  MenuSlot,
  MenuStructure,
  MenuVersion,
  MenuRegistryItem,
  MenuVisibilityContext,
  MenuBuilderPrismaClient,
} from '../types';
import type { ApiResponse } from '../types';
import { DEFAULT_MENU_STRUCTURE, MAX_MENU_ITEMS, MAX_MENUS, MAX_MENU_DEPTH, MAX_MENU_HISTORY } from './constants';
import {
  normalizeMenuStructure,
  buildMenuTree,
  filterMenuTreeByVisibility,
  expandMenuTreeWithRegistry,
  getMenusForSlot,
  countTotalItems,
  findMenuItem,
  generateMenuId,
  generateMenuItemId,
  normalizeMenuItem,
  validateMenuTree,
  duplicateMenu,
  removeMenuItemCascade,
  reorderMenuItems,
  moveMenuItem,
} from './menu-structure';
import { clonePresetMenus, getPresetById } from './menu-presets';

// ─── Service ────────────────────────────────────────────────────────────────

export class MenuBuilderService {
  private cached: MenuStructure | null = null;

  constructor(private readonly prisma: MenuBuilderPrismaClient) {}

  // ─── Read ─────────────────────────────────────────────────────────────

  /** Load the full menu structure (cached). */
  async getMenuStructure(): Promise<MenuStructure> {
    if (this.cached) return this.cached;
    const row = await this.prisma.siteSettings.findFirst();
    const raw = row?.menuStructure ?? DEFAULT_MENU_STRUCTURE;
    const structure = normalizeMenuStructure(raw as MenuStructure);
    this.cached = structure;
    return structure;
  }

  /** Get all menus for a slot with tree built and visibility filtered. */
  async getMenusForSlot(
    slot: MenuSlot,
    ctx: MenuVisibilityContext,
    registry?: MenuRegistryItem[],
  ): Promise<Menu[]> {
    const structure = await this.getMenuStructure();
    const slotMenus = getMenusForSlot(structure, slot);

    return slotMenus
      .filter((m) => m.enabled !== false)
      .map((menu) => {
        let tree = buildMenuTree(menu.items);
        tree = filterMenuTreeByVisibility(tree, ctx);
        if (registry) {
          tree = expandMenuTreeWithRegistry(tree, registry);
        }
        return { ...menu, items: tree };
      });
  }

  /** Get a single menu by ID. */
  async getMenuById(menuId: string): Promise<ApiResponse<Menu>> {
    try {
      const structure = await this.getMenuStructure();
      const menu = structure.menus.find((m) => m.id === menuId);
      if (!menu) {
        return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);
      }
      return this.ok(menu);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Get version history entries (without full menu payloads). */
  async getHistory(): Promise<ApiResponse<MenuVersion[]>> {
    try {
      const structure = await this.getMenuStructure();
      return this.ok(structure.history ?? []);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Menu CRUD ────────────────────────────────────────────────────────

  /** Create a new empty menu. */
  async createMenu(
    data: { name: string; slots: MenuSlot[]; description?: string; containerClass?: string },
    updatedBy?: string,
  ): Promise<ApiResponse<Menu>> {
    try {
      const structure = await this.getMenuStructure();
      if (structure.menus.length >= MAX_MENUS) {
        return this.error('MAX_MENUS_REACHED', `Maximum of ${MAX_MENUS} menus allowed`, 400);
      }
      const menu: Menu = {
        id: generateMenuId(data.name),
        name: data.name,
        slots: data.slots,
        items: [],
        description: data.description,
        containerClass: data.containerClass,
        enabled: true,
      };
      structure.menus.push(menu);
      await this.save(structure, updatedBy, `Created menu "${data.name}"`);
      return this.ok(menu);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Update menu metadata (name, slots, enabled, etc.). */
  async updateMenu(
    menuId: string,
    updates: Partial<Pick<Menu, 'name' | 'slots' | 'description' | 'containerClass' | 'enabled'>>,
    updatedBy?: string,
  ): Promise<ApiResponse<Menu>> {
    try {
      const structure = await this.getMenuStructure();
      const idx = structure.menus.findIndex((m) => m.id === menuId);
      if (idx === -1) return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);

      const menu = { ...structure.menus[idx], ...updates };
      structure.menus[idx] = menu;
      await this.save(structure, updatedBy, `Updated menu "${menu.name}"`);
      return this.ok(menu);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Delete a menu by ID. */
  async deleteMenu(menuId: string, updatedBy?: string): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const structure = await this.getMenuStructure();
      const idx = structure.menus.findIndex((m) => m.id === menuId);
      if (idx === -1) return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);

      const name = structure.menus[idx].name;
      structure.menus.splice(idx, 1);
      await this.save(structure, updatedBy, `Deleted menu "${name}"`);
      return this.ok({ deleted: true });
    } catch (e) {
      return this.err(e);
    }
  }

  /** Duplicate an existing menu. */
  async duplicateMenu(
    menuId: string,
    newName?: string,
    updatedBy?: string,
  ): Promise<ApiResponse<Menu>> {
    try {
      const structure = await this.getMenuStructure();
      const source = structure.menus.find((m) => m.id === menuId);
      if (!source) return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);
      if (structure.menus.length >= MAX_MENUS) {
        return this.error('MAX_MENUS_REACHED', `Maximum of ${MAX_MENUS} menus allowed`, 400);
      }
      const dup = duplicateMenu(source, newName);
      structure.menus.push(dup);
      await this.save(structure, updatedBy, `Duplicated menu "${source.name}" → "${dup.name}"`);
      return this.ok(dup);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Item CRUD ────────────────────────────────────────────────────────

  /** Add an item to a menu. */
  async addMenuItem(
    menuId: string,
    item: Omit<MenuItem, 'id' | 'order'> & { id?: string; order?: number },
    updatedBy?: string,
  ): Promise<ApiResponse<MenuItem>> {
    try {
      const structure = await this.getMenuStructure();
      const menu = structure.menus.find((m) => m.id === menuId);
      if (!menu) return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);

      const total = countTotalItems(structure);
      if (total >= MAX_MENU_ITEMS) {
        return this.error('MAX_ITEMS_REACHED', `Maximum of ${MAX_MENU_ITEMS} menu items allowed`, 400);
      }

      // Check depth
      if (item.parentId) {
        const parent = findMenuItem(structure, item.parentId);
        if (!parent) return this.error('PARENT_NOT_FOUND', `Parent "${item.parentId}" not found`, 404);
        const tree = buildMenuTree(menu.items);
        const depth = this.getDepthOf(tree, item.parentId);
        if (depth >= MAX_MENU_DEPTH) {
          return this.error('MAX_DEPTH_REACHED', `Maximum nesting depth of ${MAX_MENU_DEPTH} exceeded`, 400);
        }
      }

      const normalized = normalizeMenuItem({
        ...item,
        id: item.id ?? generateMenuItemId(item.label),
        order: item.order ?? menu.items.length,
      }, menu.items.length);
      const newItem = normalized[0];
      if (!newItem) return this.error('NORMALIZE_FAILED', 'Failed to normalize menu item', 500);

      menu.items.push(...normalized);
      await this.save(structure, updatedBy, `Added "${newItem.label}" to "${menu.name}"`);
      return this.ok(newItem);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Update an existing menu item. */
  async updateMenuItem(
    menuId: string,
    itemId: string,
    updates: Partial<Omit<MenuItem, 'id'>>,
    updatedBy?: string,
  ): Promise<ApiResponse<MenuItem>> {
    try {
      const structure = await this.getMenuStructure();
      const menu = structure.menus.find((m) => m.id === menuId);
      if (!menu) return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);

      const idx = menu.items.findIndex((i) => i.id === itemId);
      if (idx === -1) return this.error('ITEM_NOT_FOUND', `Item "${itemId}" not found`, 404);

      const normalizedArr = normalizeMenuItem({ ...menu.items[idx], ...updates, id: itemId }, idx);
      const updated = normalizedArr[0];
      if (!updated) return this.error('NORMALIZE_FAILED', 'Failed to normalize menu item', 500);
      menu.items[idx] = updated;
      await this.save(structure, updatedBy, `Updated "${updated.label}" in "${menu.name}"`);
      return this.ok(updated);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Remove an item and its descendants. */
  async removeMenuItem(
    menuId: string,
    itemId: string,
    updatedBy?: string,
  ): Promise<ApiResponse<{ removed: number }>> {
    try {
      const structure = await this.getMenuStructure();
      const menu = structure.menus.find((m) => m.id === menuId);
      if (!menu) return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);

      const before = menu.items.length;
      menu.items = removeMenuItemCascade(menu.items, itemId);
      const removed = before - menu.items.length;
      if (removed === 0) return this.error('ITEM_NOT_FOUND', `Item "${itemId}" not found`, 404);

      await this.save(structure, updatedBy, `Removed ${removed} item(s) from "${menu.name}"`);
      return this.ok({ removed });
    } catch (e) {
      return this.err(e);
    }
  }

  /** Reorder items within a menu by providing an ordered list of IDs. */
  async reorderItems(
    menuId: string,
    orderedIds: string[],
    parentId?: string,
    updatedBy?: string,
  ): Promise<ApiResponse<Menu>> {
    try {
      const structure = await this.getMenuStructure();
      const menu = structure.menus.find((m) => m.id === menuId);
      if (!menu) return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);

      // Reorder: apply the provided order, then normalize
      const targetItems = parentId
        ? menu.items.filter((i) => i.parentId === parentId)
        : menu.items.filter((i) => !i.parentId);
      const otherItems = menu.items.filter(
        (i) => !targetItems.some((t) => t.id === i.id),
      );
      const reordered = orderedIds
        .map((id) => targetItems.find((i) => i.id === id))
        .filter((i): i is MenuItem => !!i)
        .map((item, idx) => ({ ...item, order: idx }));
      menu.items = [...otherItems, ...reordered];
      await this.save(structure, updatedBy, `Reordered items in "${menu.name}"`);
      return this.ok(menu);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Move an item to a different parent. */
  async moveItem(
    menuId: string,
    itemId: string,
    newParentId: string | undefined,
    newOrder: number,
    updatedBy?: string,
  ): Promise<ApiResponse<Menu>> {
    try {
      const structure = await this.getMenuStructure();
      const menu = structure.menus.find((m) => m.id === menuId);
      if (!menu) return this.error('MENU_NOT_FOUND', `Menu "${menuId}" not found`, 404);

      // Update the item's parentId and order
      const itemIdx = menu.items.findIndex((i) => i.id === itemId);
      if (itemIdx === -1) return this.error('ITEM_NOT_FOUND', `Item "${itemId}" not found`, 404);
      menu.items[itemIdx] = { ...menu.items[itemIdx], parentId: newParentId, order: newOrder };
      // Re-normalize order for siblings
      const siblings = menu.items.filter(
        (i) => i.parentId === newParentId && i.id !== itemId,
      );
      siblings.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      siblings.splice(newOrder, 0, menu.items[itemIdx]);
      siblings.forEach((s, idx) => { s.order = idx; });
      await this.save(structure, updatedBy, `Moved item "${itemId}" in "${menu.name}"`);
      return this.ok(menu);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Presets ──────────────────────────────────────────────────────────

  /** Replace all menus with a preset. */
  async loadPreset(
    presetId: string,
    updatedBy?: string,
  ): Promise<ApiResponse<MenuStructure>> {
    try {
      const preset = getPresetById(presetId);
      if (!preset) return this.error('PRESET_NOT_FOUND', `Preset "${presetId}" not found`, 404);

      const structure = await this.getMenuStructure();
      structure.menus = clonePresetMenus(preset);
      await this.save(structure, updatedBy, `Loaded preset "${preset.name}"`);
      return this.ok(structure);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Merge preset menus into existing structure (additive). */
  async mergePreset(
    presetId: string,
    updatedBy?: string,
  ): Promise<ApiResponse<MenuStructure>> {
    try {
      const preset = getPresetById(presetId);
      if (!preset) return this.error('PRESET_NOT_FOUND', `Preset "${presetId}" not found`, 404);

      const structure = await this.getMenuStructure();
      const cloned = clonePresetMenus(preset);
      const total = structure.menus.length + cloned.length;
      if (total > MAX_MENUS) {
        return this.error('MAX_MENUS_REACHED', `Merging would exceed max of ${MAX_MENUS} menus`, 400);
      }
      structure.menus.push(...cloned);
      await this.save(structure, updatedBy, `Merged preset "${preset.name}"`);
      return this.ok(structure);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Version History / Rollback ───────────────────────────────────────

  /** Roll back to a specific version. */
  async rollback(
    versionId: string,
    updatedBy?: string,
  ): Promise<ApiResponse<MenuStructure>> {
    try {
      const structure = await this.getMenuStructure();
      const version = (structure.history ?? []).find((v) => v.id === versionId);
      if (!version) return this.error('VERSION_NOT_FOUND', `Version "${versionId}" not found`, 404);

      structure.menus = JSON.parse(JSON.stringify(version.menus));
      await this.save(structure, updatedBy, `Rolled back to version ${version.version}`);
      return this.ok(structure);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Validation ───────────────────────────────────────────────────────

  /** Validate the current menu structure and return any issues. */
  async validate(): Promise<ApiResponse<{ valid: boolean; errors: string[] }>> {
    try {
      const structure = await this.getMenuStructure();
      const errors: string[] = [];

      for (const menu of structure.menus) {
        const result = validateMenuTree(menu.items);
        errors.push(...result.errors.map((e) => `[${menu.name}] ${e}`));
      }

      return this.ok({ valid: errors.length === 0, errors });
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Bulk Operations ──────────────────────────────────────────────────

  /** Replace the entire menu structure (import). */
  async importStructure(
    structure: MenuStructure,
    updatedBy?: string,
  ): Promise<ApiResponse<MenuStructure>> {
    try {
      const normalized = normalizeMenuStructure(structure);
      await this.save(normalized, updatedBy, 'Imported full menu structure');
      return this.ok(normalized);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Export menu structure (clean copy without history). */
  async exportStructure(): Promise<ApiResponse<MenuStructure>> {
    try {
      const structure = await this.getMenuStructure();
      const clean: MenuStructure = {
        version: structure.version,
        menus: JSON.parse(JSON.stringify(structure.menus)),
      };
      return this.ok(clean);
    } catch (e) {
      return this.err(e);
    }
  }

  /** Reset to defaults. */
  async resetToDefaults(updatedBy?: string): Promise<ApiResponse<MenuStructure>> {
    try {
      const structure: MenuStructure = JSON.parse(JSON.stringify(DEFAULT_MENU_STRUCTURE));
      await this.save(structure, updatedBy, 'Reset menus to defaults');
      return this.ok(structure);
    } catch (e) {
      return this.err(e);
    }
  }

  // ─── Cache ────────────────────────────────────────────────────────────

  /** Force cache invalidation. */
  invalidateCache(): void {
    this.cached = null;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  /** Persist, snapshot history, bump version, clear cache. */
  private async save(
    structure: MenuStructure,
    updatedBy?: string,
    note?: string,
  ): Promise<void> {
    // Snapshot current state into history
    const history = structure.history ?? [];
    const nextVersion = (structure.version ?? 0) + 1;

    history.push({
      id: `v${nextVersion}-${Date.now()}`,
      version: nextVersion,
      createdAt: new Date().toISOString(),
      createdBy: updatedBy,
      note,
      menus: JSON.parse(JSON.stringify(structure.menus)),
    });

    // Trim to max
    const max = structure.maxHistory ?? MAX_MENU_HISTORY;
    while (history.length > max) history.shift();

    structure.version = nextVersion;
    structure.updatedAt = new Date().toISOString();
    structure.updatedBy = updatedBy;
    structure.history = history;

    const row = await this.prisma.siteSettings.findFirst();
    if (!row) throw new Error('SiteSettings row not found — run seed first');

    await this.prisma.siteSettings.update({
      where: { id: row.id },
      data: { menuStructure: JSON.parse(JSON.stringify(structure)) },
    });

    this.cached = structure;
  }

  /** Calculate the depth of a given parent inside a tree. */
  private getDepthOf(tree: MenuItem[], parentId: string, depth = 0): number {
    for (const item of tree) {
      if (item.id === parentId) return depth + 1;
      if (item.children?.length) {
        const found = this.getDepthOf(item.children, parentId, depth + 1);
        if (found > 0) return found;
      }
    }
    return 0;
  }

  /** Standard success response. */
  private ok<T>(data: T): ApiResponse<T> {
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  /** Standard error response. */
  private error<T>(code: string, message: string, statusCode: number): ApiResponse<T> {
    return {
      success: false,
      error: { code, message, statusCode },
      timestamp: new Date().toISOString(),
    };
  }

  /** Catch-all error handler. */
  private err<T>(e: unknown): ApiResponse<T> {
    return this.error(
      'MENU_SERVICE_ERROR',
      e instanceof Error ? e.message : 'Unknown error in menu builder service',
      500,
    );
  }
}
