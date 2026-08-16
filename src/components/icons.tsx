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

export function MenuIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
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
  return <GiftIcon size={size} {...props} />;
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

export function CatOutingIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M5 17h14l-1.5-6.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5L5 17z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  );
}

export function CatAppointmentIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6" />
      <polyline points="9 13 11 15 15 11" />
    </svg>
  );
}

export function CatOtherIcon({ size = 20, ...props }: IconProps) {
  return <PawIcon size={size} {...props} />;
}

export const CategoryIcons: Record<string, React.FC<IconProps>> = {
  betime: CatRomanticIcon,
  outings: CatOutingIcon,
  occasions: CatSpecialIcon,
  social: CatCasualIcon,
  errands: CatChoresIcon,
  appointments: CatAppointmentIcon,
  other: CatOtherIcon,
  // Legacy ids — kept so any un-migrated row still renders an icon
  romantic: CatRomanticIcon,
  datenight: CatDateIcon,
  adventure: CatAdventureIcon,
  special: CatSpecialIcon,
  chores: CatChoresIcon,
  casual: CatCasualIcon,
};

// ─────────────────────────────────────────────────────────────
// Feature glyphs
// ─────────────────────────────────────────────────────────────

export function BellIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 8.5-2.5 8.5h17S18 14.5 18 8.5" />
      <path d="M13.7 20.5a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function HighlightStarIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <polygon points="12 2.5 15 8.7 21.8 9.7 16.9 14.4 18.1 21.2 12 18 5.9 21.2 7.1 14.4 2.2 9.7 9 8.7" />
    </svg>
  );
}

export function CameraIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M21 18.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3.2l1.8-2.5h4l1.8 2.5H19a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function LetterIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <rect x="2.5" y="5.5" width="19" height="13.5" rx="2.5" />
      <path d="M4 8l6 4.2" />
      <path d="M20 8l-6 4.2" />
      <path d="M12 10.2c-.4-.6-1.5-.7-1.9 0-.3.5 0 1.2.5 1.6l1.4 1.1 1.4-1.1c.5-.4.8-1.1.5-1.6-.4-.7-1.5-.6-1.9 0z" />
    </svg>
  );
}

export function GratitudeHeartIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M12 20.5s-7.5-4.8-7.5-11A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 7.5 3.3c0 6.2-7.5 11-7.5 11z" />
      <path d="M19.5 2.5l.55 1.55L21.6 4.6l-1.55.55L19.5 6.7l-.55-1.55L17.4 4.6l1.55-.55z" />
    </svg>
  );
}

export function FlameIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-3.2-1.8-5.6-4-7.6.3 2.6-1 4-2.3 4.6.2-2.8-1-5.2-3.4-7-.1 4-3.3 5.4-4.3 8.2A7.5 7.5 0 0 0 12 22z" />
      <path d="M12 18.8c-.7-.9-2-.9-2.6 0-.4.7 0 1.6.6 2l2 1.6 2-1.6c.6-.4 1-1.3.6-2-.6-.9-1.9-.9-2.6 0z" />
    </svg>
  );
}

export function TrophyIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M7 4h10v6a5 5 0 0 1-10 0z" />
      <path d="M7 5H4.5a2.5 2.5 0 0 0 0 5H7" />
      <path d="M17 5h2.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M12 15v3" />
      <path d="M9.5 18h5" />
      <path d="M8 21h8" />
    </svg>
  );
}

export function CrownIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M3.5 17.5 2 7l5.5 3.5L12 4l4.5 6.5L22 7l-1.5 10.5z" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function PolaroidIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 15h17" />
      <circle cx="12" cy="10" r="2.2" />
      <path d="M12 16.4c-.4-.5-1.2-.6-1.5 0-.25.5 0 1 .4 1.3l1.1.9 1.1-.9c.4-.3.65-.8.4-1.3-.3-.6-1.1-.5-1.5 0z" />
    </svg>
  );
}

export function SparklesIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z" />
      <path d="M18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </svg>
  );
}

export function CelebrateIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M4.5 13.5 3 21l7.5-1.5" />
      <path d="M12.5 4.5l.8-2" />
      <path d="M15 8l2-.8" />
      <path d="M13.5 9.5l1.9 1.9" />
      <path d="M19.5 13.5l2-.5" />
      <path d="M18.5 9.5 20 8" />
      <path d="M9 7l.5-2" />
    </svg>
  );
}

export function StatsIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M3.5 20.5h17" />
      <line x1="7" y1="16.5" x2="7" y2="20" />
      <line x1="12" y1="10.5" x2="12" y2="20" />
      <line x1="17" y1="13.5" x2="17" y2="20" />
    </svg>
  );
}

export function TimelineIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M3.5 4.5V9H8" />
      <path d="M3.6 9a8.5 8.5 0 1 0 1.9-3.4" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function BirthdayCakeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M4 21.5h16" />
      <path d="M5.5 21.5V16h13v5.5" />
      <path d="M7.5 16v-3.5h9V16" />
      <path d="M12 12.5V10" />
      <path d="M9 12.5V11" />
      <path d="M15 12.5V11" />
      <path d="M12 9.8c-.6-.7-.6-1.5 0-2.2.6.7.6 1.5 0 2.2z" />
    </svg>
  );
}

export function GiftIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      <line x1="12" y1="8" x2="12" y2="21" />
      <path d="M12 8c-1.5 0-4.5-.8-4.5-3A2 2 0 0 1 9.5 3c2.4 0 2.5 3.5 2.5 5z" />
      <path d="M12 8c1.5 0 4.5-.8 4.5-3A2 2 0 0 0 14.5 3C12.1 3 12 6.5 12 8z" />
    </svg>
  );
}

export function ChatIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M21 14.5a2 2 0 0 1-2 2H8l-4.5 4V5.5a2 2 0 0 1 2-2H19a2 2 0 0 1 2 2z" />
      <circle cx="9" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PencilIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M17 3.5a2.4 2.4 0 0 1 3.4 3.4L8 19.5 3.5 20.5 4.5 16z" />
      <line x1="14.5" y1="6" x2="18" y2="9.5" />
    </svg>
  );
}

export function TrashIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M4 7h16" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <polyline points="14.5 6 8.5 12 14.5 18" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <polyline points="9.5 6 15.5 12 9.5 18" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <polyline points="6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <line x1="20" y1="12" x2="4" y2="12" />
      <polyline points="10 6 4 12 10 18" />
    </svg>
  );
}

export function MoonIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a7 7 0 0 0 10 10z" />
    </svg>
  );
}

export function LogOutIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M9 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2H9" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function CalendarClockIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <line x1="3.5" y1="10.5" x2="20.5" y2="10.5" />
      <circle cx="12" cy="15.5" r="3" />
      <polyline points="12 14 12 15.5 13 16.3" />
    </svg>
  );
}

export function LoaderIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function PauseIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
      <rect x="14" y="5" width="3.5" height="14" rx="1" />
    </svg>
  );
}

export function PlayIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <polygon points="7 4.5 19.5 12 7 19.5" />
    </svg>
  );
}

export function CatIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <circle cx="12" cy="13.5" r="7" />
      <circle cx="5.5" cy="6" r="2" />
      <circle cx="18.5" cy="6" r="2" />
      <circle cx="9.5" cy="13" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="0.5" fill="currentColor" stroke="none" />
      <path d="M10.5 16c.5.5 1 .5 1.5 0s1-.5 1.5 0" />
    </svg>
  );
}

export function SmilePlusIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <circle cx="10" cy="14" r="7.5" />
      <path d="M7 14.5c.7 1.6 1.7 2.3 3 2.3s2.3-.7 3-2.3" />
      <circle cx="7.5" cy="11" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="11" r="0.5" fill="currentColor" stroke="none" />
      <path d="M19.5 4.5v5" />
      <path d="M17 7h5" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Person glyphs (personTag chips & filters)
// ─────────────────────────────────────────────────────────────

export function CoupleIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M9 20.5s-6.5-4.2-6.5-9.8A4.1 4.1 0 0 1 9 7.6a4.1 4.1 0 0 1 6.5 3.1c0 5.6-6.5 9.8-6.5 9.8z" />
      <path d="M17 9.5s-3.8-2.4-3.8-5.7A2.4 2.4 0 0 1 17 1.7a2.4 2.4 0 0 1 3.8 2.1c0 3.3-3.8 5.7-3.8 5.7z" />
    </svg>
  );
}

export function FamilyIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M5.5 9.5V20.5h13V9.5" />
      <path d="M12 16.5c-.8-1-2.3-1.1-2.9 0-.5.8 0 1.8.7 2.3l2.2 1.8 2.2-1.8c.7-.5 1.2-1.5.7-2.3-.6-1.1-2.1-1-2.9 0z" />
    </svg>
  );
}

export function TulipIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M12 21v-8" />
      <path d="M12 13c-3.4 0-5-2.4-5-5.5 1.8 1.2 3.3 1.4 5-1 1.7 2.4 3.2 2.2 5 1 0 3.1-1.6 5.5-5 5.5z" />
      <path d="M12 17.5c-1.9 0-3.5-1.6-3.5-3.5 1.9 0 3.5 1.6 3.5 3.5z" />
    </svg>
  );
}

export function TeddyIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <circle cx="12" cy="9" r="5" />
      <circle cx="5.5" cy="4.5" r="2.2" />
      <circle cx="18.5" cy="4.5" r="2.2" />
      <path d="M12 14c-3.3 0-5.5 2.6-5.5 5 0 1.4 1 2.5 2.4 2.5 1 0 2-.6 3.1-.6s2.1.6 3.1.6c1.4 0 2.4-1.1 2.4-2.5 0-2.4-2.2-5-5.5-5z" />
      <circle cx="10" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
      <path d="M12 10.2v.9" />
      <path d="M10.8 11.9c.7.6 1.7.6 2.4 0" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Reaction glyphs (keyed by the emoji string stored in the DB)
// ─────────────────────────────────────────────────────────────

export function LaughIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 12.5c.6 3 2.3 4.7 4.5 4.7s3.9-1.7 4.5-4.7z" />
      <path d="M7.5 9.5c.5-.8 1.5-.8 2 0" />
      <path d="M14.5 9.5c.5-.8 1.5-.8 2 0" />
    </svg>
  );
}

export function HeartEyesIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 15c1 1.3 2.4 2 4 2s3-.7 4-2" />
      <path d="M8.3 8.8c-.4-.5-1.1-.6-1.4 0-.25.45 0 .95.4 1.3l1 .8 1-.8c.4-.35.65-.85.4-1.3-.3-.6-1-.5-1.4 0z" />
      <path d="M15.7 8.8c-.4-.5-1.1-.6-1.4 0-.25.45 0 .95.4 1.3l1 .8 1-.8c.4-.35.65-.85.4-1.3-.3-.6-1-.5-1.4 0z" />
    </svg>
  );
}

export function ClapIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M9.5 12V6.8a1.3 1.3 0 0 1 2.6 0V11" />
      <path d="M12.1 11V5.3a1.3 1.3 0 0 1 2.6 0V11" />
      <path d="M14.7 11V6.3a1.3 1.3 0 0 1 2.6 0v6.2c0 4.2-2 7.5-5.3 7.5-2.6 0-4.4-1.4-5.6-3.6L4.6 13c-.4-.8-.2-1.7.6-2.1.7-.4 1.6-.1 2 .6l1.3 2" />
      <path d="M12 2.5v1.5" />
      <path d="M8 2.8l.6 1.4" />
      <path d="M16 2.8l-.6 1.4" />
    </svg>
  );
}

export function WowIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="9.3" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.3" r="0.6" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="15.3" rx="2" ry="2.6" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Badge & level glyphs
// ─────────────────────────────────────────────────────────────

export function TeapotIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M7.5 10.5h8v4.5a4.5 4.5 0 0 1-4.5 4.5 4.5 4.5 0 0 1-4.5-4.5z" />
      <path d="M9.5 10.5V9a2.5 2.5 0 0 1 5 0v1.5" />
      <line x1="12" y1="5" x2="12" y2="6.5" />
      <path d="M7.5 13.5 3.8 11l1.4-2.6" />
      <path d="M15.5 12h1.75a2.75 2.75 0 0 1 0 5.5H15" />
    </svg>
  );
}

export function BoltIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <polygon points="13 2 3 14 11 14 10 22 21 10 13 10" />
    </svg>
  );
}

export function CandleIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M12 9.8c-1.1-.9-1.1-2.4 0-3.8 1.1 1.4 1.1 2.9 0 3.8z" />
      <rect x="9.5" y="10" width="5" height="11" rx="1.2" />
      <path d="M6.5 21h11" />
    </svg>
  );
}

export function ScarfIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M8 3.5c0 4-3 5.5-3 9a4.5 4.5 0 0 0 4.5 4.5H14" />
      <path d="M16 3.5c0 4 3 5.5 3 9a4.5 4.5 0 0 1-4.5 4.5H10" />
      <path d="M9.5 17v2" />
      <path d="M12 17v2" />
      <path d="M14.5 17v2" />
    </svg>
  );
}

export function HeartHandsIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M12 19.5c-3.6-2.3-7-5-7-8.6C5 8.2 6.8 6.5 9 6.5c1.2 0 2.3.6 3 1.7.7-1.1 1.8-1.7 3-1.7 2.2 0 4 1.7 4 4.4 0 3.6-3.4 6.3-7 8.6z" />
      <path d="M4 14.5c-.8 1.3-.8 3 0 4.5.5 1 1.6 1.5 2.7 1.2" />
      <path d="M20 14.5c.8 1.3.8 3 0 4.5-.5 1-1.6 1.5-2.7 1.2" />
    </svg>
  );
}

export function MountainIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="m2.5 20.5 7.5-15 4.3 8.6 2.2-3.6 5 10z" />
      <path d="M8.9 8.6l1.4 2 1.4-1.6 1.3 1.7" />
    </svg>
  );
}

export function HeartFlameIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...icon({ size, ...props })}>
      <path d="M12 21s-7.5-4.8-7.5-11A4.7 4.7 0 0 1 12 6.7a4.7 4.7 0 0 1 7.5 3.3c0 6.2-7.5 11-7.5 11z" />
      <path d="M12 16.5c-1.6 0-2.8-1.2-2.8-2.7 0-1.1.6-1.9 1.4-2.7-.1.9.3 1.4.8 1.7-.1-1 .3-1.8 1.1-2.5.2 1.6 2.3 2 2.3 3.5 0 1.5-1.2 2.7-2.8 2.7z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Registries — map domain ids/emoji keys to icon components,
// mirroring CategoryIcons. Emoji strings stay as data (emails,
// push, Google Calendar can't render SVG); the UI renders these.
// ─────────────────────────────────────────────────────────────

export const PersonIcons: Record<string, React.FC<IconProps>> = {
  family: FamilyIcon,
  couple: CoupleIcon,
  wife: TulipIcon,
  husband: CoffeeIcon,
  child: TeddyIcon,
};

export const ReactionIcons: Record<string, React.FC<IconProps>> = {
  "❤️": HeartIcon,
  "😂": LaughIcon,
  "🥰": HeartEyesIcon,
  "👏": ClapIcon,
  "😮": WowIcon,
  "🔥": FlameIcon,
};

export const BadgeIcons: Record<string, React.FC<IconProps>> = {
  brewing_beginner: CoffeeIcon,
  steady_sipper: TeapotIcon,
  espresso_expert: BoltIcon,
  latte_legend: CrownIcon,
};

export const LevelIcons: Record<number, React.FC<IconProps>> = {
  1: CoffeeIcon,
  2: CandleIcon,
  3: ScarfIcon,
  4: HeartHandsIcon,
  5: MountainIcon,
  6: CameraIcon,
  7: HighlightStarIcon,
  8: BoltIcon,
  9: HeartFlameIcon,
  10: CrownIcon,
};
