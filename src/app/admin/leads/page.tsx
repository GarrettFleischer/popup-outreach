"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadDialog, type LeadFormData } from "@/components/LeadDialog";
import { isSuperAdmin } from "@/utils/supabase/types/users";

import {
  getAllLeads,
  createLead,
  updateLead,
  getAllProfiles,
  bulkAssignLeads,
  getEventsWithStats,
} from "@/utils/supabase/actions/actions";
import { Tables } from "@/utils/supabase/database.types";

type LeadWithEventInfo = Tables<"saved"> & {
  events?: {
    id: string;
    name: string;
    url_slug: string;
  } | null;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  referrer_profiles?: {
    user_id: string;
    first_name: string;
    last_name: string;
  } | null;
};

export default function LeadsManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<LeadWithEventInfo[]>([]);
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithEventInfo | null>(
    null
  );

  // Filter states
  const [hideContacted, setHideContacted] = useState(false);
  const [hideAssigned, setHideAssigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selection states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Middleware handles admin authorization, so we just need to check if user exists
    loadLeads();
    loadProfiles();
    loadEvents();
  }, [user, router]);

  const loadLeads = async () => {
    try {
      // RLS policies now handle permission-based filtering at the database level
      const allLeads = await getAllLeads();
      setLeads(allLeads);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const allProfiles = await getAllProfiles();
      setProfiles(allProfiles);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadEvents = async () => {
    try {
      const allEvents = await getEventsWithStats();
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  // Filter leads based on checkbox states and user permissions
  const filteredLeads = leads.filter((lead) => {
    // Always apply contacted filter
    if (hideContacted && lead.contacted) {
      return false;
    }

    // Only apply assigned filter for super admins (level 0)
    // Level 1 users (lead managers) only see their own leads, so this filter doesn't make sense
    if (isSuperAdmin(user?.profile) && hideAssigned && lead.assigned_user_id) {
      return false;
    }

    // Apply search filter if search query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const searchableFields = [
        // Lead name
        lead.first_name?.toLowerCase() || "",
        lead.last_name?.toLowerCase() || "",
        // Age type
        lead.age_range?.toLowerCase() || "",
        // Source name (event name)
        lead.events?.name?.toLowerCase() || "",
        // Contact info
        lead.email?.toLowerCase() || "",
        lead.phone?.toLowerCase() || "",
        lead.address?.toLowerCase() || "",
        // Assigned to
        lead.profiles?.first_name?.toLowerCase() || "",
        lead.profiles?.last_name?.toLowerCase() || "",
        // Referred by
        lead.referrer_profiles?.first_name?.toLowerCase() || "",
        lead.referrer_profiles?.last_name?.toLowerCase() || "",
      ];

      return searchableFields.some((field) => field.includes(query));
    }

    return true;
  });

  // Selection handlers
  const handleSelectLead = (leadId: string, selected: boolean) => {
    if (selected) {
      setSelectedLeads((prev) => [...prev, leadId]);
    } else {
      setSelectedLeads((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleBulkAssign = async (assignedUserId: string | null) => {
    if (selectedLeads.length === 0) return;

    try {
      await bulkAssignLeads(selectedLeads, assignedUserId);

      // Update local state
      setLeads((prev) =>
        prev.map((lead) =>
          selectedLeads.includes(lead.id)
            ? { ...lead, assigned_user_id: assignedUserId }
            : lead
        )
      );

      // Clear selection
      setSelectedLeads([]);

      // Reload leads to ensure consistency
      await loadLeads();
    } catch (error) {
      console.error("Error bulk assigning leads:", error);
      // You might want to show a toast/notification here
    }
  };

  const handleCreateLead = () => {
    setEditingLead(null);
    setIsDialogOpen(true);
  };

  const handleEditLead = (lead: LeadWithEventInfo) => {
    setEditingLead(lead);
    setIsDialogOpen(true);
  };

  const handleSaveLead = async (leadData: LeadFormData) => {
    try {
      if (editingLead) {
        // Update existing lead
        await updateLead(editingLead.id, leadData);
      } else {
        // Create new lead
        await createLead(leadData);
      }

      // Reload leads to show changes
      await loadLeads();
    } catch (error) {
      console.error("Error saving lead:", error);
      throw error; // Let the dialog handle the error display
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLead(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-gray-600 mt-2">
            Manage and track leads converted from saved event submissions
          </p>
        </div>
        <div className="flex space-x-3">
          {/* Only show create button for super admins (level 0) */}
          {isSuperAdmin(user?.profile) && (
            <Button variant="primary" onClick={handleCreateLead}>
              Create Lead
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-6">
          <h3 className="text-sm font-medium text-gray-900">Filters:</h3>

          {/* Search Box */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search leads by name, age, source, contact info, assigned to, or referred by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={hideContacted}
              onChange={(e) => setHideContacted(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Hide contacted leads</span>
          </label>
          {/* Only show "Hide assigned leads" filter for super admins (level 0) */}
          {isSuperAdmin(user?.profile) && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={hideAssigned}
                onChange={(e) => setHideAssigned(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Hide assigned leads</span>
            </label>
          )}
          <div className="text-sm text-gray-500">
            Showing {filteredLeads.length} of {leads.length} leads
          </div>
        </div>
      </div>

      <LeadsTable
        leads={filteredLeads}
        onEditLead={handleEditLead}
        selectedLeads={selectedLeads}
        onSelectLead={handleSelectLead}
        onSelectAll={handleSelectAll}
        onBulkAssign={handleBulkAssign}
        profiles={profiles}
      />

      <LeadDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveLead}
        lead={editingLead}
        profiles={profiles}
        events={events}
      />
    </div>
  );
}
