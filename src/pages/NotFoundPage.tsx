import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "../components/Header";

export default function NotFoundPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-md px-4 py-24 text-center">
        <div className="relative mx-auto h-24 w-24">
          <span className="absolute inset-0 rounded-full bg-primary/15 blur-xl" aria-hidden="true" />
          <BrandMark className="relative mx-auto h-24 w-24 ring-0" />
        </div>
        <p className="mt-6 bg-gradient-to-r from-primary to-gold-600 bg-clip-text font-heading text-7xl font-extrabold text-transparent">
          404
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold">Looks like this shot went wide</h1>
        <p className="mt-2 text-foreground/60">
          The page you&apos;re after rolled off the table. Let&apos;s get you back in the game.
        </p>
        <Link to="/" className="btn btn-accent mt-6">
          Back to home <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}