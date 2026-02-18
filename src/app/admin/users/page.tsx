"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Users, Trash2, Search, CheckSquare, Square,
  ChevronDown, MoreHorizontal, UserPlus, Shield, Edit2,
  Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/FormFields";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { PasswordStrengthIndicator, isPasswordValid } from "@/components/ui/PasswordStrengthIndicator";
import { toast } from "@/components/ui/Toast";
import { AdminPagination, ADMIN_PAGE_SIZE } from "@/components/ui/AdminPagination";

interface UserRow {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  bio: string | null;
  website: string | null;
  phoneNumber: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
  github: string | null;
  _count: { posts: number; comments: number };
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  ADMINISTRATOR: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  EDITOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  AUTHOR: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CONTRIBUTOR: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  SUBSCRIBER: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const roles = ["SUBSCRIBER", "CONTRIBUTOR", "AUTHOR", "EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPage = ADMIN_PAGE_SIZE;
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Create user modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", role: "SUBSCRIBER" });
  const [creating, setCreating] = useState(false);

  // Edit user modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ username: "", email: "", displayName: "", firstName: "", lastName: "", role: "SUBSCRIBER", password: "", bio: "", website: "", phoneNumber: "", facebook: "", twitter: "", instagram: "", linkedin: "", github: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{ action: string; label: string } | null>(null);
  const [bulkRole, setBulkRole] = useState("SUBSCRIBER");
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Close bulk menu on click outside
  useEffect(() => {
    if (!bulkMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) setBulkMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bulkMenuOpen]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(perPage));
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.data || []);
      if (data.total !== undefined) {
        setTotalUsers(data.total);
        setTotalPages(data.totalPages);
      }
    } catch { toast("Failed to fetch users", "error"); }
    finally { setLoading(false); }
  }, [page, search, roleFilter, perPage]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function changeRole(userId: string, role: string) {
    try {
      const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, role }) });
      const data = await res.json();
      if (data.success) { toast("Role updated", "success"); fetchUsers(); }
      else toast(data.error || "Failed to update role", "error");
    } catch { toast("Failed to update role", "error"); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: [deleteId] }),
      });
      const data = await res.json();
      if (data.success) { toast("User deleted", "success"); fetchUsers(); }
      else toast(data.error || "Failed to delete", "error");
    } catch { toast("Failed to delete user", "error"); }
    finally { setDeleteId(null); }
  }

  async function handleCreate() {
    if (!createForm.username || !createForm.email || !createForm.password) {
      toast("All fields required", "error"); return;
    }
    if (!isPasswordValid(createForm.password)) {
      toast("Password does not meet the security policy", "error"); return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success || data.data) {
        // Set role if not subscriber
        if (createForm.role !== "SUBSCRIBER" && data.data?.id) {
          await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.data.id, role: createForm.role }) });
        }
        toast("User created!", "success");
        setCreateOpen(false);
        setCreateForm({ username: "", email: "", password: "", role: "SUBSCRIBER" });
        fetchUsers();
      } else toast(data.error || "Failed to create user", "error");
    } catch { toast("Failed to create user", "error"); }
    finally { setCreating(false); }
  }

  function openEditUser(user: UserRow) {
    setEditUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      displayName: user.displayName || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role,
      password: "",
      bio: user.bio || "",
      website: user.website || "",
      phoneNumber: user.phoneNumber || "",
      facebook: user.facebook || "",
      twitter: user.twitter || "",
      instagram: user.instagram || "",
      linkedin: user.linkedin || "",
      github: user.github || "",
    });
  }

  async function handleEditSave() {
    if (!editUser) return;
    if (editForm.password && !isPasswordValid(editForm.password)) {
      toast("Password does not meet the security policy", "error"); return;
    }
    setEditSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editUser.id,
          username: editForm.username,
          email: editForm.email,
          displayName: editForm.displayName || null,
          firstName: editForm.firstName || null,
          lastName: editForm.lastName || null,
          bio: editForm.bio || null,
          website: editForm.website || null,
          phoneNumber: editForm.phoneNumber || null,
          facebook: editForm.facebook || null,
          twitter: editForm.twitter || null,
          instagram: editForm.instagram || null,
          linkedin: editForm.linkedin || null,
          github: editForm.github || null,
          ...(editForm.password ? { password: editForm.password } : {}),
          role: editForm.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("User updated!", "success");
        setEditUser(null);
        fetchUsers();
      } else toast(data.error || "Failed to update user", "error");
    } catch { toast("Failed to update user", "error"); }
    finally { setEditSaving(false); }
  }

  // Server-side pagination — users are already filtered/paginated from the API
  const paginatedUsers = users;

  // Debounce search to avoid excessive API calls
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  }

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value);
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    setSelected(selected.size === paginatedUsers.length ? new Set() : new Set(paginatedUsers.map((u) => u.id)));
  }

  async function executeBulkAction() {
    if (!bulkConfirm) return;
    try {
      const body: Record<string, unknown> = { action: bulkConfirm.action, ids: Array.from(selected) };
      if (bulkConfirm.action === "changeRole") body.role = bulkRole;
      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) { toast(data.message, "success"); setSelected(new Set()); fetchUsers(); }
      else toast(data.error || "Bulk action failed", "error");
    } catch { toast("Bulk action failed", "error"); }
    finally { setBulkConfirm(null); setBulkMenuOpen(false); }
  }

  const allSelected = paginatedUsers.length > 0 && selected.size === paginatedUsers.length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{totalUsers} registered users</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<UserPlus className="h-4 w-4" />}>Add User</Button>
      </div>

      {/* Search + Filters + Bulk */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-50 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input defaultValue={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search users..." className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
        </div>
        <select value={roleFilter} onChange={(e) => handleRoleFilterChange(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          <option value="">All Roles</option>
          {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>

        {selected.size > 0 && (
          <div className="relative" ref={bulkMenuRef}>
            <Button variant="secondary" onClick={() => setBulkMenuOpen(!bulkMenuOpen)} icon={<MoreHorizontal className="h-4 w-4" />}>
              Bulk ({selected.size}) <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {bulkMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="px-4 py-2">
                  <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Change Role To:</p>
                  <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                    {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select>
                  <button onClick={() => setBulkConfirm({ action: "changeRole", label: `change role to ${bulkRole.replace("_", " ")}` })} className="mt-2 flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><Shield className="h-4 w-4 text-blue-500" /> Apply Role</button>
                </div>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button onClick={() => setBulkConfirm({ action: "delete", label: "delete" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /> Delete</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-700 dark:bg-gray-800/80">
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    {allSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">User</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Role</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Posts</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Comments</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Joined</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></td>
                    ))}</tr>
                  ))
                : paginatedUsers.map((user) => (
                    <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${selected.has(user.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(user.id)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          {selected.has(user.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEditUser(user)} className="flex items-center gap-3 text-left hover:opacity-80">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {(user.displayName || user.username)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">{user.displayName || user.username}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600 dark:text-gray-400">{user.email}</span>
                          {user.isEmailVerified && <span className="text-green-500" title="Verified">✓</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={user.role} onChange={(e) => changeRole(user.id, e.target.value)} className={`rounded px-2 py-1 text-xs font-medium ${roleColors[user.role] || ""} border-0 cursor-pointer`}>
                          {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user._count.posts}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user._count.comments}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditUser(user)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                            title="Edit user"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(user.id)}
                            className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete user"
                            disabled={user.role === "SUPER_ADMIN"}
                          >
                            <Trash2 className={`h-4 w-4 ${user.role === "SUPER_ADMIN" ? "opacity-30" : ""}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && paginatedUsers.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>
        <AdminPagination page={page} totalPages={totalPages} total={totalUsers} onPageChange={setPage} />
      </div>

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add New User">
        <div className="space-y-4">
          <Input label="Username" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} placeholder="username" />
          <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="user@example.com" />
          <div className="relative">
            <Input label="Password" type={showCreatePassword ? "text" : "password"} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Enter a strong password" />
            <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrengthIndicator password={createForm.password} showWhenEmpty />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
              {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} loading={creating}>Create User</Button>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First name" />
            <Input label="Last Name" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="Last name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Display Name" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} placeholder="Display name" />
            <Input label="Username" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} placeholder="username" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="user@example.com" />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                {roles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="relative">
            <Input label="New Password" type={showEditPassword ? "text" : "password"} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
            <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {editForm.password && <PasswordStrengthIndicator password={editForm.password} />}

          <hr className="border-gray-200 dark:border-gray-700" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Profile</p>
          <Textarea label="Bio" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Brief biography..." rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Website" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="https://example.com" />
            <Input label="Phone" value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} placeholder="+1 555-0100" />
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Social Links</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Facebook" value={editForm.facebook} onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })} placeholder="https://facebook.com/..." />
            <Input label="Twitter / X" value={editForm.twitter} onChange={(e) => setEditForm({ ...editForm, twitter: e.target.value })} placeholder="https://x.com/..." />
            <Input label="Instagram" value={editForm.instagram} onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })} placeholder="https://instagram.com/..." />
            <Input label="LinkedIn" value={editForm.linkedin} onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
            <Input label="GitHub" value={editForm.github} onChange={(e) => setEditForm({ ...editForm, github: e.target.value })} placeholder="https://github.com/..." />
          </div>

          {editUser && (
            <div className="flex items-center gap-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <span><strong>Posts:</strong> {editUser._count.posts}</span>
              <span><strong>Comments:</strong> {editUser._count.comments}</span>
              <span><strong>Joined:</strong> {new Date(editUser.createdAt).toLocaleDateString()}</span>
              <span><strong>Verified:</strong> {editUser.isEmailVerified ? "Yes" : "No"}</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between">
          <button
            onClick={() => { if (editUser) { setDeleteId(editUser.id); setEditUser(null); } }}
            disabled={editUser?.role === "SUPER_ADMIN"}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEditSave} loading={editSaving}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete User" message="Permanently delete this user and all their content?" confirmText="Delete" variant="danger" />
      <ConfirmDialog open={!!bulkConfirm} onClose={() => { setBulkConfirm(null); setBulkMenuOpen(false); }} onConfirm={executeBulkAction} title={`Bulk ${bulkConfirm?.label || ""}`} message={`${bulkConfirm?.label} ${selected.size} user(s)?`} confirmText={bulkConfirm?.action === "delete" ? "Delete All" : "Confirm"} variant={bulkConfirm?.action === "delete" ? "danger" : "primary"} />
    </div>
  );
}
