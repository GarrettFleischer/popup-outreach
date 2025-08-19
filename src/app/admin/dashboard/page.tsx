"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-6">
          Welcome to the admin dashboard. This is where you can manage your
          application.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">User Management</h3>
            <p className="text-blue-700 text-sm mt-2">
              Manage user accounts and permissions
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">Content Management</h3>
            <p className="text-green-700 text-sm mt-2">
              Manage application content and settings
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">Analytics</h3>
            <p className="text-purple-700 text-sm mt-2">
              View application analytics and reports
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">
            Account Information
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Name:</strong> {user?.profile?.first_name}{" "}
              {user?.profile?.last_name}
            </p>
            <p>
              <strong>Admin Level:</strong>{" "}
              {user?.profile?.profile_permissions?.permission_level}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
