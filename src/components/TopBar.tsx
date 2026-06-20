"use client";

import { MindAppLauncher } from "@mind-studio/core/launcher";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useMindTheme,
} from "@mind-studio/ui";
import Link from "next/link";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        boxShadow:
          "0 0 0 1px color-mix(in oklch, white 10%, transparent), 0 6px 18px -6px var(--primary)",
      }}
    >
      ✦
    </span>
  );
}

export function ThemeToggle() {
  const { resolvedMode, setMode } = useMindTheme();
  const dark = resolvedMode !== "light";
  return (
    <button
      aria-label={dark ? "Switch to light" : "Switch to dark"}
      onClick={() => setMode(dark ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <span className="text-[15px]">{dark ? "☀" : "☾"}</span>
    </button>
  );
}

export function TopBar({
  name,
  avatarUri,
  webHost,
  podRoot,
  podFetch,
  onSignOut,
}: {
  name: string;
  avatarUri?: string;
  webHost?: string;
  podRoot?: string | null;
  podFetch?: typeof globalThis.fetch | null;
  onSignOut: () => void;
}) {
  const initial = (name || "Y").slice(0, 1).toUpperCase();
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border)] glass-panel">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/dock" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-[19px] font-semibold tracking-tight">Mind Dock</span>
        </Link>
        <div className="flex items-center gap-1">
          <MindAppLauncher podRoot={podRoot ?? undefined} podFetch={podFetch} manageHref="/dock" />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-primary">
                <Avatar className="size-9 ring-1 ring-[color:var(--border)] transition hover:ring-primary/60">
                  {avatarUri ? <AvatarImage src={avatarUri} alt={name} /> : null}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="truncate font-medium">{name || "Your account"}</div>
                {webHost ? (
                  <div className="truncate font-mono text-[11px] font-normal text-muted-foreground">
                    {webHost}
                  </div>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dock">Dock</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} variant="destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
