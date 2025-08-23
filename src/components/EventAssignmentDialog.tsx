"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import {
  getUserEventAssignments,
  getAllEvents,
  assignUserToEvent,
  removeUserFromEvent,
  EventAssignmentWithEvent,
} from "@/utils/supabase/actions/actions";
import { Tables } from "@/utils/supabase/database.types";

type Event = Tables<"events">;

interface EventAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export default function EventAssignmentDialog({
  isOpen,
  onClose,
  userId,
  userName,
}: EventAssignmentDialogProps) {
  const [assignments, setAssignments] = useState<EventAssignmentWithEvent[]>(
    []
  );
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, eventsData] = await Promise.all([
        getUserEventAssignments(userId),
        getAllEvents(),
      ]);
      setAssignments(assignmentsData);
      setAvailableEvents(eventsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleAssignEvent = async (eventId: string) => {
    setIsAssigning(true);
    try {
      await assignUserToEvent(userId, eventId);
      await loadData(); // Refresh the data
    } catch (error) {
      console.error("Error assigning event:", error);
      alert("Failed to assign event");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveEvent = async (eventId: string) => {
    setIsRemoving(eventId);
    try {
      await removeUserFromEvent(userId, eventId);
      await loadData(); // Refresh the data
    } catch (error) {
      console.error("Error removing event:", error);
      alert("Failed to remove event assignment");
    } finally {
      setIsRemoving(null);
    }
  };

  const getAvailableEventsForAssignment = () => {
    const assignedEventIds = assignments.map((a) => a.event_id);
    return availableEvents.filter(
      (event) => !assignedEventIds.includes(event.id)
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Event Assignments for {userName}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Assignments */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Current Event Assignments
                </h3>
                {assignments.length === 0 ? (
                  <div className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                    No events assigned yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {assignment.events.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(assignment.events.date)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveEvent(assignment.event_id)}
                          disabled={isRemoving === assignment.event_id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isRemoving === assignment.event_id
                            ? "Removing..."
                            : "Remove"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Assignment */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Assign to New Event
                </h3>
                {getAvailableEventsForAssignment().length === 0 ? (
                  <div className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                    All available events are already assigned
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getAvailableEventsForAssignment().map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {event.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(event.date)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignEvent(event.id)}
                          disabled={isAssigning}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          {isAssigning ? "Assigning..." : "Assign"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
