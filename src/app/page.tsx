"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import UserMenu from "@/components/UserMenu";
import EventModal from "@/components/EventModal";
import DetailsModal from "@/components/DetailsModal";
import CountdownBanner from "@/components/CountdownBanner";
import StreakBanner from "@/components/StreakBanner";
import NoteDrawer from "@/components/NoteDrawer";
import BucketListDrawer from "@/components/BucketListDrawer";
import Toast from "@/components/Toast";
import { useSession } from "@/components/SessionProvider";
import { triggerConfetti } from "@/lib/confetti";
import { getCategoryById } from "@/lib/categories";
import { CategoryIcons, PlusIcon } from "@/components/icons";
import type { CalendarEvent, StickyNote, SpecialDateWithCountdown, StreakData, PendingMemory, Reminder } from "@/lib/types";
import SaveMemoryModal from "@/components/SaveMemoryModal";
import ReminderModal from "@/components/ReminderModal";

const TIMEZONE = "+04:00";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarViewEvent extends CalendarEvent {
  start: Date;
  end: Date;
  isReminder?: boolean;
}

export default function Home() {
  const { isLoading: isSessionLoading } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarViewEvent | null>(null);
  const [events, setEvents] = useState<CalendarViewEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [showArchived, setShowArchived] = useState(false);
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
  const [isBucketDrawerOpen, setIsBucketDrawerOpen] = useState(false);
  const [flyingNotes, setFlyingNotes] = useState<StickyNote[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDateWithCountdown[]>([]);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [pendingMemory, setPendingMemory] = useState<PendingMemory | null>(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [flashback, setFlashback] = useState<{ memory: { id: string; journal: string | null; photos: string | null; event: { id: string; title: string; category: string | null } }; yearsAgo: number } | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = showArchived ? '/api/events?showArchived=true' : '/api/events';
      const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data.map((event: CalendarEvent) => {
          const datePart = new Date(event.date).toISOString().split('T')[0];
          const start = new Date(`${datePart}T${event.time}:00${TIMEZONE}`);
          let end: Date;
          if (event.endTime) {
            end = new Date(`${datePart}T${event.endTime}:00${TIMEZONE}`);
          } else {
            end = new Date(start.getTime() + 60 * 60 * 1000);
          }
          return { ...event, start, end, allDay: event.allDay || false };
        }));
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('accepted') === 'true') {
      setToastMessage("Meow! The plan has been accepted! 🧶");
      triggerConfetti();
      window.history.replaceState({}, '', '/');
    } else if (urlParams.get('google') === 'connected') {
      setToastMessage("Google Calendar connected!");
      window.history.replaceState({}, '', '/');
    } else if (urlParams.get('google') === 'error') {
      setToastMessage("Could not connect Google Calendar. Please try again.");
      window.history.replaceState({}, '', '/');
    }
  }, [fetchEvents]);

  // Fetch unread flying notes
  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setFlyingNotes(data);
      })
      .catch(() => {});
  }, []);

  // Fetch streaks
  useEffect(() => {
    fetch("/api/streaks")
      .then((r) => r.json())
      .then((data) => {
        if (data.currentStreak !== undefined) setStreakData(data);
      })
      .catch(() => {});
  }, []);

  // Fetch special dates
  useEffect(() => {
    fetch("/api/special-dates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSpecialDates(data as SpecialDateWithCountdown[]);
      })
      .catch(() => {});
  }, []);

  // Check for pending memories to rate
  useEffect(() => {
    fetch("/api/memories/pending")
      .then((r) => r.json())
      .then((data) => {
        if (data?.event) setPendingMemory(data);
      })
      .catch(() => {});
  }, []);

  // "On this day" flashback
  useEffect(() => {
    fetch("/api/memories/flashback")
      .then((r) => r.json())
      .then((data) => { if (data?.memory) setFlashback(data); })
      .catch(() => {});
  }, []);

  // Fetch reminders
  const fetchReminders = useCallback(async () => {
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setReminders(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const dismissNote = async (id: string) => {
    setFlyingNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: "PATCH" }).catch(() => {});
  };

  useEffect(() => {
    const handler = (e: CustomEvent) => setToastMessage(`💕 ${e.detail}`);
    window.addEventListener("nudge-sent", handler as EventListener);
    return () => window.removeEventListener("nudge-sent", handler as EventListener);
  }, []);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarViewEvent) => {
    // Reminders are not full calendar events — skip the details modal
    if (event.isReminder) return;
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const eventStyleGetter = (event: CalendarViewEvent) => {
    if (event.isReminder) {
      return {
        style: {
          backgroundColor: "#e8eaf6",
          color: "#3949ab",
          borderLeft: "3px solid #5c6bc0",
          borderRadius: "8px",
          padding: "4px 7px 4px 6px",
          fontSize: "11.5px",
          fontWeight: 500,
          display: "flex" as const,
          alignItems: "center" as const,
          gap: "6px",
          overflow: "hidden" as const,
          textOverflow: "ellipsis" as const,
          whiteSpace: "nowrap" as const,
          cursor: "pointer",
        },
      };
    }
    const cat = getCategoryById(event.category);
    return {
      style: {
        backgroundColor: cat.color,
        color: cat.textColor,
        borderLeft: `3px solid ${cat.dotColor}`,
        borderRadius: "8px",
        padding: "4px 7px 4px 6px",
        fontSize: "11.5px",
        fontWeight: 500,
        display: "flex" as const,
        alignItems: "center" as const,
        gap: "6px",
        overflow: "hidden" as const,
        textOverflow: "ellipsis" as const,
        whiteSpace: "nowrap" as const,
        cursor: "pointer",
      },
    };
  };

  // Merge reminders into the calendar events array
  const reminderEvents: CalendarViewEvent[] = reminders.map((r) => {
    const datePart = new Date(r.date).toISOString().split("T")[0];
    const start = new Date(`${datePart}T${r.time}:00${TIMEZONE}`);
    const end = r.endTime
      ? new Date(`${datePart}T${r.endTime}:00${TIMEZONE}`)
      : new Date(start.getTime() + 60 * 60 * 1000);
    return {
      id: r.id,
      title: r.title,
      notes: null,
      date: r.date,
      time: r.time,
      endTime: r.endTime ?? null,
      category: null,
      allDay: false,
      createdBy: r.createdBy,
      status: "accepted" as const,
      archived: false,
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
      start,
      end,
      isReminder: true,
    };
  });

  const allCalendarEvents = [...events, ...reminderEvents];

  return (
    <AnimatePresence mode="wait">
      <motion.main
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex flex-col max-w-6xl mx-auto relative"
      >
        {/* Header */}
        <UserMenu onSendNote={() => setIsNoteDrawerOpen(true)} />

        {/* Countdown Banner */}
        <div className="mt-4 sm:mt-5">
          <CountdownBanner
            events={events}
            onOpenNotes={() => setIsNoteDrawerOpen(true)}
            onOpenBucket={() => setIsBucketDrawerOpen(true)}
            onToggleArchive={() => setShowArchived(!showArchived)}
            showArchived={showArchived}
            specialDates={specialDates}
            onDeleteSpecialDate={async (id) => {
              await fetch(`/api/special-dates/${id}`, { method: "DELETE", credentials: "same-origin" });
              setSpecialDates((prev) => prev.filter((d) => d.id !== id));
            }}
          />
          {streakData && (
            <div className="mx-4 sm:mx-8 mt-3">
              <StreakBanner streak={streakData} />
            </div>
          )}

          {pendingMemory && (
            <div className="mx-4 sm:mx-8 mt-3">
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
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Save this memory?
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                    {pendingMemory.event.title} · {pendingMemory.daysAgo} {pendingMemory.daysAgo === 1 ? "day" : "days"} ago
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsRateModalOpen(true)}
                  className="chip-pill font-medium text-xs"
                  style={{ whiteSpace: "nowrap" }}
                >
                  Save memory &rarr;
                </motion.button>
              </motion.div>
            </div>
          )}

          {flashback && (
            <div className="mx-4 sm:mx-8 mt-3">
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl border"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    📸 On this day, {flashback.yearsAgo} {flashback.yearsAgo === 1 ? "year" : "years"} ago
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-soft)" }}>
                    {flashback.memory.event.title}
                  </p>
                </div>
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href="/memories"
                  className="chip-pill font-medium text-xs shrink-0"
                  style={{ whiteSpace: "nowrap" }}
                >
                  View &rarr;
                </motion.a>
              </motion.div>
            </div>
          )}
        </div>

        {/* Calendar Card */}
        <motion.div layout className="flex-1 calendar-card mx-4 sm:mx-8 mt-[14px] sm:mt-[18px] mb-8 flex flex-col min-h-[360px] md:min-h-[650px]">
          <div className="flex-1 h-full min-h-[350px] md:min-h-[600px]">
            {(isLoading || isSessionLoading) ? (
              <div className="flex items-center justify-center h-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-3xl"
                >
                  ☕
                </motion.div>
              </div>
            ) : (
              <Calendar
                localizer={localizer}
                events={allCalendarEvents}
                startAccessor="start"
                endAccessor="end"
                allDayAccessor="allDay"
                view={view}
                onView={(newView: View) => setView(newView)}
                style={{ height: "100%" }}
                components={{
                  event: ({ event }: { event: CalendarViewEvent }) => {
                    if (event.isReminder) {
                      return (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ scale: 1.03 }}
                          className="flex items-center gap-1.5 group relative"
                        >
                          <span style={{ fontSize: 10 }}>🔔</span>
                          <span className="truncate">{event.title}</span>
                        </motion.div>
                      );
                    }
                    const cat = getCategoryById(event.category);
                    const Icon = CategoryIcons[cat.id];
                    return (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.03 }}
                        className="flex items-center gap-1.5 group relative"
                      >
                        <Icon size={11} color={cat.textColor} />
                        <span className="truncate">{event.title}</span>
                        {event.memoryId && <span style={{ fontSize: 9, opacity: 0.8 }}>📸</span>}
                      </motion.div>
                    );
                  },
                }}
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                selectable
                popup
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                className="calendar-custom"
              />
            )}
          </div>
        </motion.div>

        {/* Floating action buttons */}
        <div className="fixed bottom-5 sm:bottom-6 right-4 sm:right-8 z-50 flex items-center gap-2 sm:gap-3">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsReminderModalOpen(true)}
            className="flex items-center gap-2 text-sm sm:text-[15px] px-4 sm:px-[18px] py-3 sm:py-[14px] rounded-2xl font-semibold shadow-lg transition-colors"
            style={{
              background: "var(--card-bg)",
              border: "1.5px solid var(--card-border)",
              color: "var(--text)",
            }}
          >
            <span>🔔</span>
            <span className="hidden sm:inline">Reminder</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="btn-accent text-sm sm:text-[15px] px-4 sm:px-[22px] py-3 sm:py-[14px]"
          >
            <PlusIcon size={18} />
            New event
          </motion.button>
        </div>

        {/* Modals & Drawers */}
        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchEvents}
          selectedDate={selectedDate}
        />

        <DetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onSuccess={(newBadges) => {
            fetchEvents();
            fetch("/api/streaks").then(r => r.json()).then(d => {
              if (d.currentStreak !== undefined) setStreakData(d);
            });
            if (newBadges?.length) {
              setToastMessage(`\u{1F389} Achievement unlocked: ${newBadges[0].emoji} ${newBadges[0].label}!`);
              triggerConfetti();
            }
          }}
          event={selectedEvent}
          onSaveMemory={(evt) => {
            const daysAgo = Math.floor((Date.now() - new Date(evt.date).getTime()) / (1000 * 60 * 60 * 24));
            setPendingMemory({ event: { id: evt.id, title: evt.title, category: evt.category ?? null }, daysAgo });
            setIsRateModalOpen(true);
          }}
        />

        <NoteDrawer
          isOpen={isNoteDrawerOpen}
          onClose={() => setIsNoteDrawerOpen(false)}
        />

        <BucketListDrawer
          isOpen={isBucketDrawerOpen}
          onClose={() => setIsBucketDrawerOpen(false)}
        />

        <SaveMemoryModal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
          onSuccess={() => { fetchEvents(); setPendingMemory(null); }}
          pending={pendingMemory}
        />

        <ReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          onSuccess={fetchReminders}
          onToast={setToastMessage}
        />

        {/* Flying Notes */}
        <AnimatePresence>
          {flyingNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -60, x: 20 }}
              animate={{ opacity: 1, y: [0, -15, 0], rotate: [-3, 2, 0] }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ delay: index * 0.25, y: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }}
              style={{ top: `${90 + index * 110}px`, right: "16px" }}
              className="fixed z-50 w-64 note-card p-4 cursor-pointer"
              onClick={() => dismissNote(note.id)}
            >
              <p className="text-sm" style={{ color: "var(--text)" }}>{note.content}</p>
              <p className="text-[10px] mt-1.5" style={{ color: "var(--text-soft)" }}>
                — {note.createdBy === "Wife" ? "Budoor" : "Imad"} 💌
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        <Toast
          message={toastMessage || ""}
          isVisible={toastMessage !== null}
          onClose={() => setToastMessage(null)}
        />
      </motion.main>
    </AnimatePresence>
  );
}
