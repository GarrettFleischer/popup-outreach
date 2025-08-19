"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  getEventsWithStats,
  getEventAttendees,
  getEventSavedSubmissions,
  updateEvent,
  archiveEvent,
  type EventWithStats,
  type Attendee,
  type SavedSubmission,
} from "@/utils/supabase/actions/actions";

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
    description: "",
    archived: false,
  });

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
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

      setEditForm({
        name: foundEvent.name,
        date: localDate,
        time: localTime,
        description: foundEvent.description || "",
        archived: foundEvent.archived || false,
      });

      loadEventData();
    } catch (error) {
      console.error("Error loading event:", error);
      alert("Failed to load event");
    } finally {
      setIsLoading(false);
    }
  };

  const loadEventData = async () => {
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
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Combine date and time and convert to UTC
      // The user enters time in their local timezone, so we need to create a local datetime
      // and then convert it to UTC for storage
      const localDateTime = new Date(`${editForm.date}T${editForm.time}`);

      // Convert local datetime to UTC (this handles the timezone conversion correctly)
      const utcDateTime = new Date(localDateTime.toISOString());

      await updateEvent(eventId, {
        name: editForm.name,
        date: utcDateTime.toISOString(),
        description: editForm.description,
        archived: editForm.archived,
      });

      alert("Event updated successfully!");
      // Reload the event data to reflect changes
      await loadEvent();
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Function to check if a saved submission matches an attendee
  const isMatched = (saved: SavedSubmission, attendees: Attendee[]) => {
    return attendees.some(
      (attendee) =>
        (attendee.first_name.toLowerCase() === saved.first_name.toLowerCase() &&
          attendee.last_name.toLowerCase() === saved.last_name.toLowerCase()) ||
        attendee.phone === saved.phone
    );
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
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Event Details
              </h2>

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
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
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
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          time: e.target.value,
                        }))
                      }
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
                    Archived (hidden from main view)
                  </label>
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
                      window.open(
                        `/events/${event.url_slug}/register`,
                        "_blank"
                      )
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
                  {attendees.map((attendee) => (
                    <div key={attendee.id} className="px-6 py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">
                            {attendee.first_name} {attendee.last_name}
                          </p>
                        </div>
                        <span className="text-sm text-gray-600 font-mono">
                          {attendee.phone.replace(
                            /(\d{3})(\d{3})(\d{4})/,
                            "($1) $2-$3"
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Saved Submissions List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Saved ({savedSubmissions.length})
              </h3>
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
                  {savedSubmissions.map((saved) => {
                    const isMatchedWithAttendee = isMatched(saved, attendees);
                    return (
                      <div
                        key={saved.id}
                        className={`px-6 py-3 ${
                          isMatchedWithAttendee
                            ? "bg-green-50 border-l-4 border-l-green-400"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">
                              {saved.first_name} {saved.last_name}
                            </p>
                            {saved.email && (
                              <p className="text-sm text-gray-600">
                                {saved.email}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-gray-600 font-mono block mb-1">
                              {saved.phone.replace(
                                /(\d{3})(\d{3})(\d{4})/,
                                "($1) $2-$3"
                              )}
                            </span>
                            {isMatchedWithAttendee && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Matched
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
        </div>
      </div>
    </div>
  );
}
