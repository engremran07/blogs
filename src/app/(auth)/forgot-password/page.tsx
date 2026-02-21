"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import Captcha from "@/features/captcha/ui/Captcha";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaId, setCaptchaId] = useState<string | undefined>();
  const [captchaType, setCaptchaType] = useState<string | undefined>();
  const [captchaNonce, setCaptchaNonce] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          captchaToken,
          captchaType,
          captchaId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to send reset link");
      } else {
        const msg = data.message || "If this email exists, a reset link was sent.";
        setMessage(msg);
        toast(msg, "success");
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot your password?</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter your email and we will send a reset link.
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
          {message && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              {message}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
          />

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
            icon={<Send className="h-4 w-4" />}
          >
            Send Reset Link
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="inline-flex items-center gap-2 font-medium text-primary hover:text-primary/80">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
