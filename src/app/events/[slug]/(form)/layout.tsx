"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEvent } from "@/contexts/EventContext";

interface EventLayoutProps {
  children: React.ReactNode;
}

export default function EventLayout({ children }: EventLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const { event } = useEvent();

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
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
      {children}
    </div>
  );
}
