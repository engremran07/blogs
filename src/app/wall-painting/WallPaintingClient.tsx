"use client";

import { useState, type FormEvent } from "react";
import { Send, Loader2 } from "lucide-react";

export function WallPaintingClient() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);

    // Simulate form submission (replace with real API call)
    await new Promise((r) => setTimeout(r, 1200));

    setSending(false);
    setSent(true);
    setForm({ name: "", phone: "", email: "", service: "", message: "" });
    setTimeout(() => setSent(false), 5000);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="Full Name"
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <input
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          required
          placeholder="Phone Number"
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="Email Address"
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <select
          name="service"
          value={form.service}
          onChange={handleChange}
          required
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Select Service</option>
          <option value="interior">Interior Painting</option>
          <option value="exterior">Exterior Painting</option>
          <option value="textured">Textured Painting</option>
          <option value="accent">Accent Wall</option>
          <option value="specialty">Specialty Painting</option>
          <option value="decorative">Decorative / Faux</option>
          <option value="commercial">Commercial Painting</option>
        </select>
      </div>
      <textarea
        name="message"
        value={form.message}
        onChange={handleChange}
        rows={3}
        placeholder="Tell us about your project (optional)"
        className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      <button
        type="submit"
        disabled={sending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-60"
      >
        {sending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-5 w-5" />
            Get My Free Quote
          </>
        )}
      </button>
      {sent && (
        <p className="mt-3 text-center text-sm font-medium text-green-600 dark:text-green-400">
          ✓ Thank you! We&apos;ll get back to you within 24 hours.
        </p>
      )}
    </form>
  );
}
