/**
 * ============================================================================
 * FRONTEND: site-settings/menu-builder/frontend/index.ts
 * PURPOSE:  Barrel exports for all menu builder frontend components.
 * ============================================================================
 */

// Context & hooks
export {
  MenuProvider,
  useMenu,
  useSlotMenus,
  usePrimaryMenu,
  useMenuIcon,
} from './MenuContext';
export type { MenuProviderProps, MenuContextValue } from './MenuContext';

// Rendering components
export { TopBar } from './TopBar';
export type { TopBarProps } from './TopBar';

export { Navbar } from './Navbar';
export type { NavbarProps } from './Navbar';

export { Footer } from './Footer';
export type { FooterProps } from './Footer';

export { Sidebar } from './Sidebar';
export type { SidebarProps } from './Sidebar';

// Admin
export { MenuManagementPage } from './MenuManagementPage';
export type { MenuManagementPageProps, MenuManagementApi } from './MenuManagementPage';
