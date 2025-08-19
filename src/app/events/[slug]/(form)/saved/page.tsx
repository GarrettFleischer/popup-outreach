"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SavedForm } from "@/utils/supabase/types";
import { useEvent } from "@/contexts/EventContext";
import { createClient } from "@/utils/supabase/client";

export default function EventSavedPage() {
  const { event } = useEvent();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState<SavedForm>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    needs_ride: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    // Prevent submission for archived events
    if (event.archived) {
      alert("This event is no longer available.");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("saved").insert({
        event_id: event.id,
        ...formData,
      });

      if (error) {
        console.error("Error submitting saved form:", error);
        alert("Failed to submit form. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch (error) {
      console.error("Error submitting saved form:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) {
    return null; // This should never happen due to layout validation
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-orange-200 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Thank You!
          </h3>
          <p className="text-gray-600 mb-6">
            We&apos;ll be in touch soon to help you on your journey!
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  first_name: "",
                  last_name: "",
                  phone: "",
                  email: "",
                  needs_ride: false,
                });
              }}
              variant="primary"
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
          JUST SAVED?
        </h1>
        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
            WELCOME TO THE FAMILY!
          </p>
        </div>
      </div>

      {/* Registration Form */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-orange-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div>
            <label
              htmlFor="first_name"
              className="block text-sm font-bold text-gray-900 mb-2"
            >
              First Name
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              required
              aria-required="true"
              aria-describedby="saved-first-name-help"
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder-gray-400 font-medium text-gray-900"
              placeholder="Enter your first name"
            />
            <div id="saved-first-name-help" className="sr-only">
              Enter your first name so we can provide spiritual support and
              guidance
            </div>
          </div>

          <div>
            <label
              htmlFor="last_name"
              className="block text-sm font-bold text-gray-900 mb-2"
            >
              Last Name
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              required
              aria-required="true"
              aria-describedby="saved-last-name-help"
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder-gray-400 font-medium text-gray-900"
              placeholder="Enter your last name"
            />
            <div id="saved-last-name-help" className="sr-only">
              Enter your last name so we can provide spiritual support and
              guidance
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-bold text-gray-900 mb-2"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              aria-required="true"
              aria-describedby="saved-phone-help"
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder-gray-400 font-medium text-gray-900"
              placeholder="Enter your phone number"
            />
            <div id="saved-phone-help" className="sr-only">
              Enter your phone number so we can reach out to provide spiritual
              support and guidance
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-bold text-gray-900 mb-2"
            >
              Email Address{" "}
              <span className="text-gray-600 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              aria-describedby="saved-email-help"
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder-gray-400 font-medium text-gray-900"
              placeholder="Enter your email address (optional)"
            />
            <div id="saved-email-help" className="sr-only">
              Optional email address for additional ways to stay connected and
              receive spiritual resources
            </div>
          </div>

          {/* Bus Ministry Checkbox */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="needs_ride"
                  name="needs_ride"
                  type="checkbox"
                  checked={formData.needs_ride}
                  onChange={handleInputChange}
                  aria-describedby="bus-help"
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
              <div className="ml-3">
                <label
                  htmlFor="needs_ride"
                  className="text-sm font-bold text-blue-900"
                >
                  I need a ride with the free bus ministry
                </label>
                <p className="text-xs text-blue-800 mt-1" id="bus-help">
                  Check this if you need transportation to and from church
                </p>
              </div>
            </div>
          </div>

          {/* Christian Outreach Message */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-green-900 mb-2">
                Welcome to God&apos;s Family!
              </h3>
              <p className="text-sm text-green-800 mb-3">
                We&apos;re excited to walk alongside you in your new faith
                journey. Our team will reach out to provide support, resources,
                and guidance.
              </p>
              <div className="bg-green-100 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-900 font-medium">
                  🔒 We will never spam you or send junk mail.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            variant="success"
            size="xl"
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            aria-label={
              submitting
                ? "Processing submission, please wait"
                : "Submit form to connect with our spiritual support team"
            }
            aria-describedby="saved-submit-help"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </div>
            ) : (
              "SUBMIT & CONNECT"
            )}
          </Button>
          <div id="saved-submit-help" className="sr-only">
            Click to submit your information and connect with our team for
            spiritual support and guidance
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-sm text-white font-medium drop-shadow-md">
          By submitting, you agree to our terms and conditions
        </p>
      </div>
    </div>
  );
}
