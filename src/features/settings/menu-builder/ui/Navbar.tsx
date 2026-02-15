/**
 * ============================================================================
 * FRONTEND: site-settings/menu-builder/frontend/Navbar.tsx
 * PURPOSE:  Primary header navigation bar.
 *           Renders desktop menu, mobile toggle, logo slot, and action items.
 *           Supports mega menu drop-downs and CTA buttons.
 * ============================================================================
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { usePrimaryMenu, useMenuIcon } from './MenuContext';
import type { MenuItem } from '../types';

export interface NavbarProps {
  /** Site logo element. */
  logo?: React.ReactNode;
  /** Extra CSS class. */
  className?: string;
  /** Render function for right-side action items. */
  renderActions?: () => React.ReactNode;
  /** Custom mobile menu renderer (receives items and close handler). */
  renderMobileMenu?: (items: MenuItem[], close: () => void) => React.ReactNode;
}

export function Navbar({ logo, className, renderActions, renderMobileMenu }: NavbarProps) {
  const menu = usePrimaryMenu('header');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (!menu) return null;

  const topItems = menu.items.filter((i) => !i.parentId);
  const ctaItems = topItems.filter((i) => i.template === 'cta');
  const navItems = topItems.filter((i) => i.template !== 'cta');

  return (
    <nav className={`menu-navbar ${className ?? ''}`.trim()} role="navigation" aria-label="Main navigation">
      <div className="menu-navbar__inner">
        {/* Logo */}
        {logo && <div className="menu-navbar__logo">{logo}</div>}

        {/* Desktop Nav */}
        <ul className="menu-navbar__desktop-list">
          {navItems.map((item) => (
            <NavbarMenuItem key={item.id} item={item} allItems={menu.items} />
          ))}
        </ul>

        {/* Actions & CTAs */}
        <div className="menu-navbar__actions">
          {renderActions?.()}
          {ctaItems.map((item) => (
            <NavbarCta key={item.id} item={item} />
          ))}
        </div>

        {/* Mobile Toggle */}
        <button
          className="menu-navbar__mobile-toggle"
          onClick={toggleMobile}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          <span className={`menu-navbar__hamburger ${mobileOpen ? 'menu-navbar__hamburger--open' : ''}`.trim()} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="menu-navbar__mobile-panel" role="dialog" aria-label="Mobile navigation">
          {renderMobileMenu ? (
            renderMobileMenu(menu.items, closeMobile)
          ) : (
            <DefaultMobileMenu items={menu.items} close={closeMobile} />
          )}
        </div>
      )}
    </nav>
  );
}

// ─── Desktop Menu Item ──────────────────────────────────────────────────────

function NavbarMenuItem({ item, allItems }: { item: MenuItem; allItems: MenuItem[] }) {
  const icon = useMenuIcon(item.icon);
  const children = item.children ?? [];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasDropdown = children.length > 0 || item.layout?.type === 'mega';
  const isMega = item.layout?.type === 'mega';

  if (item.type === 'separator') {
    return <li className="menu-navbar__separator" role="separator" />;
  }

  if (item.type === 'heading') {
    return <li className="menu-navbar__heading">{item.label}</li>;
  }

  return (
    <li
      ref={ref}
      className={`menu-navbar__item ${hasDropdown ? 'menu-navbar__item--has-dropdown' : ''}`.trim()}
      onMouseEnter={() => hasDropdown && setOpen(true)}
      onMouseLeave={() => hasDropdown && setOpen(false)}
    >
      <a
        href={item.url}
        className={`menu-navbar__link ${item.appearance ? `menu-navbar__link--${item.appearance}` : ''}`.trim()}
        target={item.target ?? '_self'}
        rel={item.rel}
        aria-label={item.ariaLabel ?? item.label}
        aria-haspopup={hasDropdown ? 'true' : undefined}
        aria-expanded={hasDropdown ? open : undefined}
        title={item.tooltip}
        data-analytics={item.analyticsTag}
        onClick={hasDropdown ? (e) => { e.preventDefault(); setOpen(!open); } : undefined}
      >
        {icon && <span className="menu-navbar__icon" aria-hidden="true">{icon}</span>}
        <span>{item.label}</span>
        {item.badge && (
          <span className={`menu-badge menu-badge--${item.badge.variant ?? 'primary'}`}>{item.badge.text}</span>
        )}
        {hasDropdown && <span className="menu-navbar__chevron" aria-hidden="true" />}
      </a>

      {/* Dropdown */}
      {hasDropdown && open && (
        isMega ? (
          <MegaMenu item={item} />
        ) : (
          <ul className="menu-navbar__dropdown">
            {children.map((child) => (
              <NavbarDropdownItem key={child.id} item={child} />
            ))}
          </ul>
        )
      )}
    </li>
  );
}

// ─── Dropdown Item ──────────────────────────────────────────────────────────

function NavbarDropdownItem({ item }: { item: MenuItem }) {
  const icon = useMenuIcon(item.icon);
  const children = item.children ?? [];

  return (
    <li className="menu-navbar__dropdown-item">
      <a href={item.url} className="menu-navbar__dropdown-link" target={item.target ?? '_self'} rel={item.rel}>
        {icon && <span className="menu-navbar__icon" aria-hidden="true">{icon}</span>}
        <div className="menu-navbar__dropdown-content">
          <span className="menu-navbar__dropdown-label">{item.label}</span>
          {item.description && <span className="menu-navbar__dropdown-desc">{item.description}</span>}
        </div>
        {item.badge && (
          <span className={`menu-badge menu-badge--${item.badge.variant ?? 'primary'}`}>{item.badge.text}</span>
        )}
      </a>
      {children.length > 0 && (
        <ul className="menu-navbar__nested-dropdown">
          {children.map((child) => (
            <NavbarDropdownItem key={child.id} item={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Mega Menu ──────────────────────────────────────────────────────────────

function MegaMenu({ item }: { item: MenuItem }) {
  const children = item.children ?? [];
  const columns = item.layout?.columns ?? 3;
  const blocks = item.layout?.contentBlocks ?? [];
  const fullWidth = item.layout?.fullWidth ?? false;

  // Group children by their `group` field
  const groups = new Map<string, MenuItem[]>();
  for (const child of children) {
    const g = child.group ?? '';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(child);
  }

  return (
    <div
      className={`menu-mega ${fullWidth ? 'menu-mega--full-width' : ''}`.trim()}
      style={{ '--mega-columns': columns } as React.CSSProperties}
      role="menu"
    >
      <div className="menu-mega__grid">
        {Array.from(groups.entries()).map(([groupName, items]) => (
          <div key={groupName || '__ungrouped'} className="menu-mega__column">
            {groupName && <div className="menu-mega__group-title">{groupName}</div>}
            <ul className="menu-mega__list">
              {items.map((child) => (
                <MegaMenuItem key={child.id} item={child} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      {blocks.length > 0 && (
        <div className="menu-mega__promo-area">
          {blocks.map((block, i) => (
            <div key={i} className="menu-mega__promo-block">
              {block.image && (
                <div className="menu-mega__promo-image" style={{ backgroundImage: `url(${block.image})` }} />
              )}
              {block.title && <div className="menu-mega__promo-title">{block.title}</div>}
              {block.description && <p className="menu-mega__promo-desc">{block.description}</p>}
              {block.ctaLabel && block.ctaUrl && (
                <a href={block.ctaUrl} className="menu-mega__promo-cta">{block.ctaLabel}</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MegaMenuItem({ item }: { item: MenuItem }) {
  const icon = useMenuIcon(item.icon);

  return (
    <li className="menu-mega__item" role="menuitem">
      <a href={item.url} className="menu-mega__link" target={item.target ?? '_self'}>
        {icon && <span className="menu-mega__icon" aria-hidden="true">{icon}</span>}
        <div>
          <span className="menu-mega__label">{item.label}</span>
          {item.description && <span className="menu-mega__desc">{item.description}</span>}
        </div>
        {item.badge && (
          <span className={`menu-badge menu-badge--${item.badge.variant ?? 'primary'}`}>{item.badge.text}</span>
        )}
      </a>
    </li>
  );
}

// ─── CTA Button ─────────────────────────────────────────────────────────────

function NavbarCta({ item }: { item: MenuItem }) {
  const icon = useMenuIcon(item.icon);

  return (
    <a
      href={item.url}
      className={`menu-navbar__cta menu-navbar__cta--${item.appearance ?? 'primary'}`}
      target={item.target ?? '_self'}
      rel={item.rel}
      data-analytics={item.analyticsTag}
    >
      {icon && <span className="menu-navbar__cta-icon" aria-hidden="true">{icon}</span>}
      {item.label}
    </a>
  );
}

// ─── Default Mobile Menu ────────────────────────────────────────────────────

function DefaultMobileMenu({ items, close }: { items: MenuItem[]; close: () => void }) {
  const topItems = items.filter((i) => !i.parentId);

  return (
    <ul className="menu-navbar__mobile-list">
      {topItems.map((item) => (
        <MobileMenuItem key={item.id} item={item} close={close} />
      ))}
    </ul>
  );
}

function MobileMenuItem({ item, close }: { item: MenuItem; close: () => void }) {
  const icon = useMenuIcon(item.icon);
  const children = item.children ?? [];
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="menu-navbar__mobile-item">
      <div className="menu-navbar__mobile-row">
        <a
          href={item.url}
          className={`menu-navbar__mobile-link ${item.appearance ? `menu-navbar__mobile-link--${item.appearance}` : ''}`.trim()}
          target={item.target ?? '_self'}
          onClick={children.length === 0 ? close : undefined}
        >
          {icon && <span className="menu-navbar__icon" aria-hidden="true">{icon}</span>}
          {item.label}
          {item.badge && (
            <span className={`menu-badge menu-badge--${item.badge.variant ?? 'primary'}`}>{item.badge.text}</span>
          )}
        </a>
        {children.length > 0 && (
          <button
            className="menu-navbar__mobile-expand"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
          >
            <span className={`menu-navbar__chevron ${expanded ? 'menu-navbar__chevron--up' : ''}`.trim()} />
          </button>
        )}
      </div>
      {children.length > 0 && expanded && (
        <ul className="menu-navbar__mobile-sub">
          {children.map((child) => (
            <MobileMenuItem key={child.id} item={child} close={close} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default Navbar;
