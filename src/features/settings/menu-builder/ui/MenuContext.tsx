/**
 * ============================================================================
 * FRONTEND: site-settings/menu-builder/frontend/MenuContext.tsx
 * PURPOSE:  Centralised menu state for Next.js client components.
 *           Fetches menus once, builds trees, applies visibility, and
 *           exposes slot-specific getters via `useMenu()`.
 * ============================================================================
 */

'use client';

import React, { createContext, useContext, useMemo, useCallback, type ReactNode } from 'react';
import type {
  Menu,
  MenuSlot,
  MenuVisibilityContext,
  MenuRegistryItem,
} from '../types';
import {
  buildMenuTree,
  filterMenuTreeByVisibility,
  expandMenuTreeWithRegistry,
  getMenusForSlot,
} from '../server/menu-structure';
import type { MenuStructure } from '../types';

// ─── Context Shape ──────────────────────────────────────────────────────────

export interface MenuContextValue {
  /** Full menu structure (normalised). */
  structure: MenuStructure;
  /** Resolved icon map (icon key → component/string). */
  iconMap: Record<string, ReactNode>;
  /** Registry items for auto-children expansion. */
  registry: MenuRegistryItem[];
  /** Current visibility context (auth, role, device, locale, etc.). */
  visibilityCtx: MenuVisibilityContext;
  /** Get all menus for a given slot, with tree built, visibility filtered. */
  getSlotMenus: (slot: MenuSlot) => Menu[];
}

const MenuCtx = createContext<MenuContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export interface MenuProviderProps {
  /** Menu structure (typically fetched from API / SSR). */
  structure: MenuStructure;
  /** Map of icon keys to React nodes for rendering. */
  iconMap?: Record<string, ReactNode>;
  /** Content registry for auto-children expansion. */
  registry?: MenuRegistryItem[];
  /** Runtime visibility context. */
  visibilityCtx: MenuVisibilityContext;
  children: ReactNode;
}

export function MenuProvider({
  structure,
  iconMap = {},
  registry = [],
  visibilityCtx,
  children,
}: MenuProviderProps) {
  const getSlotMenus = useCallback(
    (slot: MenuSlot): Menu[] => {
      const menus = getMenusForSlot(structure, slot).filter((m) => m.enabled !== false);
      return menus.map((menu) => {
        let tree = buildMenuTree(menu.items);
        tree = filterMenuTreeByVisibility(tree, visibilityCtx);
        if (registry.length > 0) {
          tree = expandMenuTreeWithRegistry(tree, registry);
        }
        return { ...menu, items: tree };
      });
    },
    [structure, visibilityCtx, registry],
  );

  const value = useMemo<MenuContextValue>(
    () => ({ structure, iconMap, registry, visibilityCtx, getSlotMenus }),
    [structure, iconMap, registry, visibilityCtx, getSlotMenus],
  );

  return <MenuCtx.Provider value={value}>{children}</MenuCtx.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/** Access the menu context — must be used within `<MenuProvider>`. */
export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuCtx);
  if (!ctx) throw new Error('useMenu() must be used within <MenuProvider>');
  return ctx;
}

/** Convenience: get all resolved menus for a specific slot. */
export function useSlotMenus(slot: MenuSlot): Menu[] {
  const { getSlotMenus } = useMenu();
  return useMemo(() => getSlotMenus(slot), [getSlotMenus, slot]);
}

/** Convenience: get the first (primary) menu for a slot. */
export function usePrimaryMenu(slot: MenuSlot): Menu | null {
  const menus = useSlotMenus(slot);
  return menus[0] ?? null;
}

/** Resolve an icon key to a React node from the icon map. */
export function useMenuIcon(key?: string): ReactNode | null {
  const { iconMap } = useMenu();
  if (!key) return null;
  return iconMap[key] ?? null;
}
