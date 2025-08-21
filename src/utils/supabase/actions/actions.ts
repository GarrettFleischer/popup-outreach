import { createClient } from "@/utils/supabase/client";
import { Tables } from "@/utils/supabase/database.types";

export type EventWithStats = Tables<"events"> & {
  attendee_count: number;
  saved_count: number;
  lead_count: number;
};

export type Attendee = Tables<"attendees">;
export type SavedSubmission = Tables<"saved">;

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

      // Get lead count for the event (now consolidated into saved table)
      // A lead is a saved submission that has been assigned to a user
      const { count: leadCount } = await supabase
        .from("saved")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .not("assigned_user_id", "is", null);

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

  // Since leads are now consolidated into the saved table, we just need to count
  // how many saved submissions are assigned to users (i.e., are leads)
  const { count, error } = await supabase
    .from("saved")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .not("assigned_user_id", "is", null);

  if (error) {
    console.error("Error counting leads:", error);
    throw new Error("Failed to count leads");
  }

  return count || 0;
}

// Since leads are now consolidated into the saved table, this function now returns
// saved submissions that are assigned to users (i.e., are leads)
export async function getEventLeads(
  eventId: string
): Promise<Tables<"saved">[]> {
  const supabase = createClient();

  // Get all saved submissions for this event that are assigned to users (leads)
  const { data: leads, error } = await supabase
    .from("saved")
    .select(
      `
      *,
      profiles:assigned_user_id (
        id,
        first_name,
        last_name
      ),
      events:event_id (
        id,
        name,
        url_slug
      )
    `
    )
    .eq("event_id", eventId)
    .not("assigned_user_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching event leads:", error);
    throw new Error("Failed to fetch event leads");
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
    .select(
      `
      id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      age_range,
      assigned_user_id,
      events!inner (
        id,
        name,
        url_slug
      )
    `
    )
    .eq("event_id", eventId);

  if (savedError) {
    console.error("Error fetching saved submissions:", savedError);
    throw new Error("Failed to fetch saved submissions");
  }

  if (!savedSubmissions || savedSubmissions.length === 0) {
    return {};
  }

  // Check which saved submissions are assigned to users (i.e., are leads)
  const conversionStatus: { [key: string]: boolean } = {};

  for (const saved of savedSubmissions) {
    // A saved submission is considered a lead if it has an assigned_user_id
    conversionStatus[saved.id] = !!saved.assigned_user_id;
  }

  return conversionStatus;
}

export async function getAllLeads(): Promise<Tables<"saved">[]> {
  const supabase = createClient();

  const { data: leads, error } = await supabase
    .from("saved")
    .select(
      `
      *,
      profiles:assigned_user_id (
        id,
        first_name,
        last_name
      ),
      events:event_id (
        id,
        name,
        url_slug
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
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  age_range?: "Child" | "Young Adult" | "Adult" | null;
  needs_ride?: boolean;
  contacted?: boolean;
  notes?: string;
  assigned_user_id?: string | null;
}): Promise<SavedSubmission> {
  const supabase = createClient();

  const { data: lead, error } = await supabase
    .from("saved")
    .insert({
      event_id: leadData.event_id,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      email: leadData.email,
      phone: leadData.phone || "",
      age_range: leadData.age_range || null,
      needs_ride: leadData.needs_ride || false,
      contacted: leadData.contacted || false,
      notes: leadData.notes || null,
      assigned_user_id: leadData.assigned_user_id || null,
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
): Promise<SavedSubmission> {
  const supabase = createClient();

  const { data: lead, error } = await supabase
    .from("saved")
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

export async function getAllProfiles(): Promise<Tables<"profiles">[]> {
  const supabase = createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error);
    throw new Error("Failed to fetch profiles");
  }

  return profiles || [];
}

export async function bulkAssignLeads(
  leadIds: string[],
  assignedUserId: string | null
): Promise<void> {
  const supabase = createClient();

  // RLS policies will automatically ensure users can only update leads they have access to
  const { error } = await supabase
    .from("saved")
    .update({ assigned_user_id: assignedUserId })
    .in("id", leadIds);

  if (error) {
    console.error("Error bulk assigning leads:", error);
    throw new Error("Failed to bulk assign leads");
  }
}
