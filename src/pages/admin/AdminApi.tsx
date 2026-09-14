import { useState } from "react";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { Button, Card, Input } from "../../components/ui";

/**
 * External Score Exchange API access.
 * The API is served by the Supabase Edge Function `api` — all calls are
 * read-only over the public anon key, so no per-user token is required.
 */
export function AdminApiPage() {
  const [copied, setCopied] = useState(false);

  const baseUrl = `${window.location.origin}/functions/v1/api`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold">
          <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" /> External API
        </h1>
        <p className="text-sm text-muted">
          Publish tournament data (scores, matches, players) to external scoreboards and partner systems.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <label htmlFor="api-url" className="mb-1.5 block text-sm font-medium">API base URL</label>
          <div className="flex gap-2">
            <Input id="api-url" readOnly value={baseUrl} aria-label="API base URL" />
            <Button variant="secondary" onClick={copy}>
              {copied ? "Copied!" : <Copy className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-sm font-semibold">Example requests</p>
          <pre className="mt-2 overflow-x-auto text-xs text-muted">{`GET ${baseUrl}/tournaments
GET ${baseUrl}/tournaments/{slug}/matches
GET ${baseUrl}/tournaments/{slug}/live
GET ${baseUrl}/players`}</pre>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Scores update automatically as referees enter them in the scorer console.
        </p>
      </Card>
    </div>
  );
}