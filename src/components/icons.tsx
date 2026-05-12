"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function icon({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  } as SVGProps<SVGSVGElement>;
}

export function HeartIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })} strokeWidth={1.8}>
      <path d="M12 20s-7-4.5-7-10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20z" />
    </svg>
  );
}

export function PawIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <ellipse cx="6" cy="10" rx="2" ry="2.6" />
      <ellipse cx="18" cy="10" rx="2" ry="2.6" />
      <ellipse cx="9.5" cy="6" rx="1.8" ry="2.4" />
      <ellipse cx="14.5" cy="6" rx="1.8" ry="2.4" />
      <path d="M12 12c-3.5 0-6 3-6 5.5C6 19.4 7.6 21 9.5 21c1 0 1.5-.6 2.5-.6s1.5.6 2.5.6c1.9 0 3.5-1.6 3.5-3.5 0-2.5-2.5-5.5-6-5.5z" />
    </svg>
  );
}

export function CoffeeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M6 8h10a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-4a2 2 0 0 1 2-2z" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="12" y1="3" x2="12" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
      <path d="M18 10h1a3 3 0 0 1 0 6h-1" />
    </svg>
  );
}

export function CalendarIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function NoteIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      <path d="M14 3v5h5" />
      <line x1="8" y1="15" x2="16" y2="15" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function TargetIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function ArchiveIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </svg>
  );
}

export function PlusIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function XIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function SendIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function SunIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  );
}

export function CheckIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Category icons
export function CatRomanticIcon({ size = 20, ...props }: IconProps) {
  return <HeartIcon size={size} {...props} />;
}

export function CatDateIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <line x1="8" y1="21" x2="8" y2="14" />
      <line x1="16" y1="21" x2="16" y2="14" />
      <line x1="3" y1="14" x2="21" y2="14" />
      <path d="M6 10l3-8h6l3 8" />
    </svg>
  );
}

export function CatAdventureIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M12 2L2 22h20L12 2z" />
      <path d="M12 2l-4 10h8l-4-10z" />
    </svg>
  );
}

export function CatSpecialIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

export function CatChoresIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M4 7h16l-1 13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 7z" />
      <line x1="9" y1="4" x2="15" y2="4" />
      <line x1="8" y1="7" x2="8" y2="11" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <line x1="16" y1="7" x2="16" y2="11" />
    </svg>
  );
}

export function CatCasualIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="14" y2="13" />
    </svg>
  );
}

export function CatOtherIcon({ size = 20, ...props }: IconProps) {
  return <PawIcon size={size} {...props} />;
}

export const CategoryIcons: Record<string, React.FC<IconProps>> = {
  romantic: CatRomanticIcon,
  datenight: CatDateIcon,
  adventure: CatAdventureIcon,
  special: CatSpecialIcon,
  chores: CatChoresIcon,
  casual: CatCasualIcon,
  other: CatOtherIcon,
};
