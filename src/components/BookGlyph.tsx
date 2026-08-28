/**
 * The one icon in the app: an open book, two facing pages.
 * Left leaf sage, right leaf green-deep.
 */
export default function BookGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 14) / 18}
      viewBox="0 0 18 14"
      fill="none"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path d="M9 2.6C7.4 1.3 5.3 0.9 1 1.4V12c4.3-.5 6.4-.1 8 1.2V2.6Z" fill="var(--sage-light)" />
      <path d="M9 2.6C10.6 1.3 12.7.9 17 1.4V12c-4.3-.5-6.4-.1-8 1.2V2.6Z" fill="var(--green-deep)" />
      <path d="M9 2.6v10.6" stroke="var(--card)" strokeWidth="0.8" />
    </svg>
  );
}
