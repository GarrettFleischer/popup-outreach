import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Lead } from "@/utils/supabase/actions/actions";

interface LeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leadData: LeadFormData) => Promise<void>;
  lead?: Lead | null; // If provided, we're editing; if null/undefined, we're creating
}

export interface LeadFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  age_range: "Child" | "Young Adult" | "Adult" | null;
  needs_ride: boolean;
  contacted: boolean;
  notes: string;
}

export function LeadDialog({ isOpen, onClose, onSave, lead }: LeadDialogProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    age_range: null,
    needs_ride: false,
    contacted: false,
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens/closes or lead changes
  useEffect(() => {
    if (isOpen) {
      if (lead) {
        // Editing existing lead
        setFormData({
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone || "",
          age_range: lead.age_range,
          needs_ride: lead.needs_ride || false,
          contacted: lead.contacted || false,
          notes: lead.notes || "",
        });
      } else {
        // Creating new lead
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          age_range: null,
          needs_ride: false,
          contacted: false,
          notes: "",
        });
      }
    }
  }, [isOpen, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving lead:", error);
      alert("Failed to save lead. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {lead ? "Edit Lead" : "Create Lead"}
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-sm font-medium text-gray-900 mb-1"
                >
                  First Name *
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  placeholder="First name"
                />
              </div>
              <div>
                <label
                  htmlFor="last_name"
                  className="block text-sm font-medium text-gray-900 mb-1"
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label
                htmlFor="age_range"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                Age Range
              </label>
              <select
                id="age_range"
                name="age_range"
                value={formData.age_range || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    age_range: e.target.value
                      ? (e.target.value as "Child" | "Young Adult" | "Adult")
                      : null,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
              >
                <option value="">Select age range</option>
                <option value="Child">Child</option>
                <option value="Young Adult">Young Adult</option>
                <option value="Adult">Adult</option>
              </select>
            </div>

            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="needs_ride"
                  name="needs_ride"
                  checked={formData.needs_ride}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="needs_ride"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Needs Ride
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="contacted"
                  name="contacted"
                  checked={formData.contacted}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="contacted"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Contacted
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                placeholder="Add any notes about this lead..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? "Saving..." : lead ? "Update Lead" : "Create Lead"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
