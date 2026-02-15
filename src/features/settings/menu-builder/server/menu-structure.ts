/**
 * ============================================================================
 * SUB-MODULE: site-settings/menu-builder/menu-structure.ts
 * PURPOSE:    Pure utility functions for normalizing, building, filtering,
 *             and expanding menu structures.
 *
 *             Zero framework dependencies — works in any TypeScript runtime.
 *             All functions are deterministic given the same inputs.
 * ============================================================================
 */

import type {
  MenuItem,
  MenuItemType,
  MenuItemAppearance,
  MenuItemTemplate,
  MenuItemBadgeVariant,
  MenuItemBadge,
  MenuItemAutoChildren,
  MenuItemLayout,
  MenuItemLayoutBlock,
  MenuVisibility,
  Menu,
  MenuStructure,
  MenuSlot,
  MenuVersion,
  MenuRegistryItem,
  MenuVisibilityContext,
} from '../types';

// ─── String / Type Parsers ──────────────────────────────────────────────────

const parseString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const parseBoolean = (value: unknown): boolean =>
  typeof value === 'boolean' ? value : false;

const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

const parseNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback;

// ─── URL Normalization ──────────────────────────────────────────────────────

/**
 * Normalize a menu item URL.
 * - `/pages/home` → `/`
 * - `/pages/about` → `/about`
 * - Missing / empty → `#`
 */
export const normalizeMenuUrl = (url?: string): string => {
  if (!url) return '#';
  if (url.startsWith('/pages/')) {
    const slug = url.replace('/pages/', '');
    if (slug === '(home)' || slug === 'home') return '/';
    return `/${slug}`;
  }
  return url;
};

// ─── Auto Children ──────────────────────────────────────────────────────────

const parseAutoChildren = (value: unknown): MenuItemAutoChildren | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;
  const categories = obj.categories === true;
  const posts = obj.posts === true;
  const maxItems = typeof obj.maxItems === 'number' ? obj.maxItems : undefined;
  if (!categories && !posts) return undefined;
  return {
    categories: categories || undefined,
    posts: posts || undefined,
    maxItems,
  };
};

// ─── Visibility Normalization ───────────────────────────────────────────────

const normalizeVisibility = (value: unknown): MenuVisibility | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;

  const roles = parseStringArray(obj.roles);
  const locales = parseStringArray(obj.locales);
  const requireAuth = parseBoolean(obj.requireAuth);
  const guestOnly = parseBoolean(obj.guestOnly);
  const devices = Array.isArray(obj.devices)
    ? obj.devices.filter(
        (d) => d === 'desktop' || d === 'mobile' || d === 'tablet',
      )
    : [];
  const excludePaths = parseStringArray(obj.excludePaths);
  const includePaths = parseStringArray(obj.includePaths);

  const timeWindow =
    obj.timeWindow && typeof obj.timeWindow === 'object'
      ? {
          start:
            typeof (obj.timeWindow as Record<string, unknown>).start === 'string'
              ? (obj.timeWindow as Record<string, string>).start
              : undefined,
          end:
            typeof (obj.timeWindow as Record<string, unknown>).end === 'string'
              ? (obj.timeWindow as Record<string, string>).end
              : undefined,
          timezone:
            typeof (obj.timeWindow as Record<string, unknown>).timezone === 'string'
              ? (obj.timeWindow as Record<string, string>).timezone
              : undefined,
        }
      : undefined;

  if (
    roles.length === 0 &&
    locales.length === 0 &&
    !requireAuth &&
    !guestOnly &&
    devices.length === 0 &&
    !timeWindow &&
    excludePaths.length === 0 &&
    includePaths.length === 0
  ) {
    return undefined;
  }

  return {
    roles: roles.length > 0 ? roles : undefined,
    locales: locales.length > 0 ? locales : undefined,
    requireAuth: requireAuth || undefined,
    guestOnly: guestOnly || undefined,
    devices: devices.length > 0 ? devices : undefined,
    timeWindow,
    excludePaths: excludePaths.length > 0 ? excludePaths : undefined,
    includePaths: includePaths.length > 0 ? includePaths : undefined,
  };
};

// ─── Menu Item Normalization ────────────────────────────────────────────────

const VALID_TYPES: MenuItemType[] = [
  'page', 'post', 'category', 'tag', 'route', 'custom', 'separator', 'heading',
];
const VALID_APPEARANCES: MenuItemAppearance[] = [
  'link', 'primary', 'outline', 'ghost', 'danger', 'accent',
];
const VALID_TEMPLATES: MenuItemTemplate[] = [
  'link', 'cta', 'card', 'featured', 'icon-only', 'image-card',
];
const VALID_BADGE_VARIANTS: MenuItemBadgeVariant[] = [
  'primary', 'success', 'warning', 'info', 'danger', 'neutral',
];

const normalizeLayoutBlock = (value: unknown): MenuItemLayoutBlock | null => {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  return {
    title: typeof obj.title === 'string' ? obj.title : undefined,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    image: typeof obj.image === 'string' ? obj.image : undefined,
    ctaLabel: typeof obj.ctaLabel === 'string' ? obj.ctaLabel : undefined,
    ctaUrl: typeof obj.ctaUrl === 'string' ? obj.ctaUrl : undefined,
  };
};

const normalizeLayout = (value: unknown): MenuItemLayout | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;
  const type =
    obj.type === 'mega' ? 'mega' : obj.type === 'standard' ? 'standard' : undefined;
  const columns = typeof obj.columns === 'number' ? obj.columns : undefined;
  const blocks = Array.isArray(obj.contentBlocks)
    ? obj.contentBlocks
        .map(normalizeLayoutBlock)
        .filter((b): b is MenuItemLayoutBlock => !!b)
    : undefined;
  return {
    type,
    columns,
    contentBlocks: blocks,
    showDividers: parseBoolean(obj.showDividers) || undefined,
    fullWidth: parseBoolean(obj.fullWidth) || undefined,
  };
};

const normalizeBadge = (value: unknown): MenuItemBadge | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.text !== 'string' || !obj.text) return undefined;
  return {
    text: obj.text,
    variant: VALID_BADGE_VARIANTS.includes(obj.variant as MenuItemBadgeVariant)
      ? (obj.variant as MenuItemBadgeVariant)
      : undefined,
  };
};

/**
 * Normalize a raw menu item object into a validated `MenuItem`.
 * Returns an array because inline `children` are flattened into siblings.
 */
export const normalizeMenuItem = (
  value: unknown,
  index: number,
  parentId?: string,
): MenuItem[] => {
  if (!value || typeof value !== 'object') return [];
  const obj = value as Record<string, unknown>;

  const type: MenuItemType = VALID_TYPES.includes(obj.type as MenuItemType)
    ? (obj.type as MenuItemType)
    : 'custom';
  const label = parseString(obj.label, 'Menu Item');
  const url = normalizeMenuUrl(parseString(obj.url, '#'));
  const order = parseNumber(obj.order, index);
  const refId = parseString(
    obj.refId || obj.pageId || obj.postId || obj.tagId || obj.categoryId,
  );
  const appearance = VALID_APPEARANCES.includes(obj.appearance as MenuItemAppearance)
    ? (obj.appearance as MenuItemAppearance)
    : undefined;
  const template = VALID_TEMPLATES.includes(obj.template as MenuItemTemplate)
    ? (obj.template as MenuItemTemplate)
    : undefined;

  const id = parseString(obj.id, `item-${index}`);

  const normalized: MenuItem = {
    id,
    type,
    label,
    url,
    order,
    refId: refId || undefined,
    parentId: typeof obj.parentId === 'string' ? obj.parentId : parentId,
    visibility: normalizeVisibility(obj.visibility),
    appearance,
    template,
    badge: normalizeBadge(obj.badge),
    icon: typeof obj.icon === 'string' ? obj.icon : undefined,
    analyticsTag: typeof obj.analyticsTag === 'string' ? obj.analyticsTag : undefined,
    autoChildren: parseAutoChildren(obj.autoChildren),
    description: typeof obj.description === 'string' ? obj.description : undefined,
    image: typeof obj.image === 'string' ? obj.image : undefined,
    group: typeof obj.group === 'string' ? obj.group : undefined,
    column: typeof obj.column === 'number' ? obj.column : undefined,
    layout: normalizeLayout(obj.layout),
    target: obj.target === '_blank' ? '_blank' : undefined,
    rel: typeof obj.rel === 'string' ? obj.rel : undefined,
    ariaLabel: typeof obj.ariaLabel === 'string' ? obj.ariaLabel : undefined,
    tooltip: typeof obj.tooltip === 'string' ? obj.tooltip : undefined,
    customStyle:
      obj.customStyle && typeof obj.customStyle === 'object'
        ? (obj.customStyle as MenuItem['customStyle'])
        : undefined,
  };

  // Inline children → flatten as siblings with parentId set
  const children = Array.isArray(obj.children) ? obj.children : [];
  const normalizedChildren = children.flatMap((child, childIndex) =>
    normalizeMenuItem(child, childIndex, id),
  );

  return [normalized, ...normalizedChildren];
};

// ─── Slot Normalization ─────────────────────────────────────────────────────

type LegacyLocations = { primary?: boolean; footer?: boolean };

const normalizeSlots = (
  value: unknown,
  legacy: LegacyLocations,
  index: number,
): MenuSlot[] => {
  const validSlots: MenuSlot[] = [
    'header', 'footer', 'topbar', 'sidebar', 'mobile-drawer',
  ];
  const slots = Array.isArray(value)
    ? value.filter((s) => validSlots.includes(s as MenuSlot))
    : [];

  const next = new Set<MenuSlot>(slots as MenuSlot[]);
  if (legacy.primary) next.add('header');
  if (legacy.footer) next.add('footer');
  if (next.size === 0 && index === 0) next.add('header');
  return Array.from(next);
};

// ─── Full Structure Normalization ───────────────────────────────────────────

/**
 * Normalize a raw (possibly legacy) menu structure into a validated `MenuStructure`.
 * Handles missing/malformed data gracefully — always returns a valid object.
 */
export const normalizeMenuStructure = (value: unknown): MenuStructure => {
  const defaultMenu: Menu = {
    id: 'main',
    name: 'Main Menu',
    slots: ['header'],
    items: [],
    enabled: true,
  };

  if (!value || typeof value !== 'object') {
    return { menus: [defaultMenu] };
  }

  const obj = value as Record<string, unknown>;
  const rawMenus = Array.isArray(obj.menus) ? obj.menus : [];

  const menus = rawMenus.length
    ? rawMenus
        .map((menu, index) => {
          if (!menu || typeof menu !== 'object') return null;
          const menuObj = menu as Record<string, unknown>;
          const legacyLocations = (menuObj.locations || {}) as LegacyLocations;
          const items = Array.isArray(menuObj.items)
            ? menuObj.items.flatMap((item, itemIndex) =>
                normalizeMenuItem(item, itemIndex),
              )
            : [];
          return {
            id: parseString(menuObj.id, `menu-${index}`),
            name: parseString(menuObj.name, `Menu ${index + 1}`),
            slots: normalizeSlots(menuObj.slots, legacyLocations, index),
            items,
            enabled: menuObj.enabled !== false,
            description:
              typeof menuObj.description === 'string'
                ? menuObj.description
                : undefined,
            containerClass:
              typeof menuObj.containerClass === 'string'
                ? menuObj.containerClass
                : undefined,
          };
        })
        .filter((menu): menu is NonNullable<typeof menu> => !!menu) as Menu[]
    : [defaultMenu];

  const history = Array.isArray(obj.history)
    ? (obj.history as MenuVersion[])
    : undefined;

  return {
    version: typeof obj.version === 'number' ? obj.version : undefined,
    updatedAt: parseString(obj.updatedAt) || undefined,
    updatedBy: parseString(obj.updatedBy) || undefined,
    menus,
    history,
    maxHistory:
      typeof obj.maxHistory === 'number' ? obj.maxHistory : undefined,
  };
};

// ─── Slot Queries ───────────────────────────────────────────────────────────

/** Get all menus assigned to a specific slot. */
export const getMenusForSlot = (
  structure: MenuStructure,
  slot: MenuSlot,
): Menu[] =>
  structure.menus.filter(
    (menu) => menu.enabled !== false && menu.slots.includes(slot),
  );

/** Get all slots that have at least one menu assigned. */
export const getActiveSlots = (structure: MenuStructure): MenuSlot[] => {
  const slots = new Set<MenuSlot>();
  structure.menus.forEach((menu) => {
    if (menu.enabled !== false) {
      menu.slots.forEach((s) => slots.add(s));
    }
  });
  return Array.from(slots);
};

// ─── Sorting ────────────────────────────────────────────────────────────────

/** Sort items by their `order` field. Returns a new array. */
export const sortMenuItems = (items: MenuItem[]): MenuItem[] =>
  [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// ─── Tree Building ──────────────────────────────────────────────────────────

/**
 * Convert a flat list of items into a tree based on `parentId`.
 * Items without a parent (or with an unknown parent) become roots.
 */
export const buildMenuTree = (items: MenuItem[]): MenuItem[] => {
  const map = new Map<string, MenuItem & { children: MenuItem[] }>();
  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  const roots: MenuItem[] = [];
  map.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(item);
    } else {
      roots.push(item);
    }
  });

  const sortTree = (nodes: MenuItem[]) => {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortTree(node.children);
      }
    });
  };

  sortTree(roots);
  return roots;
};

/** Flatten a tree back into a flat list (depth-first). */
export const flattenMenuTree = (items: MenuItem[]): MenuItem[] => {
  const list: MenuItem[] = [];
  const walk = (nodes: MenuItem[]) => {
    nodes.forEach((node) => {
      list.push(node);
      if (node.children && node.children.length > 0) {
        walk(node.children);
      }
    });
  };
  walk(items);
  return list;
};

/** Compute nesting depth of an item in a flat list. */
export const getItemDepth = (
  items: MenuItem[],
  itemId: string,
  maxDepth = 5,
): number => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  let current = itemMap.get(itemId);
  let depth = 0;
  const seen = new Set<string>();

  while (current?.parentId) {
    if (seen.has(current.parentId) || depth >= maxDepth) break;
    seen.add(current.parentId);
    current = itemMap.get(current.parentId);
    depth += 1;
  }

  return depth;
};

// ─── Time Window Evaluation ─────────────────────────────────────────────────

const getMinutesFromTimeString = (value?: string): number | null => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
};

const getMinutesInTimeZone = (date: Date, timezone?: string): number => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
    const parts = formatter.formatToParts(date);
    const hour = Number(
      parts.find((p) => p.type === 'hour')?.value ?? '0',
    );
    const minute = Number(
      parts.find((p) => p.type === 'minute')?.value ?? '0',
    );
    return hour * 60 + minute;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
};

const isWithinTimeWindow = (
  date: Date,
  window?: MenuVisibility['timeWindow'],
): boolean => {
  if (!window) return true;
  const start = getMinutesFromTimeString(window.start);
  const end = getMinutesFromTimeString(window.end);
  if (start === null && end === null) return true;
  const nowMinutes = getMinutesInTimeZone(date, window.timezone);
  if (start !== null && end !== null) {
    return start <= end
      ? nowMinutes >= start && nowMinutes <= end
      : nowMinutes >= start || nowMinutes <= end;
  }
  if (start !== null) return nowMinutes >= start;
  if (end !== null) return nowMinutes <= end;
  return true;
};

// ─── Path Matching ──────────────────────────────────────────────────────────

const matchesPathPatterns = (
  pathname: string,
  patterns: string[],
): boolean => {
  return patterns.some((pattern) => {
    try {
      return new RegExp(pattern).test(pathname);
    } catch {
      return pathname === pattern;
    }
  });
};

// ─── Visibility Evaluation ──────────────────────────────────────────────────

/**
 * Evaluate whether a single menu item should be shown given the current context.
 */
export const shouldShowMenuItem = (
  item: MenuItem,
  context: MenuVisibilityContext,
): boolean => {
  const v = item.visibility;
  if (!v) return true;

  if (v.requireAuth && !context.isAuthenticated) return false;
  if (v.guestOnly && context.isAuthenticated) return false;

  if (v.roles && v.roles.length > 0) {
    if (!context.role || !v.roles.includes(context.role)) return false;
  }

  if (v.locales && v.locales.length > 0 && context.locale) {
    if (!v.locales.includes(context.locale)) return false;
  }

  if (v.devices && v.devices.length > 0 && context.device) {
    if (!v.devices.includes(context.device)) return false;
  }

  if (!isWithinTimeWindow(context.now ?? new Date(), v.timeWindow)) {
    return false;
  }

  if (context.pathname) {
    if (
      v.excludePaths &&
      v.excludePaths.length > 0 &&
      matchesPathPatterns(context.pathname, v.excludePaths)
    ) {
      return false;
    }
    if (
      v.includePaths &&
      v.includePaths.length > 0 &&
      !matchesPathPatterns(context.pathname, v.includePaths)
    ) {
      return false;
    }
  }

  return true;
};

/**
 * Filter a tree of menu items by visibility rules.
 * Returns only visible items, preserving tree structure.
 */
export const filterMenuTreeByVisibility = (
  items: MenuItem[],
  context: MenuVisibilityContext,
): MenuItem[] => {
  return items.flatMap((item) => {
    if (!shouldShowMenuItem(item, context)) return [];
    const children = item.children
      ? filterMenuTreeByVisibility(item.children, context)
      : [];
    return [{ ...item, children }];
  });
};

// ─── Content Registry Expansion ─────────────────────────────────────────────

const sortRegistryByLabel = (items: MenuRegistryItem[]) =>
  [...items].sort((a, b) => (a.label || '').localeCompare(b.label || ''));

const parseCategorySlugFromUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url, 'https://menu.local');
    return parsed.searchParams.get('category');
  } catch {
    return null;
  }
};

/**
 * Expand menu items that have `autoChildren` set with data from
 * the content registry (categories + posts).
 */
export const expandMenuTreeWithRegistry = (
  items: MenuItem[],
  registryItems: MenuRegistryItem[],
): MenuItem[] => {
  if (!registryItems.length) return items;

  const categories = registryItems.filter((i) => i.type === 'category');
  const posts = registryItems.filter((i) => i.type === 'post');

  const categoriesById = new Map<string, MenuRegistryItem>();
  const categoriesBySlug = new Map<string, MenuRegistryItem>();
  const categoriesByParent = new Map<string, MenuRegistryItem[]>();

  categories.forEach((cat) => {
    categoriesById.set(cat.id, cat);
    if (cat.slug) categoriesBySlug.set(cat.slug, cat);
    const parentKey = cat.parentId ?? '';
    const existing = categoriesByParent.get(parentKey) ?? [];
    existing.push(cat);
    categoriesByParent.set(parentKey, existing);
  });

  const postsByCategory = new Map<string, MenuRegistryItem[]>();
  posts.forEach((post) => {
    (post.categoryIds || []).forEach((catId) => {
      const existing = postsByCategory.get(catId) ?? [];
      existing.push(post);
      postsByCategory.set(catId, existing);
    });
  });

  const buildPostItems = (
    categoryId: string,
    parentId: string,
    visibility?: MenuVisibility,
    maxItems?: number,
  ): MenuItem[] => {
    let list = sortRegistryByLabel(postsByCategory.get(categoryId) ?? []);
    if (maxItems && maxItems > 0) list = list.slice(0, maxItems);
    return list.map((post, index) => ({
      id: `auto-post-${parentId}-${post.id}`,
      type: 'post' as const,
      label: post.label || 'Post',
      url: normalizeMenuUrl(post.url || '#'),
      order: index,
      refId: post.id,
      parentId,
      visibility,
    }));
  };

  const buildCategoryItems = (
    categoryId: string,
    parentId: string,
    visibility: MenuVisibility | undefined,
    includePosts: boolean,
    maxItems?: number,
  ): MenuItem[] => {
    let list = sortRegistryByLabel(
      categoriesByParent.get(categoryId) ?? [],
    );
    if (maxItems && maxItems > 0) list = list.slice(0, maxItems);
    return list.map((cat, index) => {
      const childId = `auto-cat-${parentId}-${cat.id}`;
      const children = buildCategoryItems(
        cat.id,
        childId,
        visibility,
        includePosts,
        maxItems,
      );
      const postItems = includePosts
        ? buildPostItems(cat.id, childId, visibility, maxItems)
        : [];
      return {
        id: childId,
        type: 'category' as const,
        label: cat.label || 'Category',
        url: normalizeMenuUrl(cat.url || '#'),
        order: index,
        refId: cat.id,
        parentId,
        visibility,
        children: [...children, ...postItems],
      };
    });
  };

  const resolveCategoryId = (item: MenuItem): string | undefined => {
    if (item.refId && categoriesById.has(item.refId)) return item.refId;
    const slug = parseCategorySlugFromUrl(item.url);
    if (slug && categoriesBySlug.has(slug)) {
      return categoriesBySlug.get(slug)!.id;
    }
    return undefined;
  };

  const expandItem = (item: MenuItem): MenuItem => {
    const children = item.children ? item.children.map(expandItem) : [];

    if (item.type !== 'category' || !item.autoChildren) {
      return { ...item, children };
    }

    const includeCategories = Boolean(item.autoChildren.categories);
    const includePosts = Boolean(item.autoChildren.posts);
    if (!includeCategories && !includePosts) {
      return { ...item, children };
    }

    const categoryId = resolveCategoryId(item);
    if (!categoryId) return { ...item, children };

    const existingUrls = new Set(children.map((c) => c.url));
    const nextChildren = [...children];
    let nextOrder = nextChildren.length;
    const maxItems = item.autoChildren.maxItems;

    if (includeCategories) {
      const autoCategories = buildCategoryItems(
        categoryId,
        item.id,
        item.visibility,
        includePosts,
        maxItems,
      );
      autoCategories.forEach((child) => {
        if (!existingUrls.has(child.url)) {
          child.order = nextOrder++;
          nextChildren.push(child);
        }
      });
    }

    if (includePosts) {
      const autoPosts = buildPostItems(
        categoryId,
        item.id,
        item.visibility,
        maxItems,
      );
      autoPosts.forEach((child) => {
        if (!existingUrls.has(child.url)) {
          child.order = nextOrder++;
          nextChildren.push(child);
        }
      });
    }

    return { ...item, children: nextChildren };
  };

  return items.map(expandItem);
};

// ─── Menu Helpers ───────────────────────────────────────────────────────────

/** Generate a unique menu item ID. */
export const generateMenuItemId = (prefix = 'item'): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Generate a unique menu ID. */
export const generateMenuId = (prefix = 'menu'): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Count total items across all menus. */
export const countTotalItems = (structure: MenuStructure): number =>
  structure.menus.reduce((sum, menu) => sum + menu.items.length, 0);

/** Find a specific menu item anywhere in the structure. */
export const findMenuItem = (
  structure: MenuStructure,
  itemId: string,
): { menu: Menu; item: MenuItem } | null => {
  for (const menu of structure.menus) {
    const item = menu.items.find((i) => i.id === itemId);
    if (item) return { menu, item };
  }
  return null;
};

/** Get all unique groups used in a menu's items. */
export const getMenuGroups = (menu: Menu): string[] => {
  const groups = new Set<string>();
  menu.items.forEach((item) => {
    if (item.group) groups.add(item.group);
  });
  return Array.from(groups).sort();
};

/** Reorder items sequentially (fills gaps in order numbers). */
export const reorderMenuItems = (items: MenuItem[]): MenuItem[] =>
  sortMenuItems(items).map((item, index) => ({ ...item, order: index }));

/** Move an item from one position to another within the same menu. */
export const moveMenuItem = (
  items: MenuItem[],
  fromIndex: number,
  toIndex: number,
): MenuItem[] => {
  if (fromIndex === toIndex) return items;
  const sorted = sortMenuItems(items);
  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved);
  return sorted.map((item, index) => ({ ...item, order: index }));
};

/** Remove an item and all its descendants from a menu. */
export const removeMenuItemCascade = (
  items: MenuItem[],
  itemId: string,
): MenuItem[] => {
  const toRemove = new Set<string>();
  const collect = (id: string) => {
    toRemove.add(id);
    items
      .filter((item) => item.parentId === id)
      .forEach((child) => collect(child.id));
  };
  collect(itemId);
  return items.filter((item) => !toRemove.has(item.id));
};

/** Validate that a menu structure has no circular parentId references. */
export const validateMenuTree = (
  items: MenuItem[],
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const itemMap = new Map(items.map((item) => [item.id, item]));

  items.forEach((item) => {
    if (!item.parentId) return;
    const seen = new Set<string>();
    let current = item;
    while (current.parentId) {
      if (seen.has(current.parentId)) {
        errors.push(`Circular reference: item "${item.id}" has a cycle via "${current.parentId}"`);
        break;
      }
      seen.add(current.parentId);
      const parent = itemMap.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
  });

  return { valid: errors.length === 0, errors };
};

/** Duplicate a menu with new IDs. */
export const duplicateMenu = (
  menu: Menu,
  newName?: string,
): Menu => {
  const idMap = new Map<string, string>();
  let counter = 0;
  menu.items.forEach((item) => {
    counter++;
    idMap.set(item.id, generateMenuItemId(`dup-${counter}`));
  });

  const newItems = menu.items.map((item) => ({
    ...item,
    id: idMap.get(item.id)!,
    parentId: item.parentId ? idMap.get(item.parentId) : undefined,
  }));

  return {
    ...menu,
    id: generateMenuId('menu-dup'),
    name: newName || `${menu.name} (Copy)`,
    items: newItems,
  };
};
