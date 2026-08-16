"use client";

import type { CSSProperties } from "react";

/** Shimmering placeholder block — see `.skeleton` in globals.css. */
export default function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

/** Toolbar + month-grid skeleton that matches the calendar card's shape. */
export function CalendarSkeleton() {
  return (
    <div className="p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-36 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`h${i}`} className="h-3 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl sm:h-20 md:h-[4.5rem]" />
        ))}
      </div>
    </div>
  );
}
