/**
 * ============================================================================
 * FRONTEND: site-settings/menu-builder/frontend/Footer.tsx
 * PURPOSE:  Structured site footer with grouped link columns, sitemap,
 *           copyright bar, and social links integration.
 * ============================================================================
 */

'use client';

import React from 'react';
import { useSlotMenus, useMenuIcon } from './MenuContext';
import type { MenuItem } from '../types';

export interface FooterProps {
  /** Site logo or wordmark. */
  logo?: React.ReactNode;
  /** Copyright text (supports {year} interpolation). */
  copyright?: string;
  /** Social links list (rendered below columns). */
  socialLinks?: Array<{ label: string; url: string; icon?: string }>;
  /** Extra CSS class. */
  className?: string;
  /** Custom item renderer override. */
  renderItem?: (item: MenuItem) => React.ReactNode;
}

export function Footer({ logo, copyright, socialLinks, className, renderItem }: FooterProps) {
  const menus = useSlotMenus('footer');

  if (menus.length === 0 && !copyright) return null;

  const copyrightText = copyright?.replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className={`menu-footer ${className ?? ''}`.trim()} role="contentinfo">
      <div className="menu-footer__inner">
        {/* Logo + tagline */}
        {logo && <div className="menu-footer__brand">{logo}</div>}

        {/* Link Columns */}
        <div className="menu-footer__columns">
          {menus.map((menu) => (
            <FooterColumns key={menu.id} items={menu.items} renderItem={renderItem} />
          ))}
        </div>

        {/* Social Links */}
        {socialLinks && socialLinks.length > 0 && (
          <div className="menu-footer__social">
            {socialLinks.map((link) => (
              <SocialLink key={link.url} {...link} />
            ))}
          </div>
        )}
      </div>

      {/* Copyright Bar */}
      {copyrightText && (
        <div className="menu-footer__copyright">
          <p>{copyrightText}</p>
        </div>
      )}
    </footer>
  );
}

// ─── Footer Columns (grouped by top-level items) ───────────────────────────

function FooterColumns({
  items,
  renderItem,
}: {
  items: MenuItem[];
  renderItem?: (item: MenuItem) => React.ReactNode;
}) {
  // Top-level items become column headers
  const topItems = items.filter((i) => !i.parentId);

  return (
    <>
      {topItems.map((topItem) => {
        const children = topItem.children ?? [];
        return (
          <div key={topItem.id} className="menu-footer__column">
            <h4 className="menu-footer__column-title">
              <FooterLink item={topItem} renderItem={renderItem} />
            </h4>
            {children.length > 0 && (
              <ul className="menu-footer__list">
                {children.map((child) => (
                  <li key={child.id} className="menu-footer__item">
                    {renderItem ? renderItem(child) : <FooterLink item={child} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Footer Link ────────────────────────────────────────────────────────────

function FooterLink({
  item,
  renderItem,
}: {
  item: MenuItem;
  renderItem?: (item: MenuItem) => React.ReactNode;
}) {
  const icon = useMenuIcon(item.icon);

  if (renderItem) return <>{renderItem(item)}</>;

  return (
    <a
      href={item.url}
      className={`menu-footer__link ${item.appearance ? `menu-footer__link--${item.appearance}` : ''}`.trim()}
      target={item.target ?? '_self'}
      rel={item.rel}
      aria-label={item.ariaLabel ?? item.label}
      data-analytics={item.analyticsTag}
    >
      {icon && <span className="menu-footer__icon" aria-hidden="true">{icon}</span>}
      {item.label}
      {item.badge && (
        <span className={`menu-badge menu-badge--${item.badge.variant ?? 'primary'}`}>
          {item.badge.text}
        </span>
      )}
    </a>
  );
}

// ─── Social Link ────────────────────────────────────────────────────────────

function SocialLink({ label, url, icon }: { label: string; url: string; icon?: string }) {
  const resolvedIcon = useMenuIcon(icon);

  return (
    <a
      href={url}
      className="menu-footer__social-link"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      {resolvedIcon ?? <span>{label}</span>}
    </a>
  );
}

export default Footer;
