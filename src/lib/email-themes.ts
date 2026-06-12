export type SpecialKind = "birthday" | "anniversary" | "milestone" | "other";

interface ThemeColors {
  bg: string;
  cardBg: string;
  accent: string;
  accentText: string;
  border: string;
  text: string;
  muted: string;
}

interface ThemeConfig {
  colors: ThemeColors;
  decorations: string;
  greeting: (name: string, title?: string) => string;
  acceptLabel: string;
  subjectPrefix: string;
}

const THEMES: Record<SpecialKind, ThemeConfig> = {
  birthday: {
    colors: {
      bg: "#fef5fb",
      cardBg: "#fff",
      accent: "#e91e63",
      accentText: "#fff",
      border: "#f8bbd0",
      text: "#5d1a3a",
      muted: "#8e6b7a",
    },
    decorations: `
      <div style="font-size: 48px; text-align: center; margin-bottom: 8px;">🎂 🎈 🎉</div>
      <div style="font-size: 14px; text-align: center; margin-bottom: 24px; color: #e91e63; opacity: 0.7;">
        ═══════════════════════════════
      </div>`,
    greeting: (name: string, title?: string) =>
      `🎂 It's Birthday Time! ${name} is celebrating${title ? `: <em>${title}</em>` : ""}`,
    acceptLabel: "🎉 Celebrate!",
    subjectPrefix: "🎂 Birthday Plan",
  },

  anniversary: {
    colors: {
      bg: "#fdf9f5",
      cardBg: "#fff",
      accent: "#c17a4a",
      accentText: "#fff",
      border: "#e8d5c4",
      text: "#4a2a1a",
      muted: "#8a6a5a",
    },
    decorations: `
      <div style="font-size: 48px; text-align: center; margin-bottom: 8px;">💕 💍 🥂</div>
      <div style="font-size: 14px; text-align: center; margin-bottom: 24px; color: #c17a4a; opacity: 0.7;">
        ═══ ♥ ═══ ♥ ═══
      </div>`,
    greeting: (name: string, title?: string) =>
      `💕 Happy Anniversary! ${name} wants to make it special${title ? ` — <em>${title}</em>` : ""}`,
    acceptLabel: "💕 Let's Celebrate",
    subjectPrefix: "💍 Anniversary Plan",
  },

  milestone: {
    colors: {
      bg: "#fdfbf5",
      cardBg: "#fff",
      accent: "#d4a017",
      accentText: "#3b2716",
      border: "#e8d9a0",
      text: "#3b2716",
      muted: "#8a7840",
    },
    decorations: `
      <div style="font-size: 48px; text-align: center; margin-bottom: 8px;">🎆 🏆 🎆</div>
      <div style="font-size: 14px; text-align: center; margin-bottom: 24px; color: #d4a017; opacity: 0.7;">
        ═══════════════════════════════
      </div>`,
    greeting: (name: string, title?: string) =>
      `🎆 Milestone Alert! ${name} has a celebration planned${title ? `: <em>${title}</em>` : ""}`,
    acceptLabel: "🎆 Let's Go!",
    subjectPrefix: "🎆 Milestone Plan",
  },

  other: {
    colors: {
      bg: "#fdfbf7",
      cardBg: "#fff",
      accent: "#fce4ec",
      accentText: "#5d4037",
      border: "#ffeedb",
      text: "#5d4037",
      muted: "#5d4037",
    },
    decorations: "",
    greeting: (name: string, title?: string) =>
      `🐾 ${name} wants to plan something with you${title ? ` — <em>${title}</em>` : ""}`,
    acceptLabel: "Meow Accept 🧶",
    subjectPrefix: "New Plan",
  },
};

export function getTheme(kind: string | null | undefined): ThemeConfig {
  const key = (kind || "other") as SpecialKind;
  return THEMES[key] || THEMES.other;
}

export function renderThemedEmail(
  kind: string | null | undefined,
  content: {
    h1: string;
    cardHtml: string;
    acceptLink: string;
    adjustLink?: string;
    baseUrl: string;
  }
): string {
  const t = getTheme(kind);
  const c = t.colors;

  const adjustBlock = content.adjustLink
    ? `<a href="${content.adjustLink}" style="background-color: ${c.muted}; color: #fff; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block; margin-left: 10px; opacity: 0.85;">
         Propose Adjustment 🐾
       </a>`
    : "";

  return `
    <div style="font-family: sans-serif; background-color: ${c.bg}; padding: 40px; border-radius: 32px; color: ${c.text}; border: 2px solid ${c.border};">
      ${t.decorations}
      <h1 style="color: ${c.text}; font-size: 24px; text-align: center;">${content.h1}</h1>

      <div style="background-color: ${c.cardBg}; padding: 24px; border-radius: 24px; margin: 20px 0; border: 1px solid ${c.border};">
        ${content.cardHtml}
      </div>

      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
        <a href="${content.acceptLink}" style="background-color: ${c.accent}; color: ${c.accentText}; padding: 12px 24px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
          ${t.acceptLabel}
        </a>
        ${adjustBlock}
      </div>

      <p style="margin-top: 30px; font-size: 12px; opacity: 0.6; text-align: center;">Sent with love from Purrfect Plans 🐾</p>
    </div>`;
}
