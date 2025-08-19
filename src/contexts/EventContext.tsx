"use client";

import { createContext, useContext, ReactNode } from "react";
import { Event } from "@/utils/supabase/types";

interface EventContextType {
  event: Event | null;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({
  children,
  event,
}: {
  children: ReactNode;
  event: Event | null;
}) {
  return (
    <EventContext.Provider value={{ event }}>{children}</EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}
