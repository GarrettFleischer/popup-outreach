"use client";

import { EventProvider } from "@/contexts/EventContext";
import { useParams } from "next/navigation";

interface EventLayoutProps {
  children: React.ReactNode;
}

export default function EventLayout({ children }: EventLayoutProps) {
  const params = useParams();
  const eventSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  if (!eventSlug) {
    return null;
  }

  return (
    <EventProvider eventSlug={eventSlug}>
      {children}
    </EventProvider>
  );
}
