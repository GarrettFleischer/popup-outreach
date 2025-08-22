"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { getUserPermissionLevel } from "@/utils/supabase/types/users";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // No need to check permissions here - middleware handles it
  // This effect is kept for any future admin-specific logic
  useEffect(() => {
    // Admin-specific logic can go here if needed
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut("local");
    router.push("/auth/login");
  };

  // Show loading state while checking authentication or if user is null
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Middleware has already verified admin permissions, so we can render
  // If we reach here, the user is guaranteed to have admin access
  const permissionLevel = getUserPermissionLevel(user.profile);
  const isSuperAdmin = permissionLevel === 0;

  const isActiveRoute = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link
                href="/"
                className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors duration-200 cursor-pointer"
              >
                Reno Revival
              </Link>
              <div className="flex space-x-2">
                {isSuperAdmin && (
                  <Button
                    variant={
                      isActiveRoute("/admin/dashboard") ? "primary" : "outline"
                    }
                    onClick={() => router.push("/admin/dashboard")}
                    className={`transition-all duration-200 ${
                      isActiveRoute("/admin/dashboard")
                        ? "shadow-md transform scale-105"
                        : "hover:shadow-md hover:scale-105"
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Dashboard
                  </Button>
                )}
                <Button
                  variant={
                    isActiveRoute("/admin/leads") ? "primary" : "outline"
                  }
                  onClick={() => router.push("/admin/leads")}
                  className={`transition-all duration-200 ${
                    isActiveRoute("/admin/leads")
                      ? "shadow-md transform scale-105"
                      : "hover:shadow-md hover:scale-105"
                  }`}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Leads
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-gray-100 px-4 py-2 rounded-full">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user.profile.first_name?.[0]}
                    {user.profile.last_name?.[0]}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.profile.first_name} {user.profile.last_name}
                </span>
              </div>
              <Button
                onClick={handleLogout}
                variant="danger"
                size="sm"
                className="hover:shadow-md transition-shadow"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
