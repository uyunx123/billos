import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { useConfig } from "../context/ConfigContext";

export default function CustomPage() {
  const { slug } = useParams();
  const { pages } = useConfig();
  const page = slug ? pages.find((p) => p.slug === slug && p.enabled) : undefined;

  if (!page) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-200 ring-1 ring-primary-400/40">
          <FileText className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-foreground/60">
          This page has been moved or switched off by the store owner. Head back to the
          shop — the felts are waiting.
        </p>
        <Link to="/" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the homepage
        </Link>
      </div>
    );
  }

  const paragraphs = page.content.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const siblings = pages.filter((p) => p.enabled && p.id !== page.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-12 shadow-soft sm:px-12">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <p className="eyebrow">Info</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>

        <div className="mt-8 max-w-2xl space-y-5 text-[15px] leading-relaxed text-foreground/75">
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {siblings.length > 0 && (
          <div className="mt-10 border-t border-border pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/45">On this site</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {siblings.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/page/${p.slug}`}
                    className="chip transition-colors hover:border-primary/50 hover:text-gold-300"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}