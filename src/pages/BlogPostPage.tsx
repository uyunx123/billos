import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { useConfig } from "../context/ConfigContext";
import { formatDate } from "../lib/format";
import VideoEmbed from "../components/VideoEmbed";
import JsonLd from "../components/JsonLd";
import { usePageMeta } from "../hooks/usePageMeta";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { posts } = useConfig();
  const post = slug ? posts.find((p) => p.slug === slug && p.published) : undefined;

  usePageMeta({
    title: post ? `${post.title} — ISAK Billiard Co.` : "Post not found — ISAK Billiard Co.",
    description: post?.excerpt,
    canonical: post ? `${window.location.origin}/blog/${post.slug}` : undefined,
    image: post?.image,
    type: "article",
    publishedTime: post?.date,
  });

  if (!post) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold">Post not found</h1>
        <p className="mt-2 text-foreground/60">This article may have been moved or removed.</p>
        <Link to="/blog" className="btn btn-accent mt-6">Back to blog</Link>
      </div>
    );
  }

  const others = posts.filter((p) => p.published && p.slug !== post.slug).slice(0, 2);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "ISAK Billiard Co.", logo: { "@type": "ImageObject", url: "/logo.svg" } },
    mainEntityOfPage: `${window.location.origin}/blog/${post.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={articleLd} />
      <Link to="/blog" className="btn btn-ghost -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All posts
      </Link>

      <header className="mt-6">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary-200">
          <span className="h-px w-6 bg-gradient-to-r from-gold-500 to-transparent" aria-hidden="true" />
          {post.category}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 flex items-center gap-3 text-sm font-semibold text-foreground/55">
          {post.author} · {formatDate(post.date)}
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {post.readMinutes} min read
          </span>
        </p>
      </header>

      <div className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-100 via-muted to-primary-50 ring-1 ring-border/60">
        <img src={post.image} alt="" className="aspect-[16/9] w-full object-cover" />
      </div>

      {post.videoUrl && (
        <div className="mt-6">
          <VideoEmbed url={post.videoUrl} title={`${post.title} — video`} />
        </div>
      )}

      <div className="mt-8 space-y-5 leading-relaxed text-foreground/80">
        {post.content.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <aside className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 to-primary-950 p-6 text-on-primary shadow-lift sm:p-8">
        <div className="pointer-events-none absolute inset-0 nav-grid opacity-30" aria-hidden="true" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-lg font-bold">Ready to upgrade your gear?</h2>
            <p className="text-sm text-on-primary/80">Browse the shop — every order ships fast, nationwide.</p>
          </div>
          <Link to="/shop" className="btn btn-accent shrink-0">
            Shop now <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </aside>

      {others.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-center gap-3">
            <p className="eyebrow">More to read</p>
            <span className="h-px flex-1 bg-gradient-to-r from-gold-500/40 to-transparent" aria-hidden="true" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {others.map((p) => (
              <Link
                key={p.slug}
                to={`/blog/${p.slug}`}
                className="card lift p-5 transition-colors duration-300 hover:border-gold-400/50"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary-200">{p.category}</p>
                <h3 className="mt-1 font-heading font-bold leading-snug">{p.title}</h3>
                <p className="mt-1 text-xs font-semibold text-foreground/50">{formatDate(p.date)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}