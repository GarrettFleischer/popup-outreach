"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Event } from "@/utils/supabase/types";

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchEvent() {
      if (!params.slug || Array.isArray(params.slug)) return;

      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("url_slug", params.slug)
          .single();

        if (error) {
          console.error("Error fetching event:", error);
          if (error.code === "PGRST116") {
            // No rows returned
            router.push("/events");
          }
        } else {
          // Check if event is archived
          if (data.archived) {
            router.push("/events");
            return;
          }
          setEvent(data);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [params.slug, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Event Not Found
          </h1>
          <Link
            href="/events"
            className="text-indigo-600 hover:text-indigo-700 underline"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Back to events link */}
        <Link
          href="/events"
          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 mb-8"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Events
        </Link>

        {/* Event details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-sm text-gray-500">
                Created{" "}
                {event.created_at &&
                  new Date(event.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
              </span>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {event.name}
            </h1>

            {event.archived && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span className="text-red-800 font-medium">
                    This event has been archived and is no longer available for
                    registration.
                  </span>
                </div>
              </div>
            )}

            {event.description && (
              <p className="text-lg text-gray-600 leading-relaxed">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons - only show for non-archived events */}
        {!event.archived && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href={`/events/${event.url_slug}/register`} className="block">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center hover:shadow-md transition-shadow duration-200 group">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4 group-hover:bg-green-200 transition-colors duration-200">
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Register for Event
                </h3>
                <p className="text-gray-600 mb-4">
                  Sign up to attend this event and secure your spot.
                </p>
                <div className="inline-flex items-center text-green-600 group-hover:text-green-700 transition-colors duration-200">
                  <span>Register Now</span>
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
            </Link>

            <Link href={`/events/${event.url_slug}/saved`} className="block">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center hover:shadow-md transition-shadow duration-200 group">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-4 group-hover:bg-purple-200 transition-colors duration-200">
                  <svg
                    className="h-8 w-8 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Get Saved
                </h3>
                <p className="text-gray-600 mb-4">
                  Accept Jesus Christ and connect with our spiritual support
                  team.
                </p>
                <div className="inline-flex items-center text-purple-600 group-hover:text-purple-700 transition-colors duration-200">
                  <span>Get Saved</span>
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
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
