"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { ThemeDropdown } from "@/components/ui/ThemeDropdown";
import {
  getEventsWithStats,
  getEventAttendees,
  getEventSavedSubmissions,
  updateEvent,
  type EventWithStats,
  type Attendee,
  type SavedSubmission,
} from "@/utils/supabase/actions/actions";
import { predefinedThemes, type Theme } from "@/utils/supabase/types";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventWithStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [savedSubmissions, setSavedSubmissions] = useState<SavedSubmission[]>(
    []
  );

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    date: "",
    time: "12:00",
    endDate: "",
    endTime: "13:00",
    description: "",
    archived: false,
    gradient_from_color: "#f97316",
    gradient_through_color: "#ea580c",
    gradient_to_color: "#dc2626",
    custom_title: "",
    custom_subtitle: "",
    custom_description: "",
    grand_prize: "",
  });

  const [isStylingExpanded, setIsStylingExpanded] = useState(true);

  // Helper function to ensure end date/time is valid
  const ensureValidEndDateTime = (
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string
  ) => {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (endDateTime <= startDateTime) {
      // End time is before or equal to start time, adjust it
      const adjustedEndDateTime = new Date(
        startDateTime.getTime() + 60 * 60 * 1000
      ); // Add 1 hour
      return {
        endDate: adjustedEndDateTime.toISOString().split("T")[0],
        endTime: adjustedEndDateTime.toTimeString().slice(0, 5),
      };
    }

    return { endDate, endTime };
  };

  const handleThemeChange = (theme: Theme) => {
    // Don't change colors if "Custom" is selected
    if (theme.name === "Custom") return;

    setEditForm((prev) => ({
      ...prev,
      gradient_from_color: theme.colors.from,
      gradient_through_color: theme.colors.through,
      gradient_to_color: theme.colors.to,
    }));
  };

  const handleStylingToggle = () => {
    const newExpanded = !isStylingExpanded;
    setIsStylingExpanded(newExpanded);

    // Save to local storage for this specific event
    if (eventId) {
      localStorage.setItem(
        `event-styling-expanded-${eventId}`,
        JSON.stringify(newExpanded)
      );
    }
  };

  const getCurrentTheme = (): Theme | null => {
    return (
      predefinedThemes.find(
        (theme) =>
          theme.name !== "Custom" &&
          editForm.gradient_from_color === theme.colors.from &&
          editForm.gradient_through_color === theme.colors.through &&
          editForm.gradient_to_color === theme.colors.to
      ) || null
    );
  };

  const loadEventData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [attendeesData, savedData] = await Promise.all([
        getEventAttendees(eventId),
        getEventSavedSubmissions(eventId),
      ]);

      setAttendees(attendeesData);
      setSavedSubmissions(savedData);
    } catch (error) {
      console.error("Error loading event data:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [eventId]);

  const loadEvent = useCallback(async () => {
    setIsLoading(true);
    try {
      const eventsData = await getEventsWithStats(true); // Include archived events
      const foundEvent = eventsData.find((e) => e.id === eventId);

      if (!foundEvent) {
        alert("Event not found");
        router.push("/admin/dashboard");
        return;
      }

      setEvent(foundEvent);

      // Parse the UTC date and extract local date and time
      const utcDate = new Date(foundEvent.date);

      // Convert UTC to local date and time for the form
      const localDate = utcDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format
      const localTime = utcDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      // Convert UTC end date to local date and time for the form
      const utcEndDate = new Date(foundEvent.end_date || foundEvent.date);
      const localEndDate = utcEndDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format
      const localEndTime = utcEndDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      setEditForm({
        name: foundEvent.name,
        date: localDate,
        time: localTime,
        endDate: localEndDate,
        endTime: localEndTime,
        description: foundEvent.description || "",
        archived: foundEvent.archived || false,
        gradient_from_color: foundEvent.gradient_from_color || "#3B82F6",
        gradient_through_color: foundEvent.gradient_through_color || "#8B5CF6",
        gradient_to_color: foundEvent.gradient_to_color || "#EC4899",
        custom_title: foundEvent.custom_title || "",
        custom_subtitle: foundEvent.custom_subtitle || "",
        custom_description: foundEvent.custom_description || "",
        grand_prize: foundEvent.grand_prize || "",
      });

      loadEventData();
    } catch (error) {
      console.error("Error loading event:", error);
      alert("Failed to load event");
    } finally {
      setIsLoading(false);
    }
  }, [eventId, router, loadEventData]);

  useEffect(() => {
    if (eventId) {
      loadEvent();

      // Load styling expansion state from local storage
      const storedExpanded = localStorage.getItem(
        `event-styling-expanded-${eventId}`
      );
      if (storedExpanded !== null) {
        setIsStylingExpanded(JSON.parse(storedExpanded));
      }
    }
  }, [eventId, loadEvent]);

  // Set up realtime subscriptions for live updates
  useEffect(() => {
    if (!eventId) return;

    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    // Subscribe to event changes
    const eventChannel = supabase
      .channel(`admin-event:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          console.log("Admin event realtime update:", payload);
          if (payload.eventType === "UPDATE") {
            // Update local event state with new data
            setEvent((prevEvent) => {
              if (prevEvent && payload.new) {
                return { ...prevEvent, ...payload.new };
              }
              return prevEvent;
            });
          }
        }
      )
      .subscribe();

    channels.push(eventChannel);

    // Subscribe to attendee changes
    const attendeesChannel = supabase
      .channel(`admin-attendees:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendees",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log("Admin attendees realtime update:", payload);
          loadEventData();
        }
      )
      .subscribe();

    channels.push(attendeesChannel);

    // Subscribe to saved submissions changes
    const savedChannel = supabase
      .channel(`admin-saved:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log("Admin saved submissions realtime update:", payload);
          loadEventData();
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
  }, [eventId, loadEventData]);

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Validate that end date/time is after start date/time
      const startDateTime = new Date(`${editForm.date}T${editForm.time}`);
      const endDateTime = new Date(`${editForm.endDate}T${editForm.endTime}`);

      if (endDateTime <= startDateTime) {
        alert("End date and time must be after start date/time");
        setIsSaving(false);
        return;
      }

      // Combine date and time and convert to UTC
      // The user enters time in their local timezone, so we need to create a local datetime
      // and then convert it to UTC for storage
      const localDateTime = new Date(`${editForm.date}T${editForm.time}`);

      // Convert local datetime to UTC (this handles the timezone conversion correctly)
      const utcDateTime = new Date(localDateTime.toISOString());

      // Combine end date and time and convert to UTC
      const localEndDateTime = new Date(
        `${editForm.endDate}T${editForm.endTime}`
      );

      // Convert local end datetime to UTC (this handles the timezone conversion correctly)
      const utcEndDateTime = new Date(localEndDateTime.toISOString());

      await updateEvent(eventId, {
        name: editForm.name,
        date: utcDateTime.toISOString(),
        end_date: utcEndDateTime.toISOString(),
        description: editForm.description,
        archived: editForm.archived,
        gradient_from_color: editForm.gradient_from_color,
        gradient_through_color: editForm.gradient_through_color,
        gradient_to_color: editForm.gradient_to_color,
        custom_title: editForm.custom_title,
        custom_subtitle: editForm.custom_subtitle,
        custom_description: editForm.custom_description,
        grand_prize: editForm.grand_prize,
      });

      alert("Event updated successfully!");
      // No need to reload - realtime updates will handle this automatically
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 text-lg">Loading event...</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Event Not Found
          </h1>
          <Button
            onClick={() => router.push("/admin/dashboard")}
            variant="primary"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/dashboard")}
                size="sm"
              >
                ← Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Event: {event.name}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="primary"
                onClick={handleUpdateEvent}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Event Details
                </h2>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="archived"
                    checked={editForm.archived}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        archived: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="archived"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Archived
                  </label>
                </div>
              </div>

              <form onSubmit={handleUpdateEvent} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    placeholder="Enter event name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editForm.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setEditForm((prev) => {
                          // Auto-set end date to match start date if it's not already set
                          let newEndDate = prev.endDate || newDate;

                          // If end date is now before start date, set it to start date
                          if (newEndDate < newDate) {
                            newEndDate = newDate;
                          }

                          // Ensure end time is valid for the new dates
                          const { endTime } = ensureValidEndDateTime(
                            newDate,
                            prev.time,
                            newEndDate,
                            prev.endTime
                          );

                          return {
                            ...prev,
                            date: newDate,
                            endDate: newEndDate,
                            endTime,
                          };
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Event Time * (
                      {
                        new Date()
                          .toLocaleTimeString("en-US", {
                            timeZoneName: "short",
                          })
                          .split(" ")[2]
                      }
                      )
                    </label>
                    <input
                      type="time"
                      required
                      value={editForm.time}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        setEditForm((prev) => {
                          // Calculate end time 1 hour after start time
                          const [hours, minutes] = newTime
                            .split(":")
                            .map(Number);
                          const endHours = (hours + 1) % 24;
                          const endTime = `${endHours
                            .toString()
                            .padStart(2, "0")}:${minutes
                            .toString()
                            .padStart(2, "0")}`;

                          // Check if current end time would be before start time
                          let newEndTime = prev.endTime || endTime;
                          if (prev.date === prev.endDate) {
                            // Same date, check if end time is before start time
                            const [endHours, endMinutes] = newEndTime
                              .split(":")
                              .map(Number);
                            if (
                              endHours < hours ||
                              (endHours === hours && endMinutes <= minutes)
                            ) {
                              newEndTime = endTime; // Set to 1 hour after start time
                            }
                          }

                          // Ensure end date/time is valid
                          const { endDate, endTime: validEndTime } =
                            ensureValidEndDateTime(
                              prev.date,
                              newTime,
                              prev.endDate,
                              newEndTime
                            );

                          return {
                            ...prev,
                            time: newTime,
                            endDate,
                            endTime: validEndTime,
                          };
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editForm.endDate}
                      onChange={(e) => {
                        const newEndDate = e.target.value;
                        setEditForm((prev) => {
                          // Ensure end date is not before start date
                          if (newEndDate < prev.date) {
                            return prev; // Don't update if invalid
                          }

                          return {
                            ...prev,
                            endDate: newEndDate,
                          };
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      End Time * (
                      {
                        new Date()
                          .toLocaleTimeString("en-US", {
                            timeZoneName: "short",
                          })
                          .split(" ")[2]
                      }
                      )
                    </label>
                    <input
                      type="time"
                      required
                      value={editForm.endTime}
                      onChange={(e) => {
                        const newEndTime = e.target.value;
                        setEditForm((prev) => {
                          // If same date, ensure end time is after start time
                          if (prev.date === prev.endDate) {
                            const [startHours, startMinutes] = prev.time
                              .split(":")
                              .map(Number);
                            const [endHours, endMinutes] = newEndTime
                              .split(":")
                              .map(Number);

                            if (
                              endHours < startHours ||
                              (endHours === startHours &&
                                endMinutes <= startMinutes)
                            ) {
                              return prev; // Don't update if invalid
                            }
                          }

                          return {
                            ...prev,
                            endTime: newEndTime,
                          };
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    placeholder="Enter event description"
                  />
                </div>

                {/* Styling Options */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Styling Options
                    </h3>
                    <button
                      type="button"
                      onClick={handleStylingToggle}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                    >
                      {isStylingExpanded ? (
                        <>
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                          Collapse
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          Expand
                        </>
                      )}
                    </button>
                  </div>

                  {isStylingExpanded && (
                    <>
                      {/* Comprehensive Theme Dropdown */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Select Theme
                        </label>
                        <p className="text-sm text-gray-600 mb-3">
                          Choose from predefined themes or use the color pickers
                          below for custom colors. The &quot;Custom&quot; option
                          is automatically selected when you modify individual
                          colors.
                        </p>
                        <ThemeDropdown
                          themes={predefinedThemes}
                          selectedTheme={getCurrentTheme()}
                          onThemeChange={handleThemeChange}
                          placeholder="Select Theme"
                        />
                      </div>

                      {/* Gradient Colors */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                          <ColorPicker
                            value={editForm.gradient_from_color}
                            onChange={(color) =>
                              setEditForm((prev) => ({
                                ...prev,
                                gradient_from_color: color,
                              }))
                            }
                            label="Gradient From Color"
                            placeholder="#f97316"
                          />
                        </div>

                        <div>
                          <ColorPicker
                            value={editForm.gradient_through_color}
                            onChange={(color) =>
                              setEditForm((prev) => ({
                                ...prev,
                                gradient_through_color: color,
                              }))
                            }
                            label="Gradient Through Color"
                            placeholder="#ea580c"
                          />
                        </div>

                        <div>
                          <ColorPicker
                            value={editForm.gradient_to_color}
                            onChange={(color) =>
                              setEditForm((prev) => ({
                                ...prev,
                                gradient_to_color: color,
                              }))
                            }
                            label="Gradient To Color"
                            placeholder="#dc2626"
                          />
                        </div>
                      </div>

                      {/* Gradient Preview */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Gradient Preview
                        </label>
                        <div
                          className="w-full h-20 rounded-lg border-2 border-gray-300"
                          style={{
                            background: `linear-gradient(to bottom, ${editForm.gradient_from_color}, ${editForm.gradient_through_color}, ${editForm.gradient_to_color})`,
                          }}
                        />
                      </div>

                      {/* Custom Content Fields */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Custom Title (overrides event name)
                          </label>
                          <input
                            type="text"
                            value={editForm.custom_title}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                custom_title: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                            placeholder="Leave empty to use event name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Custom Subtitle
                          </label>
                          <input
                            type="text"
                            value={editForm.custom_subtitle}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                custom_subtitle: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                            placeholder="Enter custom subtitle"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Custom Description
                          </label>
                          <textarea
                            rows={3}
                            value={editForm.custom_description}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                custom_description: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                            placeholder="Enter custom description"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Grand Prize
                          </label>
                          <input
                            type="text"
                            value={editForm.grand_prize}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                grand_prize: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                            placeholder="e.g., Oculus Quest VR Headset"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar - Event Statistics */}
          <div className="space-y-6">
            {/* Event Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Event Statistics
              </h3>

              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {attendees.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Attendees</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {savedSubmissions.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Saved</div>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`/events/${event.url_slug}`, "_blank")
                    }
                    className="w-full"
                  >
                    Open Event Page
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendees and Saved Lists - Side by Side */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendees List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Attendees ({attendees.length})
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoadingData ? (
                <div className="p-6 text-center text-gray-500">
                  Loading attendees...
                </div>
              ) : attendees.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No attendees yet
                </div>
              ) : (
                <div className="divide-y">
                  {attendees.map((attendee) => {
                    // Check if this attendee has a matching saved submission
                    const hasMatchingSaved = savedSubmissions.some(
                      (saved) => saved.phone === attendee.phone
                    );

                    return (
                      <div key={attendee.id} className="px-6 py-3">
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div>
                            <p className="font-medium text-gray-900">
                              {attendee.first_name} {attendee.last_name}
                            </p>
                          </div>
                          <div className="text-center">
                            <span className="text-sm text-gray-600 font-mono">
                              {attendee.phone.replace(
                                /(\d{3})(\d{3})(\d{4})/,
                                "($1) $2-$3"
                              )}
                            </span>
                          </div>
                          <div className="text-right">
                            {hasMatchingSaved && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Saved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Saved Submissions List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Saved ({savedSubmissions.length})
                </h3>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoadingData ? (
                <div className="p-6 text-center text-gray-500">
                  Loading saved submissions...
                </div>
              ) : savedSubmissions.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No saved submissions yet
                </div>
              ) : (
                <div className="divide-y">
                  {savedSubmissions.map((saved) => (
                    <div key={saved.id} className="px-6 py-3">
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div>
                          <p className="font-medium text-gray-900">
                            {saved.first_name} {saved.last_name}
                          </p>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-gray-600 font-mono block mb-1">
                            {saved.phone.replace(
                              /(\d{3})(\d{3})(\d{4})/,
                              "($1) $2-$3"
                            )}
                          </span>
                          {saved.email && (
                            <p className="text-sm text-gray-600">
                              {saved.email}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col items-end space-y-1">
                            {saved.needs_ride && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                🚗 Needs Ride
                              </span>
                            )}
                            {saved.assigned_user_id && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                👤 Assigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
