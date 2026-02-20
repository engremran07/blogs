"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Link2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  label: string;
  url: string;
  target: string;
  parentId: string | null;
  order: number;
  visible: boolean;
  children?: MenuItem[];
}

interface MenuData {
  id: string;
  name: string;
  slot: string;
  enabled: boolean;
  items: MenuItem[];
}

// ─── URL Safety ─────────────────────────────────────────────────────────────

/** Dangerous URI schemes that must be rejected in menu URLs. */
const DANGEROUS_URL_PATTERN = /^\s*(javascript|data|vbscript)\s*:/i;

/** Returns true if the URL is safe for use in navigation. */
function isSafeMenuUrl(url: string): boolean {
  return !DANGEROUS_URL_PATTERN.test(url);
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuSlot, setNewMenuSlot] = useState("header");

  const activeMenu = menus.find((m) => m.id === activeMenuId) || null;

  // Load menus (basic mock until API is wired)
  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      const siteMenus: MenuData[] = data.data?.menuStructure || [];

      // If no menus exist, create defaults
      if (siteMenus.length === 0) {
        const defaults: MenuData[] = [
          {
            id: "header",
            name: "Header Navigation",
            slot: "header",
            enabled: true,
            items: [
              {
                id: "h1",
                label: "Home",
                url: "/",
                target: "_self",
                parentId: null,
                order: 0,
                visible: true,
              },
              {
                id: "h2",
                label: "Blog",
                url: "/blog",
                target: "_self",
                parentId: null,
                order: 1,
                visible: true,
              },
              {
                id: "h3",
                label: "Tags",
                url: "/tags",
                target: "_self",
                parentId: null,
                order: 2,
                visible: true,
              },
              {
                id: "h4",
                label: "About",
                url: "/about",
                target: "_self",
                parentId: null,
                order: 3,
                visible: true,
              },
              {
                id: "h5",
                label: "Contact",
                url: "/contact",
                target: "_self",
                parentId: null,
                order: 4,
                visible: true,
              },
            ],
          },
          {
            id: "footer",
            name: "Footer Links",
            slot: "footer",
            enabled: true,
            items: [
              {
                id: "f1",
                label: "Privacy Policy",
                url: "/privacy",
                target: "_self",
                parentId: null,
                order: 0,
                visible: true,
              },
              {
                id: "f2",
                label: "Terms of Service",
                url: "/terms",
                target: "_self",
                parentId: null,
                order: 1,
                visible: true,
              },
              {
                id: "f3",
                label: "Contact Us",
                url: "/contact",
                target: "_self",
                parentId: null,
                order: 2,
                visible: true,
              },
            ],
          },
          {
            id: "topbar",
            name: "Top Bar",
            slot: "topbar",
            enabled: false,
            items: [],
          },
        ];
        setMenus(defaults);
        setActiveMenuId("header");
      } else {
        setMenus(siteMenus);
        setActiveMenuId(siteMenus[0]?.id || null);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  const addMenu = useCallback(() => {
    if (!newMenuName.trim()) return;
    const id = `menu_${Date.now()}`;
    setMenus((prev) => [
      ...prev,
      { id, name: newMenuName, slot: newMenuSlot, enabled: true, items: [] },
    ]);
    setActiveMenuId(id);
    setNewMenuName("");
    setShowAddMenu(false);
  }, [newMenuName, newMenuSlot]);

  const deleteMenu = useCallback(
    (menuId: string) => {
      setMenus((prev) => prev.filter((m) => m.id !== menuId));
      setActiveMenuId((prev) =>
        prev === menuId ? menus[0]?.id || null : prev,
      );
    },
    [menus],
  );

  const addMenuItem = useCallback(() => {
    if (!activeMenuId) return;
    const id = `item_${Date.now()}`;
    setMenus((prev) =>
      prev.map((m) =>
        m.id === activeMenuId
          ? {
              ...m,
              items: [
                ...m.items,
                {
                  id,
                  label: "New Link",
                  url: "/",
                  target: "_self",
                  parentId: null,
                  order: m.items.length,
                  visible: true,
                },
              ],
            }
          : m,
      ),
    );
  }, [activeMenuId]);

  const updateMenuItem = useCallback(
    (
      menuId: string,
      itemId: string,
      field: string,
      value: string | boolean,
    ) => {
      // Reject dangerous URL schemes (javascript:, data:, vbscript:)
      if (
        field === "url" &&
        typeof value === "string" &&
        !isSafeMenuUrl(value)
      ) {
        toast(
          "Unsafe URL scheme rejected (javascript:, data:, vbscript: are not allowed)",
          "error",
        );
        return;
      }
      setMenus((prev) =>
        prev.map((m) =>
          m.id === menuId
            ? {
                ...m,
                items: m.items.map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item,
                ),
              }
            : m,
        ),
      );
    },
    [],
  );

  const deleteMenuItem = useCallback((menuId: string, itemId: string) => {
    setMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? { ...m, items: m.items.filter((item) => item.id !== itemId) }
          : m,
      ),
    );
  }, []);

  const toggleMenuEnabled = useCallback((menuId: string) => {
    setMenus((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, enabled: !m.enabled } : m)),
    );
  }, []);

  async function handleSave() {
    // Final safety check: reject any menus containing dangerous URLs
    for (const menu of menus) {
      for (const item of menu.items) {
        if (!isSafeMenuUrl(item.url)) {
          toast(
            `Menu "${menu.name}" contains an unsafe URL in "${item.label}". Remove it before saving.`,
            "error",
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuStructure: menus }),
      });
      if (res.ok) {
        toast("Menus saved!", "success");
      } else {
        toast("Failed to save menus", "error");
      }
    } catch {
      toast("Failed to save menus", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Menu Builder
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage navigation menus for header, footer, and top bar
          </p>
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          icon={<Save className="h-4 w-4" />}
        >
          Save All Menus
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Menu List Sidebar */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Menus
          </h2>
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => setActiveMenuId(menu.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                activeMenuId === menu.id
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <div>
                <span className="font-medium">{menu.name}</span>
                <span className="ml-2 text-xs text-gray-400">{menu.slot}</span>
              </div>
              <span
                className={`h-2 w-2 rounded-full ${menu.enabled ? "bg-green-500" : "bg-gray-300"}`}
              />
            </button>
          ))}

          {showAddMenu ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <Input
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                placeholder="Menu name..."
              />
              <Select
                value={newMenuSlot}
                onChange={(e) => setNewMenuSlot(e.target.value)}
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="topbar">Top Bar</option>
                <option value="sidebar">Sidebar</option>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addMenu}
                  disabled={!newMenuName.trim()}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddMenu(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddMenu(true)}
              className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:hover:border-blue-500"
            >
              <Plus className="h-4 w-4" /> Add Menu
            </button>
          )}
        </div>

        {/* Menu Editor */}
        <div className="lg:col-span-3">
          {activeMenu ? (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              {/* Menu Header */}
              <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {activeMenu.name}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    {activeMenu.slot}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMenuEnabled(activeMenu.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeMenu.enabled
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {activeMenu.enabled ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                    {activeMenu.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMenu(activeMenu.id)}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-4">
                {activeMenu.items.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <Link2 className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p>No menu items yet. Add your first link below.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeMenu.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800/50"
                      >
                        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-400" />
                        <div className="grid flex-1 gap-2 sm:grid-cols-3">
                          <input
                            value={item.label}
                            onChange={(e) =>
                              updateMenuItem(
                                activeMenu.id,
                                item.id,
                                "label",
                                e.target.value,
                              )
                            }
                            placeholder="Label"
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                          <input
                            value={item.url}
                            onChange={(e) =>
                              updateMenuItem(
                                activeMenu.id,
                                item.id,
                                "url",
                                e.target.value,
                              )
                            }
                            placeholder="URL"
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={item.target}
                              onChange={(e) =>
                                updateMenuItem(
                                  activeMenu.id,
                                  item.id,
                                  "target",
                                  e.target.value,
                                )
                              }
                              className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="_self">Same Tab</option>
                              <option value="_blank">New Tab</option>
                            </select>
                            <button
                              onClick={() =>
                                updateMenuItem(
                                  activeMenu.id,
                                  item.id,
                                  "visible",
                                  !item.visible,
                                )
                              }
                              className={`p-1.5 rounded ${item.visible ? "text-green-600" : "text-gray-400"}`}
                              title={item.visible ? "Visible" : "Hidden"}
                            >
                              {item.visible ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                deleteMenuItem(activeMenu.id, item.id)
                              }
                              className="p-1.5 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={addMenuItem}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:hover:border-blue-500"
                >
                  <Plus className="h-4 w-4" /> Add Menu Item
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">
                Select or create a menu to start editing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
