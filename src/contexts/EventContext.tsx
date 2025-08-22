"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Event, Attendee, SavedSubmission } from "@/utils/supabase/types";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface EventContextType {
  event: Event | null;
  attendees: Attendee[];
  savedSubmissions: SavedSubmission[];
  isLoading: boolean;
  error: string | null;
  refreshEvent: () => Promise<void>;
  refreshAttendees: () => Promise<void>;
  refreshSavedSubmissions: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({
  children,
  eventSlug,
}: {
  children: ReactNode;
  eventSlug: string;
}) {
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [savedSubmissions, setSavedSubmissions] = useState<SavedSubmission[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchEvent = useCallback(async () => {
    if (!eventSlug) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("url_slug", eventSlug)
        .single();

      if (eventError) {
        throw eventError;
      }

      setEvent(data);
    } catch (err) {
      console.error("Error fetching event:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch event");
    } finally {
      setIsLoading(false);
    }
  }, [eventSlug, supabase]);

  const fetchAttendees = useCallback(async () => {
    if (!event?.id) return;

    try {
      const { data, error: attendeesError } = await supabase
        .from("attendees")
        .select("*")
        .eq("event_id", event.id);

      if (attendeesError) {
        throw attendeesError;
      }

      setAttendees(data || []);
    } catch (err) {
      console.error("Error fetching attendees:", err);
    }
  }, [event?.id, supabase]);

  const fetchSavedSubmissions = useCallback(async () => {
    if (!event?.id) return;

    try {
      const { data, error: savedError } = await supabase
        .from("saved")
        .select("*")
        .eq("event_id", event.id);

      if (savedError) {
        throw savedError;
      }

      setSavedSubmissions(data || []);
    } catch (err) {
      console.error("Error fetching saved submissions:", err);
    }
  }, [event?.id, supabase]);

  const refreshEvent = useCallback(async () => {
    await fetchEvent();
  }, [fetchEvent]);

  const refreshAttendees = useCallback(async () => {
    await fetchAttendees();
  }, [fetchAttendees]);

  const refreshSavedSubmissions = useCallback(async () => {
    await fetchSavedSubmissions();
  }, [fetchSavedSubmissions]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!event?.id) return;

    const channels: RealtimeChannel[] = [];

    // Subscribe to event changes
    const eventChannel = supabase
      .channel(`event:${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `id=eq.${event.id}`,
        },
        (payload) => {
          console.log("Event realtime update:", payload);
          if (
            payload.eventType === "UPDATE" ||
            payload.eventType === "DELETE"
          ) {
            fetchEvent();
          }
        }
      )
      .subscribe();

    channels.push(eventChannel);

    // Subscribe to attendee changes
    const attendeesChannel = supabase
      .channel(`attendees:${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendees",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          console.log("Attendees realtime update:", payload);
          fetchAttendees();
        }
      )
      .subscribe();

    channels.push(attendeesChannel);

    // Subscribe to saved submissions changes
    const savedChannel = supabase
      .channel(`saved:${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          console.log("Saved submissions realtime update:", payload);
          fetchSavedSubmissions();
        }
      )
      .subscribe();

    channels.push(savedChannel);

    // Cleanup function
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [event?.id, supabase, fetchEvent, fetchAttendees, fetchSavedSubmissions]);

  // Initial data fetch
  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Fetch attendees and saved submissions when event is loaded
  useEffect(() => {
    if (event?.id) {
      fetchAttendees();
      fetchSavedSubmissions();
    }
  }, [event?.id, fetchAttendees, fetchSavedSubmissions]);

  const value: EventContextType = {
    event,
    attendees,
    savedSubmissions,
    isLoading,
    error,
    refreshEvent,
    refreshAttendees,
    refreshSavedSubmissions,
  };

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}
