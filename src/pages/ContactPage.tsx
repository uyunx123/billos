import { useState, type FormEvent } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useConfig } from "../context/ConfigContext";
import { sanitizeUrl } from "../lib/security";
import { usePageMeta } from "../hooks/usePageMeta";

export default function ContactPage() {
  const { siteConfig } = useConfig();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  usePageMeta({
    title: "Contact — ISAK Billiard Co.",
    description: "Questions about a cue, a table install, or a bulk order — reach ISAK Billiard Co. on WhatsApp, phone or email.",
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setSent(true);
  }

  const CONTACT_ROWS = [
    {
      icon: MapPin,
      title: "Showroom",
      lines: [siteConfig.address, siteConfig.hours].filter(Boolean),
      href: siteConfig.mapEmbedUrl || undefined,
    },
    {
      icon: Phone,
      title: "Phone",
      lines: [siteConfig.phone].filter(Boolean),
      href: siteConfig.phone ? `tel:${siteConfig.phone.replace(/[^\d+]/g, "")}` : undefined,
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      lines: [siteConfig.whatsapp ? `${siteConfig.whatsapp} — fastest reply (09:00–21:00)` : ""].filter(Boolean),
      href: siteConfig.whatsapp
        ? `https://wa.me/${siteConfig.whatsapp.replace(/[^\d]/g, "")}`
        : undefined,
    },
    {
      icon: Mail,
      title: "Email",
      lines: [siteConfig.email].filter(Boolean),
      href: siteConfig.email ? `mailto:${siteConfig.email}` : undefined,
    },
    {
      icon: Clock,
      title: "Hours",
      lines: siteConfig.hours ? [siteConfig.hours, "Online orders: 24/7"] : ["Online orders: 24/7"],
      href: undefined,
    },
  ].filter((row) => row.lines.length > 0);

  const shopLinks = siteConfig.shopLinks.filter((s) => s.enabled && s.url.trim());

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 shadow-soft sm:px-10 sm:py-12">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Talk to a real player
        </h1>
        <p className="mt-3 max-w-xl text-foreground/65 sm:text-base">
          Questions about a cue, a table install, or a bulk order — chat on
          WhatsApp, or order straight from our official store partners. We
          answer fast, in Indonesian or English.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {CONTACT_ROWS.map((row) => {
              const Wrapper = row.href ? "a" : "div";
              return (
                <li key={row.title}>
                  <Wrapper
                    {...(row.href ? { href: row.href, target: row.href.startsWith("http") ? "_blank" : undefined, rel: "noreferrer" } : {})}
                    className={`card h-full block p-5 transition-all duration-200 ${row.href ? "hover:-translate-y-0.5 hover:border-gold-400/60 hover:shadow-soft" : ""}`}
                  >
                    <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-100 to-gold-200/70 text-gold-700 ring-1 ring-gold-300/50">
                      <row.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2 className="font-heading font-bold">{row.title}</h2>
                    {row.lines.map((line) => (
                      <p key={line} className="mt-1 text-sm text-foreground/65">{line}</p>
                    ))}
                  </Wrapper>
                </li>
              );
            })}
          </ul>

          {shopLinks.length > 0 && (
            <div className="mt-6">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-heading text-lg font-bold">Order on official stores</h2>
                <span className="h-px flex-1 bg-gradient-to-r from-gold-500/40 to-transparent" aria-hidden="true" />
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {shopLinks.map((s) => (
                  <li key={s.id}>
                    <a
                      href={sanitizeUrl(s.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="card group block h-full p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary-700">
                          <span className="font-heading text-sm font-extrabold">{s.label.slice(0, 2).toUpperCase()}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary-950 shadow-gold">
                          <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                          Official store
                        </span>
                      </div>
                      <h3 className="mt-3 font-heading font-bold">{s.label}</h3>
                      <p className="mt-0.5 truncate text-sm text-foreground/60">{s.url}</p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 transition-colors group-hover:text-gold-700">
                        Open store <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card mt-4 p-6">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-heading text-lg font-bold">Send a message</h2>
              <span className="h-px flex-1 bg-gradient-to-r from-gold-500/40 to-transparent" aria-hidden="true" />
            </div>
            {sent ? (
              <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100/60 px-4 py-3.5 text-sm font-semibold text-primary-700 ring-1 ring-primary-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Thanks, {form.name.split(" ")[0] || "friend"}! Your message is in. We reply within one
                business day.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="cf-name" className="field-label">Name</label>
                  <input id="cf-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="cf-email" className="field-label">Email</label>
                  <input id="cf-email" type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="cf-message" className="field-label">Message</label>
                  <textarea id="cf-message" rows={4} className="input resize-none" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-accent">Send message</button>
              </form>
            )}
          </div>
        </div>

        {siteConfig.mapEmbedUrl && (
          <div className="card overflow-hidden">
            <iframe
              title="ISAK Billiard Co. showroom on Google Maps"
              src={siteConfig.mapEmbedUrl}
              className="h-full min-h-[420px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </div>
  );
}