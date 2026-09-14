import { Link } from "react-router-dom";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { BrandMark } from "./Header";
import SocialPlatformIcon from "./SocialIcon";
import { useConfig } from "../context/ConfigContext";
import { sanitizeUrl } from "../lib/security";

const PAYMENT_CHIPS = ["QRIS", "BCA VA", "BNI VA", "BRI VA", "GoPay", "OVO", "ShopeePay", "Visa", "Mastercard"];

export default function Footer() {
  const { categories, pages, siteConfig, partners, ticker } = useConfig();
  const tickerVisible = ticker.enabled && ticker.items.some((i) => i.enabled && i.text.trim());
  const activePartners = partners.filter((p) => p.active && p.image && p.url.trim());
  const enabledCategories = categories.filter((c) => c.enabled);
  const enabledPages = pages.filter((p) => p.enabled);
  const socials = siteConfig.socials.filter((s) => s.enabled && s.url.trim());
  const shopLinks = siteConfig.shopLinks.filter((s) => s.enabled && s.url.trim());
  const shippingPage = pages.find((p) => p.slug === "shipping-returns");

  return (
    <footer
      className={`relative overflow-hidden border-t border-primary-800/60 bg-primary-950 text-on-primary print:hidden ${
        tickerVisible ? "pb-[calc(4rem+env(safe-area-inset-bottom))]" : ""
      }`}
    >
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[38rem] -translate-x-1/2 rounded-full bg-gold-400/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 nav-grid opacity-30" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-12 sm:px-6 sm:pt-14">
        {/* Two-up link columns on phones, balanced 12-col grid from md up */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-12 md:gap-10">
          {/* Brand */}
          <div className="space-y-4 md:col-span-4 max-md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5" aria-label="ISAK Billiard Co. home">
              <BrandMark className="h-10 w-10" />
              <span className="flex flex-col leading-none">
                <span className="font-heading text-xl font-bold tracking-tight">
                  ISAK<span className="text-gold-400">.</span>
                </span>
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.3em] text-on-primary/50">
                  Billiard Co.
                </span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-on-primary/65">
              ISAK Billiard Co. — Jakarta&apos;s billiard equipment house. Cues,
              tables, balls and gear, orderable here or via our official store
              partners. Ships nationwide with JNE, J&amp;T and SiCepat.
            </p>
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {socials.map((s) => (
                  <a
                    key={s.id}
                    href={sanitizeUrl(s.url)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label || s.platform}
                    className="grid h-9 w-9 place-items-center rounded-full border border-on-primary/15 bg-on-primary/5 text-on-primary/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-400/60 hover:text-gold-300"
                  >
                    <SocialPlatformIcon platform={s.platform} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop */}
          <div className="md:col-span-2">
            <p className="mb-4 font-heading text-[11px] font-bold uppercase tracking-[0.22em] text-gold-300">
              Shop
            </p>
            <ul className="space-y-2.5 text-sm text-on-primary/80">
              {enabledCategories.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/shop?category=${c.id}`}
                    className="inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-gold-300"
                  >
                    <span className="h-1 w-1 rounded-full bg-gold-500/70" aria-hidden="true" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-3">
            <p className="mb-4 font-heading text-[11px] font-bold uppercase tracking-[0.22em] text-gold-300">
              Company
            </p>
            <ul className="space-y-2.5 text-sm text-on-primary/80">
              <li>
                <Link to="/blog" className="transition-colors duration-150 hover:text-gold-300">Journal &amp; Guides</Link>
              </li>
              <li>
                <Link to="/contact" className="transition-colors duration-150 hover:text-gold-300">Contact &amp; Support</Link>
              </li>
              <li>
                <Link to="/orders" className="transition-colors duration-150 hover:text-gold-300">Order Status</Link>
              </li>
              {enabledPages.map((p) => (
                <li key={p.id}>
                  <Link to={`/page/${p.slug}`} className="transition-colors duration-150 hover:text-gold-300">
                    {p.title}
                  </Link>
                </li>
              ))}
              <li>
                {shippingPage ? (
                  <Link to={`/page/${shippingPage.slug}`} className="transition-colors duration-150 hover:text-gold-300">
                    Shipping &amp; Returns
                  </Link>
                ) : (
                  <Link to="/shop" className="transition-colors duration-150 hover:text-gold-300">Shipping &amp; Returns</Link>
                )}
              </li>
              <li>
                <Link to="/admin" className="transition-colors duration-150 hover:text-gold-300">Admin Console</Link>
              </li>
            </ul>
          </div>

          {/* Contact + payments */}
          <div className="col-span-2 md:col-span-3">
            <p className="mb-4 font-heading text-[11px] font-bold uppercase tracking-[0.22em] text-gold-300">
              Get in touch
            </p>
            <ul className="space-y-2.5 text-sm text-on-primary/80">
              {siteConfig.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                  {siteConfig.address}
                </li>
              )}
              {siteConfig.phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                  <a href={`tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`} className="transition-colors hover:text-gold-300">
                    {siteConfig.phone}
                  </a>
                </li>
              )}
              {siteConfig.email && (
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                  <a href={`mailto:${siteConfig.email}`} className="transition-colors hover:text-gold-300">
                    {siteConfig.email}
                  </a>
                </li>
              )}
              {siteConfig.hours && (
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                  {siteConfig.hours}
                </li>
              )}
            </ul>
            {shopLinks.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-on-primary/60">Official stores</p>
                <div className="flex flex-wrap gap-2">
                  {shopLinks.map((s) => (
                    <a
                      key={s.id}
                      href={sanitizeUrl(s.url)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${s.label} official store`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-on-primary/25 bg-on-primary/10 px-3 py-1.5 text-xs font-bold text-on-primary/90 transition-colors hover:border-gold-400/60 hover:text-gold-300"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                      {s.label}
                    </a>
                  ))}
                </div>
              </>
            )}
            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-on-primary/60">Payments</p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-lg border border-on-primary/15 bg-on-primary/5 px-2 py-1 text-[11px] font-semibold text-on-primary/80"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Official partner logos */}
        {activePartners.length > 0 && (
          <div className="mt-12 border-t border-on-primary/10 pt-7">
            <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-on-primary/45">
              Official partners
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-4">
              {activePartners.map((s) => (
                <li key={s.id}>
                  <a
                    href={sanitizeUrl(s.url, "#")}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.name}
                    title={s.name}
                    className="group grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-on-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:ring-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
                  >
                    <img
                      src={s.image}
                      alt={s.name}
                      loading="lazy"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-on-primary/10 pt-6 text-xs text-on-primary/55 sm:flex-row">
          <p>© {new Date().getFullYear()} ISAK Billiard Co. — Jakarta, Indonesia. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Secure checkout &mdash; every order fully protected
          </p>
        </div>
      </div>
    </footer>
  );
}