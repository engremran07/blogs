"use client";

import { useState } from "react";
import { Send, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import Captcha from "@/features/captcha/ui/Captcha";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaNonce, setCaptchaNonce] = useState(0);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast("Please fill in all required fields.", "error");
      return;
    }
    if (!captchaToken) {
      toast("Please complete the security check.", "error");
      return;
    }
    setSending(true);
    // In production, POST to a contact API / email service
    await new Promise((r) => setTimeout(r, 1000));
    toast("Message sent! We'll get back to you soon.", "success");
    setForm({ name: "", email: "", subject: "", message: "" });
    setCaptchaNonce((n) => n + 1);
    setCaptchaToken("");
    setSending(false);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Contact Us</h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          Have a question, suggestion, or want to collaborate? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Contact Info */}
        <div className="space-y-6">
          {[
            { icon: Mail, label: "Email", value: "contact@myblog.com" },
            { icon: MapPin, label: "Location", value: "San Francisco, CA" },
            { icon: Phone, label: "Phone", value: "+1 (555) 123-4567" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-900/30">
                <item.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-6 grid gap-6 sm:grid-cols-2">
              <Input
                label="Name *"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="mb-6">
              <Input
                label="Subject"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="What is this about?"
              />
            </div>
            <div className="mb-6">
              <Textarea
                label="Message *"
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Your message..."
                rows={6}
              />
            </div>
            <div className="mb-6">
              <Captcha
                onVerify={(token) => setCaptchaToken(token)}
                resetNonce={captchaNonce}
              />
            </div>
            <Button type="submit" loading={sending} icon={<Send className="h-4 w-4" />}>
              Send Message
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
