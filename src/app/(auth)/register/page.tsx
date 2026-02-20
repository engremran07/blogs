"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, UserPlus, Eye, EyeOff, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import { PasswordStrengthIndicator, isPasswordValid } from "@/components/ui/PasswordStrengthIndicator";
import Captcha from "@/features/captcha/ui/Captcha";

export default function RegisterPage() {
  const router = useRouter();
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaId, setCaptchaId] = useState<string | undefined>();
  const [captchaType, setCaptchaType] = useState<string | undefined>();
  const [captchaNonce, setCaptchaNonce] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Check if registration is enabled
  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => setRegistrationEnabled(d.data?.enableRegistration !== false))
      .catch(() => setRegistrationEnabled(true));
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid(form.password)) {
      setError("Password does not meet all requirements");
      return;
    }

    if (!agreedToTerms) {
      setError("You must agree to the Privacy Policy and Terms of Service");
      return;
    }

    if (!captchaToken) {
      setError("Please complete the security check");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          captchaToken,
          captchaType,
          captchaId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        toast("Account created! Please sign in.", "success");
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

  // Loading state while checking registration availability
  if (registrationEnabled === null) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Registration disabled
  if (!registrationEnabled) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <ShieldOff className="h-7 w-7 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registration is closed</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            New account creation is currently disabled by the site administrator.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            B
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create an account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Join the community and start interacting
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
              label="Username"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              placeholder="johndoe"
              required
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="username"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
              required
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
            />
            <Input
              label="Password"
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
            <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                required
              />
              <span>
                I agree to the{" "}
                <Link href="/privacy-policy" target="_blank" className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms-of-service" target="_blank" className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
                  Terms of Service
                </Link>
              </span>
            </label>
          </div>

          <div className="mt-4">
            <Captcha
              onVerify={(token, id, type) => {
                setCaptchaToken(token);
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
            icon={<UserPlus className="h-4 w-4" />}
          >
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
