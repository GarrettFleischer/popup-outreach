import { createClient } from "@/utils/supabase/client";
import { Tables } from "@/utils/supabase/database.types";

export type EventWithStats = Tables<"events"> & {
  attendee_count: number;
  saved_count: number;
  lead_count: number;
};

export type Attendee = Tables<"attendees">;
export type SavedSubmission = Tables<"saved">;
export type Lead = Tables<"leads">;

export async function getEventsWithStats(
  includeArchived: boolean = false
): Promise<EventWithStats[]> {
  const supabase = createClient();

  let query = supabase.from("events").select("*");

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  const { data: events, error: eventsError } = await query.order("date", {
    ascending: false,
  });

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
    throw new Error("Failed to fetch events");
  }

  // Get attendee and saved counts for each event
  const eventsWithStats = await Promise.all(
    events.map(async (event: Tables<"events">) => {
      const { count: attendeeCount } = await supabase
        .from("attendees")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);

      const { count: savedCount } = await supabase
        .from("saved")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);

      // Get lead count for the event through saved submissions
      const { count: leadCount } = await supabase
        .from("leads")
        .select("*, saved!inner(event_id)", { count: "exact", head: true })
        .eq("saved.event_id", event.id);

      return {
        ...event,
        attendee_count: attendeeCount || 0,
        saved_count: savedCount || 0,
        lead_count: leadCount || 0,
      };
    })
  );

  return eventsWithStats;
}

export async function getEventAttendees(eventId: string): Promise<Attendee[]> {
  const supabase = createClient();

  const { data: attendees, error } = await supabase
    .from("attendees")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching attendees:", error);
    throw new Error("Failed to fetch attendees");
  }

  return attendees || [];
}

export async function getEventSavedSubmissions(
  eventId: string
): Promise<SavedSubmission[]> {
  const supabase = createClient();

  const { data: saved, error } = await supabase
    .from("saved")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching saved submissions:", error);
    throw new Error("Failed to fetch saved submissions");
  }

  return saved || [];
}

export async function updateEvent(
  eventId: string,
  updates: Partial<Tables<"events">>
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", eventId);

  if (error) {
    console.error("Error updating event:", error);
    throw new Error("Failed to update event");
  }
}

export async function archiveEvent(
  eventId: string,
  archived: boolean
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("events")
    .update({ archived })
    .eq("id", eventId);

  if (error) {
    console.error("Error archiving event:", error);
    throw new Error("Failed to archive event");
  }
}

export async function convertSavedToLeads(eventId: string): Promise<number> {
  const supabase = createClient();

  // First, get all saved submissions for the event
  const { data: savedSubmissions, error: fetchError } = await supabase
    .from("saved")
    .select("*")
    .eq("event_id", eventId);

  if (fetchError) {
    console.error("Error fetching saved submissions:", fetchError);
    throw new Error("Failed to fetch saved submissions");
  }

  if (!savedSubmissions || savedSubmissions.length === 0) {
    return 0;
  }

  // Convert saved submissions to leads
  const leadsToInsert = savedSubmissions.map((saved) => ({
    saved_id: saved.id, // Reference to the saved submission
    first_name: saved.first_name,
    last_name: saved.last_name,
    email: saved.email || "", // Handle null email
    phone: saved.phone || "", // Handle null phone
    age_range: saved.age_range, // Important for outreach strategy (enum type)
    needs_ride: saved.needs_ride || false,
    assigned_user_id: null, // Will be assigned later
    contacted: false,
    notes: null,
  }));

  // Insert all leads
  const { error: insertError } = await supabase
    .from("leads")
    .insert(leadsToInsert);

  if (insertError) {
    console.error("Error inserting leads:", insertError);
    throw new Error("Failed to convert saved submissions to leads");
  }

  return savedSubmissions.length;
}

export async function getEventLeads(eventId: string): Promise<Lead[]> {
  const supabase = createClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      profiles:assigned_user_id (
        id,
        first_name,
        last_name
      ),
      saved!inner(event_id)
    `
    )
    .eq("saved.event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching leads:", error);
    throw new Error("Failed to fetch leads");
  }

  return leads || [];
}

export async function checkSavedConversionStatus(
  eventId: string
): Promise<{ [key: string]: boolean }> {
  const supabase = createClient();

  // Get all saved submissions for the event
  const { data: savedSubmissions, error: savedError } = await supabase
    .from("saved")
    .select("id, first_name, last_name, email, phone, age_range")
    .eq("event_id", eventId);

  if (savedError) {
    console.error("Error fetching saved submissions:", savedError);
    throw new Error("Failed to fetch saved submissions");
  }

  if (!savedSubmissions || savedSubmissions.length === 0) {
    return {};
  }

  // Check which saved submissions have been converted to leads
  const conversionStatus: { [key: string]: boolean } = {};

  for (const saved of savedSubmissions) {
    // Check if there's a lead that references this saved submission
    const { data: existingLead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("saved_id", saved.id)
      .single();

    if (leadError && leadError.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Error checking lead conversion:", leadError);
    }

    conversionStatus[saved.id] = !!existingLead;
  }

  return conversionStatus;
}

export async function getAllLeads(): Promise<Lead[]> {
  const supabase = createClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      profiles:assigned_user_id (
        id,
        first_name,
        last_name
      ),
      saved:saved_id (
        id,
        event_id,
        events:event_id (
          id,
          name,
          url_slug
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all leads:", error);
    throw new Error("Failed to fetch leads");
  }

  return leads || [];
}

export async function createLead(leadData: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  age_range?: "Child" | "Young Adult" | "Adult" | null;
  needs_ride?: boolean;
  contacted?: boolean;
  notes?: string;
}): Promise<Lead> {
  const supabase = createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      email: leadData.email,
      phone: leadData.phone || null,
      age_range: leadData.age_range || null,
      needs_ride: leadData.needs_ride || false,
      contacted: leadData.contacted || false,
      notes: leadData.notes || null,
      assigned_user_id: null, // Will be assigned later
      saved_id: null, // Manual lead, not from saved submission
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating lead:", error);
    throw new Error("Failed to create lead");
  }

  return lead;
}

export async function updateLead(
  leadId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    age_range?: "Child" | "Young Adult" | "Adult" | null;
    needs_ride?: boolean;
    contacted?: boolean;
    notes?: string;
    assigned_user_id?: string | null;
  }
): Promise<Lead> {
  const supabase = createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    console.error("Error updating lead:", error);
    throw new Error("Failed to update lead");
  }

  return lead;
}
