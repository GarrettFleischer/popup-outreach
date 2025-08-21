import React from "react";
import { Tables } from "@/utils/supabase/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdmin } from "@/utils/supabase/types/users";

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
};

interface LeadsTableProps {
  leads: LeadWithEventInfo[];
  onEditLead?: (lead: LeadWithEventInfo) => void;
  selectedLeads: string[];
  onSelectLead: (leadId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onBulkAssign: (assignedUserId: string | null) => void;
  profiles: Tables<"profiles">[];
}

export function LeadsTable({
  leads,
  onEditLead,
  selectedLeads,
  onSelectLead,
  onSelectAll,
  onBulkAssign,
  profiles,
}: LeadsTableProps) {
  const { user } = useAuth();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;
  const someSelected =
    selectedLeads.length > 0 && selectedLeads.length < leads.length;

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg mb-2">No leads found</p>
          <p className="text-sm">
            Convert saved attendees to leads to start managing them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Bulk Actions Header - Only show for super admins (level 0) */}
      {selectedLeads.length > 0 && isSuperAdmin(user?.profile) && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedLeads.length} lead
                {selectedLeads.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-blue-700">Assign to:</label>
                <select
                  className="text-sm border border-blue-300 rounded px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => onBulkAssign(e.target.value || null)}
                  defaultValue=""
                >
                  <option value="" className="text-gray-500">
                    Select user...
                  </option>
                  <option value="" className="text-gray-900">
                    Unassign
                  </option>
                  {profiles.map((profile) => (
                    <option
                      key={profile.user_id}
                      value={profile.user_id}
                      className="text-gray-900"
                    >
                      {profile.first_name} {profile.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => onSelectAll(false)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            All Leads ({leads.length})
          </h2>
          {selectedLeads.length > 0 && (
            <span className="text-sm text-gray-500">
              {selectedLeads.length} selected
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Only show checkbox column for super admins (level 0) */}
              {isSuperAdmin(user?.profile) && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                {/* Only show checkbox for super admins (level 0) */}
                {isSuperAdmin(user?.profile) && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => onSelectLead(lead.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                )}
                <td
                  className="px-6 py-4 whitespace-nowrap cursor-pointer"
                  onClick={() => onEditLead?.(lead)}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </div>
                    {lead.age_range && (
                      <div className="text-sm text-gray-500">
                        Age: {lead.age_range}
                      </div>
                    )}
                  </div>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap cursor-pointer"
                  onClick={() => onEditLead?.(lead)}
                >
                  <div className="text-sm text-gray-900">
                    {lead.events?.name ? lead.events.name : "Event Lead"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lead.created_at
                      ? formatDate(lead.created_at)
                      : "Unknown date"}
                  </div>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap cursor-pointer"
                  onClick={() => onEditLead?.(lead)}
                >
                  <div className="text-sm text-gray-900">{lead.email}</div>
                  {lead.phone && (
                    <div className="text-sm text-gray-500">{lead.phone}</div>
                  )}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap cursor-pointer"
                  onClick={() => onEditLead?.(lead)}
                >
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      lead.contacted
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {lead.contacted ? "Contacted" : "Not Contacted"}
                  </span>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap cursor-pointer"
                  onClick={() => onEditLead?.(lead)}
                >
                  <div className="text-sm text-gray-900">
                    {lead.assigned_user_id
                      ? lead.profiles
                        ? `${lead.profiles.first_name} ${lead.profiles.last_name}`
                        : "Assigned"
                      : "Unassigned"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
