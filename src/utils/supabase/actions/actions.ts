import { createClient } from "@/utils/supabase/client";
import { Tables } from "@/utils/supabase/database.types";

export type EventWithStats = Tables<"events"> & {
  attendee_count: number;
  saved_count: number;
  lead_count: number;
};

export type Attendee = Tables<"attendees">;
export type SavedSubmission = Tables<"saved">;

export type EventAssignment = Tables<"event_assignments">;

export type EventAssignmentWithEvent = Tables<"event_assignments"> & {
  events: {
    id: string;
    name: string;
    date: string;
    url_slug: string;
  };
};

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
        user_id,
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
      referrer_user_id,
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
        user_id,
        first_name,
        last_name
      ),
      referrer_profiles:referrer_user_id (
        user_id,
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

export async function getLeadsWithPagination({
  page = 1,
  pageSize = 20,
  search = "",
  hideContacted = false,
  hideAssigned = false,
  assignedUserId = null,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  hideContacted?: boolean;
  hideAssigned?: boolean;
  assignedUserId?: string | null;
}): Promise<{
  leads: Tables<"saved">[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  const supabase = createClient();

  // If no search term, use simple pagination with filters
  if (!search.trim()) {
    let query = supabase.from("saved").select(
      `
        *,
        profiles:assigned_user_id (
          user_id,
          first_name,
          last_name
        ),
        referrer_profiles:referrer_user_id (
          user_id,
          first_name,
          last_name
        ),
        events:event_id (
          id,
          name,
          url_slug
        )
      `,
      { count: "exact" }
    );

    // Apply filters
    if (hideContacted) {
      query = query.eq("contacted", false);
    }

    if (hideAssigned) {
      query = query.is("assigned_user_id", null);
    }

    // Note: assignedUserId should be a profile ID, not a user ID
    // This filter is mainly used for super admins to filter by specific assigned users
    // For lead managers, RLS policies handle the filtering automatically
    if (assignedUserId) {
      query = query.eq("assigned_user_id", assignedUserId);
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await query;

    if (countError) {
      console.error("Error counting leads:", countError);
      throw new Error("Failed to count leads");
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: leads, error: leadsError } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      throw new Error("Failed to fetch leads");
    }

    const totalPages = Math.ceil((totalCount || 0) / pageSize);

    return {
      leads: leads || [],
      totalCount: totalCount || 0,
      totalPages,
      currentPage: page,
    };
  }

  // For search with joined tables, we need to use multiple queries
  const searchTerm = search.trim().toLowerCase();
  let allLeads: Tables<"saved">[] = [];

  // Create a function to apply common filters to any query
  const applyFilters = (query: ReturnType<typeof supabase.from>) => {
    if (hideContacted) {
      query = query.eq("contacted", false);
    }

    if (hideAssigned) {
      query = query.is("assigned_user_id", null);
    }

    // Note: assignedUserId should be a profile ID, not a user ID
    // This filter is mainly used for super admins to filter by specific assigned users
    // For lead managers, RLS policies handle the filtering automatically
    if (assignedUserId) {
      query = query.eq("assigned_user_id", assignedUserId);
    }

    return query;
  };

  // Common select statement for all queries
  const selectStatement = `
    *,
    profiles:assigned_user_id (
      user_id,
      first_name,
      last_name
    ),
    referrer_profiles:referrer_user_id (
      user_id,
      first_name,
      last_name
    ),
    events:event_id (
      id,
      name,
      url_slug
    )
  `;

  try {
    // 1. Search main fields
    const mainQuery = applyFilters(
      supabase.from("saved").select(selectStatement)
    );

    // Build main field search conditions
    const mainSearchConditions = [
      `first_name.ilike.%${searchTerm}%`,
      `last_name.ilike.%${searchTerm}%`,
      `email.ilike.%${searchTerm}%`,
      `phone.ilike.%${searchTerm}%`,
      `address.ilike.%${searchTerm}%`,
    ];

    mainQuery.or(mainSearchConditions.join(","));
    const { data: mainResults, error: mainError } = await mainQuery;

    if (mainError) {
      console.error("Error searching main fields:", mainError);
    } else if (mainResults) {
      allLeads = [...allLeads, ...mainResults];
    }

    // 2. Search age_range if applicable
    if (["child", "young adult", "adult"].includes(searchTerm)) {
      const ageValue =
        searchTerm === "child"
          ? "Child"
          : searchTerm === "young adult"
          ? "Young Adult"
          : searchTerm === "adult"
          ? "Adult"
          : null;
      if (ageValue) {
        const ageQuery = applyFilters(
          supabase
            .from("saved")
            .select(selectStatement)
            .eq("age_range", ageValue)
        );

        const { data: ageResults, error: ageError } = await ageQuery;

        if (ageError) {
          console.error("Error searching age_range:", ageError);
        } else if (ageResults) {
          allLeads = [...allLeads, ...ageResults];
        }
      }
    }

    // 3. Search event names (source)
    const eventNameQuery = applyFilters(
      supabase.from("saved").select(selectStatement)
    );

    // We need to use a different approach for joined tables
    const { data: allSavedWithEvents, error: eventQueryError } =
      await eventNameQuery;

    if (eventQueryError) {
      console.error("Error fetching leads with events:", eventQueryError);
    } else if (allSavedWithEvents) {
      // Filter client-side for event name matches
      const eventMatches = allSavedWithEvents.filter(
        (lead: Tables<"saved"> & { events?: { name: string } | null }) =>
          lead.events &&
          lead.events.name &&
          lead.events.name.toLowerCase().includes(searchTerm)
      );

      allLeads = [...allLeads, ...eventMatches];
    }

    // 4. Search assigned user names
    const { data: allSavedWithProfiles, error: profilesQueryError } =
      await applyFilters(supabase.from("saved").select(selectStatement));

    if (profilesQueryError) {
      console.error("Error fetching leads with profiles:", profilesQueryError);
    } else if (allSavedWithProfiles) {
      // Filter client-side for assigned user name matches
      const assignedMatches = allSavedWithProfiles.filter(
        (
          lead: Tables<"saved"> & {
            profiles?: { first_name: string; last_name: string } | null;
          }
        ) =>
          lead.profiles &&
          ((lead.profiles.first_name &&
            lead.profiles.first_name.toLowerCase().includes(searchTerm)) ||
            (lead.profiles.last_name &&
              lead.profiles.last_name.toLowerCase().includes(searchTerm)))
      );

      allLeads = [...allLeads, ...assignedMatches];
    }

    // 5. Search referrer user names
    const { data: allSavedWithReferrers, error: referrersQueryError } =
      await applyFilters(
        supabase
          .from("saved")
          .select(selectStatement)
          .not("referrer_user_id", "is", null)
      );

    if (referrersQueryError) {
      console.error(
        "Error fetching leads with referrers:",
        referrersQueryError
      );
    } else if (allSavedWithReferrers) {
      // Filter client-side for referrer name matches
      const referrerMatches = allSavedWithReferrers.filter(
        (
          lead: Tables<"saved"> & {
            referrer_profiles?: {
              first_name: string;
              last_name: string;
            } | null;
          }
        ) =>
          lead.referrer_profiles &&
          ((lead.referrer_profiles.first_name &&
            lead.referrer_profiles.first_name
              .toLowerCase()
              .includes(searchTerm)) ||
            (lead.referrer_profiles.last_name &&
              lead.referrer_profiles.last_name
                .toLowerCase()
                .includes(searchTerm)))
      );

      allLeads = [...allLeads, ...referrerMatches];
    }

    // Deduplicate by ID
    const uniqueLeads = Array.from(
      new Map(allLeads.map((lead) => [lead.id, lead])).values()
    );

    // Handle pagination manually
    const totalCount = uniqueLeads.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Sort by created_at (newest first) and paginate
    const paginatedLeads = uniqueLeads
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice((page - 1) * pageSize, page * pageSize);

    return {
      leads: paginatedLeads,
      totalCount,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error("Error searching leads:", error);
    throw new Error("Failed to search leads");
  }
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
  address?: string;
  assigned_user_id?: string | null;
  referrer_user_id?: string | null;
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
      address: leadData.address || null,
      assigned_user_id: leadData.assigned_user_id || null,
      referrer_user_id: leadData.referrer_user_id || null,
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
    address?: string;
    assigned_user_id?: string | null;
    referrer_user_id?: string | null;
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

export async function updateUserPermission(
  targetUserId: string,
  newPermissionLevel: number
): Promise<boolean> {
  const supabase = createClient();

  // Use RPC call for the update_user_permission function
  const { data, error } = await supabase.rpc("update_user_permission", {
    target_user_id: targetUserId,
    new_permission_level: newPermissionLevel,
  });

  if (error) {
    console.error("Error updating user permission:", error);
    throw new Error("Failed to update user permission");
  }

  return Boolean(data);
}

export async function getAllProfilesWithPermissions(): Promise<
  Array<
    Tables<"profiles"> & {
      profile_permissions: { permission_level: number } | null;
    }
  >
> {
  const supabase = createClient();

  // First check if the current user is a super admin
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser?.id) {
    throw new Error("User not authenticated");
  }

  const { data: currentUserPermissions, error: permError } = await supabase
    .from("profile_permissions")
    .select("permission_level")
    .eq("user_id", currentUser.id)
    .single();

  if (
    permError ||
    !currentUserPermissions ||
    currentUserPermissions.permission_level !== 0
  ) {
    throw new Error("Access denied: Only super admins can view all profiles");
  }

  // If we're here, the user is a super admin, so we can fetch all profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      profile_permissions (
        permission_level
      )
    `
    )
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching profiles with permissions:", error);
    throw new Error("Failed to fetch profiles with permissions");
  }

  return profiles || [];
}

// Event Assignment Functions
export async function getUserEventAssignments(
  userId: string
): Promise<EventAssignmentWithEvent[]> {
  const supabase = createClient();

  const { data: assignments, error } = await supabase
    .from("event_assignments")
    .select(
      `
      *,
      events (
        id,
        name,
        date,
        url_slug
      )
    `
    )
    .eq("user_id", userId)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("Error fetching user event assignments:", error);
    throw new Error("Failed to fetch user event assignments");
  }

  return assignments || [];
}

export async function getAllEvents(): Promise<Tables<"events">[]> {
  const supabase = createClient();

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("archived", false)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    throw new Error("Failed to fetch events");
  }

  return events || [];
}

export async function assignUserToEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("event_assignments").insert({
    user_id: userId,
    event_id: eventId,
    assigned_by: (await supabase.auth.getUser()).data.user?.id || null,
  });

  if (error) {
    console.error("Error assigning user to event:", error);
    throw new Error("Failed to assign user to event");
  }
}

export async function removeUserFromEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("event_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error removing user from event:", error);
    throw new Error("Failed to remove user from event");
  }
}
