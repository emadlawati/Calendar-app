"use client";

import { motion } from "framer-motion";

const OPTIONS = [
  { value: "once", label: "Once" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

export type RecurrenceOption = (typeof OPTIONS)[number]["value"];

interface RecurrenceSelectorProps {
  value: RecurrenceOption;
  onChange: (value: RecurrenceOption) => void;
}

export default function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(opt.value)}
            className="chip-pill text-xs font-medium"
            style={{
              background: active ? "var(--accent)" : "var(--chip-bg)",
              borderColor: active ? "var(--accent)" : "var(--chip-border)",
              color: active ? "var(--on-accent)" : "var(--chip-text)",
              padding: "5px 12px",
            }}
          >
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}
