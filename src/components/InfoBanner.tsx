"use client";

import { motion } from "framer-motion";

/**
 * Compact inline banner used for transient prompts on the home page
 * (pending memory, flashback, etc.).
 */
export default function InfoBanner({
  title,
  subtitle,
  actionLabel,
  onAction,
  href,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction?: () => void;
  href?: string;
}) {
  const actionClass =
    "chip-pill font-medium text-xs shrink-0 motion-safe:transition-transform hover:scale-[1.03] active:scale-[0.97]";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 p-4 rounded-2xl border"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {title}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--text-soft)" }}>
          {subtitle}
        </p>
      </div>
      {href ? (
        <motion.a whileTap={{ scale: 0.97 }} href={href} className={actionClass} style={{ whiteSpace: "nowrap" }}>
          {actionLabel}
        </motion.a>
      ) : (
        <motion.button whileTap={{ scale: 0.97 }} onClick={onAction} className={actionClass} style={{ whiteSpace: "nowrap" }}>
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
