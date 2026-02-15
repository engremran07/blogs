/**
 * ============================================================================
 * FRONTEND: site-settings/menu-builder/frontend/Sidebar.tsx
 * PURPOSE:  Vertical sidebar navigation with collapsible sections,
 *           designed for dashboards, documentation, and admin panels.
 * ============================================================================
 */

'use client';

import React, { useState } from 'react';
import { useSlotMenus, useMenuIcon } from './MenuContext';
import type { MenuItem } from '../types';

export interface SidebarProps {
  /** Extra CSS class. */
  className?: string;
  /** Whether the sidebar starts collapsed on mobile. */
  defaultCollapsed?: boolean;
  /** Active path (highlights matching item). */
  activePath?: string;
  /** Custom item renderer. */
  renderItem?: (item: MenuItem, isActive: boolean) => React.ReactNode;
}

export function Sidebar({ className, defaultCollapsed = true, activePath, renderItem }: SidebarProps) {
  const menus = useSlotMenus('sidebar');
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (menus.length === 0) return null;

  return (
    <aside
      className={`menu-sidebar ${collapsed ? 'menu-sidebar--collapsed' : ''} ${className ?? ''}`.trim()}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      <button
        className="menu-sidebar__toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
      >
        <span className={`menu-sidebar__toggle-icon ${collapsed ? 'menu-sidebar__toggle-icon--right' : ''}`.trim()} />
      </button>

      <div className="menu-sidebar__content">
        {menus.map((menu) => (
          <div key={menu.id} className="menu-sidebar__section">
            {menu.name && <div className="menu-sidebar__title">{menu.name}</div>}
            <ul className="menu-sidebar__list">
              {menu.items
                .filter((i) => !i.parentId)
                .map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    activePath={activePath}
                    renderItem={renderItem}
                  />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  activePath,
  renderItem,
  depth = 0,
}: {
  item: MenuItem;
  activePath?: string;
  renderItem?: (item: MenuItem, isActive: boolean) => React.ReactNode;
  depth?: number;
}) {
  const icon = useMenuIcon(item.icon);
  const children = item.children ?? [];
  const isActive = activePath ? item.url === activePath : false;
  const [expanded, setExpanded] = useState(isActive || (activePath ? children.some((c) => c.url === activePath) : false));

  if (item.type === 'separator') {
    return <li className="menu-sidebar__separator" role="separator" />;
  }

  if (item.type === 'heading') {
    return <li className="menu-sidebar__heading">{item.label}</li>;
  }

  if (renderItem) {
    return <li>{renderItem(item, isActive)}</li>;
  }

  return (
    <li className={`menu-sidebar__item ${isActive ? 'menu-sidebar__item--active' : ''}`.trim()}>
      <div className="menu-sidebar__row" style={{ paddingLeft: `${depth * 12 + 12}px` }}>
        <a
          href={item.url}
          className={`menu-sidebar__link ${item.appearance ? `menu-sidebar__link--${item.appearance}` : ''}`.trim()}
          aria-current={isActive ? 'page' : undefined}
        >
          {icon && <span className="menu-sidebar__icon" aria-hidden="true">{icon}</span>}
          <span className="menu-sidebar__label">{item.label}</span>
          {item.badge && (
            <span className={`menu-badge menu-badge--${item.badge.variant ?? 'primary'}`}>{item.badge.text}</span>
          )}
        </a>
        {children.length > 0 && (
          <button
            className="menu-sidebar__expand"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
          >
            <span className={`menu-sidebar__chevron ${expanded ? 'menu-sidebar__chevron--down' : ''}`.trim()} />
          </button>
        )}
      </div>
      {children.length > 0 && expanded && (
        <ul className="menu-sidebar__sub-list">
          {children.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              activePath={activePath}
              renderItem={renderItem}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default Sidebar;
