"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link
                href="/"
                className="text-xl font-semibold text-gray-900 hover:text-indigo-600 transition-colors duration-200 cursor-pointer"
              >
                Reno Revival
              </Link>
              <div className="flex space-x-4">
                {isSuperAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/admin/dashboard")}
                    className="text-gray-700 hover:text-gray-900 cursor-pointer"
                  >
                    Dashboard
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => router.push("/admin/leads")}
                  className="text-gray-700 hover:text-gray-900 cursor-pointer"
                >
                  Leads
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.profile.first_name} {user.profile.last_name}
              </span>
              <Button onClick={handleLogout} variant="danger" size="sm">
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
