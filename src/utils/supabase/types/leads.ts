// Lead types that extend the database types
import { Tables } from "@/utils/supabase/database.types";

export type Lead = Tables<"leads">;

export interface LeadWithEvent extends Lead {
  saved: {
    id: string;
    event_id: string;
    event?: {
      id: string;
      name: string;
      url_slug: string;
    };
  } | null;
}

export interface LeadWithAssignee extends Lead {
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}
