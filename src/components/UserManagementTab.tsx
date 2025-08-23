"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { GenericDropdown } from "@/components/ui/GenericDropdown";
import { updateUserPermission } from "@/utils/supabase/actions/actions";
import { getAllProfilesWithPermissions } from "@/utils/supabase/actions/actions";
import { isSuperAdmin } from "@/utils/supabase/types/users";
import EventAssignmentDialog from "./EventAssignmentDialog";

type ProfileWithPermissions = {
  user_id: string;
  first_name: string;
  last_name: string;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [eventAssignmentDialog, setEventAssignmentDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
  });
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsRefreshing(true);
      const profilesData = await getAllProfilesWithPermissions();
      setProfiles(profilesData);
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdatePermission = async (
    profileUserId: string,
    newLevel: number
  ) => {
    if (!isSuperAdmin(user?.profile)) return;

    setUpdatingUserId(profileUserId);

    try {
      await updateUserPermission(profileUserId, newLevel);
      await loadProfiles(); // Refresh the list
    } catch (error) {
      console.error("Error updating permission:", error);
      alert("Failed to update permission level");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenEventAssignment = (userId: string, userName: string) => {
    setEventAssignmentDialog({
      isOpen: true,
      userId,
      userName,
    });
  };

  const handleCloseEventAssignment = () => {
    setEventAssignmentDialog({
      isOpen: false,
      userId: "",
      userName: "",
    });
  };

  const getPermissionLevelLabel = (level: number) => {
    switch (level) {
      case 0:
        return { label: "Super Admin", color: "bg-red-100 text-red-800" };
      case 1:
        return { label: "Lead Manager", color: "bg-blue-100 text-blue-800" };
      case 2:
        return { label: "Unknown", color: "bg-gray-100 text-gray-800" };
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
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            All Users ({profiles.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={loadProfiles}
            className="flex items-center space-x-2"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <svg
                className="animate-spin h-4 w-4 text-blue-600"
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
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            <span>Refresh</span>
          </Button>
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
                      <td className="px-6 py-4 text-sm font-medium">
                        {!isCurrentUser && (
                          <div className="flex space-x-2">
                            <GenericDropdown
                              options={[
                                { id: 0, label: "Super Admin", data: 0 },
                                { id: 1, label: "Lead Manager", data: 1 },
                                { id: 2, label: "Unknown", data: 2 },
                              ]}
                              selectedOption={{
                                id: currentLevel,
                                label:
                                  getPermissionLevelLabel(currentLevel).label,
                                data: currentLevel,
                              }}
                              onOptionChange={(option) =>
                                handleUpdatePermission(
                                  profile.user_id,
                                  option.data
                                )
                              }
                              placeholder="Select Role"
                              className="w-32"
                              renderOption={(option) => (
                                <span className="text-xs">{option.label}</span>
                              )}
                              renderSelected={(option) => (
                                <span className="text-xs font-medium">
                                  {updatingUserId === profile.user_id
                                    ? "Updating..."
                                    : option?.label || "Select Role"}
                                </span>
                              )}
                            />
                            {updatingUserId === profile.user_id && (
                              <div className="text-xs text-gray-500 ml-2">
                                Updating...
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenEventAssignment(
                                  profile.user_id,
                                  `${profile.first_name} ${profile.last_name}`
                                )
                              }
                              className="text-xs text-white bg-blue-600 hover:bg-blue-700 hover:text-white"
                            >
                              Manage Events
                            </Button>
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

      {/* Event Assignment Dialog */}
      <EventAssignmentDialog
        isOpen={eventAssignmentDialog.isOpen}
        onClose={handleCloseEventAssignment}
        userId={eventAssignmentDialog.userId}
        userName={eventAssignmentDialog.userName}
      />
    </div>
  );
}
