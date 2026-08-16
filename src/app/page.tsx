"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import UserMenu from "@/components/UserMenu";
import EventModal from "@/components/EventModal";
import DetailsModal from "@/components/DetailsModal";
import CountdownBanner from "@/components/CountdownBanner";
import StreakBanner from "@/components/StreakBanner";
import BucketListDrawer from "@/components/BucketListDrawer";
import Toast from "@/components/Toast";
import InfoBanner from "@/components/InfoBanner";
import FloatingActions from "@/components/FloatingActions";
import { CalendarSkeleton } from "@/components/Skeleton";
import { useSession } from "@/components/SessionProvider";
import { triggerConfetti } from "@/lib/confetti";
import { getCategoryById } from "@/lib/categories";
import { PEOPLE } from "@/lib/people";
import { specialDateLabel, linkableSpecialDates } from "@/lib/special-date-display";
import { CategoryIcons, HighlightStarIcon, CameraIcon, BellIcon, PersonIcons, XIcon } from "@/components/icons";
import type { CalendarEvent, SpecialDateWithCountdown, StreakData, PendingMemory, Reminder, DailyHighlight } from "@/lib/types";
import SaveMemoryModal from "@/components/SaveMemoryModal";
import PushPrompt from "@/components/PushPrompt";
import ReminderModal from "@/components/ReminderModal";
import DailyHighlightModal from "@/components/DailyHighlightModal";
import HighlightViewModal from "@/components/HighlightViewModal";

const TIMEZONE = "+04:00";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarViewEvent extends CalendarEvent {
  start: Date;
  end: Date;
  isReminder?: boolean;
  isHighlight?: boolean;
  highlightDate?: string;
  highlightId?: string;
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
  const [isBucketDrawerOpen, setIsBucketDrawerOpen] = useState(false);
  const [specialDates, setSpecialDates] = useState<SpecialDateWithCountdown[]>([]);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [pendingMemory, setPendingMemory] = useState<PendingMemory | null>(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [flashback, setFlashback] = useState<{ memory: { id: string; journal: string | null; photos: string | null; event: { id: string; title: string; category: string | null } }; yearsAgo: number } | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [highlights, setHighlights] = useState<DailyHighlight[]>([]);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [highlightInitialDate, setHighlightInitialDate] = useState<string | undefined>(undefined);
  const [highlightEditing, setHighlightEditing] = useState<DailyHighlight | null>(null);
  const [viewHighlight, setViewHighlight] = useState<DailyHighlight | null>(null);
  // Filters: show only events tagged to a person and/or linked to an occasion
  const [filterPerson, setFilterPerson] = useState<string | null>(null);
  const [filterOccasion, setFilterOccasion] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = showArchived ? '/api/events?showArchived=true' : '/api/events';
      const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data.map((event: CalendarEvent) => {
          const datePart = new Date(event.date).toISOString().split('T')[0];
          const endDatePart = event.endDate
            ? new Date(event.endDate).toISOString().split('T')[0]
            : datePart;
          const start = new Date(`${datePart}T${event.time}:00${TIMEZONE}`);
          let end: Date;
          if (event.endTime) {
            end = new Date(`${endDatePart}T${event.endTime}:00${TIMEZONE}`);
          } else if (endDatePart !== datePart) {
            // Multi-day without explicit end time — end at same clock time on the last day
            end = new Date(`${endDatePart}T${event.time}:00${TIMEZONE}`);
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
      setToastMessage("Meow! The plan has been accepted!");
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

  // Fetch highlights
  const fetchHighlights = useCallback(async () => {
    fetch("/api/highlights")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHighlights(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarViewEvent) => {
    // Highlights — open the read-only view modal for that specific highlight
    if (event.isHighlight) {
      const existing = highlights.find((h) => h.id === event.highlightId) ?? null;
      if (existing) setViewHighlight(existing);
      return;
    }
    // Reminders are not full calendar events — skip the details modal
    if (event.isReminder) return;
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const eventStyleGetter = (event: CalendarViewEvent) => {
    if (event.isHighlight) {
      return {
        style: {
          backgroundColor: "var(--chip-highlight)",
          color: "var(--chip-highlight-text)",
          borderLeft: "3px solid var(--chip-highlight-dot)",
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
    if (event.isReminder) {
      return {
        style: {
          backgroundColor: "var(--chip-reminder)",
          color: "var(--chip-reminder-text)",
          borderLeft: "3px solid var(--chip-reminder-dot)",
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

  // Map highlights to calendar events (show as all-day chips)
  const highlightEvents: CalendarViewEvent[] = highlights.map((h) => {
    const [y, m, d] = h.date.split("-").map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 0, 30, 0); // 30 min block so it shows
    const noteSnippet = h.note ? h.note.slice(0, 30) + (h.note.length > 30 ? "…" : "") : "Today's highlight";
    return {
      id: `highlight-${h.id}`,
      title: noteSnippet,
      notes: h.note,
      date: h.date,
      time: "00:00",
      endTime: null,
      category: null,
      allDay: true,
      createdBy: h.createdBy,
      status: "accepted" as const,
      archived: false,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
      start: dayStart,
      end: dayEnd,
      isHighlight: true,
      highlightDate: h.date,
      highlightId: h.id,
    };
  });

  // When a filter is on, show only matching events — reminders and highlights
  // carry no person/occasion tags, so they'd just be noise.
  const isFiltering = filterPerson !== null || filterOccasion !== null;
  const filteredEvents = events.filter((e) => {
    if (filterPerson && e.personTag !== filterPerson) return false;
    if (filterOccasion === "__any__") return !!e.specialDateId;
    if (filterOccasion && e.specialDateId !== filterOccasion) return false;
    return true;
  });

  const allCalendarEvents = isFiltering
    ? filteredEvents
    : [...events, ...reminderEvents, ...highlightEvents];

  return (
    <main className="min-h-screen flex flex-col max-w-6xl mx-auto relative">
        {/* Header */}
        <UserMenu />

        {/* Countdown Banner */}
        <div className="mt-3 sm:mt-5">
          <CountdownBanner
            events={events}
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
            <div className="mx-2.5 sm:mx-8 mt-2.5 sm:mt-3">
              <StreakBanner streak={streakData} />
            </div>
          )}

          {pendingMemory && (
            <div className="mx-2.5 sm:mx-8 mt-2.5 sm:mt-3">
              <InfoBanner
                title="Save this memory?"
                subtitle={`${pendingMemory.event.title} · ${pendingMemory.daysAgo} ${pendingMemory.daysAgo === 1 ? "day" : "days"} ago`}
                actionLabel="Save memory →"
                onAction={() => setIsRateModalOpen(true)}
              />
            </div>
          )}

          {flashback && (
            <div className="mx-2.5 sm:mx-8 mt-2.5 sm:mt-3">
              <InfoBanner
                title={`On this day, ${flashback.yearsAgo} ${flashback.yearsAgo === 1 ? "year" : "years"} ago`}
                subtitle={flashback.memory.event.title}
                actionLabel="View →"
                href="/memories"
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mx-2.5 sm:mx-8 mt-3 sm:mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold mr-0.5" style={{ color: "var(--text-soft)" }}>
            Show:
          </span>

          {/* Person chips */}
          {PEOPLE.map((p) => {
            const PIcon = PersonIcons[p.id];
            return (
              <button
                key={p.id}
                onClick={() => setFilterPerson(filterPerson === p.id ? null : p.id)}
                className="chip-pill text-xs inline-flex items-center gap-1.5"
                style={{
                  background: filterPerson === p.id ? "var(--accent)" : "var(--chip-bg)",
                  color: filterPerson === p.id ? "var(--on-accent)" : "var(--chip-text)",
                  borderColor: filterPerson === p.id ? "var(--accent)" : "var(--chip-border)",
                }}
              >
                {PIcon ? <PIcon size={12} /> : p.emoji} {p.label}
              </button>
            );
          })}

          {/* Occasion select */}
          <select
            value={filterOccasion ?? ""}
            onChange={(e) => setFilterOccasion(e.target.value || null)}
            aria-label="Filter by occasion"
            className="rounded-full px-3 py-[5px] text-[11px] outline-none border cursor-pointer"
            style={{
              background: filterOccasion ? "var(--accent)" : "var(--chip-bg)",
              color: filterOccasion ? "var(--on-accent)" : "var(--chip-text)",
              borderColor: filterOccasion ? "var(--accent)" : "var(--chip-border)",
            }}
          >
            <option value="">Any occasion</option>
            <option value="__any__">Linked to any occasion</option>
            {linkableSpecialDates(specialDates).map((sd) => (
              <option key={sd.id} value={sd.id}>
                {specialDateLabel(sd)}
              </option>
            ))}
          </select>

          {isFiltering && (
            <>
              <span className="text-[11px]" style={{ color: "var(--text-soft)" }}>
                {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
              </span>
              <button
                onClick={() => { setFilterPerson(null); setFilterOccasion(null); }}
                className="chip-pill text-xs font-semibold inline-flex items-center gap-1"
              >
                Clear <XIcon size={10} />
              </button>
            </>
          )}
        </div>

        {/* Calendar Card */}
        <div className="flex-1 calendar-card mx-2.5 sm:mx-8 mt-3 sm:mt-[18px] mb-20 sm:mb-8 flex flex-col min-h-[360px] md:min-h-[650px]">
          <div className="flex-1 h-full min-h-[350px] md:min-h-[600px]">
            {(isLoading || isSessionLoading) ? (
              <CalendarSkeleton />
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
                    if (event.isHighlight) {
                      const h = highlights.find((hl) => hl.date === event.highlightDate);
                      const hasPhotos = h?.photos && JSON.parse(h.photos).length > 0;
                      return (
                        <div className="event-chip flex items-center gap-1.5">
                          <HighlightStarIcon size={10} />
                          <span className="truncate">{event.title}</span>
                          {hasPhotos && <CameraIcon size={9} style={{ opacity: 0.75 }} />}
                        </div>
                      );
                    }
                    if (event.isReminder) {
                      return (
                        <div className="event-chip flex items-center gap-1.5">
                          <BellIcon size={10} />
                          <span className="truncate">{event.title}</span>
                        </div>
                      );
                    }
                    const cat = getCategoryById(event.category);
                    const Icon = CategoryIcons[cat.id];
                    return (
                      <div className="event-chip flex items-center gap-1.5">
                        <Icon size={11} color={cat.textColor} />
                        <span className="truncate">{event.title}</span>
                        {event.memoryId && <CameraIcon size={9} style={{ opacity: 0.8 }} />}
                      </div>
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
        </div>

        {/* Floating action buttons */}
        <FloatingActions
          onNewEvent={() => setIsModalOpen(true)}
          onReminder={() => setIsReminderModalOpen(true)}
          onHighlight={() => {
            setHighlightEditing(null);
            setHighlightInitialDate(undefined);
            setIsHighlightModalOpen(true);
          }}
        />

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

        <DailyHighlightModal
          isOpen={isHighlightModalOpen}
          onClose={() => { setIsHighlightModalOpen(false); setHighlightEditing(null); }}
          onSuccess={() => { fetchHighlights(); setToastMessage("Highlight saved!"); }}
          initialDate={highlightInitialDate}
          existing={highlightEditing}
        />

        <HighlightViewModal
          isOpen={!!viewHighlight}
          onClose={() => setViewHighlight(null)}
          highlight={viewHighlight}
          onEdit={(h) => { setHighlightEditing(h); setHighlightInitialDate(h.date); setIsHighlightModalOpen(true); }}
          onDeleted={fetchHighlights}
        />

        <Toast
          message={toastMessage || ""}
          isVisible={toastMessage !== null}
          onClose={() => setToastMessage(null)}
        />

        <PushPrompt />
      </main>
  );
}
