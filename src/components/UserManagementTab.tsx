"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  getAllProfilesWithPermissions,
  updateUserPermission,
} from "@/utils/supabase/actions/actions";
import { isSuperAdmin } from "@/utils/supabase/types/users";

type ProfileWithPermissions = {
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  created_at: string | null;
  updated_at: string | null;
  profile_permissions: {
    permission_level: number;
  } | null;
};

export default function UserManagementTab() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingPermissions, setUpdatingPermissions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const profilesData = await getAllProfilesWithPermissions();
      setProfiles(profilesData);
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePermission = async (
    profileUserId: string,
    newLevel: number
  ) => {
    if (!isSuperAdmin(user?.profile)) return;

    setUpdatingPermissions((prev) => new Set(prev).add(profileUserId));

    try {
      await updateUserPermission(profileUserId, newLevel);
      await loadProfiles(); // Refresh the list
    } catch (error) {
      console.error("Error updating permission:", error);
      alert("Failed to update permission level");
    } finally {
      setUpdatingPermissions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(profileUserId);
        return newSet;
      });
    }
  };

  const getPermissionLevelLabel = (level: number) => {
    switch (level) {
      case 0:
        return { label: "Super Admin", color: "bg-red-100 text-red-800" };
      case 1:
        return { label: "Lead Manager", color: "bg-blue-100 text-blue-800" };
      case 2:
        return { label: "Regular User", color: "bg-gray-100 text-gray-800" };
      default:
        return { label: "Unknown", color: "bg-gray-100 text-gray-800" };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  if (!isSuperAdmin(user?.profile)) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-500">
          Only super admins can manage user permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          User Management
        </h2>
        <p className="text-gray-600">
          Manage user accounts and permission levels. Only super admins can
          modify permissions.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            All Users ({profiles.length})
          </h3>
        </div>

        {profiles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No users found</p>
            <p className="text-sm">
              Users will appear here once they create accounts
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile) => {
                  const currentLevel =
                    profile.profile_permissions?.permission_level ?? 2;
                  const isCurrentUser = profile.user_id === user?.id;
                  const { label, color } =
                    getPermissionLevelLabel(currentLevel);

                  return (
                    <tr key={profile.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {profile.first_name} {profile.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {profile.email || "No email"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {profile.created_at
                          ? formatDate(profile.created_at)
                          : "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!isCurrentUser && (
                          <div className="flex space-x-2">
                            {currentLevel !== 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdatePermission(profile.user_id, 0)
                                }
                                disabled={updatingPermissions.has(
                                  profile.user_id
                                )}
                                className="text-xs"
                              >
                                {updatingPermissions.has(profile.user_id)
                                  ? "Updating..."
                                  : "Make Super Admin"}
                              </Button>
                            )}
                            {currentLevel !== 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdatePermission(profile.user_id, 1)
                                }
                                disabled={updatingPermissions.has(
                                  profile.user_id
                                )}
                                className="text-xs"
                              >
                                {updatingPermissions.has(profile.user_id)
                                  ? "Updating..."
                                  : "Make Lead Manager"}
                              </Button>
                            )}
                            {currentLevel !== 2 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdatePermission(profile.user_id, 2)
                                }
                                disabled={updatingPermissions.has(
                                  profile.user_id
                                )}
                                className="text-xs"
                              >
                                {updatingPermissions.has(profile.user_id)
                                  ? "Updating..."
                                  : "Make Regular User"}
                              </Button>
                            )}
                          </div>
                        )}
                        {isCurrentUser && (
                          <span className="text-gray-400 text-xs">
                            Current User
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
