"use client";

import { Facebook, Twitter, Linkedin, Link2, Check, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface PostCardShareOverlayProps {
  slug: string;
  title: string;
}

export function PostCardShareOverlay({ slug, title }: PostCardShareOverlayProps) {
  const [copied, setCopied] = useState(false);

  // Resolve the absolute URL only after mount to avoid SSR/client hydration mismatch
  const [absoluteUrl, setAbsoluteUrl] = useState(`/blog/${slug}`);

  useEffect(() => {
    setAbsoluteUrl(`${window.location.origin}/blog/${slug}`);
  }, [slug]);

  async function copyLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const encoded = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(absoluteUrl);

  const actions = [
    { label: "Facebook", icon: <Facebook className="h-3.5 w-3.5" />, url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "Twitter", icon: <Twitter className="h-3.5 w-3.5" />, url: `https://twitter.com/intent/tweet?text=${encoded}&url=${encodedUrl}` },
    { label: "LinkedIn", icon: <Linkedin className="h-3.5 w-3.5" />, url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "WhatsApp", icon: <MessageCircle className="h-3.5 w-3.5" />, url: `https://wa.me/?text=${encoded}%20${encodedUrl}` },
  ];

  return (
    <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg bg-white/90 p-1.5 shadow-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:bg-gray-800/90 backdrop-blur-sm">
      {actions.map((a) => (
        <a
          key={a.label}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          title={a.label}
          onClick={(e) => e.stopPropagation()}
          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          {a.icon}
        </a>
      ))}
      <button
        onClick={copyLink}
        title="Copy link"
        className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
