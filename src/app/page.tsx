"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Event } from "@/utils/supabase/types";
import { RealtimeChannel } from "@supabase/supabase-js";
import Header from "@/components/Header";

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("archived", false)
        .gte("end_date", now.toISOString())
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Set up realtime subscriptions for live updates
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    // Subscribe to all event changes
    const eventsChannel = supabase
      .channel("homepage-events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        (payload) => {
          console.log("Homepage events realtime update:", payload);
          // Refresh events when any event is created, updated, or deleted
          fetchEvents();
        }
      )
      .subscribe();

    channels.push(eventsChannel);

    // Cleanup function
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [supabase, fetchEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const formatEventDate = (dateString: string, endDateString?: string) => {
    const date = new Date(dateString);
    const endDate = endDateString ? new Date(endDateString) : null;

    const startDateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const startTimeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (endDate && endDate.getTime() !== date.getTime()) {
      const endTimeStr = endDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Check if it's a multi-day event
      const startDateOnly = date.toDateString();
      const endDateOnly = endDate.toDateString();

      if (startDateOnly !== endDateOnly) {
        // Multi-day event: show both dates with timezone
        const endDateStr = endDate.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        const timezone = date
          .toLocaleTimeString("en-US", {
            timeZoneName: "short",
          })
          .split(" ")[2]; // Extract just the timezone part
        return `${startDateStr} (${startTimeStr} ${timezone})\n${endDateStr} (${endTimeStr} ${timezone})`;
      } else {
        // Same day event: show date on first line, time range on second line with timezone
        const timezone = date
          .toLocaleTimeString("en-US", {
            timeZoneName: "short",
          })
          .split(" ")[2]; // Extract just the timezone part
        return `${startDateStr}\n(${startTimeStr} - ${endTimeStr} ${timezone})`;
      }
    }

    // Single time event: show with timezone
    const timezone = date
      .toLocaleTimeString("en-US", {
        timeZoneName: "short",
      })
      .split(" ")[2]; // Extract just the timezone part
    return `${startDateStr} (${startTimeStr} ${timezone})`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upcoming Events
          </h1>
          <p className="text-lg text-gray-600">
            Events happening now and in the future
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No events scheduled
            </h3>
            <p className="text-gray-500">
              Check back later for upcoming events.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.url_slug}`}
                className="block group"
              >
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200 mb-3">
                        {event.name}
                      </h3>
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <div className="whitespace-pre-line text-center">
                          {formatEventDate(event.date, event.end_date)}
                        </div>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center text-sm text-indigo-600 group-hover:text-indigo-700 transition-colors duration-200">
                      <span>View Event</span>
                      <svg
                        className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
