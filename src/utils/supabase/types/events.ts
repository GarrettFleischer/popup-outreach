import { Tables } from "@/utils/supabase/database.types";

// Base event type from database
export type Event = Tables<"events">;

// Attendee type from database
export type Attendee = Tables<"attendees">;

// Saved submission type from database
export type SavedSubmission = Tables<"saved">;

// Extended event type with additional computed properties if needed
export interface EventWithStats extends Event {
  attendee_count?: number;
  saved_count?: number;
}
