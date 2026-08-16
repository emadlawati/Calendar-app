"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { BellIcon } from "@/components/icons";
import { useSession } from "./SessionProvider";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (msg: string) => void;
}

export default function ReminderModal({ isOpen, onClose, onSuccess, onToast }: Props) {
  const { user } = useSession();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDate("");
    setTime("");
    setEndTime("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date || !time || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), date, time, endTime: endTime || undefined }),
      });
      if (res.ok) {
        onToast("Reminder set!");
        onSuccess();
        handleClose();
      } else {
        const err = await res.json();
        onToast(`Error: ${err.error || "Failed to create reminder"}`);
      }
    } catch {
      onToast("Error: Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      width="sm"
      title={
        <div className="flex items-center gap-2">
          <BellIcon size={20} style={{ color: "var(--accent)" }} />
          <h2 className="heading-font text-xl" style={{ color: "var(--accent)" }}>
            New Reminder
          </h2>
        </div>
      }
    >
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-very)" }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Doctor appointment"
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text)",
                    }}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-very)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text)",
                    }}
                  />
                </div>

                {/* Time row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-very)" }}>
                      Time *
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--card-border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-very)" }}>
                      End time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--card-border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                </div>

                <p className="text-[11px]" style={{ color: "var(--text-very)" }}>
                  You'll both receive an email 24 hours and 1 hour before the reminder.
                </p>

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-70"
                    style={{ background: "var(--input-bg)", color: "var(--text-soft)" }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={submitting || !title.trim() || !date || !time}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{
                      background: submitting || !title.trim() || !date || !time ? "var(--input-bg)" : "var(--accent)",
                      color: submitting || !title.trim() || !date || !time ? "var(--text-very)" : "var(--on-accent)",
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <BellIcon size={13} />
                      {submitting ? "Setting..." : "Set Reminder"}
                    </span>
                  </motion.button>
                </div>
      </form>
    </Modal>
  );
}
