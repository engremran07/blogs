"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Save,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Camera,
  ArrowLeft,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import {
  PasswordStrengthIndicator,
  isPasswordValid,
} from "@/components/ui/PasswordStrengthIndicator";
import { Avatar } from "@/components/ui/Card";

interface ProfileForm {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  website: string;
  avatarUrl: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>({
    displayName: "",
    username: "",
    email: "",
    bio: "",
    website: "",
    avatarUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password change section
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/profile");
      return;
    }
    if (session?.user) {
      setForm({
        displayName: session.user.displayName || session.user.name || "",
        username: session.user.username || "",
        email: session.user.email || "",
        bio: session.user.bio || "",
        website: session.user.website || "",
        avatarUrl: session.user.image || "",
      });
      setLoading(false);
    }
  }, [session, status, router]);

  function update(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          bio: form.bio,
          website: form.website,
        }),
      });
      if (res.ok) {
        toast("Profile updated!", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update profile", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }
    if (!isPasswordValid(passwordForm.newPassword)) {
      toast("Password does not meet all requirements", "error");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (res.ok) {
        toast("Password changed!", "success");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const data = await res.json();
        toast(data.error || "Failed to change password", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
          Profile Settings
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your account information
        </p>
      </div>

      {/* Avatar & Basic Info */}
      <div className="mb-8 flex items-center gap-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="relative">
          <Avatar
            src={form.avatarUrl}
            fallback={form.displayName || form.username}
            size="lg"
          />
          <button className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-white shadow-md hover:bg-primary/90">
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {form.displayName || form.username}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            @{form.username}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {form.email}
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <form
        onSubmit={handleSave}
        className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          <User className="mr-2 inline h-5 w-5" />
          Personal Information
        </h3>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Display Name"
              value={form.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              placeholder="Your display name"
              leftIcon={<User className="h-4 w-4" />}
            />
            <Input
              label="Username"
              value={form.username}
              disabled
              leftIcon={<span className="text-xs text-gray-400">@</span>}
              hint="Username cannot be changed"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            disabled
            leftIcon={<Mail className="h-4 w-4" />}
            hint="Contact an admin to change your email"
          />
          <Textarea
            label="Bio"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="Tell the world about yourself..."
            rows={3}
          />
          <Input
            label="Website"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://yourwebsite.com"
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            loading={saving}
            icon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>

      {/* Password Change */}
      <form
        onSubmit={handlePasswordChange}
        className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          <Lock className="mr-2 inline h-5 w-5" />
          Change Password
        </h3>
        <div className="space-y-4">
          <Input
            label="Current Password"
            type={showPasswords ? "text" : "password"}
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm((p) => ({
                ...p,
                currentPassword: e.target.value,
              }))
            }
            placeholder="Enter current password"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPasswords ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="New Password"
              type={showPasswords ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
              }
              placeholder="New password"
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Confirm New Password"
              type={showPasswords ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((p) => ({
                  ...p,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="Repeat new password"
              leftIcon={<Lock className="h-4 w-4" />}
            />
          </div>
          <PasswordStrengthIndicator
            password={passwordForm.newPassword}
            confirmPassword={passwordForm.confirmPassword}
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            loading={changingPassword}
            variant="outline"
            icon={<Lock className="h-4 w-4" />}
          >
            Change Password
          </Button>
        </div>
      </form>

      {/* Data Export */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Download className="mr-2 inline h-5 w-5" />
          Export Your Data
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Download a copy of all your personal data in JSON format (GDPR Article
          20).
        </p>
        <Button
          variant="outline"
          loading={exporting}
          icon={<Download className="h-4 w-4" />}
          onClick={async () => {
            setExporting(true);
            try {
              const res = await fetch("/api/profile");
              if (!res.ok) throw new Error("Export failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `my-data-export.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast("Data export downloaded.", "success");
            } catch {
              toast("Failed to export data. Please try again.", "error");
            }
            setExporting(false);
          }}
        >
          Download My Data
        </Button>
      </div>

      {/* Delete Account */}
      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/20">
        <h3 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">
          <AlertTriangle className="mr-2 inline h-5 w-5" />
          Delete Account
        </h3>
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        {!showDeleteSection ? (
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400"
            onClick={() => setShowDeleteSection(true)}
            icon={<Trash2 className="h-4 w-4" />}
          >
            I want to delete my account
          </Button>
        ) : (
          <div className="space-y-4">
            <Input
              label="Enter your password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your current password"
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Input
              label='Type "DELETE MY ACCOUNT" to confirm'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteSection(false);
                  setDeletePassword("");
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="border-red-300 bg-red-600 text-white hover:bg-red-700"
                loading={deleting}
                disabled={
                  deleteConfirm !== "DELETE MY ACCOUNT" || !deletePassword
                }
                icon={<Trash2 className="h-4 w-4" />}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const res = await fetch("/api/profile", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        password: deletePassword,
                        confirmText: deleteConfirm,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      toast(data.error || "Failed to delete account", "error");
                      setDeleting(false);
                      return;
                    }
                    toast("Account deleted. Redirecting...", "success");
                    setTimeout(() => router.push("/"), 2000);
                  } catch {
                    toast("Network error. Please try again.", "error");
                    setDeleting(false);
                  }
                }}
              >
                Permanently Delete Account
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
