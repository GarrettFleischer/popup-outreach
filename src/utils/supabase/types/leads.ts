// Lead types that extend the database types
// Since leads are now consolidated into the saved table, we use the saved table types
import { Tables } from "@/utils/supabase/database.types";

export type Lead = Tables<"saved">;

export interface LeadWithEvent extends Lead {
  events: {
    id: string;
    name: string;
    url_slug: string;
  } | null;
}

export interface LeadWithAssignee extends Lead {
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}
