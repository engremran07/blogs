/**
 * ============================================================================
 * SUB-MODULE: site-settings/menu-builder/menu-presets.ts
 * PURPOSE:    10 production-ready menu presets spanning every common site type.
 *             Each preset includes header + footer menus with realistic items,
 *             mega menu layouts, CTAs, badges, and visibility rules.
 *
 *             Presets are immutable — `clonePresetMenus` creates deep copies
 *             with unique IDs so the original definitions are never mutated.
 * ============================================================================
 */

import type { Menu, MenuItem, MenuPreset } from '../types';
import { generateMenuId, generateMenuItemId } from './menu-structure';

// ─── Preset Definitions ─────────────────────────────────────────────────────

const SERVICE_BUSINESS: MenuPreset = {
  id: 'service-business',
  name: 'Service Business',
  description: 'Professional service navigation with mega menu, clear CTAs, and footer links.',
  category: 'business',
  tags: ['services', 'consulting', 'agency', 'construction', 'professional'],
  menus: [
    {
      id: 'svc-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'svc-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home', analyticsTag: 'nav_home' },
        { id: 'svc-services', type: 'custom', label: 'Services', url: '/services', order: 1, icon: 'services',
          layout: { type: 'mega', columns: 3, contentBlocks: [{ title: 'Free Estimate', description: 'Talk through scope, timing, and budget.', ctaLabel: 'Get Started', ctaUrl: '/get-quote' }] } },
        { id: 'svc-projects', type: 'custom', label: 'Projects', url: '/projects', order: 2, icon: 'portfolio' },
        { id: 'svc-blog', type: 'route', label: 'Blog', url: '/blog', order: 3, icon: 'blog' },
        { id: 'svc-about', type: 'custom', label: 'About', url: '/about', order: 4, icon: 'info' },
        { id: 'svc-contact', type: 'route', label: 'Contact', url: '/contact', order: 5, icon: 'mail' },
        { id: 'svc-quote', type: 'route', label: 'Get Quote', url: '/get-quote', order: 6, appearance: 'primary', template: 'cta', analyticsTag: 'header_cta_quote' },
        // Sub-items under Services
        { id: 'svc-s1', type: 'custom', label: 'Consulting', url: '/services/consulting', order: 0, parentId: 'svc-services', group: 'Core' },
        { id: 'svc-s2', type: 'custom', label: 'Implementation', url: '/services/implementation', order: 1, parentId: 'svc-services', group: 'Core' },
        { id: 'svc-s3', type: 'custom', label: 'Support Plans', url: '/services/support', order: 2, parentId: 'svc-services', group: 'Support' },
        { id: 'svc-s4', type: 'custom', label: 'Training', url: '/services/training', order: 3, parentId: 'svc-services', group: 'Support', badge: { text: 'New', variant: 'info' } },
      ],
    },
    {
      id: 'svc-topbar', name: 'Top Bar', slots: ['topbar'], items: [
        { id: 'svc-tb-phone', type: 'custom', label: 'Call Us', url: 'tel:+1234567890', order: 0, icon: 'phone' },
        { id: 'svc-tb-email', type: 'custom', label: 'info@example.com', url: 'mailto:info@example.com', order: 1, icon: 'mail' },
        { id: 'svc-tb-hours', type: 'custom', label: 'Mon-Fri 9am-6pm', url: '#', order: 2, icon: 'calendar' },
      ],
    },
    {
      id: 'svc-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'svc-f1', type: 'custom', label: 'Company', url: '/about', order: 0 },
        { id: 'svc-f1a', type: 'custom', label: 'Team', url: '/team', order: 0, parentId: 'svc-f1' },
        { id: 'svc-f1b', type: 'custom', label: 'Careers', url: '/careers', order: 1, parentId: 'svc-f1' },
        { id: 'svc-f2', type: 'custom', label: 'Resources', url: '/resources', order: 1 },
        { id: 'svc-f2a', type: 'custom', label: 'Guides', url: '/resources/guides', order: 0, parentId: 'svc-f2' },
        { id: 'svc-f2b', type: 'route', label: 'Blog', url: '/blog', order: 1, parentId: 'svc-f2' },
        { id: 'svc-f3', type: 'route', label: 'Contact', url: '/contact', order: 2 },
        { id: 'svc-f4', type: 'custom', label: 'Privacy', url: '/privacy', order: 3 },
      ],
    },
  ],
};

const STUDIO_PORTFOLIO: MenuPreset = {
  id: 'studio-portfolio',
  name: 'Studio / Portfolio',
  description: 'Portfolio-driven navigation with featured work, galleries, and case studies.',
  category: 'portfolio',
  tags: ['creative', 'design', 'photography', 'freelance', 'art'],
  menus: [
    {
      id: 'studio-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'st-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home' },
        { id: 'st-work', type: 'custom', label: 'Work', url: '/work', order: 1, icon: 'portfolio' },
        { id: 'st-services', type: 'custom', label: 'Services', url: '/services', order: 2, icon: 'services' },
        { id: 'st-studio', type: 'custom', label: 'Studio', url: '/studio', order: 3, icon: 'company' },
        { id: 'st-contact', type: 'route', label: 'Contact', url: '/contact', order: 4, icon: 'mail' },
        { id: 'st-book', type: 'custom', label: 'Book Consult', url: '/get-quote', order: 5, appearance: 'primary', template: 'cta', analyticsTag: 'header_cta_book' },
        { id: 'st-w1', type: 'custom', label: 'Featured Projects', url: '/work/featured', order: 0, parentId: 'st-work', template: 'featured', description: 'Spotlight on our latest work.' },
        { id: 'st-w2', type: 'custom', label: 'Galleries', url: '/work/galleries', order: 1, parentId: 'st-work', template: 'card', description: 'Browse by style.' },
        { id: 'st-w3', type: 'custom', label: 'Case Studies', url: '/work/case-studies', order: 2, parentId: 'st-work' },
      ],
    },
    {
      id: 'studio-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'st-f1', type: 'custom', label: 'Studio', url: '/studio', order: 0 },
        { id: 'st-f1a', type: 'custom', label: 'Team', url: '/team', order: 0, parentId: 'st-f1' },
        { id: 'st-f1b', type: 'custom', label: 'Press', url: '/press', order: 1, parentId: 'st-f1' },
        { id: 'st-f2', type: 'route', label: 'Contact', url: '/contact', order: 1 },
        { id: 'st-f3', type: 'custom', label: 'Privacy', url: '/privacy', order: 2 },
      ],
    },
  ],
};

const ECOMMERCE_STORE: MenuPreset = {
  id: 'ecommerce-store',
  name: 'E-Commerce Store',
  description: 'Shop-first layout with product categories, promotions, deals, and support.',
  category: 'ecommerce',
  tags: ['shop', 'store', 'products', 'retail', 'marketplace'],
  menus: [
    {
      id: 'store-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'ec-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home' },
        { id: 'ec-shop', type: 'custom', label: 'Shop', url: '/shop', order: 1, icon: 'shop',
          layout: { type: 'mega', columns: 3, contentBlocks: [{ title: 'Seasonal Picks', description: 'Fresh arrivals curated by our team.', ctaLabel: 'View Collection', ctaUrl: '/shop/collections/seasonal' }] } },
        { id: 'ec-deals', type: 'custom', label: 'Deals', url: '/shop/deals', order: 2, badge: { text: 'Hot', variant: 'warning' } },
        { id: 'ec-blog', type: 'route', label: 'Blog', url: '/blog', order: 3, icon: 'blog' },
        { id: 'ec-support', type: 'custom', label: 'Support', url: '/support', order: 4, icon: 'support' },
        { id: 'ec-cart', type: 'custom', label: 'Cart', url: '/cart', order: 5, appearance: 'outline', template: 'cta', icon: 'cart', analyticsTag: 'header_cart' },
        // Shop sub-items
        { id: 'ec-s1', type: 'custom', label: 'New Arrivals', url: '/shop/new', order: 0, parentId: 'ec-shop', group: 'Products', badge: { text: 'New', variant: 'success' } },
        { id: 'ec-s2', type: 'custom', label: 'Best Sellers', url: '/shop/best-sellers', order: 1, parentId: 'ec-shop', group: 'Products' },
        { id: 'ec-s3', type: 'custom', label: 'Categories', url: '/shop/categories', order: 2, parentId: 'ec-shop', group: 'Products' },
        { id: 'ec-s4', type: 'custom', label: 'Accessories', url: '/shop/accessories', order: 3, parentId: 'ec-shop', group: 'Products' },
        { id: 'ec-s5', type: 'custom', label: 'Shipping Info', url: '/support/shipping', order: 4, parentId: 'ec-shop', group: 'Help' },
        { id: 'ec-s6', type: 'custom', label: 'Returns', url: '/support/returns', order: 5, parentId: 'ec-shop', group: 'Help' },
      ],
    },
    {
      id: 'store-topbar', name: 'Top Bar', slots: ['topbar'], items: [
        { id: 'ec-tb1', type: 'custom', label: 'Free shipping over $50', url: '/shop', order: 0, icon: 'gift' },
        { id: 'ec-tb2', type: 'custom', label: 'Track Order', url: '/account/orders', order: 1, visibility: { requireAuth: true } },
      ],
    },
    {
      id: 'store-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'ec-f1', type: 'custom', label: 'Help', url: '/support', order: 0 },
        { id: 'ec-f1a', type: 'custom', label: 'Shipping', url: '/support/shipping', order: 0, parentId: 'ec-f1' },
        { id: 'ec-f1b', type: 'custom', label: 'Returns', url: '/support/returns', order: 1, parentId: 'ec-f1' },
        { id: 'ec-f1c', type: 'custom', label: 'FAQ', url: '/support/faq', order: 2, parentId: 'ec-f1' },
        { id: 'ec-f2', type: 'route', label: 'Contact', url: '/contact', order: 1 },
        { id: 'ec-f3', type: 'custom', label: 'Privacy', url: '/privacy', order: 2 },
        { id: 'ec-f4', type: 'custom', label: 'Terms', url: '/terms', order: 3 },
      ],
    },
  ],
};

const SAAS_PRODUCT: MenuPreset = {
  id: 'saas-product',
  name: 'SaaS / Software Product',
  description: 'Product-led layout with docs, pricing, integrations, and onboarding CTAs.',
  category: 'saas',
  tags: ['software', 'startup', 'tech', 'platform', 'api'],
  menus: [
    {
      id: 'saas-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'sa-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home' },
        { id: 'sa-product', type: 'custom', label: 'Product', url: '/product', order: 1,
          layout: { type: 'mega', columns: 2, contentBlocks: [{ title: 'Start in Minutes', description: 'Guided onboarding and ready-made templates.', ctaLabel: 'Start Free', ctaUrl: '/auth?mode=signup' }] } },
        { id: 'sa-pricing', type: 'custom', label: 'Pricing', url: '/pricing', order: 2, badge: { text: 'New', variant: 'info' } },
        { id: 'sa-docs', type: 'custom', label: 'Docs', url: '/docs', order: 3, icon: 'book' },
        { id: 'sa-blog', type: 'route', label: 'Blog', url: '/blog', order: 4, icon: 'blog' },
        { id: 'sa-login', type: 'route', label: 'Login', url: '/auth?mode=login', order: 5, appearance: 'ghost', template: 'cta', visibility: { guestOnly: true } },
        { id: 'sa-start', type: 'route', label: 'Start Free', url: '/auth?mode=signup', order: 6, appearance: 'primary', template: 'cta', analyticsTag: 'header_cta_start', visibility: { guestOnly: true } },
        { id: 'sa-dashboard', type: 'route', label: 'Dashboard', url: '/dashboard', order: 7, appearance: 'primary', template: 'cta', visibility: { requireAuth: true }, icon: 'dashboard' },
        // Product sub-items
        { id: 'sa-p1', type: 'custom', label: 'Overview', url: '/product/overview', order: 0, parentId: 'sa-product', group: 'Platform' },
        { id: 'sa-p2', type: 'custom', label: 'Automation', url: '/product/automation', order: 1, parentId: 'sa-product', group: 'Platform' },
        { id: 'sa-p3', type: 'custom', label: 'Analytics', url: '/product/analytics', order: 2, parentId: 'sa-product', group: 'Platform' },
        { id: 'sa-p4', type: 'custom', label: 'Integrations', url: '/product/integrations', order: 3, parentId: 'sa-product', group: 'Ecosystem' },
        { id: 'sa-p5', type: 'custom', label: 'Security', url: '/product/security', order: 4, parentId: 'sa-product', group: 'Ecosystem' },
        { id: 'sa-p6', type: 'custom', label: 'API Reference', url: '/docs/api', order: 5, parentId: 'sa-product', group: 'Ecosystem' },
      ],
    },
    {
      id: 'saas-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'sa-f1', type: 'custom', label: 'Product', url: '/product', order: 0 },
        { id: 'sa-f1a', type: 'custom', label: 'Features', url: '/product/features', order: 0, parentId: 'sa-f1' },
        { id: 'sa-f1b', type: 'custom', label: 'Changelog', url: '/changelog', order: 1, parentId: 'sa-f1' },
        { id: 'sa-f1c', type: 'custom', label: 'Roadmap', url: '/roadmap', order: 2, parentId: 'sa-f1' },
        { id: 'sa-f2', type: 'custom', label: 'Company', url: '/about', order: 1 },
        { id: 'sa-f2a', type: 'custom', label: 'About', url: '/about', order: 0, parentId: 'sa-f2' },
        { id: 'sa-f2b', type: 'custom', label: 'Careers', url: '/careers', order: 1, parentId: 'sa-f2' },
        { id: 'sa-f2c', type: 'custom', label: 'Blog', url: '/blog', order: 2, parentId: 'sa-f2' },
        { id: 'sa-f3', type: 'custom', label: 'Legal', url: '/legal', order: 2 },
        { id: 'sa-f3a', type: 'custom', label: 'Privacy', url: '/privacy', order: 0, parentId: 'sa-f3' },
        { id: 'sa-f3b', type: 'custom', label: 'Terms', url: '/terms', order: 1, parentId: 'sa-f3' },
      ],
    },
  ],
};

const BLOG_FOCUSED: MenuPreset = {
  id: 'blog-focused',
  name: 'Blog / Publication',
  description: 'Content-first layout for publishing sites, magazines, and newsletters.',
  category: 'blog',
  tags: ['publishing', 'magazine', 'newsletter', 'content', 'media'],
  menus: [
    {
      id: 'blog-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'bl-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home' },
        { id: 'bl-blog', type: 'route', label: 'Articles', url: '/blog', order: 1, icon: 'blog' },
        { id: 'bl-topics', type: 'custom', label: 'Topics', url: '/blog#topics', order: 2, icon: 'tag' },
        { id: 'bl-podcast', type: 'custom', label: 'Podcast', url: '/podcast', order: 3, icon: 'podcast' },
        { id: 'bl-about', type: 'custom', label: 'About', url: '/about', order: 4, icon: 'info' },
        { id: 'bl-contact', type: 'route', label: 'Contact', url: '/contact', order: 5, icon: 'mail' },
        { id: 'bl-subscribe', type: 'custom', label: 'Subscribe', url: '/subscribe', order: 6, appearance: 'primary', template: 'cta', analyticsTag: 'header_cta_subscribe' },
      ],
    },
    {
      id: 'blog-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'bl-f1', type: 'custom', label: 'About', url: '/about', order: 0 },
        { id: 'bl-f2', type: 'custom', label: 'Privacy', url: '/privacy', order: 1 },
        { id: 'bl-f3', type: 'custom', label: 'Terms', url: '/terms', order: 2 },
        { id: 'bl-f4', type: 'route', label: 'Contact', url: '/contact', order: 3 },
        { id: 'bl-f5', type: 'custom', label: 'RSS Feed', url: '/feed.xml', order: 4, icon: 'rss' },
      ],
    },
  ],
};

const CORPORATE_ENTERPRISE: MenuPreset = {
  id: 'corporate-enterprise',
  name: 'Corporate / Enterprise',
  description: 'Multi-tier corporate navigation with departments, investor relations, and careers.',
  category: 'corporate',
  tags: ['enterprise', 'corporate', 'b2b', 'organization', 'large'],
  menus: [
    {
      id: 'corp-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'co-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home' },
        { id: 'co-solutions', type: 'custom', label: 'Solutions', url: '/solutions', order: 1, icon: 'services',
          layout: { type: 'mega', columns: 3 } },
        { id: 'co-industries', type: 'custom', label: 'Industries', url: '/industries', order: 2 },
        { id: 'co-insights', type: 'custom', label: 'Insights', url: '/insights', order: 3, icon: 'blog' },
        { id: 'co-about', type: 'custom', label: 'About', url: '/about', order: 4, icon: 'company' },
        { id: 'co-careers', type: 'custom', label: 'Careers', url: '/careers', order: 5, icon: 'careers', badge: { text: 'Hiring', variant: 'success' } },
        { id: 'co-contact', type: 'route', label: 'Contact', url: '/contact', order: 6, appearance: 'primary', template: 'cta' },
        // Solutions sub-items
        { id: 'co-sl1', type: 'custom', label: 'Digital Transformation', url: '/solutions/digital', order: 0, parentId: 'co-solutions', group: 'Services' },
        { id: 'co-sl2', type: 'custom', label: 'Cloud Infrastructure', url: '/solutions/cloud', order: 1, parentId: 'co-solutions', group: 'Services' },
        { id: 'co-sl3', type: 'custom', label: 'Cybersecurity', url: '/solutions/security', order: 2, parentId: 'co-solutions', group: 'Services' },
        { id: 'co-sl4', type: 'custom', label: 'Healthcare', url: '/industries/healthcare', order: 3, parentId: 'co-solutions', group: 'Industries' },
        { id: 'co-sl5', type: 'custom', label: 'Finance', url: '/industries/finance', order: 4, parentId: 'co-solutions', group: 'Industries' },
        { id: 'co-sl6', type: 'custom', label: 'Manufacturing', url: '/industries/manufacturing', order: 5, parentId: 'co-solutions', group: 'Industries' },
      ],
    },
    {
      id: 'corp-topbar', name: 'Top Bar', slots: ['topbar'], items: [
        { id: 'co-tb1', type: 'custom', label: 'Investor Relations', url: '/investors', order: 0 },
        { id: 'co-tb2', type: 'custom', label: 'Newsroom', url: '/newsroom', order: 1 },
        { id: 'co-tb3', type: 'custom', label: 'Support Portal', url: '/support', order: 2, icon: 'support' },
      ],
    },
    {
      id: 'corp-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'co-f1', type: 'custom', label: 'Solutions', url: '/solutions', order: 0 },
        { id: 'co-f2', type: 'custom', label: 'Company', url: '/about', order: 1 },
        { id: 'co-f2a', type: 'custom', label: 'Leadership', url: '/about/leadership', order: 0, parentId: 'co-f2' },
        { id: 'co-f2b', type: 'custom', label: 'Sustainability', url: '/about/sustainability', order: 1, parentId: 'co-f2' },
        { id: 'co-f3', type: 'custom', label: 'Legal', url: '/legal', order: 2 },
        { id: 'co-f3a', type: 'custom', label: 'Privacy Policy', url: '/privacy', order: 0, parentId: 'co-f3' },
        { id: 'co-f3b', type: 'custom', label: 'Terms of Service', url: '/terms', order: 1, parentId: 'co-f3' },
        { id: 'co-f3c', type: 'custom', label: 'Cookie Policy', url: '/cookies', order: 2, parentId: 'co-f3' },
      ],
    },
  ],
};

const COMMUNITY_FORUM: MenuPreset = {
  id: 'community-forum',
  name: 'Community / Forum',
  description: 'Social-driven nav with user areas, discussions, events, and member-only sections.',
  category: 'community',
  tags: ['forum', 'social', 'membership', 'community', 'network'],
  menus: [
    {
      id: 'comm-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'cm-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home' },
        { id: 'cm-forum', type: 'custom', label: 'Discussions', url: '/forum', order: 1, icon: 'chat' },
        { id: 'cm-events', type: 'custom', label: 'Events', url: '/events', order: 2, icon: 'calendar' },
        { id: 'cm-members', type: 'custom', label: 'Members', url: '/members', order: 3, icon: 'team', visibility: { requireAuth: true } },
        { id: 'cm-resources', type: 'custom', label: 'Resources', url: '/resources', order: 4, icon: 'book' },
        { id: 'cm-login', type: 'route', label: 'Sign In', url: '/auth?mode=login', order: 5, appearance: 'ghost', visibility: { guestOnly: true } },
        { id: 'cm-join', type: 'route', label: 'Join Community', url: '/auth?mode=signup', order: 6, appearance: 'primary', template: 'cta', visibility: { guestOnly: true }, analyticsTag: 'header_cta_join' },
        { id: 'cm-profile', type: 'route', label: 'My Profile', url: '/profile', order: 7, appearance: 'outline', visibility: { requireAuth: true }, icon: 'user' },
      ],
    },
    {
      id: 'comm-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'cm-f1', type: 'custom', label: 'Community', url: '/about', order: 0 },
        { id: 'cm-f1a', type: 'custom', label: 'Guidelines', url: '/guidelines', order: 0, parentId: 'cm-f1' },
        { id: 'cm-f1b', type: 'custom', label: 'Moderators', url: '/moderators', order: 1, parentId: 'cm-f1' },
        { id: 'cm-f2', type: 'custom', label: 'Privacy', url: '/privacy', order: 1 },
        { id: 'cm-f3', type: 'custom', label: 'Terms', url: '/terms', order: 2 },
      ],
    },
  ],
};

const EDUCATION_PLATFORM: MenuPreset = {
  id: 'education-platform',
  name: 'Education / LMS',
  description: 'Learning platform nav with courses, instructors, certifications, and student dashboards.',
  category: 'education',
  tags: ['school', 'courses', 'lms', 'university', 'learning'],
  menus: [
    {
      id: 'edu-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'ed-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home' },
        { id: 'ed-courses', type: 'custom', label: 'Courses', url: '/courses', order: 1, icon: 'book',
          layout: { type: 'mega', columns: 2 } },
        { id: 'ed-instructors', type: 'custom', label: 'Instructors', url: '/instructors', order: 2, icon: 'team' },
        { id: 'ed-certifications', type: 'custom', label: 'Certifications', url: '/certifications', order: 3, icon: 'certificate', badge: { text: 'Pro', variant: 'primary' } },
        { id: 'ed-blog', type: 'route', label: 'Blog', url: '/blog', order: 4, icon: 'blog' },
        { id: 'ed-dashboard', type: 'route', label: 'My Learning', url: '/dashboard', order: 5, appearance: 'outline', visibility: { requireAuth: true }, icon: 'dashboard' },
        { id: 'ed-enroll', type: 'route', label: 'Enroll Now', url: '/auth?mode=signup', order: 6, appearance: 'primary', template: 'cta', visibility: { guestOnly: true }, analyticsTag: 'header_cta_enroll' },
        // Course sub-items
        { id: 'ed-c1', type: 'custom', label: 'Web Development', url: '/courses/web-development', order: 0, parentId: 'ed-courses', group: 'Technology' },
        { id: 'ed-c2', type: 'custom', label: 'Data Science', url: '/courses/data-science', order: 1, parentId: 'ed-courses', group: 'Technology' },
        { id: 'ed-c3', type: 'custom', label: 'Design', url: '/courses/design', order: 2, parentId: 'ed-courses', group: 'Creative' },
        { id: 'ed-c4', type: 'custom', label: 'Business', url: '/courses/business', order: 3, parentId: 'ed-courses', group: 'Professional' },
      ],
    },
    {
      id: 'edu-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'ed-f1', type: 'custom', label: 'Platform', url: '/about', order: 0 },
        { id: 'ed-f1a', type: 'custom', label: 'For Students', url: '/for-students', order: 0, parentId: 'ed-f1' },
        { id: 'ed-f1b', type: 'custom', label: 'For Instructors', url: '/teach', order: 1, parentId: 'ed-f1' },
        { id: 'ed-f2', type: 'custom', label: 'Support', url: '/support', order: 1 },
        { id: 'ed-f3', type: 'custom', label: 'Privacy', url: '/privacy', order: 2 },
      ],
    },
  ],
};

const NEWS_MEDIA: MenuPreset = {
  id: 'news-media',
  name: 'News / Media Outlet',
  description: 'Multi-section news layout with breaking news topbar, sections, and trending.',
  category: 'media',
  tags: ['news', 'journalism', 'media', 'newspaper', 'broadcasting'],
  menus: [
    {
      id: 'news-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'nw-home', type: 'route', label: 'Home', url: '/', order: 0, icon: 'home' },
        { id: 'nw-local', type: 'custom', label: 'Local', url: '/local', order: 1 },
        { id: 'nw-national', type: 'custom', label: 'National', url: '/national', order: 2 },
        { id: 'nw-world', type: 'custom', label: 'World', url: '/world', order: 3, icon: 'globe' },
        { id: 'nw-politics', type: 'custom', label: 'Politics', url: '/politics', order: 4 },
        { id: 'nw-tech', type: 'custom', label: 'Tech', url: '/tech', order: 5 },
        { id: 'nw-opinion', type: 'custom', label: 'Opinion', url: '/opinion', order: 6 },
        { id: 'nw-video', type: 'custom', label: 'Video', url: '/video', order: 7, icon: 'video' },
        { id: 'nw-subscribe', type: 'custom', label: 'Subscribe', url: '/subscribe', order: 8, appearance: 'primary', template: 'cta', analyticsTag: 'header_cta_subscribe' },
      ],
    },
    {
      id: 'news-topbar', name: 'Breaking News Bar', slots: ['topbar'], items: [
        { id: 'nw-tb1', type: 'custom', label: 'Live Updates', url: '/live', order: 0, badge: { text: 'LIVE', variant: 'danger' }, icon: 'notification' },
        { id: 'nw-tb2', type: 'custom', label: 'Trending', url: '/trending', order: 1 },
        { id: 'nw-tb3', type: 'custom', label: 'Newsletter', url: '/newsletter', order: 2, icon: 'mail' },
      ],
    },
    {
      id: 'news-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'nw-f1', type: 'custom', label: 'Sections', url: '#', order: 0 },
        { id: 'nw-f1a', type: 'custom', label: 'Local', url: '/local', order: 0, parentId: 'nw-f1' },
        { id: 'nw-f1b', type: 'custom', label: 'National', url: '/national', order: 1, parentId: 'nw-f1' },
        { id: 'nw-f1c', type: 'custom', label: 'World', url: '/world', order: 2, parentId: 'nw-f1' },
        { id: 'nw-f2', type: 'custom', label: 'About', url: '/about', order: 1 },
        { id: 'nw-f2a', type: 'custom', label: 'Masthead', url: '/about/masthead', order: 0, parentId: 'nw-f2' },
        { id: 'nw-f2b', type: 'custom', label: 'Ethics Policy', url: '/about/ethics', order: 1, parentId: 'nw-f2' },
        { id: 'nw-f3', type: 'custom', label: 'Advertise', url: '/advertise', order: 2 },
        { id: 'nw-f4', type: 'custom', label: 'Privacy', url: '/privacy', order: 3 },
      ],
    },
  ],
};

const MINIMAL_LANDING: MenuPreset = {
  id: 'minimal-landing',
  name: 'Minimal / Landing Page',
  description: 'Clean, minimal navigation for single-page or landing-page sites.',
  category: 'minimal',
  tags: ['landing', 'minimal', 'onepage', 'simple', 'startup'],
  menus: [
    {
      id: 'min-header', name: 'Header Menu', slots: ['header'], items: [
        { id: 'mn-home', type: 'route', label: 'Home', url: '/', order: 0 },
        { id: 'mn-features', type: 'custom', label: 'Features', url: '/#features', order: 1 },
        { id: 'mn-pricing', type: 'custom', label: 'Pricing', url: '/#pricing', order: 2 },
        { id: 'mn-faq', type: 'custom', label: 'FAQ', url: '/#faq', order: 3 },
        { id: 'mn-cta', type: 'custom', label: 'Get Started', url: '/auth?mode=signup', order: 4, appearance: 'primary', template: 'cta', analyticsTag: 'header_cta_start' },
      ],
    },
    {
      id: 'min-footer', name: 'Footer Menu', slots: ['footer'], items: [
        { id: 'mn-f1', type: 'custom', label: 'Privacy', url: '/privacy', order: 0 },
        { id: 'mn-f2', type: 'custom', label: 'Terms', url: '/terms', order: 1 },
        { id: 'mn-f3', type: 'route', label: 'Contact', url: '/contact', order: 2 },
      ],
    },
  ],
};

// ─── Preset Registry ────────────────────────────────────────────────────────

/**
 * All available menu presets. Immutable reference — use `clonePresetMenus`
 * to create mutable copies for editing.
 */
export const MENU_PRESETS: MenuPreset[] = [
  SERVICE_BUSINESS,
  STUDIO_PORTFOLIO,
  ECOMMERCE_STORE,
  SAAS_PRODUCT,
  BLOG_FOCUSED,
  CORPORATE_ENTERPRISE,
  COMMUNITY_FORUM,
  EDUCATION_PLATFORM,
  NEWS_MEDIA,
  MINIMAL_LANDING,
];

/** Look up a preset by its ID. */
export const getPresetById = (id: string): MenuPreset | undefined =>
  MENU_PRESETS.find((p) => p.id === id);

/** Filter presets by category. */
export const getPresetsByCategory = (
  category: string,
): MenuPreset[] =>
  MENU_PRESETS.filter((p) => p.category === category);

/** Search presets by tag. */
export const searchPresets = (query: string): MenuPreset[] => {
  const lower = query.toLowerCase();
  return MENU_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags?.some((t) => t.toLowerCase().includes(lower)),
  );
};

// ─── Deep Clone ─────────────────────────────────────────────────────────────

/**
 * Deep-clone a preset's menus with freshly generated IDs.
 * Safe to mutate without affecting the original preset.
 */
export const clonePresetMenus = (preset: MenuPreset): Menu[] => {
  const idMap = new Map<string, string>();
  let counter = 0;

  // Map old → new IDs for all items
  preset.menus.forEach((menu) => {
    menu.items.forEach((item) => {
      counter++;
      idMap.set(item.id, generateMenuItemId(`preset-${counter}`));
    });
  });

  return preset.menus.map((menu, menuIndex) => {
    const newMenuId = generateMenuId(`preset-menu-${menuIndex + 1}`);
    const items: MenuItem[] = menu.items.map((item) => ({
      ...item,
      id: idMap.get(item.id) ?? item.id,
      parentId: item.parentId ? idMap.get(item.parentId) : undefined,
    }));
    return {
      ...menu,
      id: newMenuId,
      items,
      enabled: true,
    };
  });
};
