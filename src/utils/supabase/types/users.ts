import { Database } from "@/utils/supabase/database.types";
import { User } from "@supabase/supabase-js";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfilePermissions =
  Database["public"]["Tables"]["profile_permissions"]["Row"];

// Combined type that includes both profile data and permissions
export interface ProfileWithPermissions extends Profile {
  profile_permissions: {
    permission_level: number;
  } | null;
}

export interface UserProfile extends User {
  profile: ProfileWithPermissions;
}

/**
 * Generates the full name from a profile object.
 * Handles potential null/undefined values for names.
 * @param profile The profile object.
 * @returns The concatenated first and last name, trimmed. Returns an empty string if profile is null/undefined.
 */
export function getProfileFullName(
  profile: Profile | ProfileWithPermissions | null | undefined
): string {
  if (!profile) {
    return "";
  }
  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";

  // Combine names and trim any leading/trailing whitespace
  return `${firstName} ${lastName}`.trim();
}

/**
 * Gets the permission level for a user profile.
 * @param profile The profile with permissions.
 * @returns The permission level as a number, or 1 (lowest permissions) if no permissions found.
 */
export function getUserPermissionLevel(
  profile: ProfileWithPermissions | null | undefined
): number {
  return profile?.profile_permissions?.permission_level ?? 1;
}

/**
 * Checks if a user has at least the specified permission level.
 * Note: Lower numbers = higher permissions (0 = Owner, 9 = Contractor)
 * @param profile The profile with permissions.
 * @param requiredLevel The maximum permission level allowed (user must have this level or lower number).
 * @returns True if the user has sufficient permissions, false otherwise.
 */
export function hasMinimumPermission(
  profile: ProfileWithPermissions | null | undefined,
  requiredLevel: number
): boolean {
  const userLevel = getUserPermissionLevel(profile);
  // Lower numbers = higher permissions, so user level must be <= required level
  return userLevel <= requiredLevel;
}

export enum UserRole {
  Administrator = "Administrator",
  User = "User",
}
