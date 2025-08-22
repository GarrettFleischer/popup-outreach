"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadDialog, type LeadFormData } from "@/components/LeadDialog";
import { isSuperAdmin } from "@/utils/supabase/types/users";

import {
  getLeadsWithPagination,
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
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Selection states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Initialize Supabase client for real-time
  const supabase = createClient();

  // Debounced refresh state to prevent excessive API calls
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLeads = useCallback(async () => {
    try {
      // RLS policies now handle permission-based filtering at the database level
      const response = await getLeadsWithPagination({
        page: currentPage,
        pageSize,
        search: appliedSearchQuery,
        hideContacted,
        hideAssigned,
        assignedUserId: isSuperAdmin(user?.profile) ? null : user?.id || null,
      });

      setLeads(response.leads);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setIsLoading(false);
      setIsPageLoading(false); // Reset loading state
    }
  }, [
    currentPage,
    pageSize,
    appliedSearchQuery,
    hideContacted,
    hideAssigned,
    user,
  ]);

  const loadProfiles = useCallback(async () => {
    try {
      const allProfiles = await getAllProfiles();
      setProfiles(allProfiles);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const allEvents = await getEventsWithStats();
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Middleware handles admin authorization, so we just need to check if user exists
    loadLeads();
    loadProfiles();
    loadEvents();
  }, [user, router, loadLeads, loadProfiles, loadEvents]);

  // Reload leads when filters change
  useEffect(() => {
    if (user) {
      setCurrentPage(1); // Reset to first page when filters change
      loadLeads();
    }
  }, [hideContacted, hideAssigned, user, loadLeads]);

  // Function to apply search
  const applySearch = () => {
    setAppliedSearchQuery(searchInput);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Reload leads when page changes
  useEffect(() => {
    if (user && currentPage > 1) {
      loadLeads();
    }
  }, [currentPage, user, loadLeads]);

  // Reload leads when page size changes
  useEffect(() => {
    if (user) {
      setCurrentPage(1);
      loadLeads();
    }
  }, [pageSize, user, loadLeads]);

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // Subscribe to saved table changes (leads)
    const savedChannel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved",
        },
        (payload) => {
          console.log("Leads realtime update:", payload);
          // Only refresh if not currently loading or refreshing
          if (!isLoading && !isPageLoading && !isRefreshing) {
            setIsRefreshing(true);
            // Debounce the refresh to prevent excessive API calls
            setTimeout(() => {
              loadLeads();
              setIsRefreshing(false);
            }, 500);
          }
        }
      )
      .subscribe();

    channels.push(savedChannel);

    // Subscribe to profiles table changes (for user assignment updates)
    const profilesChannel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          console.log("Profiles realtime update:", payload);
          // Refresh profiles data when there are changes
          loadProfiles();
        }
      )
      .subscribe();

    channels.push(profilesChannel);

    // Subscribe to events table changes (for event information updates)
    const eventsChannel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        (payload) => {
          console.log("Events realtime update:", payload);
          // Refresh events data when there are changes
          loadEvents();
          // Also refresh leads data since leads display event information
          if (!isLoading && !isPageLoading && !isRefreshing) {
            setIsRefreshing(true);
            setTimeout(() => {
              loadLeads();
              setIsRefreshing(false);
            }, 500);
          }
        }
      )
      .subscribe();

    channels.push(eventsChannel);

    // Cleanup function
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, supabase, loadLeads, isLoading, isPageLoading, isRefreshing]);

  // Filter leads based on checkbox states and user permissions
  const filteredLeads = leads;

  // Handle page change
  const handlePageChange = (page: number) => {
    if (isPageLoading) return; // Prevent multiple simultaneous requests
    setCurrentPage(page);
    setIsPageLoading(true);
    loadLeads();
  };

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
      <div className="space-y-4 lg:space-y-0 lg:flex lg:justify-between lg:items-start mb-6">
        <div className="space-y-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Leads Management
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            Manage and track leads converted from saved event submissions
          </p>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">
              Live updates enabled
            </span>
          </div>
        </div>
        <div className="flex justify-start lg:justify-end">
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
        {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
        <div className="space-y-4 lg:space-y-0 lg:flex lg:items-center lg:space-x-6">
          <h3 className="text-sm font-medium text-gray-900">Filters:</h3>

          {/* Search Box - Full width on mobile, constrained on desktop */}
          <div className="w-full lg:flex-1 lg:max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by any field..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applySearch();
                  }
                }}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
              <button
                onClick={applySearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                type="button"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Controls Row - Stack on mobile, horizontal on desktop */}
          <div className="space-y-3 lg:space-y-0 lg:flex lg:items-center lg:space-x-6">
            {/* Page Size Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-900">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                  loadLeads();
                }}
                disabled={isPageLoading}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-900">per page</span>
            </div>

            {/* Checkboxes Row - Stack on mobile, horizontal on desktop */}
            <div className="space-y-2 lg:space-y-0 lg:flex lg:items-center lg:space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={hideContacted}
                  onChange={(e) => setHideContacted(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Hide contacted leads
                </span>
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
                  <span className="text-sm text-gray-700">
                    Hide assigned leads
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Results Info - Full width on mobile, right-aligned on desktop */}
          <div className="text-sm text-gray-500 lg:text-right lg:flex-shrink-0">
            Showing {filteredLeads.length} of {totalCount} leads
            {isPageLoading && (
              <span className="ml-2 text-blue-600">Loading...</span>
            )}
            {isRefreshing && (
              <span className="ml-2 text-green-600">Updating...</span>
            )}
          </div>
        </div>
      </div>

      {/* Loading Spinner for Table */}
      {isPageLoading && (
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Searching leads...</span>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table - Only show when not loading */}
      {!isPageLoading && (
        <LeadsTable
          leads={filteredLeads}
          onEditLead={handleEditLead}
          selectedLeads={selectedLeads}
          onSelectLead={handleSelectLead}
          onSelectAll={handleSelectAll}
          onBulkAssign={handleBulkAssign}
          profiles={profiles}
        />
      )}

      {/* Pagination Controls - Only show when not loading and there are pages */}
      {!isPageLoading && totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
              leads
              {isPageLoading && (
                <span className="ml-2 text-blue-600">Loading...</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isPageLoading}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isPageLoading}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isPageLoading}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

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
