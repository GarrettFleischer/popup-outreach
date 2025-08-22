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
      <div className="absolute top-0 left-4 z-50">
        <Link
          href={`/events/${event.url_slug}`}
          className="text-white/70 hover:text-white transition-colors p-2"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
