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
      // This includes both direct leads and leads that would violate constraints
      const { data: savedSubmissions } = await supabase
        .from("saved")
        .select(
          `
          id, 
          first_name, 
          last_name, 
          email, 
          phone,
          events!inner (
            id,
            name,
            url_slug
          )
        `
        )
        .eq("event_id", event.id);

      let leadCount = 0;
      if (savedSubmissions && savedSubmissions.length > 0) {
        for (const saved of savedSubmissions) {
          // Check for direct lead reference
          const { data: directLead } = await supabase
            .from("leads")
            .select("id")
            .eq("saved_id", saved.id)
            .maybeSingle();

          if (directLead) {
            leadCount++;
            continue;
          }

          // Check for constraint violation (same name/email/phone combination)
          const { data: constraintLead } = await supabase
            .from("leads")
            .select("id")
            .eq("first_name", saved.first_name)
            .eq("last_name", saved.last_name)
            .eq("email", saved.email || "")
            .eq("phone", saved.phone || "")
            .maybeSingle();

          if (constraintLead) {
            leadCount++;
          }
        }
      }

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

  // Check which saved submissions already have leads or would violate constraints
  const existingLeadIds = new Set<string>();
  const constraintViolationIds = new Set<string>();

  for (const saved of savedSubmissions) {
    // Check for direct lead reference
    const { data: directLead } = await supabase
      .from("leads")
      .select("id")
      .eq("saved_id", saved.id)
      .maybeSingle();

    if (directLead) {
      existingLeadIds.add(saved.id);
      continue;
    }

    // Check for constraint violation (same name/email/phone combination)
    const { data: constraintLead } = await supabase
      .from("leads")
      .select("id")
      .eq("first_name", saved.first_name)
      .eq("last_name", saved.last_name)
      .eq("email", saved.email || "")
      .eq("phone", saved.phone || "")
      .maybeSingle();

    if (constraintLead) {
      constraintViolationIds.add(saved.id);
      continue;
    }
  }

  // Filter out saved submissions that already have leads or would violate constraints
  const newSavedSubmissions = savedSubmissions.filter(
    (saved) =>
      !existingLeadIds.has(saved.id) && !constraintViolationIds.has(saved.id)
  );

  if (newSavedSubmissions.length === 0) {
    return 0; // All submissions already converted or would violate constraints
  }

  // Convert saved submissions to leads, respecting the unique constraint
  // on (first_name, last_name, email, phone)
  const leadsToInsert = [];

  for (const saved of newSavedSubmissions) {
    // Check if a lead with this exact combination already exists
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("first_name", saved.first_name)
      .eq("last_name", saved.last_name)
      .eq("email", saved.email || "")
      .eq("phone", saved.phone || "")
      .maybeSingle();

    // Only insert if no existing lead with this combination
    if (!existingLead) {
      leadsToInsert.push({
        saved_id: saved.id,
        first_name: saved.first_name,
        last_name: saved.last_name,
        email: saved.email || "",
        phone: saved.phone || "",
        age_range: saved.age_range,
        needs_ride: saved.needs_ride || false,
        assigned_user_id: null,
        contacted: false,
        notes: null,
      });
    }
  }

  if (leadsToInsert.length === 0) {
    return 0; // No new leads to insert
  }

  // Insert new leads
  const { error: insertError } = await supabase
    .from("leads")
    .insert(leadsToInsert);

  if (insertError) {
    console.error("Error inserting leads:", insertError);
    throw new Error("Failed to convert saved submissions to leads");
  }

  return leadsToInsert.length;
}

export async function getEventLeads(eventId: string): Promise<
  (Tables<"leads"> & {
    saved?: {
      id: string;
      event_id: string;
      events: {
        id: string;
        name: string;
        url_slug: string;
      };
    } | null;
  })[]
> {
  const supabase = createClient();

  // Get all saved submissions for this event
  const { data: savedSubmissions, error: savedError } = await supabase
    .from("saved")
    .select(
      `
      id, 
      first_name, 
      last_name, 
      email, 
      phone,
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
    return [];
  }

  // Get all leads that are either directly referenced or would violate constraints
  const allEventLeads: Tables<"leads">[] = [];

  for (const saved of savedSubmissions) {
    // Check for direct lead reference
    const { data: directLead } = await supabase
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
      .eq("saved_id", saved.id)
      .maybeSingle();

    if (directLead) {
      allEventLeads.push(directLead);
      continue;
    }

    // Check for constraint violation (same name/email/phone combination)
    const { data: constraintLead } = await supabase
      .from("leads")
      .select(
        `
        *,
        profiles:assigned_user_id (
          id,
          first_name,
          last_name
        )
      `
      )
      .eq("first_name", saved.first_name)
      .eq("last_name", saved.last_name)
      .eq("email", saved.email || "")
      .eq("phone", saved.phone || "")
      .maybeSingle();

    // For constraint violation leads, we need to add the event info manually
    // since they don't have a saved_id reference
    if (constraintLead) {
      const leadWithEventInfo = {
        ...constraintLead,
        saved: {
          id: saved.id,
          event_id: saved.events.id,
          events: saved.events,
        },
      };
      allEventLeads.push(leadWithEventInfo);
      continue;
    }
  }

  // Sort by creation date and remove duplicates (in case multiple saved submissions match the same lead)
  const uniqueLeads = allEventLeads.filter(
    (lead, index, self) => index === self.findIndex((l) => l.id === lead.id)
  );

  return uniqueLeads.sort((a, b) =>
    (a.created_at || "").localeCompare(b.created_at || "")
  );
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

  // Check which saved submissions have been converted to leads
  const conversionStatus: { [key: string]: boolean } = {};

  for (const saved of savedSubmissions) {
    // Check if there's a lead that references this saved submission directly
    const { data: directLead, error: directError } = await supabase
      .from("leads")
      .select("id")
      .eq("saved_id", saved.id)
      .maybeSingle();

    if (directError) {
      console.error("Error checking direct lead conversion:", directError);
      conversionStatus[saved.id] = false;
      continue;
    }

    // If there's a direct lead, mark as converted
    if (directLead) {
      conversionStatus[saved.id] = true;
      continue;
    }

    // Check if there's a lead with the same name/email/phone combination
    // This would violate the unique constraint if we tried to convert
    const { data: constraintLead, error: constraintError } = await supabase
      .from("leads")
      .select("id")
      .eq("first_name", saved.first_name)
      .eq("last_name", saved.last_name)
      .eq("email", saved.email || "")
      .eq("phone", saved.phone || "")
      .maybeSingle();

    if (constraintError) {
      console.error("Error checking constraint violation:", constraintError);
      conversionStatus[saved.id] = false;
    } else {
      // Mark as converted if there's a constraint violation
      conversionStatus[saved.id] = !!constraintLead;
    }
  }

  return conversionStatus;
}

export async function getAllLeads(): Promise<Tables<"leads">[]> {
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
  assigned_user_id?: string | null;
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
      assigned_user_id: leadData.assigned_user_id || null,
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
    .from("leads")
    .update({ assigned_user_id: assignedUserId })
    .in("id", leadIds);

  if (error) {
    console.error("Error bulk assigning leads:", error);
    throw new Error("Failed to bulk assign leads");
  }
}
