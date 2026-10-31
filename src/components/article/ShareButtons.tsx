"use client";

import { useToast } from "@/components/ui/Toaster";

/** Native share where available; otherwise copy link, email, WhatsApp, LinkedIn, X and Facebook (plain links, no scripts). */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const toast = useToast();
  const enc = encodeURIComponent;
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return; // the reader cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Couldn’t copy the link", "error");
    }
  };
  const link =
    "text-[0.85rem] text-muted underline decoration-rule underline-offset-4 hover:text-fg hover:decoration-thread";
  return (
    <div>
      <button
        type="button"
        onClick={share}
        className="border-rule hover:border-fg w-full rounded-sm border px-4 py-2.5 text-left text-[0.92rem]"
      >
        Share this article
      </button>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <a className={link} href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}>
          Email
        </a>
        <a
          className={link}
          href={`https://wa.me/?text=${enc(`${title} ${url}`)}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          WhatsApp
        </a>
        <a
          className={link}
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          LinkedIn
        </a>
        <a
          className={link}
          href={`https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          X
        </a>
        <a
          className={link}
          href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          Facebook
        </a>
      </p>
    </div>
  );
}
