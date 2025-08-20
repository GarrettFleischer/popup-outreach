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
  type Lead,
} from "@/utils/supabase/actions/actions";

export default function LeadsManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Middleware handles admin authorization, so we just need to check if user exists
    loadLeads();
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

  const handleCreateLead = () => {
    setEditingLead(null);
    setIsDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
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

      <LeadsTable leads={leads} onEditLead={handleEditLead} />

      <LeadDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveLead}
        lead={editingLead}
      />
    </div>
  );
}
