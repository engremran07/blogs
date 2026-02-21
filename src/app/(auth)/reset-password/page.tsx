"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import {
  PasswordStrengthIndicator,
  isPasswordValid,
} from "@/components/ui/PasswordStrengthIndicator";
import Captcha from "@/features/captcha/ui/Captcha";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaId, setCaptchaId] = useState<string | undefined>();
  const [captchaType, setCaptchaType] = useState<string | undefined>();
  const [captchaNonce, setCaptchaNonce] = useState(0);

  function update(field: "password" | "confirmPassword", value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing. Please use the link from your email.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid(form.password)) {
      setError("Password does not meet all requirements");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: form.password,
          captchaToken,
          captchaType,
          captchaId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to reset password");
      } else {
        toast("Password updated. Please sign in.", "success");
        router.push("/login");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setCaptchaNonce((n) => n + 1);
      setCaptchaToken("");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
            B
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a strong new password for your account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="New Password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Create a strong password"
              required
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              autoComplete="new-password"
            />
            <PasswordStrengthIndicator
              password={form.password}
              confirmPassword={form.confirmPassword}
            />
            <Input
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="Repeat your password"
              required
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="new-password"
            />
          </div>

          <div className="mt-4">
            <Captcha
              onVerify={(tokenValue, id, type) => {
                setCaptchaToken(tokenValue);
                setCaptchaId(id);
                setCaptchaType(type);
              }}
              resetNonce={captchaNonce}
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            fullWidth
            className="mt-4"
            icon={<ShieldCheck className="h-4 w-4" />}
            disabled={!token}
          >
            Update Password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="font-medium text-primary hover:text-primary/80">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
