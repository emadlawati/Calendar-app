/**
 * The only pictures in the app.
 *
 * The brief is strict about iconography: Reading Room gets one reused glyph
 * (an open book), Coffee gets exactly two (a cup and a bean), Observatory gets
 * three (a star, a ringed planet, a crescent) plus ✦ as its drawer bullet.
 * "Nothing else." So this file is the whole icon set, and anything wanting a
 * picture has to come here and take one of these.
 *
 * All of them are stroked in `currentColor` at a 24-unit box, so they inherit
 * from wherever they are placed and can be sized by font-size or width alone.
 */

export type GlyphName = "book" | "cup" | "bean" | "star" | "planet" | "crescent";

export default function ThemeGlyph({
  name,
  size = 16,
  style,
}: {
  name: GlyphName;
  size?: number;
  style?: React.CSSProperties;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    style: { display: "block", flex: "none", ...style },
  };

  switch (name) {
    // Two facing pages, spine down the middle. The left leaf carries a fill so
    // the two pages read as separate sheets rather than one outline.
    case "book":
      return (
        <svg {...common}>
          <path d="M12 6.2C10.2 4.9 7.9 4.4 5 4.6v12.9c2.9-.2 5.2.3 7 1.6V6.2Z"
            fill="currentColor" opacity=".28" />
          <path d="M12 6.2C10.2 4.9 7.9 4.4 5 4.6v12.9c2.9-.2 5.2.3 7 1.6M12 6.2c1.8-1.3 4.1-1.8 7-1.6v12.9c-2.9-.2-5.2.3-7 1.6M12 6.2v12.9"
            fill="none" stroke="currentColor" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Body, handle, and the saucer as a separate stroke beneath it.
    case "cup":
      return (
        <svg {...common}>
          <path d="M6 7h10v5.5a5 5 0 0 1-10 0V7Z"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M16 8.4h1.6a2.2 2.2 0 0 1 0 4.4H16"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M4.4 19.2h13.2"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );

    // An ellipse on a slight lean, with the crease drawn lighter so it reads
    // as a seam rather than a second outline.
    case "bean":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="5.6" ry="7.6" transform="rotate(-28 12 12)"
            fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9.1 16.6c1.5-1.1 2.1-2.6 1.8-4.5-.3-1.9.3-3.4 1.8-4.6"
            fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".65" strokeLinecap="round" />
        </svg>
      );

    case "star":
      return (
        <svg {...common}>
          <path d="M12 3.4l2.5 5.9 6.4.5-4.9 4.2 1.5 6.2L12 16.9l-5.5 3.3 1.5-6.2-4.9-4.2 6.4-.5L12 3.4Z"
            fill="currentColor" />
        </svg>
      );

    // A small disc with a ring cutting across it on a lean.
    case "planet":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="5" fill="currentColor" opacity=".9" />
          <ellipse cx="12" cy="12" rx="9.4" ry="3.4" transform="rotate(-22 12 12)"
            fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );

    // One path — a disc with a second disc bitten out of it.
    case "crescent":
      return (
        <svg {...common}>
          <path d="M16.6 4.4a8.4 8.4 0 1 0 3.1 10.9A9.4 9.4 0 0 1 16.6 4.4Z"
            fill="currentColor" />
        </svg>
      );
  }
}

/** Observatory's drawer bullet. Not a glyph — a character the brief names. */
export const SPARK = "✦";
