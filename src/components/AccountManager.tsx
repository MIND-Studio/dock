"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, Input, Label } from "@mind-studio/ui";

type State = {
  loggedIn: boolean;
  issuer?: string;
  pods?: string[];
  webIds?: string[];
  credentials?: { id: string; url: string }[];
};

export function AccountManager({
  webid,
  onSignOut,
}: {
  webid: string | null;
  onSignOut: () => void;
}) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issuer = webid ? `${new URL(webid).origin}/` : "";

  const refresh = useCallback(async () => {
    const res = await fetch("/api/account/state");
    setState((await res.json()) as State);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function call(path: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, init);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Something went wrong.");
        return false;
      }
      await refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!state.loggedIn) {
    return <AccountLogin issuer={issuer} busy={busy} error={error} onLogin={(email, password) =>
      call("/api/account/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, issuer }),
      })
    } />;
  }

  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Signed in to manage your account at <span className="font-mono">{hostOf(state.issuer)}</span>.
        <button className="ml-2 underline hover:text-foreground" onClick={() => void call("/api/account/logout", { method: "POST" })}>
          Lock account tools
        </button>
      </p>

      <Section title="Your pods" hint="Each pod is a separate private space.">
        <ul className="grid gap-1.5">
          {(state.pods ?? []).map((p) => (
            <li key={p} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
              <a href={p} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{p}</a>
              <Badge variant="secondary">pod</Badge>
            </li>
          ))}
          {(state.pods ?? []).length === 0 ? <li className="text-sm text-muted-foreground">No pods yet.</li> : null}
        </ul>
        <CreateRow placeholder="new-pod-name" label="Create pod" busy={busy} onSubmit={(name) =>
          call("/api/account/pod", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) })
        } />
      </Section>

      <Section title="Linked WebIDs" hint="The identities this account can sign in as.">
        <ul className="grid gap-1.5">
          {(state.webIds ?? []).map((w) => (
            <li key={w} className="truncate rounded-lg border px-3 py-2 font-mono text-[12px]">{w}</li>
          ))}
          {(state.webIds ?? []).length === 0 ? <li className="text-sm text-muted-foreground">None linked.</li> : null}
        </ul>
      </Section>

      <Section title="App credentials" hint="Machine tokens for apps that act on your behalf.">
        <ul className="grid gap-1.5">
          {(state.credentials ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className="truncate font-mono text-[12px]">{c.id}</span>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() =>
                void call(`/api/account/credentials?url=${encodeURIComponent(c.url)}`, { method: "DELETE" })
              }>Revoke</Button>
            </li>
          ))}
          {(state.credentials ?? []).length === 0 ? <li className="text-sm text-muted-foreground">No credentials.</li> : null}
        </ul>
        <CreateRow placeholder="my-laptop" label="Create credential" busy={busy} onSubmit={(name) =>
          call("/api/account/credentials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) })
        } />
      </Section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-xs text-muted-foreground">
        Want to revoke an app you signed into? That lives on your pod’s own account page —{" "}
        <a href={`${state.issuer ?? issuer}.account/`} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          open it here
        </a>.
      </p>

      <div>
        <Button variant="outline" size="sm" onClick={onSignOut}>Sign out of Mind Home</Button>
      </div>
    </div>
  );
}

function AccountLogin({
  issuer,
  busy,
  error,
  onLogin,
}: {
  issuer: string;
  busy: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<boolean>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <div>
          <h3 className="text-sm font-semibold">Manage your account</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to your pod account at <span className="font-mono">{hostOf(issuer)}</span> to manage pods,
            identities, and app credentials. This is separate from signing in to Mind Home.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="acct-email">Email</Label>
          <Input id="acct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="acct-pw">Password</Label>
          <Input id="acct-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Button disabled={busy || !email || !password} onClick={() => void onLogin(email, password)}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function CreateRow({
  placeholder,
  label,
  busy,
  onSubmit,
}: {
  placeholder: string;
  label: string;
  busy: boolean;
  onSubmit: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} className="flex-1" />
      <Button
        size="sm"
        disabled={busy || !name.trim()}
        onClick={async () => {
          const ok = await onSubmit(name.trim());
          if (ok) setName("");
        }}
      >
        {label}
      </Button>
    </div>
  );
}

function hostOf(issuer?: string): string {
  if (!issuer) return "your pod";
  try {
    return new URL(issuer).host;
  } catch {
    return issuer;
  }
}
