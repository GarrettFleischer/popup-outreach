"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function AuthHandler() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't do anything while loading
    if (loading) return;

    // Handle admin route access control
    if (pathname.startsWith("/admin")) {
      // If not authenticated, redirect to login
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Check if user has admin permissions
      if (!user.profile?.profile_permissions) {
        // If we can't fetch permissions, redirect to not-authorized
        router.push("/not-authorized");
        return;
      }

      const permissionLevel = user.profile.profile_permissions.permission_level;

      // Level 2 users (regular users) cannot access any admin routes
      if (permissionLevel === 2) {
        router.push("/not-authorized");
        return;
      }

      // Level 1 users (lead managers) can only access leads page
      if (permissionLevel === 1) {
        // If they try to access dashboard or other admin pages, redirect to leads
        if (pathname !== "/admin/leads") {
          router.push("/admin/leads");
          return;
        }
      }

      // Level 0 users (super admins) can access everything
      // User has admin permissions, allow access
    }

    // Redirect authenticated users away from auth pages to appropriate admin page
    if (user && pathname.startsWith("/auth")) {
      // Check user permissions to determine where to redirect
      if (!user.profile?.profile_permissions) {
        // If we can't fetch permissions, redirect to not-authorized
        router.push("/not-authorized");
        return;
      }

      const permissionLevel = user.profile.profile_permissions.permission_level;
      let redirectPath = "/admin/dashboard";

      // Level 1 users get redirected to leads, level 0 users to dashboard
      if (permissionLevel === 1) {
        redirectPath = "/admin/leads";
      } else if (permissionLevel === 2) {
        redirectPath = "/not-authorized";
      }

      router.push(redirectPath);
    }
  }, [user, loading, pathname, router]);

  // This component doesn't render anything
  return null;
}
