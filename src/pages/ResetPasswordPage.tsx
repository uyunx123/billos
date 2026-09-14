import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button, Field, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export function ResetPasswordPage() {
  const { session, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // If the recovery token wasn't detected, nudge the user back to the flow.
    const url = new URL(window.location.href);
    if (!url.hash && !url.search) {
      setError("This reset link is missing its token. Request a fresh link from the sign-in page.");
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match — try again.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await updatePassword(session?.user.id ?? "", "", password);
    setBusy(false);
    if (error) {
      setError("We couldn't update your password — the link may have expired. Try again.");
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-2xl font-extrabold">Password updated</h1>
          <p className="mt-2 text-sm text-muted">Your password has been changed. You can now sign in with it.</p>
          <div className="mt-6">
            <Button className="w-full" onClick={() => navigate("/")}>
              Continue to the site
            </Button>
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
          <h1 className="font-heading text-2xl font-extrabold">Choose a new password</h1>
          <p className="mt-1 text-sm text-muted">Pick something strong that you haven't used before.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
          <Field label="New password" hint="At least 8 characters.">
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={busy}>
            Update password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/login" className="font-semibold text-primary cursor-pointer hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}