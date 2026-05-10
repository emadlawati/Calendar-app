"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import UserMenu from "@/components/UserMenu";
import NudgeButton from "@/components/NudgeButton";
import EventModal from "@/components/EventModal";
import DetailsModal from "@/components/DetailsModal";
import CountdownBanner from "@/components/CountdownBanner";
import NoteDrawer from "@/components/NoteDrawer";
import BucketListDrawer from "@/components/BucketListDrawer";
import Toast from "@/components/Toast";
import { useSession } from "@/components/SessionProvider";
import { triggerConfetti } from "@/lib/confetti";
import { getCategoryById } from "@/lib/categories";
import type { CalendarEvent, StickyNote } from "@/lib/types";
import { HeartPulse, Plus, X, Heart } from "lucide-react";
import { getDisplayName } from "@/lib/names";

const TIMEZONE = "+04:00"; // Asia/Muscat GMT+4

// Setup react-big-calendar localizer
const locales = {
  "en-US": enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Extended type that includes the calendar view computed fields
interface CalendarViewEvent extends CalendarEvent {
  start: Date;
  end: Date;
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

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = showArchived ? '/api/events?showArchived=true' : '/api/events';
      const res = await fetch(url, { 
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data.map((event: CalendarEvent) => {
          const datePart = new Date(event.date).toISOString().split('T')[0];
          // Parse times in Asia/Muscat timezone (GMT+4)
          const start = new Date(`${datePart}T${event.time}:00${TIMEZONE}`);
          let end: Date;
          if (event.endTime) {
            end = new Date(`${datePart}T${event.endTime}:00${TIMEZONE}`);
          } else {
            end = new Date(start.getTime() + 60 * 60 * 1000);
          }
          
          return {
            ...event,
            start,
            end,
            allDay: event.allDay || false,
          };
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
    // Check for URL query params (email accept, google connect, etc.)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('accepted') === 'true') {
      setToastMessage("Meow! The plan has been accepted! 🧶");
      triggerConfetti();
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    } else if (urlParams.get('google') === 'connected') {
      const googleUser = urlParams.get('user') || '';
      setToastMessage(`🐾 Google Calendar connected for ${googleUser}!`);
      window.history.replaceState({}, '', '/');
    } else if (urlParams.get('google') === 'error') {
      setToastMessage("😿 Could not connect Google Calendar. Please try again.");
      window.history.replaceState({}, '', '/');
    }
    }, [fetchEvents]);

  // Fetch unread flying notes on page load
  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFlyingNotes(data);
        }
      })
      .catch(() => {});
  }, []);

  const dismissNote = async (id: string) => {
    setFlyingNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: "PATCH" }).catch(() => {});
  };

  // Listen for nudge events from NudgeButton
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setToastMessage(`💕 ${e.detail}`);
    };
    window.addEventListener("nudge-sent", handler as EventListener);
    return () => window.removeEventListener("nudge-sent", handler as EventListener);
  }, []);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarViewEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const eventStyleGetter = (event: CalendarViewEvent) => {
    const category = getCategoryById(event.category);
    const isPending = event.status === "pending";

    const backgroundColor = category.color;
    const border = isPending ? `2px dashed ${category.color === '#fdfbf7' ? 'var(--color-latte-brown)' : category.color}` : "2px solid rgba(255,255,255,0.6)";
    const opacity = isPending ? 0.8 : 1;

    return {
      style: {
        backgroundColor,
        color: "var(--color-text-dark)" as const,
        borderRadius: "12px",
        border,
        opacity,
        padding: "2px 6px",
        fontSize: "0.75rem",
        fontWeight: "bold" as const,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        display: "block" as const,
        overflow: "hidden" as const,
        textOverflow: "ellipsis" as const,
        whiteSpace: "nowrap" as const,
      },
    };
  };

  return (
    <AnimatePresence mode="wait">
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="min-h-screen p-4 md:p-8 flex flex-col max-w-6xl mx-auto relative overflow-hidden"
      >
        {/* Decorative background elements */}
        <motion.div 
          animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 -left-10 text-6xl opacity-10 pointer-events-none select-none"
        >
          🐾
        </motion.div>
        <motion.div 
          animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-10 -right-10 text-6xl opacity-10 pointer-events-none select-none"
        >
          🧶
        </motion.div>

        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 md:mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <HeartPulse className="text-blush-pink" size={32} />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-sniglet text-text-dark">Our Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <NudgeButton />
            <UserMenu />
          </div>
        </header>

        <div className="mb-4 relative z-10">
          <CountdownBanner events={events} />
        </div>

        <div className="flex justify-end mb-4 relative z-10 gap-2 flex-wrap">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsNoteDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border-2 bg-white text-latte-brown border-latte-brown/30 hover:border-blush-pink"
          >
            💌 Notes
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsBucketDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border-2 bg-white text-latte-brown border-latte-brown/30 hover:border-blush-pink"
          >
            🎯 Bucket List
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border-2 ${
              showArchived 
                ? 'bg-latte-brown text-white border-latte-brown' 
                : 'bg-white text-latte-brown border-latte-brown/30 hover:border-latte-brown'
            }`}
          >
            {showArchived ? '🐾 Showing All' : '📦 Archived'}
          </motion.button>
        </div>

        <motion.div 
          layout
          className="flex-1 plush-card p-3 md:p-6 mb-8 flex flex-col min-h-[400px] md:min-h-[700px] relative z-10"
        >
          <div className="flex-1 h-full min-h-[350px] md:min-h-[600px]">
            {(isLoading || isSessionLoading) ? (
              <div className="flex items-center justify-center h-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-4xl"
                >
                  🧶
                </motion.div>
              </div>
            ) : (
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                allDayAccessor="allDay"
                view={view}
                onView={(newView: View) => setView(newView)}
                style={{ height: "100%", fontFamily: "var(--font-quicksand)" }}
                components={{
                  event: ({ event }: { event: CalendarViewEvent }) => (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1"
                    >
                      <span>{getCategoryById(event.category).emoji}</span>
                      <span className="truncate">{event.title}</span>
                    </motion.div>
                  )
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

        {/* Desktop Create Event Button */}
        <div className="hidden md:flex justify-center relative z-10">
          <motion.button
            whileHover={{ scale: 1.1, y: -5, boxShadow: "0 20px 30px -10px rgba(215, 204, 200, 0.6)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsModalOpen(true)}
            className="bg-blush-pink text-text-dark font-sniglet text-2xl px-10 py-5 rounded-full shadow-plush flex items-center gap-4 border-4 border-white group"
          >
            <span>Create Event</span>
            <motion.span 
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl"
            >
              🧶
            </motion.span>
          </motion.button>
        </div>

        {/* Mobile FAB */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsModalOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-blush-pink text-text-dark rounded-full shadow-plush flex items-center justify-center border-4 border-white"
        >
          <Plus size={28} />
        </motion.button>

        <EventModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchEvents}
          selectedDate={selectedDate}
        />

        <DetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onSuccess={fetchEvents}
          event={selectedEvent}
        />

        <NoteDrawer
          isOpen={isNoteDrawerOpen}
          onClose={() => setIsNoteDrawerOpen(false)}
        />

        <BucketListDrawer
          isOpen={isBucketDrawerOpen}
          onClose={() => setIsBucketDrawerOpen(false)}
        />

        {/* Flying Sticky Notes */}
        <AnimatePresence>
          {flyingNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -60, rotate: -5, x: 20 }}
              animate={{
                opacity: 1,
                y: [0, -15, 0],
                rotate: [-3, 2, 0],
              }}
              exit={{ opacity: 0, x: 100, rotate: 15 }}
              transition={{
                delay: index * 0.25,
                y: { duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
              }}
              style={{
                top: `${60 + index * 110}px`,
                right: "16px",
              }}
              className="fixed z-50 w-64 bg-yellow-100/95 backdrop-blur-sm rounded-lg shadow-lg border border-yellow-200 p-4 cursor-pointer"
              onClick={() => dismissNote(note.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNote(note.id);
                }}
                className="absolute top-1.5 right-1.5 text-yellow-500/50 hover:text-yellow-700 transition-colors"
              >
                <X size={14} />
              </button>
              <div className="flex items-start gap-2">
                <Heart size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-dark leading-snug font-quicksand">{note.content}</p>
                  <p className="text-[10px] text-text-dark/40 mt-1.5">
                    — {getDisplayName(note.createdBy)} 💌
                  </p>
                  <p className="text-[9px] text-text-dark/25 mt-0.5">
                    {new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
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
