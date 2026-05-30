"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MindLoginCard, writeLastIdentity } from "@mind-studio/core";
import { useSession } from "@/lib/solid/session";
import { oidcIssuer, APP_NAME, ACCENT } from "@/lib/config";
import { hueFor } from "@/lib/dock/accents";
import { BrandMark } from "@/components/TopBar";

const MOCK = [
  { key: "builder", icon: "🛠️", label: "Builder" },
  { key: "drive", icon: "📁", label: "Drive" },
  { key: "chat", icon: "💬", label: "Chat" },
  { key: "social", icon: "🌐", label: "Social" },
  { key: "market", icon: "🛒", label: "Market" },
  { key: "codespaces", icon: "🧰", label: "Codespaces" },
];

export default function LandingPage() {
  const { webid, loggedIn, loading, signIn } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && loggedIn && webid) {
      writeLastIdentity(APP_NAME, {
        webId: webid,
        displayName: webid.split("/").filter(Boolean).pop(),
      });
      router.replace("/dock");
    }
  }, [loading, loggedIn, webid, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-16">
      <header className="reveal flex items-center gap-2.5 py-7">
        <BrandMark />
        <span className="font-display text-lg font-semibold tracking-tight">Mind Dock</span>
      </header>

      <section className="grid flex-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div className="reveal" style={{ animationDelay: "0.05s" }}>
          <p className="eyebrow mb-4">Your private space on the web</p>
          <h1 className="font-display text-[2.9rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            Your pod,
            <br />
            <span className="text-primary">all in one place.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
            One calm place for everything you use — open your apps, manage your profile,
            look after your account.{" "}
            <span className="font-medium text-foreground">Your data stays yours.</span>
          </p>

          <div className="mt-8 max-w-md">
            <MindLoginCard
              appName={APP_NAME}
              defaultIssuer={oidcIssuer}
              accent={ACCENT}
              onLogin={async ({ issuer }) => {
                await signIn(issuer);
              }}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {loading
                ? "Getting things ready…"
                : webid
                  ? "You’re signed in — taking you to your dock…"
                  : "Sign in safely with your own account. No new password to remember."}
            </p>
          </div>
        </div>

        <div className="reveal hidden lg:block" style={{ animationDelay: "0.18s" }}>
          <div className="glass-panel float-y mx-auto max-w-sm overflow-hidden rounded-3xl shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-[color:var(--border)] px-4 py-3">
              <span className="size-2.5 rounded-full bg-destructive/50" />
              <span className="size-2.5 rounded-full bg-primary/40" />
              <span className="size-2.5 rounded-full bg-primary/25" />
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">mind dock</span>
            </div>
            <div className="px-5 pt-5">
              <p className="eyebrow mb-2">Your space</p>
              <h2 className="font-display text-xl font-semibold tracking-tight">Good evening, you.</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 p-5">
              {MOCK.map((m, i) => {
                const hue = hueFor(m.key);
                return (
                  <div
                    key={m.key}
                    className="tile flex flex-col items-center gap-2 px-2 py-4 text-center"
                    style={{ ["--h" as string]: String(hue) } as React.CSSProperties}
                  >
                    <span
                      className="grid size-9 place-items-center rounded-xl text-lg"
                      style={{
                        background: "oklch(0.72 0.13 var(--h) / 0.16)",
                        boxShadow: "inset 0 0 0 1px oklch(0.72 0.13 var(--h) / 0.28)",
                      }}
                    >
                      {m.icon}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
