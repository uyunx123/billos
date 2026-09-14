import { Link } from "react-router-dom";
import { Clock3 } from "lucide-react";
import { useConfig } from "../context/ConfigContext";
import { formatDate } from "../lib/format";
import { usePageMeta } from "../hooks/usePageMeta";

export default function BlogPage() {
  const { posts } = useConfig();
  const published = posts.filter((p) => p.published);

  usePageMeta({
    title: "Billiard Blog — Guides, Events & Table Care | ISAK Billiard Co.",
    description:
      "Written by players, for players: buying guides for your first cue, tournament wrap-ups, table care routines and game-day tips from ISAK Billiard Co.",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 shadow-soft sm:px-10 sm:py-12">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <p className="eyebrow">The Journal</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Guides, events &amp; table care
        </h1>
        <p className="mt-3 max-w-lg text-foreground/65 sm:text-base">
          Written by players, for players. Everything from your first cue to
          keeping your club table playing tournament-fast.
        </p>
      </div>

      <ul className="grid gap-6 md:grid-cols-2">
        {published.map((post) => (
          <li key={post.slug}>
            <Link
              to={`/blog/${post.slug}`}
              className="card lift group flex h-full flex-col overflow-hidden"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                />
                <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-primary-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-200 backdrop-blur">
                  {post.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-6">
                <h2 className="font-heading text-xl font-bold leading-snug transition-colors duration-150 group-hover:text-gold-300">
                  {post.title}
                </h2>
                <p className="text-sm text-foreground/60">{post.excerpt}</p>
                <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-foreground/50">
                  {post.author} · {formatDate(post.date)}
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {post.readMinutes} min
                  </span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}