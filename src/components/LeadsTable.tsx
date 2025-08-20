import React from "react";
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
};

interface LeadsTableProps {
  leads: LeadWithEventInfo[];
  onEditLead?: (lead: LeadWithEventInfo) => void;
}

export function LeadsTable({ leads, onEditLead }: LeadsTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          All Leads ({leads.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
              <tr
                key={lead.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onEditLead?.(lead)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {lead.saved?.events?.name
                      ? lead.saved.events.name
                      : lead.saved_id
                      ? "From Saved Submission"
                      : "Manual Lead"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lead.created_at
                      ? formatDate(lead.created_at)
                      : "Unknown date"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{lead.email}</div>
                  {lead.phone && (
                    <div className="text-sm text-gray-500">{lead.phone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {lead.assigned_user_id ? "Assigned" : "Unassigned"}
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
