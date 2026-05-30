"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@mind-studio/ui";
import { useSession } from "@/lib/solid/session";
import { podRootFromWebId } from "@/lib/solid/pod-client";
import { readProfileFromPod, type Profile } from "@/lib/solid/profile";
import { ensureSeeded, writeApps, DEFAULT_APPS, type AppEntry } from "@mind-studio/core/apps";
import { hueFor } from "@/lib/dock/accents";
import { TopBar } from "@/components/TopBar";

export default function DockPage() {
  const { webid, loggedIn, loading, fetch: solidFetch, signOut } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [apps, setApps] = useState<AppEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");

  const podRoot = webid ? podRootFromWebId(webid) : null;

  useEffect(() => {
    if (!loading && !loggedIn) router.replace("/");
  }, [loading, loggedIn, router]);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const load = useCallback(async () => {
    if (!podRoot) return;
    const [p, a] = await Promise.all([
      readProfileFromPod(podRoot, solidFetch),
      ensureSeeded(podRoot, solidFetch),
    ]);
    setProfile(p);
    setApps(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podRoot]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: AppEntry[]) => {
      if (!podRoot) return;
      setBusy(true);
      setApps(next);
      try {
        await writeApps(podRoot, next, solidFetch);
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [podRoot],
  );

  const addApp = (e: { label: string; url: string; icon: string }) => {
    if (!apps) return Promise.resolve();
    const key = `${slug(e.label)}-${Math.random().toString(36).slice(2, 6)}`;
    const order = Math.max(0, ...apps.map((a) => a.order)) + 1;
    return persist([...apps, { ...e, key, blurb: "", order }]);
  };
  const removeApp = (key: string) => apps && persist(apps.filter((a) => a.key !== key));

  if (loading || !loggedIn) {
    return <main className="px-6 py-24 text-center text-muted-foreground">Loading…</main>;
  }

  const name = profile?.displayName || ownerLabel(webid);
  const firstName = name.split(" ")[0];
  const webHost = webid ? safeHost(webid) : undefined;

  return (
    <>
      <TopBar
        name={name}
        avatarUri={profile?.avatarUri}
        webHost={webHost}
        podRoot={podRoot}
        podFetch={solidFetch}
        onSignOut={() => void signOut().then(() => router.replace("/"))}
      />

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="reveal pt-12 pb-10" style={{ animationDelay: "0.04s" }}>
          <p className="eyebrow mb-3">Your space</p>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            {greeting},{" "}
            <span className="text-primary">{firstName}</span>.
          </h1>
          <p className="mt-3 max-w-md text-[15px] text-muted-foreground">
            Everything you use, in one calm place — and it all lives in your own pod.
          </p>
        </section>

        <div className="reveal mb-5 flex items-end justify-between" style={{ animationDelay: "0.12s" }}>
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-xl font-semibold tracking-tight">Your apps</h2>
            {apps ? <Badge variant="secondary" className="translate-y-[-1px]">{apps.length}</Badge> : null}
          </div>
          <AddAppDialog onAdd={addApp} busy={busy} />
        </div>

        {apps === null ? (
          <SkeletonGrid />
        ) : apps.length === 0 ? (
          <EmptyState onRestore={() => void persist(DEFAULT_APPS)} busy={busy} />
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {apps.map((app, i) => (
              <AppTile key={app.key} app={app} index={i} onRemove={() => void removeApp(app.key)} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function AppTile({ app, index, onRemove }: { app: AppEntry; index: number; onRemove: () => void }) {
  const hue = hueFor(app.key);
  return (
    <div
      className="group reveal relative"
      style={{ animationDelay: `${0.18 + index * 0.04}s`, ["--h" as string]: String(hue) } as React.CSSProperties}
    >
      <a href={app.url} target="_blank" rel="noopener noreferrer" className="block focus:outline-none">
        <div className="tile flex h-full flex-col p-4">
          <span
            className="grid size-12 place-items-center rounded-2xl text-2xl"
            style={{
              background: "oklch(0.72 0.13 var(--h) / 0.16)",
              boxShadow: "inset 0 0 0 1px oklch(0.72 0.13 var(--h) / 0.28)",
            }}
          >
            {app.icon}
          </span>
          <h3 className="mt-3.5 text-[15px] font-semibold tracking-tight text-foreground">{app.label}</h3>
          <p className="mt-0.5 flex-1 text-[12.5px] leading-snug text-muted-foreground">
            {app.blurb || safeHost(app.url)}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="truncate font-mono text-[10px] text-muted-foreground/70">{safeHost(app.url)}</span>
            <span className="tile-arrow text-[15px]" style={{ color: "oklch(0.78 0.13 var(--h))" }} aria-hidden>
              ↗
            </span>
          </div>
        </div>
      </a>
      <button
        onClick={onRemove}
        aria-label={`Remove ${app.label}`}
        className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full border border-[color:var(--border)] bg-card text-[13px] text-muted-foreground opacity-0 transition hover:border-destructive hover:text-destructive group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="tile h-[148px] p-4">
          <div className="skeleton size-12 rounded-2xl" />
          <div className="skeleton mt-4 h-3.5 w-2/3 rounded-full" />
          <div className="skeleton mt-2 h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onRestore, busy }: { onRestore: () => void; busy: boolean }) {
  return (
    <div className="reveal grid place-items-center rounded-2xl border border-dashed border-[color:var(--border)] px-6 py-16 text-center">
      <div className="text-4xl">🗂️</div>
      <h3 className="mt-3 font-display text-lg font-semibold">No apps pinned yet</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Add your own with the button above, or bring back the starter set.
      </p>
      <Button className="mt-4" size="sm" disabled={busy} onClick={onRestore}>
        Restore starter apps
      </Button>
    </div>
  );
}

function AddAppDialog({
  onAdd,
  busy,
}: {
  onAdd: (e: { label: string; url: string; icon: string }) => Promise<void>;
  busy: boolean;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("📦");
  const [open, setOpen] = useState(false);
  const canAdd = label.trim().length > 0 && /^https?:\/\//.test(url.trim());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <span className="text-base leading-none">+</span> Add app
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add an app</DialogTitle>
          <DialogDescription>Pin any web app to your launcher. It’s saved to your pod.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="app-label">Name</Label>
            <Input id="app-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="My App" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="app-url">Link</Label>
            <Input id="app-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="app-icon">Icon</Label>
            <Input id="app-icon" value={icon} onChange={(e) => setIcon(e.target.value.slice(0, 2))} className="w-20 text-center text-lg" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button
            size="sm"
            disabled={!canAdd || busy}
            onClick={async () => {
              await onAdd({ label: label.trim(), url: url.trim(), icon: icon || "📦" });
              setLabel("");
              setUrl("");
              setIcon("📦");
              setOpen(false);
            }}
          >
            {busy ? "Adding…" : "Add to launcher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app";
}
function safeHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}
function ownerLabel(webid: string | null): string {
  if (!webid) return "there";
  try {
    const seg = new URL(webid).pathname.split("/").filter(Boolean)[0] ?? "";
    return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : "there";
  } catch {
    return "there";
  }
}
