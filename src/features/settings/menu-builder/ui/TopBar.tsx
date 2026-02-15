/**
 * ============================================================================
 * FRONTEND: site-settings/menu-builder/frontend/TopBar.tsx
 * PURPOSE:  Slim site-wide top bar: announcements, quick links, contact info.
 *           Renders all menus assigned to the 'topbar' slot.
 * ============================================================================
 */

'use client';

import React from 'react';
import { useSlotMenus, useMenuIcon } from './MenuContext';
import type { MenuItem } from '../types';

export interface TopBarProps {
  /** Extra CSS class on the outer wrapper. */
  className?: string;
  /** Override default item renderer. */
  renderItem?: (item: MenuItem) => React.ReactNode;
}

export function TopBar({ className, renderItem }: TopBarProps) {
  const menus = useSlotMenus('topbar');

  if (menus.length === 0) return null;

  return (
    <div
      className={`menu-topbar ${className ?? ''}`.trim()}
      role="banner"
      aria-label="Top bar"
    >
      <div className="menu-topbar__inner">
        {menus.map((menu) => (
          <ul key={menu.id} className="menu-topbar__list">
            {menu.items.map((item) => (
              <li key={item.id} className="menu-topbar__item">
                {renderItem ? (
                  renderItem(item)
                ) : (
                  <TopBarItem item={item} />
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

function TopBarItem({ item }: { item: MenuItem }) {
  const icon = useMenuIcon(item.icon);
  const isExternal = item.target === '_blank';

  return (
    <a
      href={item.url}
      className={`menu-topbar__link ${item.appearance ? `menu-topbar__link--${item.appearance}` : ''}`.trim()}
      target={item.target ?? '_self'}
      rel={item.rel ?? (isExternal ? 'noopener noreferrer' : undefined)}
      aria-label={item.ariaLabel ?? item.label}
      title={item.tooltip}
      data-analytics={item.analyticsTag}
      style={item.customStyle ? {
        color: item.customStyle.color,
        backgroundColor: item.customStyle.backgroundColor,
        fontWeight: item.customStyle.fontWeight,
        fontSize: item.customStyle.fontSize,
        borderRadius: item.customStyle.borderRadius,
      } : undefined}
    >
      {icon && <span className="menu-topbar__icon" aria-hidden="true">{icon}</span>}
      <span className="menu-topbar__label">{item.label}</span>
      {item.badge && (
        <span className={`menu-badge menu-badge--${item.badge.variant ?? 'primary'}`}>
          {item.badge.text}
        </span>
      )}
    </a>
  );
}

export default TopBar;
