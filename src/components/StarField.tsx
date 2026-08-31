"use client";

import { useTheme } from "./ThemeProvider";

/**
 * Observatory's star field.
 *
 * The brief: "each dark hero surface carries 5–7 absolutely-positioned 2–3px
 * dots at low-key positions in silver / gold / mauve. Never more; it must read
 * as sparse sky, not noise."
 *
 * So: six dots, fixed positions, no randomness — the sky does not rearrange
 * itself between renders. Renders nothing at all in the other two themes, so
 * it can be dropped into any hero surface without a condition around it.
 */

const STARS = [
  { top: "14%", left: "8%",  size: 2,   color: "var(--sage)",       o: 0.7 },
  { top: "9%",  left: "72%", size: 2.5, color: "var(--gold)",       o: 0.8 },
  { top: "38%", left: "91%", size: 2,   color: "var(--terracotta)", o: 0.6 },
  { top: "68%", left: "17%", size: 2.5, color: "var(--sage)",       o: 0.5 },
  { top: "82%", left: "58%", size: 2,   color: "var(--gold)",       o: 0.55 },
  { top: "52%", left: "40%", size: 3,   color: "var(--sage)",       o: 0.35 },
];

export default function StarField() {
  const { theme } = useTheme();
  if (theme !== "observatory") return null;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {STARS.map((s, i) => (
        <span key={i} style={{
          position: "absolute", top: s.top, left: s.left,
          width: s.size, height: s.size, borderRadius: "999px",
          background: s.color, opacity: s.o,
        }} />
      ))}
    </div>
  );
}
