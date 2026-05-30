"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@mind-studio/ui";
import { useSession } from "@/lib/solid/session";
import { podRootFromWebId } from "@/lib/solid/pod-client";
import { readProfileFromPod, writeProfileToPod, type Profile } from "@/lib/solid/profile";
import { AccountManager } from "@/components/AccountManager";
import { TopBar } from "@/components/TopBar";

export default function SettingsPage() {
  const { webid, loggedIn, loading, fetch: solidFetch, signOut } = useSession();
  const router = useRouter();
  const podRoot = webid ? podRootFromWebId(webid) : null;
  const [headerProfile, setHeaderProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !loggedIn) router.replace("/");
  }, [loading, loggedIn, router]);

  useEffect(() => {
    if (podRoot) void readProfileFromPod(podRoot, solidFetch).then(setHeaderProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podRoot]);

  if (loading || !loggedIn) {
    return <main className="px-6 py-24 text-center text-muted-foreground">Loading…</main>;
  }

  const name = headerProfile?.displayName || ownerLabel(webid);
  const signOutAll = () => void signOut().then(() => router.replace("/"));

  return (
    <>
      <TopBar
        name={name}
        avatarUri={headerProfile?.avatarUri}
        webHost={webid ? safeHost(webid) : undefined}
        onSignOut={signOutAll}
      />
      <main className="mx-auto max-w-2xl px-6 pb-24">
        <header className="reveal pt-12 pb-8">
          <p className="eyebrow mb-3">Settings</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Your profile & account</h1>
        </header>

        <Tabs defaultValue="profile" className="reveal" style={{ animationDelay: "0.08s" }}>
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab podRoot={podRoot} podFetch={solidFetch} onChange={setHeaderProfile} />
          </TabsContent>

          <TabsContent value="account">
            <AccountManager webid={webid} onSignOut={signOutAll} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function ProfileTab({
  podRoot,
  podFetch,
  onChange,
}: {
  podRoot: string | null;
  podFetch: typeof globalThis.fetch | null;
  onChange: (p: Profile) => void;
}) {
  const [profile, setProfile] = useState<Profile>({ displayName: "", bio: "", avatarUri: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");

  const load = useCallback(async () => {
    if (!podRoot) return;
    const p = await readProfileFromPod(podRoot, podFetch);
    if (p) setProfile({ displayName: p.displayName, bio: p.bio ?? "", avatarUri: p.avatarUri ?? "" });
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podRoot]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!podRoot) return;
    setStatus("saving");
    const clean: Profile = {
      displayName: profile.displayName.trim(),
      bio: profile.bio?.trim() || undefined,
      avatarUri: profile.avatarUri?.trim() || undefined,
    };
    try {
      await writeProfileToPod(podRoot, clean, podFetch);
      onChange(clean);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  const initial = (profile.displayName || "Y").slice(0, 1).toUpperCase();

  return (
    <Card>
      <CardContent className="grid gap-5 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 ring-1 ring-[color:var(--border)]">
            {profile.avatarUri ? <AvatarImage src={profile.avatarUri} alt="" /> : null}
            <AvatarFallback className="bg-primary text-xl text-primary-foreground">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold">{profile.displayName || "Your name"}</div>
            <p className="truncate text-sm text-muted-foreground">{profile.bio || "Add a short line about you"}</p>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={profile.displayName}
            onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
            placeholder="Your name"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bio">About you</Label>
          <Textarea
            id="bio"
            rows={3}
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            placeholder="A short line about you"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="avatar">Photo URL</Label>
          <Input
            id="avatar"
            value={profile.avatarUri}
            onChange={(e) => setProfile((p) => ({ ...p, avatarUri: e.target.value }))}
            placeholder="https://…/photo.jpg"
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={() => void save()} disabled={status === "saving" || status === "loading"}>
            {status === "saving" ? "Saving…" : "Save profile"}
          </Button>
          {status === "saved" ? <span className="text-sm text-primary">Saved ✓</span> : null}
          {status === "error" ? <span className="text-sm text-destructive">Couldn’t save — try again.</span> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Saved to your pod’s profile card. Other Mind apps that read your profile will see it.
        </p>
      </CardContent>
    </Card>
  );
}

function safeHost(webid: string): string {
  try {
    return new URL(webid).host;
  } catch {
    return webid;
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
