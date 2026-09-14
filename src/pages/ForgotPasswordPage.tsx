import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button, Field, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await requestPasswordReset(email.trim());
    setBusy(false);
    if (error) {
      setError("We couldn't send a reset link — double-check the email and try again.");
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-2xl font-extrabold">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted">
            If an account exists for <span className="font-semibold text-foreground">{email}</span>,
            we've sent a password reset link. The link expires within an hour.
          </p>
          <div className="mt-6">
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-2xl font-extrabold">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">
            Enter your email and we'll send you a secure link to set a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={busy}>
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-primary cursor-pointer hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}