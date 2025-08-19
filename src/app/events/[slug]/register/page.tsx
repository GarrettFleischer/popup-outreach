"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Event, RegistrationForm } from "@/utils/supabase/types";

export default function EventRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState<RegistrationForm>({
    first_name: "",
    last_name: "",
    phone: "",
  });

  useEffect(() => {
    async function fetchEvent() {
      const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("url_slug", slug)
          .single();

        if (error) {
          console.error("Error fetching event:", error);
          if (error.code === "PGRST116") {
            router.push("/events");
          }
        } else {
          // Check if event is archived
          if (data.archived) {
            router.push("/events");
            return;
          }
          setEvent(data);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [params.slug, supabase, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    // Prevent registration for archived events
    if (event.archived) {
      alert("This event is no longer available for registration.");
      router.push("/events");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("attendees").insert({
        event_id: event.id,
        ...formData,
      });

      if (error) {
        console.error("Error registering for event:", error);
        alert("Failed to register for event. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch (error) {
      console.error("Error registering for event:", error);
      alert("Failed to register for event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-red-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-red-600 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Event Not Found
          </h1>
          <Link
            href="/events"
            className="text-white hover:text-orange-200 underline"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-red-600 flex items-center justify-center p-4">
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
              Registration Successful!
            </h3>
            <p className="text-gray-600 mb-6">
              You have successfully registered for &ldquo;{event.name}&rdquo;.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    first_name: "",
                    last_name: "",
                    phone: "",
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-400 via-orange-500 to-red-600 flex items-center justify-center p-4 relative">
      {/* Navigation Links */}
      <div className="absolute top-4 right-4 flex gap-3">
        <Link
          href={`/events/${event.url_slug}`}
          className="text-white/70 hover:text-white text-xs font-medium transition-colors"
        >
          back to event
        </Link>
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
            FREE EVENT
          </h1>
          <div className="text-center mb-4">
            <p
              className="text-3xl font-bold text-black mb-2 drop-shadow-lg"
              style={{
                textShadow: "2px 2px 0px #ff0000, -2px -2px 0px #00ffff",
              }}
            >
              YOU&apos;RE INVITED
            </p>
            <p className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              Register To Win An Oculus Quest VR Headset Grand Prize
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
                aria-describedby="first-name-help"
                className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder-gray-400 font-medium text-gray-900"
                placeholder="Enter your first name"
              />
              <div id="first-name-help" className="sr-only">
                Enter your first name as it appears on official documents
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
                aria-describedby="last-name-help"
                className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder-gray-400 font-medium text-gray-900"
                placeholder="Enter your last name"
              />
              <div id="last-name-help" className="sr-only">
                Enter your last name as it appears on official documents
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
                aria-describedby="phone-help"
                className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder-gray-400 font-medium text-gray-900"
                placeholder="Enter your phone number"
              />
              <div id="phone-help" className="sr-only">
                Enter your phone number so we can contact you about the event
                and prizes
              </div>
            </div>

            {/* Prizes Section */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  GIVEAWAYS
                </h3>
                <p className="text-lg font-bold text-gray-800 mb-2">
                  CASH PRIZES & GIFT CARDS
                </p>
                <div className="relative inline-block">
                  <div className="bg-white border-2 border-white rounded-full px-6 py-2">
                    <span className="text-lg font-bold text-gray-900">
                      VR HEADSET
                    </span>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 -left-4 text-yellow-500 text-2xl">
                    →
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 -right-4 text-yellow-500 text-2xl">
                    ←
                  </div>
                </div>
              </div>
            </div>

            {/* Age Disclaimer */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-amber-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-800 font-medium">
                    <strong>Important:</strong> You must be 18 years or older to
                    register and be eligible for the main prize.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              variant="primary"
              size="xl"
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              aria-label={
                submitting
                  ? "Processing registration, please wait"
                  : "Submit registration form to enter for VR headset prize"
              }
              aria-describedby="submit-help"
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
                "REGISTER NOW"
              )}
            </Button>
            <div id="submit-help" className="sr-only">
              Click to submit your registration and enter for the Oculus Quest
              VR Headset grand prize
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-white font-medium drop-shadow-md">
            By registering, you agree to our terms and conditions
          </p>
        </div>
      </div>
    </div>
  );
}
