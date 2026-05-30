/**
 * A curated, low-chroma hue per app so the launcher reads like a real home
 * screen without becoming a rainbow. Returns an oklch hue angle; the tile sets
 * it as `--h` and derives icon tint + hover glow from it. Custom apps get a
 * stable hue hashed from their key.
 */
const HUES: Record<string, number> = {
  builder: 78,
  drive: 248,
  chat: 165,
  social: 300,
  market: 14,
  codespaces: 196,
  os: 268,
  agents: 145,
};

export function hueFor(key: string): number {
  const base = key.split("-")[0] ?? key;
  if (base in HUES) return HUES[base]!;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return h;
}
