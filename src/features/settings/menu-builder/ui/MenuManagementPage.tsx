/**
 * ============================================================================
 * FRONTEND: site-settings/menu-builder/frontend/MenuManagementPage.tsx
 * PURPOSE:  Full admin page for managing menu structure:
 *             - Create / edit / delete menus
 *             - Add / edit / remove / reorder items (drag-and-drop ready)
 *             - Load presets, rollback to previous versions
 *             - Visual edit panels for mega menu, visibility, badges, etc.
 *
 *           This is a presentation-ready component; wire up the actual
 *           API fetch/mutate calls via the `api` prop.
 * ============================================================================
 */

'use client';

import React, { useState, useCallback, useEffect, type FormEvent } from 'react';
import type {
  Menu,
  MenuItem,
  MenuSlot,
  MenuStructure,
  MenuVersion,
  MenuPreset,
  MenuItemType,
  MenuItemAppearance,
  MenuItemTemplate,
  MenuItemBadgeVariant,
  MenuLinkTarget,
} from '../types';
import {
  MENU_SLOTS,
  MENU_ITEM_TYPES,
  MENU_ITEM_APPEARANCES,
  MENU_ITEM_TEMPLATES,
  MENU_ITEM_BADGE_VARIANTS,
  MENU_LINK_TARGETS,
} from '../types';
import { MENU_PRESETS } from '../server/menu-presets';
import { buildMenuTree } from '../server/menu-structure';
import {
  DEFAULT_MENU_STRUCTURE,
  MENU_ICON_OPTIONS,
  MENU_ROLE_OPTIONS,
  MENU_DEVICE_OPTIONS,
  MAX_MENU_DEPTH,
} from '../server/constants';

// ─── API Interface ──────────────────────────────────────────────────────────

export interface MenuManagementApi {
  getStructure: () => Promise<MenuStructure>;
  createMenu: (data: { name: string; slots: MenuSlot[]; description?: string }) => Promise<Menu>;
  updateMenu: (id: string, data: Partial<Menu>) => Promise<Menu>;
  deleteMenu: (id: string) => Promise<void>;
  addItem: (menuId: string, item: Partial<MenuItem>) => Promise<MenuItem>;
  updateItem: (menuId: string, itemId: string, data: Partial<MenuItem>) => Promise<MenuItem>;
  removeItem: (menuId: string, itemId: string) => Promise<void>;
  reorderItems: (menuId: string, ids: string[], parentId?: string) => Promise<void>;
  loadPreset: (presetId: string) => Promise<MenuStructure>;
  rollback: (versionId: string) => Promise<MenuStructure>;
  resetToDefaults: () => Promise<MenuStructure>;
}

// ─── Main Page Component ────────────────────────────────────────────────────

export interface MenuManagementPageProps {
  api: MenuManagementApi;
  className?: string;
}

type Panel = 'menus' | 'presets' | 'history';

export function MenuManagementPage({ api, className }: MenuManagementPageProps) {
  const [structure, setStructure] = useState<MenuStructure>(DEFAULT_MENU_STRUCTURE);
  const [activePanel, setActivePanel] = useState<Panel>('menus');
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.getStructure();
      setStructure(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const selectedMenu = structure.menus.find((m) => m.id === selectedMenuId) ?? null;
  const selectedItem = selectedMenu?.items.find((i) => i.id === selectedItemId) ?? null;

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleCreateMenu = async (data: { name: string; slots: MenuSlot[]; description?: string }) => {
    try {
      const menu = await api.createMenu(data);
      setStructure((s) => ({ ...s, menus: [...s.menus, menu] }));
      setSelectedMenuId(menu.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create menu');
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm('Delete this menu and all its items?')) return;
    try {
      await api.deleteMenu(id);
      setStructure((s) => ({ ...s, menus: s.menus.filter((m) => m.id !== id) }));
      if (selectedMenuId === id) { setSelectedMenuId(null); setSelectedItemId(null); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete menu');
    }
  };

  const handleUpdateMenu = async (id: string, data: Partial<Menu>) => {
    try {
      const updated = await api.updateMenu(id, data);
      setStructure((s) => ({
        ...s,
        menus: s.menus.map((m) => (m.id === id ? updated : m)),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update menu');
    }
  };

  const handleAddItem = async (menuId: string, item: Partial<MenuItem>) => {
    try {
      const newItem = await api.addItem(menuId, item);
      setStructure((s) => ({
        ...s,
        menus: s.menus.map((m) =>
          m.id === menuId ? { ...m, items: [...m.items, newItem] } : m,
        ),
      }));
      setSelectedItemId(newItem.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item');
    }
  };

  const handleUpdateItem = async (menuId: string, itemId: string, data: Partial<MenuItem>) => {
    try {
      const updated = await api.updateItem(menuId, itemId, data);
      setStructure((s) => ({
        ...s,
        menus: s.menus.map((m) =>
          m.id === menuId
            ? { ...m, items: m.items.map((i) => (i.id === itemId ? updated : i)) }
            : m,
        ),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update item');
    }
  };

  const handleRemoveItem = async (menuId: string, itemId: string) => {
    try {
      await api.removeItem(menuId, itemId);
      setStructure((s) => ({
        ...s,
        menus: s.menus.map((m) =>
          m.id === menuId
            ? { ...m, items: m.items.filter((i) => i.id !== itemId && i.parentId !== itemId) }
            : m,
        ),
      }));
      if (selectedItemId === itemId) setSelectedItemId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove item');
    }
  };

  const handleLoadPreset = async (presetId: string) => {
    if (!confirm('Replace all menus with this preset?')) return;
    try {
      const s = await api.loadPreset(presetId);
      setStructure(s);
      setSelectedMenuId(null);
      setSelectedItemId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load preset');
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Rollback to this version?')) return;
    try {
      const s = await api.rollback(versionId);
      setStructure(s);
      setSelectedMenuId(null);
      setSelectedItemId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rollback');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all menus to factory defaults?')) return;
    try {
      const s = await api.resetToDefaults();
      setStructure(s);
      setSelectedMenuId(null);
      setSelectedItemId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) return <div className="menu-admin__loading">Loading menu structure...</div>;

  return (
    <div className={`menu-admin ${className ?? ''}`.trim()}>
      <div className="menu-admin__header">
        <h1 className="menu-admin__title">Menu Builder</h1>
        <div className="menu-admin__tabs">
          {(['menus', 'presets', 'history'] as Panel[]).map((p) => (
            <button
              key={p}
              className={`menu-admin__tab ${activePanel === p ? 'menu-admin__tab--active' : ''}`.trim()}
              onClick={() => setActivePanel(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="menu-admin__actions">
          <span className="menu-admin__version">v{structure.version ?? 0}</span>
          <button className="menu-admin__btn menu-admin__btn--danger" onClick={handleReset}>
            Reset All
          </button>
        </div>
      </div>

      {error && (
        <div className="menu-admin__error" role="alert">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {activePanel === 'menus' && (
        <div className="menu-admin__layout">
          {/* Menu List */}
          <MenuList
            menus={structure.menus}
            selectedId={selectedMenuId}
            onSelect={setSelectedMenuId}
            onCreate={handleCreateMenu}
            onDelete={handleDeleteMenu}
          />

          {/* Item Tree */}
          {selectedMenu && (
            <MenuItemTree
              menu={selectedMenu}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onAddItem={(item) => handleAddItem(selectedMenu.id, item)}
              onRemoveItem={(itemId) => handleRemoveItem(selectedMenu.id, itemId)}
            />
          )}

          {/* Item Editor */}
          {selectedMenu && selectedItem && (
            <MenuItemEditor
              item={selectedItem}
              menu={selectedMenu}
              onUpdate={(data) => handleUpdateItem(selectedMenu.id, selectedItem.id, data)}
            />
          )}

          {/* Menu Settings */}
          {selectedMenu && !selectedItem && (
            <MenuSettingsPanel
              menu={selectedMenu}
              onUpdate={(data) => handleUpdateMenu(selectedMenu.id, data)}
            />
          )}
        </div>
      )}

      {activePanel === 'presets' && <PresetGallery onLoad={handleLoadPreset} />}

      {activePanel === 'history' && (
        <VersionHistory
          history={structure.history ?? []}
          onRollback={handleRollback}
        />
      )}
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function MenuList({
  menus, selectedId, onSelect, onCreate, onDelete,
}: {
  menus: Menu[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (data: { name: string; slots: MenuSlot[] }) => void;
  onDelete: (id: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlots, setNewSlots] = useState<MenuSlot[]>(['header']);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreate({ name: newName.trim(), slots: newSlots });
    setNewName('');
    setShowCreate(false);
  };

  return (
    <div className="menu-admin__panel menu-admin__menu-list">
      <div className="menu-admin__panel-header">
        <h3>Menus</h3>
        <button className="menu-admin__btn menu-admin__btn--sm" onClick={() => setShowCreate(!showCreate)}>
          + New
        </button>
      </div>

      {showCreate && (
        <form className="menu-admin__create-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Menu name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="menu-admin__input"
            autoFocus
          />
          <div className="menu-admin__field">
            <label className="menu-admin__label">Slots</label>
            <div className="menu-admin__checkbox-group">
              {MENU_SLOTS.map((slot) => (
                <label key={slot} className="menu-admin__checkbox">
                  <input
                    type="checkbox"
                    checked={newSlots.includes(slot)}
                    onChange={(e) =>
                      setNewSlots(
                        e.target.checked
                          ? [...newSlots, slot]
                          : newSlots.filter((s) => s !== slot),
                      )
                    }
                  />
                  {slot}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="menu-admin__btn menu-admin__btn--primary">Create</button>
        </form>
      )}

      <ul className="menu-admin__list">
        {menus.map((menu) => (
          <li
            key={menu.id}
            className={`menu-admin__list-item ${selectedId === menu.id ? 'menu-admin__list-item--selected' : ''} ${menu.enabled === false ? 'menu-admin__list-item--disabled' : ''}`.trim()}
          >
            <button className="menu-admin__list-btn" onClick={() => onSelect(menu.id)}>
              <span className="menu-admin__list-name">{menu.name}</span>
              <span className="menu-admin__list-meta">
                {menu.slots.join(', ')} · {menu.items.length} items
              </span>
            </button>
            <button
              className="menu-admin__btn menu-admin__btn--icon menu-admin__btn--danger"
              onClick={(e) => { e.stopPropagation(); onDelete(menu.id); }}
              aria-label="Delete menu"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MenuItemTree({
  menu, selectedItemId, onSelectItem, onAddItem, onRemoveItem,
}: {
  menu: Menu;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onAddItem: (item: Partial<MenuItem>) => void;
  onRemoveItem: (id: string) => void;
}) {
  const tree = buildMenuTree(menu.items);

  const handleQuickAdd = () => {
    onAddItem({ type: 'custom', label: 'New Item', url: '#' });
  };

  return (
    <div className="menu-admin__panel menu-admin__item-tree">
      <div className="menu-admin__panel-header">
        <h3>Items — {menu.name}</h3>
        <button className="menu-admin__btn menu-admin__btn--sm" onClick={handleQuickAdd}>
          + Add Item
        </button>
      </div>
      <ul className="menu-admin__tree">
        {tree.map((item) => (
          <TreeNode
            key={item.id}
            item={item}
            selectedId={selectedItemId}
            onSelect={onSelectItem}
            onRemove={onRemoveItem}
            depth={0}
          />
        ))}
      </ul>
      {tree.length === 0 && (
        <p className="menu-admin__empty">No items. Click "+ Add Item" to get started.</p>
      )}
    </div>
  );
}

function TreeNode({
  item, selectedId, onSelect, onRemove, depth,
}: {
  item: MenuItem;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = item.children ?? [];
  const isSelected = item.id === selectedId;

  return (
    <li className={`menu-admin__tree-node ${isSelected ? 'menu-admin__tree-node--selected' : ''}`.trim()}>
      <div className="menu-admin__tree-row" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
        {children.length > 0 && (
          <button
            className="menu-admin__tree-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '►'}
          </button>
        )}
        {children.length === 0 && <span className="menu-admin__tree-spacer" />}
        <button className="menu-admin__tree-label" onClick={() => onSelect(item.id)}>
          {item.icon && <span className="menu-admin__tree-icon">⚑</span>}
          <span>{item.label}</span>
          <span className="menu-admin__tree-type">{item.type}</span>
          {item.badge && (
            <span className={`menu-badge menu-badge--${item.badge.variant ?? 'primary'} menu-badge--sm`}>
              {item.badge.text}
            </span>
          )}
        </button>
        <button
          className="menu-admin__btn menu-admin__btn--icon menu-admin__btn--danger"
          onClick={() => onRemove(item.id)}
          aria-label="Remove item"
        >
          ×
        </button>
      </div>
      {expanded && children.length > 0 && (
        <ul className="menu-admin__tree-children">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onRemove={onRemove}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function MenuItemEditor({
  item, menu, onUpdate,
}: {
  item: MenuItem;
  menu: Menu;
  onUpdate: (data: Partial<MenuItem>) => void;
}) {
  const [form, setForm] = useState<Partial<MenuItem>>({ ...item });

  // Sync form when selected item changes
  useEffect(() => { setForm({ ...item }); }, [item]);

  const updateField = <K extends keyof MenuItem>(key: K, value: MenuItem[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = () => {
    onUpdate(form);
  };

  const allIconKeys = MENU_ICON_OPTIONS.map((opt) => opt.value).filter(Boolean);

  return (
    <div className="menu-admin__panel menu-admin__item-editor">
      <div className="menu-admin__panel-header">
        <h3>Edit: {item.label}</h3>
        <button className="menu-admin__btn menu-admin__btn--primary" onClick={handleSave}>
          Save Changes
        </button>
      </div>

      <div className="menu-admin__form">
        {/* Basic */}
        <fieldset className="menu-admin__fieldset">
          <legend>Basic</legend>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Label</label>
            <input className="menu-admin__input" value={form.label ?? ''} onChange={(e) => updateField('label', e.target.value)} />
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">URL</label>
            <input className="menu-admin__input" value={form.url ?? ''} onChange={(e) => updateField('url', e.target.value)} />
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Type</label>
            <select className="menu-admin__select" value={form.type ?? 'custom'} onChange={(e) => updateField('type', e.target.value as MenuItemType)}>
              {MENU_ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Parent</label>
            <select className="menu-admin__select" value={form.parentId ?? ''} onChange={(e) => updateField('parentId', e.target.value || undefined)}>
              <option value="">— None (top-level) —</option>
              {menu.items.filter((i) => i.id !== item.id).map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Description</label>
            <textarea className="menu-admin__textarea" rows={2} value={form.description ?? ''} onChange={(e) => updateField('description', e.target.value || undefined)} />
          </div>
        </fieldset>

        {/* Appearance */}
        <fieldset className="menu-admin__fieldset">
          <legend>Appearance</legend>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Style</label>
            <select className="menu-admin__select" value={form.appearance ?? 'link'} onChange={(e) => updateField('appearance', e.target.value as MenuItemAppearance)}>
              {MENU_ITEM_APPEARANCES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Template</label>
            <select className="menu-admin__select" value={form.template ?? 'link'} onChange={(e) => updateField('template', e.target.value as MenuItemTemplate)}>
              {MENU_ITEM_TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Icon</label>
            <select className="menu-admin__select" value={form.icon ?? ''} onChange={(e) => updateField('icon', e.target.value || undefined)}>
              <option value="">— No icon —</option>
              {allIconKeys.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </fieldset>

        {/* Badge */}
        <fieldset className="menu-admin__fieldset">
          <legend>Badge</legend>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Badge Text</label>
            <input
              className="menu-admin__input"
              value={form.badge?.text ?? ''}
              onChange={(e) => updateField('badge', e.target.value ? { text: e.target.value, variant: form.badge?.variant ?? 'primary' } : undefined)}
            />
          </div>
          {form.badge && (
            <div className="menu-admin__field">
              <label className="menu-admin__label">Badge Variant</label>
              <select
                className="menu-admin__select"
                value={form.badge.variant ?? 'primary'}
                onChange={(e) => updateField('badge', { ...form.badge!, variant: e.target.value as MenuItemBadgeVariant })}
              >
                {MENU_ITEM_BADGE_VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}
        </fieldset>

        {/* Behaviour */}
        <fieldset className="menu-admin__fieldset">
          <legend>Behaviour</legend>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Target</label>
            <select className="menu-admin__select" value={form.target ?? '_self'} onChange={(e) => updateField('target', e.target.value as MenuLinkTarget)}>
              {MENU_LINK_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Rel</label>
            <input className="menu-admin__input" value={form.rel ?? ''} onChange={(e) => updateField('rel', e.target.value || undefined)} placeholder="nofollow, noreferrer..." />
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Analytics Tag</label>
            <input className="menu-admin__input" value={form.analyticsTag ?? ''} onChange={(e) => updateField('analyticsTag', e.target.value || undefined)} />
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Tooltip</label>
            <input className="menu-admin__input" value={form.tooltip ?? ''} onChange={(e) => updateField('tooltip', e.target.value || undefined)} />
          </div>
        </fieldset>

        {/* Visibility */}
        <fieldset className="menu-admin__fieldset">
          <legend>Visibility</legend>
          <div className="menu-admin__field">
            <label className="menu-admin__checkbox">
              <input
                type="checkbox"
                checked={form.visibility?.requireAuth ?? false}
                onChange={(e) => updateField('visibility', { ...form.visibility, requireAuth: e.target.checked || undefined })}
              />
              Require Authentication
            </label>
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__checkbox">
              <input
                type="checkbox"
                checked={form.visibility?.guestOnly ?? false}
                onChange={(e) => updateField('visibility', { ...form.visibility, guestOnly: e.target.checked || undefined })}
              />
              Guest Only
            </label>
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Roles (comma-separated)</label>
            <input
              className="menu-admin__input"
              value={form.visibility?.roles?.join(', ') ?? ''}
              onChange={(e) =>
                updateField('visibility', {
                  ...form.visibility,
                  roles: e.target.value ? e.target.value.split(',').map((r) => r.trim()) : undefined,
                })
              }
            />
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Devices</label>
            <div className="menu-admin__checkbox-group">
              {MENU_DEVICE_OPTIONS.map((d) => (
                <label key={d.value} className="menu-admin__checkbox">
                  <input
                    type="checkbox"
                    checked={form.visibility?.devices?.includes(d.value as 'desktop' | 'mobile' | 'tablet') ?? false}
                    onChange={(e) => {
                      const devices = form.visibility?.devices ?? [];
                      const val = d.value as 'desktop' | 'mobile' | 'tablet';
                      updateField('visibility', {
                        ...form.visibility,
                        devices: e.target.checked
                          ? [...devices, val]
                          : devices.filter((x) => x !== val) || undefined,
                      });
                    }}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        {/* Mega Menu Layout */}
        <fieldset className="menu-admin__fieldset">
          <legend>Mega Menu</legend>
          <div className="menu-admin__field">
            <label className="menu-admin__checkbox">
              <input
                type="checkbox"
                checked={form.layout?.type === 'mega'}
                onChange={(e) =>
                  updateField('layout', e.target.checked ? { type: 'mega', columns: 3 } : undefined)
                }
              />
              Enable Mega Menu
            </label>
          </div>
          {form.layout?.type === 'mega' && (
            <>
              <div className="menu-admin__field">
                <label className="menu-admin__label">Columns</label>
                <input
                  type="number"
                  className="menu-admin__input"
                  min={1}
                  max={6}
                  value={form.layout.columns ?? 3}
                  onChange={(e) => updateField('layout', { ...form.layout!, columns: parseInt(e.target.value) || 3 })}
                />
              </div>
              <div className="menu-admin__field">
                <label className="menu-admin__checkbox">
                  <input
                    type="checkbox"
                    checked={form.layout.fullWidth ?? false}
                    onChange={(e) => updateField('layout', { ...form.layout!, fullWidth: e.target.checked })}
                  />
                  Full Width
                </label>
              </div>
            </>
          )}
        </fieldset>

        {/* Grouping */}
        <fieldset className="menu-admin__fieldset">
          <legend>Grouping</legend>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Group (mega menu column label)</label>
            <input className="menu-admin__input" value={form.group ?? ''} onChange={(e) => updateField('group', e.target.value || undefined)} />
          </div>
          <div className="menu-admin__field">
            <label className="menu-admin__label">Column (1-based index)</label>
            <input type="number" className="menu-admin__input" min={1} max={6} value={form.column ?? ''} onChange={(e) => updateField('column', parseInt(e.target.value) || undefined)} />
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function MenuSettingsPanel({
  menu, onUpdate,
}: {
  menu: Menu;
  onUpdate: (data: Partial<Menu>) => void;
}) {
  const [form, setForm] = useState<Partial<Menu>>({ ...menu });
  useEffect(() => { setForm({ ...menu }); }, [menu]);

  return (
    <div className="menu-admin__panel menu-admin__menu-settings">
      <div className="menu-admin__panel-header">
        <h3>Menu Settings: {menu.name}</h3>
        <button className="menu-admin__btn menu-admin__btn--primary" onClick={() => onUpdate(form)}>Save</button>
      </div>
      <div className="menu-admin__form">
        <div className="menu-admin__field">
          <label className="menu-admin__label">Name</label>
          <input className="menu-admin__input" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="menu-admin__field">
          <label className="menu-admin__label">Description</label>
          <textarea className="menu-admin__textarea" rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || undefined }))} />
        </div>
        <div className="menu-admin__field">
          <label className="menu-admin__label">Container Class</label>
          <input className="menu-admin__input" value={form.containerClass ?? ''} onChange={(e) => setForm((f) => ({ ...f, containerClass: e.target.value || undefined }))} />
        </div>
        <div className="menu-admin__field">
          <label className="menu-admin__label">Slots</label>
          <div className="menu-admin__checkbox-group">
            {MENU_SLOTS.map((slot) => (
              <label key={slot} className="menu-admin__checkbox">
                <input
                  type="checkbox"
                  checked={form.slots?.includes(slot) ?? false}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slots: e.target.checked
                        ? [...(f.slots ?? []), slot]
                        : (f.slots ?? []).filter((s) => s !== slot),
                    }))
                  }
                />
                {slot}
              </label>
            ))}
          </div>
        </div>
        <div className="menu-admin__field">
          <label className="menu-admin__checkbox">
            <input
              type="checkbox"
              checked={form.enabled !== false}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            Enabled
          </label>
        </div>
      </div>
    </div>
  );
}

function PresetGallery({ onLoad }: { onLoad: (presetId: string) => void }) {
  return (
    <div className="menu-admin__panel menu-admin__presets">
      <div className="menu-admin__panel-header">
        <h3>Menu Presets</h3>
      </div>
      <div className="menu-admin__preset-grid">
        {MENU_PRESETS.map((preset) => (
          <div key={preset.id} className="menu-admin__preset-card">
            <h4 className="menu-admin__preset-name">{preset.name}</h4>
            <p className="menu-admin__preset-desc">{preset.description}</p>
            <div className="menu-admin__preset-meta">
              <span className="menu-admin__preset-category">{preset.category}</span>
              <span className="menu-admin__preset-count">{preset.menus.length} menus</span>
            </div>
            {preset.tags && (
              <div className="menu-admin__preset-tags">
                {preset.tags.map((tag) => (
                  <span key={tag} className="menu-admin__preset-tag">{tag}</span>
                ))}
              </div>
            )}
            <button
              className="menu-admin__btn menu-admin__btn--primary menu-admin__btn--sm"
              onClick={() => onLoad(preset.id)}
            >
              Load Preset
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VersionHistory({
  history, onRollback,
}: {
  history: MenuVersion[];
  onRollback: (versionId: string) => void;
}) {
  const sorted = [...history].sort((a, b) => b.version - a.version);

  return (
    <div className="menu-admin__panel menu-admin__history">
      <div className="menu-admin__panel-header">
        <h3>Version History</h3>
      </div>
      {sorted.length === 0 ? (
        <p className="menu-admin__empty">No version history yet.</p>
      ) : (
        <ul className="menu-admin__history-list">
          {sorted.map((v) => (
            <li key={v.id} className="menu-admin__history-item">
              <div className="menu-admin__history-info">
                <span className="menu-admin__history-version">v{v.version}</span>
                <span className="menu-admin__history-date">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
                {v.createdBy && <span className="menu-admin__history-user">by {v.createdBy}</span>}
                {v.note && <span className="menu-admin__history-note">{v.note}</span>}
              </div>
              <button
                className="menu-admin__btn menu-admin__btn--sm"
                onClick={() => onRollback(v.id)}
              >
                Rollback
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MenuManagementPage;
