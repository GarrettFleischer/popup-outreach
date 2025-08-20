"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadDialog, type LeadFormData } from "@/components/LeadDialog";

import {
  getAllLeads,
  createLead,
  updateLead,
  getAllProfiles,
  bulkAssignLeads,
} from "@/utils/supabase/actions/actions";
import { Tables } from "@/utils/supabase/database.types";

type LeadWithEventInfo = Tables<"leads"> & {
  saved?: {
    id: string;
    event_id: string;
    events: {
      id: string;
      name: string;
      url_slug: string;
    };
  } | null;
  profiles?: {
    id: string;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithEventInfo | null>(
    null
  );

  // Filter states
  const [hideContacted, setHideContacted] = useState(false);
  const [hideAssigned, setHideAssigned] = useState(false);

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
  }, [user, router]);

  const loadLeads = async () => {
    try {
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

  // Filter leads based on checkbox states
  const filteredLeads = leads.filter((lead) => {
    if (hideContacted && lead.contacted) {
      return false;
    }
    if (hideAssigned && lead.assigned_user_id) {
      return false;
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
          <Button variant="primary" onClick={handleCreateLead}>
            Create Lead
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center space-x-6">
          <h3 className="text-sm font-medium text-gray-900">Filters:</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={hideContacted}
              onChange={(e) => setHideContacted(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Hide contacted leads</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={hideAssigned}
              onChange={(e) => setHideAssigned(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Hide assigned leads</span>
          </label>
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
      />
    </div>
  );
}
