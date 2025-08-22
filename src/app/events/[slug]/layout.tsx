"use client";

import { EventProvider } from "@/contexts/EventContext";
import { useParams, useRouter } from "next/navigation";
import { useEvent } from "@/contexts/EventContext";
import { useEffect } from "react";

interface EventLayoutProps {
  children: React.ReactNode;
}

function EventLayoutContent({ children }: EventLayoutProps) {
  const { event, isLoading, error } = useEvent();
  const router = useRouter();

  useEffect(() => {
    if (event && event.archived) {
      router.push("/");
    }
  }, [event, router]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(to bottom, #f97316, #ea580c, #dc2626)",
        }}
      >
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !event || event.archived) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(to bottom, #f97316, #ea580c, #dc2626)",
        }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            {error === "Event not found" ? "Event Not Found" : "Event Unavailable"}
          </h1>
          <p className="text-white/80 mb-4">
            {error === "Event not found" 
              ? "The event you're looking for doesn't exist."
              : error === "Event not found" || event?.archived
              ? "This event is no longer available."
              : "There was an error loading the event."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(to bottom, ${
          event.gradient_from_color || "#f97316"
        }, ${event.gradient_through_color || "#ea580c"}, ${
          event.gradient_to_color || "#dc2626"
        })`,
      }}
    >
      {children}
    </div>
  );
}

export default function EventLayout({ children }: EventLayoutProps) {
  const params = useParams();
  const eventSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  if (!eventSlug) {
    return null;
  }

  return (
    <EventProvider eventSlug={eventSlug}>
      <EventLayoutContent>{children}</EventLayoutContent>
    </EventProvider>
  );
}
