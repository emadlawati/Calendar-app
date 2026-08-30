/**
 * Contrast check for every theme.
 *
 *   node scripts/verify-contrast.mjs
 *
 * Reads the token blocks straight out of globals.css and checks the pairings
 * the app actually renders. Worth doing rather than trusting the brief: the
 * spec's own notes warn that gold must never be text on paper and that crema
 * and matcha are fills, not text — exactly the mistakes a palette swap makes
 * quietly, on a screen nobody looks at twice.
 *
 * WCAG AA: 4.5:1 for body text, 3:1 for large text (18.66px bold / 24px) and
 * for meaningful non-text marks.
 */
import { readFileSync } from "fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** Pull one selector's custom properties out of the stylesheet. */
function tokensOf(selector) {
  const at = css.indexOf(selector + " {");
  if (at === -1) throw new Error(`no block for ${selector}`);
  const body = css.slice(at, css.indexOf("\n}", at));
  const out = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const base = tokensOf(":root");
const THEMES = {
  "Reading Room": base,
  "Coffee & Matcha": { ...base, ...tokensOf('[data-theme="coffee"]') },
  Observatory: { ...base, ...tokensOf('[data-theme="observatory"]') },
};

/** Resolve var() chains down to a hex value. */
function hex(tokens, value, depth = 0) {
  if (depth > 8) return null;
  const v = String(value).trim();
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/);
  if (ref) return hex(tokens, tokens[ref[1]], depth + 1);
  const h = v.match(/#([0-9a-fA-F]{6})/);
  return h ? h[1] : null;
}

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
function luminance(h) {
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** [foreground, background, minimum, what it is] */
const PAIRS = [
  ["ink", "paper", 4.5, "body text on the page"],
  ["ink", "card", 4.5, "body text on a card"],
  ["muted", "paper", 4.5, "secondary text"],
  ["muted", "card", 4.5, "secondary text on a card"],
  ["faint", "paper", 3, "labels (small caps, decorative weight)"],
  ["terracotta", "paper", 4.5, "accent one as text — overdue, emphasis"],
  ["terracotta", "card", 4.5, "accent one as text on a card"],
  ["on-dark", "green-deep", 4.5, "text on the dark surface"],
  ["sage-pale", "green-deep", 4.5, "secondary text on the dark surface"],
  ["on-accent", "accent", 4.5, "primary button label"],
  ["today-text", "today-bg", 4.5, "today marker"],
  ["ink", "wash", 4.5, "text on the agenda panel"],
  ["muted", "wash", 4.5, "secondary text on the agenda panel"],
  ["gold", "green-deep", 3, "accent two as a mark on dark"],
  ["rule-strong", "paper", 1.4, "visible hairline"],
];

let pass = 0, fail = 0;
for (const [name, tokens] of Object.entries(THEMES)) {
  console.log(`\n${name}`);
  for (const [fg, bg, min, what] of PAIRS) {
    const f = hex(tokens, tokens[fg]);
    const b = hex(tokens, tokens[bg]);
    if (!f || !b) {
      console.log(`  skip  ${what} — ${fg}/${bg} did not resolve`);
      continue;
    }
    const r = ratio(f, b);
    const ok = r >= min;
    ok ? pass++ : fail++;
    console.log(
      `  ${ok ? "ok  " : "FAIL"}  ${what.padEnd(42)} ${r.toFixed(2)}:1  (needs ${min})  ${fg} on ${bg}`,
    );
  }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
