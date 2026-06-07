import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@mind-studio/ui";
import { mind } from "@mind-studio/ui/themes";
import "./globals.css";
import { FeedbackLauncher } from "@/components/FeedbackLauncher";

// Distinctive type: a soft optical serif for display, a warm grotesque for body,
// a mono for micro-labels. Exposed as CSS vars consumed in globals.css.
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  title: "Mind Dock — your pod, all in one place",
  description:
    "The front door to your Mind pod: open your apps, manage your profile and account. Your data stays yours.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Font variables go on <html> so globals.css `:root` (= <html>) can consume
    // them: custom properties only inherit downward, so when they were set on
    // <body> the `:root { --font-display: var(--font-fraunces) }` aliases
    // resolved to empty and everything fell back to serif. (next-themes adds the
    // `dark` class to <html> at runtime — suppressHydrationWarning covers it.)
    <html
      lang="en"
      data-mind-theme="mind"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          theme={mind}
          defaultTheme="dark"
          enableSystem={false}
          storageKey="mind-dock-theme-v1"
        >
          <div className="aurora" aria-hidden />
          <div className="grain" aria-hidden />
          {children}
          <FeedbackLauncher />
        </ThemeProvider>
      </body>
    </html>
  );
}
