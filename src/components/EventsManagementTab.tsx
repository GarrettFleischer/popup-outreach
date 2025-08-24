"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  getEventsWithStats,
  type EventWithStats,
} from "@/utils/supabase/actions/actions";
import CreateEventDialog from "./CreateEventDialog";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function EventsManagementTab() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Separate events into upcoming and past
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date();
    const upcoming: EventWithStats[] = [];
    const past: EventWithStats[] = [];

    events.forEach((event) => {
      const eventEndDate = event.end_date
        ? new Date(event.end_date)
        : new Date(event.date);
      if (eventEndDate >= now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    // Sort upcoming events by date (earliest first)
    upcoming.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Sort past events by date (most recent first)
    past.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const eventsData = await getEventsWithStats(showArchived);
      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channels: RealtimeChannel[] = [];
    let isMounted = true;

    // Subscribe to events table changes
    const eventsChannel = supabase
      .channel("events-management-events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        (payload) => {
          console.log("Events realtime update:", payload);
          // Refresh events when any event is created, updated, or deleted
          if (!isRefreshing && isMounted) {
            setIsRefreshing(true);
            setTimeout(() => {
              if (isMounted) {
                loadEvents();
                setIsRefreshing(false);
              }
            }, 500);
          }
        }
      )
      .subscribe();

    channels.push(eventsChannel);

    // Subscribe to attendees table changes
    const attendeesChannel = supabase
      .channel("events-management-attendees")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendees",
        },
        (payload) => {
          console.log("Attendees realtime update:", payload);
          // Refresh events to get updated attendee counts
          if (!isRefreshing && isMounted) {
            setIsRefreshing(true);
            setTimeout(() => {
              if (isMounted) {
                loadEvents();
                setIsRefreshing(false);
              }
            }, 500);
          }
        }
      )
      .subscribe();

    channels.push(attendeesChannel);

    // Subscribe to saved table changes
    const savedChannel = supabase
      .channel("events-management-saved")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved",
        },
        (payload) => {
          console.log("Saved submissions realtime update:", payload);
          // Refresh events to get updated saved counts
          if (!isRefreshing && isMounted) {
            setIsRefreshing(true);
            setTimeout(() => {
              if (isMounted) {
                loadEvents();
                setIsRefreshing(false);
              }
            }, 500);
          }
        }
      )
      .subscribe();

    channels.push(savedChannel);

    // Cleanup function
    return () => {
      isMounted = false;
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, loadEvents, isRefreshing]);

  const handleEditEvent = (event: EventWithStats) => {
    router.push(`/admin/events/${event.id}/edit`);
  };

  const formatDate = (dateString: string, endDateString?: string) => {
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
        // Multi-day event: show both dates stacked vertically with timezone
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

  const getEventStatus = (event: EventWithStats) => {
    if (event.archived) {
      return { text: "Archived", className: "bg-orange-100 text-orange-800" };
    }

    const now = new Date();
    const eventStart = new Date(event.date);
    const eventEnd = event.end_date ? new Date(event.end_date) : eventStart;

    if (now < eventStart) {
      // Event hasn't started yet
      return { text: "Upcoming", className: "bg-blue-100 text-blue-800" };
    } else if (now >= eventStart && now <= eventEnd) {
      // Event is happening now
      return { text: "Active", className: "bg-green-100 text-green-800" };
    } else {
      // Event has ended
      return { text: "Completed", className: "bg-gray-100 text-gray-800" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading events...</div>
      </div>
    );
  }

  if (isRefreshing && !isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Updating events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Event Management
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            Manage your upcoming and past events
          </p>
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="showArchived"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="showArchived"
              className="ml-2 block text-sm text-gray-700"
            >
              Show archived events
            </label>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowCreateEvent(true)}>
          Create New Event
        </Button>
      </div>

      {/* Upcoming Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Upcoming Events ({upcomingEvents.length})
            {isRefreshing && !isLoading && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Updating...
              </span>
            )}
          </h3>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No upcoming events</p>
            <p className="text-sm">Create a new event to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 min-w-[150px]">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3 min-w-[280px]">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 min-w-[80px]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 min-w-[80px]">
                    Attendees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 min-w-[80px]">
                    Saved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 min-w-[100px]">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingEvents.map((event) => (
                  <tr
                    key={event.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      event.archived ? "bg-gray-50 opacity-75" : ""
                    }`}
                    onClick={() => handleEditEvent(event)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            event.archived ? "text-gray-600" : "text-gray-900"
                          }`}
                        >
                          {event.name}
                          {event.archived && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Archived
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm ${
                        event.archived ? "text-gray-600" : "text-gray-900"
                      }`}
                    >
                      <div className="whitespace-pre-line break-words min-w-0">
                        {formatDate(event.date, event.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getEventStatus(event).className
                        }`}
                      >
                        {getEventStatus(event).text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {event.attendee_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {event.saved_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/events/${event.url_slug}`, "_blank");
                        }}
                      >
                        Open Event
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Past Events ({pastEvents.length})
            {isRefreshing && !isLoading && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Updating...
              </span>
            )}
          </h3>
        </div>

        {pastEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No past events</p>
            <p className="text-sm">
              Past events will appear here once they&apos;re completed
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4 min-w-[150px]">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3 min-w-[280px]">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 min-w-[80px]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 min-w-[80px]">
                    Attendees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 min-w-[80px]">
                    Saved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 min-w-[100px]">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pastEvents.map((event) => (
                  <tr
                    key={event.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      event.archived ? "bg-gray-50 opacity-75" : ""
                    }`}
                    onClick={() => handleEditEvent(event)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            event.archived ? "text-gray-600" : "text-gray-900"
                          }`}
                        >
                          {event.name}
                          {event.archived && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Archived
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm ${
                        event.archived ? "text-gray-600" : "text-gray-900"
                      }`}
                    >
                      <div className="whitespace-pre-line break-words min-w-0">
                        {formatDate(event.date, event.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getEventStatus(event).className
                        }`}
                      >
                        {getEventStatus(event).text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {event.attendee_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {event.saved_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/events/${event.url_slug}`, "_blank");
                        }}
                      >
                        Open Event
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateEventDialog
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onEventCreated={loadEvents}
      />
    </div>
  );
}
