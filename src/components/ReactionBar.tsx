"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus } from "lucide-react";
import { useSession } from "./SessionProvider";
import { getDisplayName } from "@/lib/names";
import { REACTION_EMOJIS } from "@/lib/reactions";
import type { Reaction, CommentTarget } from "@/lib/types";

interface Props {
  targetType: CommentTarget;
  targetId: string;
}

export default function ReactionBar({ targetType, targetId }: Props) {
  const { user } = useSession();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/reactions?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
        { credentials: "same-origin" },
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setReactions(data);
      }
    } catch {
      /* ignore */
    }
  }, [targetType, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (emoji: string) => {
    if (!user || busy) return;
    setBusy(true);
    setPicker(false);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ targetType, targetId, emoji, createdBy: user }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reactions)) setReactions(data.reactions);
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  // Group by emoji
  const groups = REACTION_EMOJIS.map((emoji) => {
    const forEmoji = reactions.filter((r) => r.emoji === emoji);
    return {
      emoji,
      count: forEmoji.length,
      mine: forEmoji.some((r) => r.createdBy === user),
      who: forEmoji.map((r) => getDisplayName(r.createdBy)).join(", "),
    };
  }).filter((g) => g.count > 0);

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative">
      {groups.map((g) => (
        <motion.button
          key={g.emoji}
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => toggle(g.emoji)}
          title={g.who}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors"
          style={{
            background: g.mine ? "var(--accent-soft)" : "var(--input-bg)",
            border: `1px solid ${g.mine ? "var(--accent)" : "var(--divider)"}`,
            color: "var(--text)",
          }}
        >
          <span style={{ fontSize: 13 }}>{g.emoji}</span>
          <span className="font-semibold" style={{ color: "var(--text-soft)" }}>{g.count}</span>
        </motion.button>
      ))}

      {/* Add-reaction button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => setPicker((p) => !p)}
        aria-label="Add reaction"
        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
        style={{ background: "var(--input-bg)", border: "1px solid var(--divider)", color: "var(--text-soft)" }}
      >
        <SmilePlus size={14} />
      </motion.button>

      {/* Emoji picker popover */}
      <AnimatePresence>
        {picker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPicker(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-9 left-0 z-20 flex items-center gap-1 p-1.5 rounded-2xl"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "var(--pop-shadow)",
              }}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  type="button"
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggle(emoji)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ fontSize: 17 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
