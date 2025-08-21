"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdmin } from "@/utils/supabase/types/users";
import EventsManagementTab from "@/components/EventsManagementTab";
import UserManagementTab from "@/components/UserManagementTab";

type TabType = "events" | "users";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("events");

  const tabs = [
    {
      id: "events" as TabType,
      label: "Events",
      component: EventsManagementTab,
    },
    ...(isSuperAdmin(user?.profile)
      ? [
          {
            id: "users" as TabType,
            label: "User Management",
            component: UserManagementTab,
          },
        ]
      : []),
  ];

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || EventsManagementTab;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage events and user accounts</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        <ActiveComponent />
      </div>
    </div>
  );
}
