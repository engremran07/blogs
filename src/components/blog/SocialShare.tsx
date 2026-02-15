"use client";

import { Facebook, Twitter, Linkedin, Link2, Check, Mail, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface SocialShareProps {
  title: string;
  url: string;
  compact?: boolean;
}

export function SocialShare({ title, url, compact = false }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  // Resolve the absolute URL only after mount so SSR and the first client
  // render produce identical markup (both use the raw `url` prop).
  const [absoluteUrl, setAbsoluteUrl] = useState(url);

  useEffect(() => {
    if (!url.startsWith("http")) {
      setAbsoluteUrl(`${window.location.origin}${url}`);
    }
  }, [url]);

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(absoluteUrl);

  const shareLinks = [
    {
      label: "Facebook",
      icon: <Facebook className="h-4 w-4" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:bg-blue-600 hover:text-white",
    },
    {
      label: "Twitter",
      icon: <Twitter className="h-4 w-4" />,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: "hover:bg-sky-500 hover:text-white",
    },
    {
      label: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:bg-blue-700 hover:text-white",
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: "hover:bg-green-500 hover:text-white",
    },
    {
      label: "Email",
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      color: "hover:bg-gray-600 hover:text-white",
    },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      {!compact && <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Share:</span>}
      {shareLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target={link.label === "Email" ? "_self" : "_blank"}
          rel="noopener noreferrer"
          title={link.label}
          onClick={(e) => e.stopPropagation()}
          className={`rounded-lg border border-gray-200 p-2 text-gray-500 transition-all dark:border-gray-600 dark:text-gray-400 ${link.color}`}
        >
          {link.icon}
        </a>
      ))}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyLink(); }}
        title="Copy link"
        className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-all hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
