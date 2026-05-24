"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark-roast";

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Latte theme" : "Switch to Dark Roast theme"}
      className="flex items-center justify-center w-9 h-9 rounded-full border transition-colors"
      style={{
        background: "var(--chip-bg)",
        borderColor: "var(--chip-border)",
        color: "var(--chip-text)",
      }}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </motion.div>
    </motion.button>
  );
}
