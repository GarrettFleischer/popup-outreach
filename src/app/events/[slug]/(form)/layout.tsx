"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Event } from "@/utils/supabase/types";
import { EventProvider } from "@/contexts/EventContext";

interface EventLayoutProps {
  children: React.ReactNode;
}

export default function EventLayout({ children }: EventLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchEvent() {
      const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("url_slug", slug)
          .single();

        if (error) {
          console.error("Error fetching event:", error);
          if (error.code === "PGRST116") {
            router.push("/");
          }
        } else {
          // Check if event is archived
          if (data.archived) {
            router.push("/");
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

  if (!event) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(to bottom, #f97316, #ea580c, #dc2626)",
        }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Event Not Found
          </h1>
          <Link href="/" className="text-white hover:text-orange-200 underline">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        background: `linear-gradient(to bottom, ${
          event.gradient_from_color || "#f97316"
        }, ${event.gradient_through_color || "#ea580c"}, ${
          event.gradient_to_color || "#dc2626"
        })`,
      }}
    >
      {/* Navigation Links */}
      <div className="absolute top-4 right-4 flex gap-3">
        <Link
          href={`/events/${event.url_slug}`}
          className="text-white/70 hover:text-white text-xs font-medium transition-colors"
        >
          Back to Event
        </Link>
      </div>

      {/* Main Content */}
      <EventProvider event={event}>{children}</EventProvider>
    </div>
  );
}
