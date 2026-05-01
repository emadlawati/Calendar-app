"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import UserToggle from "@/components/UserToggle";
import EventModal from "@/components/EventModal";
import DetailsModal from "@/components/DetailsModal";
import Toast from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import type { CalendarEvent } from "@/lib/types";
import { HeartPulse } from "lucide-react";

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
  const { currentUser } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarViewEvent | null>(null);
  const [events, setEvents] = useState<CalendarViewEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [showArchived, setShowArchived] = useState(false);

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
          // Parse YYYY-MM-DD from the stored date
          const datePart = new Date(event.date).toISOString().split('T')[0];
          // Combine with the HH:mm time string
          const start = new Date(`${datePart}T${event.time}:00`);
          // Use endTime from DB if available, otherwise default to 1 hour
          let end: Date;
          if (event.endTime) {
            end = new Date(`${datePart}T${event.endTime}:00`);
          } else {
            end = new Date(start.getTime() + 60 * 60 * 1000);
          }
          
          return {
            ...event,
            start,
            end,
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
    fetchEvents();
    // Check if we just came from an email acceptance
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('accepted') === 'true') {
      setToastMessage("Meow! The plan has been accepted! 🧶");
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }
  }, [fetchEvents]);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarViewEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const eventStyleGetter = (event: CalendarViewEvent) => {
    const isWife = event.createdBy === "Wife";
    const isPending = event.status === "pending";

    const backgroundColor = isWife ? "var(--color-wife-pink)" : "var(--color-husband-blue)";
    const border = isPending ? "2px dashed var(--color-latte-brown)" : "2px solid white";
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

        <header className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <HeartPulse className="text-blush-pink" size={32} />
            </motion.div>
            <h1 className="text-3xl font-sniglet text-text-dark">Our Calendar</h1>
          </div>
          <UserToggle />
        </header>

        <div className="flex justify-end mb-4 relative z-10">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border-2 ${
              showArchived 
                ? 'bg-latte-brown text-white border-latte-brown' 
                : 'bg-white text-latte-brown border-latte-brown/30 hover:border-latte-brown'
            }`}
          >
            {showArchived ? '🐾 Showing All' : '📦 Show Archived'}
          </motion.button>
        </div>

        <motion.div 
          layout
          className="flex-1 plush-card p-4 md:p-6 mb-8 flex flex-col min-h-[700px] relative z-10"
        >
          <div className="flex-1 h-full min-h-[600px]">
            {isLoading ? (
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
                      <span>{event.status === 'accepted' ? '🐾' : '🧶'}</span>
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

        <div className="flex justify-center relative z-10">
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

        <Toast
          message={toastMessage || ""}
          isVisible={toastMessage !== null}
          onClose={() => setToastMessage(null)}
        />
      </motion.main>
    </AnimatePresence>
  );
}
