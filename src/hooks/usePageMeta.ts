import { useEffect } from "react";

export const SITE_NAME = "ISAK Billiard Co.";

export interface PageMeta {
  title: string;
  description?: string;
  /** Absolute canonical URL. Falls back to the current page URL. */
  canonical?: string;
  image?: string;
  type?: "website" | "article" | "product";
  /** ISO date — sets article:published_time (articles only). */
  publishedTime?: string;
  /** Override robots, e.g. "noindex, nofollow" for admin/checkout pages. */
  robots?: string;
}

function ensureMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(attr: "name" | "property", key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function ensureLink(rel: string, key: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][${key}]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute(key, "");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Per-route SEO: sets title, meta description, canonical, Open Graph, Twitter
 * Card, robots and article timestamps for the current page. Each page calls it
 * once with its own metadata.
 */
export function usePageMeta({
  title,
  description,
  canonical,
  image,
  type = "website",
  publishedTime,
  robots,
}: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    const descEl = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = descEl?.getAttribute("content") ?? null;

    const exactUrl = canonical ?? window.location.href;
    document.title = title;
    if (description) ensureMeta("name", "description", description);
    else removeMeta("name", "description");

    ensureLink("canonical", "data-page-canonical", exactUrl);
    ensureMeta("property", "og:title", title);
    ensureMeta("property", "og:type", type === "article" ? "article" : type);
    ensureMeta("property", "og:url", exactUrl);
    ensureMeta("property", "og:site_name", SITE_NAME);
    ensureMeta("property", "og:locale", "en_ID");
    if (description) ensureMeta("property", "og:description", description);
    if (image) ensureMeta("property", "og:image", image);
    if (publishedTime) ensureMeta("property", "article:published_time", publishedTime);
    else removeMeta("property", "article:published_time");

    ensureMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    ensureMeta("name", "twitter:title", title);
    if (description) ensureMeta("name", "twitter:description", description);
    if (image) ensureMeta("name", "twitter:image", image);

    if (robots) ensureMeta("name", "robots", robots);
    else removeMeta("name", "robots");

    return () => {
      document.title = prevTitle;
      if (prevDesc) ensureMeta("name", "description", prevDesc);
      else removeMeta("name", "description");
    };
  }, [title, description, canonical, image, type, publishedTime, robots]);
}