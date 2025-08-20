// Temporary leads type definition until database types are updated
export interface Lead {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  dietary_restrictions?: string;
  additional_notes?: string;
  needs_ride: boolean;
  assigned_user_id?: string;
  contacted: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadWithEvent extends Lead {
  event: {
    id: string;
    name: string;
    url_slug: string;
  };
}

export interface LeadWithAssignee extends Lead {
  assignee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}
