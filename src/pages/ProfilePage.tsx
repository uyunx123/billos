import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, UserCircle2 } from "lucide-react";
import { Button, Card, Field, Input, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fetchMyPlayer } from "../lib/data";
import { playerName } from "../lib/utils";

export function ProfilePage() {
  const { profile, session, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [myPlayer, setMyPlayer] = useState<Awaited<ReturnType<typeof fetchMyPlayer>> | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchMyPlayer(session.user.id).then(setMyPlayer).catch(() => {});
    }
  }, [session]);

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("The new passwords don't match — try again.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error } = await updatePassword(session?.user.id ?? "", "", next);
    setBusy(false);
    if (error) {
      setError("We couldn't update your password — please sign out and try again.");
    } else {
      setMessage("Password updated successfully.");
      setNext("");
      setConfirm("");
    }
  };

  if (loading) return <Spinner label="Loading your account…" />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="flex items-center gap-2.5 font-heading text-3xl font-extrabold">
          <UserCircle2 className="h-7 w-7 text-primary" aria-hidden="true" />
          My account
        </h1>
        <p className="mt-1 text-muted">Manage your login and security details.</p>
      </div>

      <div className="space-y-5">
        <Card className="space-y-4 p-6">
          <h2 className="font-heading text-lg font-bold">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Name</p>
              <p className="mt-0.5 font-medium">{profile?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Email</p>
              <p className="mt-0.5 font-medium">{profile?.email ?? session?.user.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Role</p>
              <p className="mt-0.5 font-medium capitalize">{profile?.role ?? "public"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Player profile</p>
              <p className="mt-0.5">
                {myPlayer ? (
                  <Link to="/players/me" className="font-medium text-primary cursor-pointer hover:underline">
                    {playerName(myPlayer)} →
                  </Link>
                ) : (
                  <Link to="/players/me" className="font-medium text-primary cursor-pointer hover:underline">
                    Set up your player profile →
                  </Link>
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" /> Change password
          </h2>

          {message && (
            <p role="status" className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <form onSubmit={handlePassword} className="space-y-4">
            <Field label="New password" hint="At least 8 characters.">
              <Input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={busy}>
                Update password
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate("/");
            }}
            className="text-sm font-semibold text-destructive cursor-pointer hover:underline"
          >
            Sign out
          </button>
          <Button variant="secondary" onClick={() => navigate("/")}>
            Back to site
          </Button>
        </div>
      </div>
    </div>
  );
}