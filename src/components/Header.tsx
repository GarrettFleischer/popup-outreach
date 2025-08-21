"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function Header() {
  const { user, signOut, loading } = useAuth();

  const handleLogout = async () => {
    await signOut("local");
  };

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Reno Revival Ministries
              </h1>
            </div>
            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Reno Revival Ministries
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors duration-200 cursor-pointer"
                >
                  Welcome, {user.profile?.first_name || user.email}
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/auth/login">
                <Button variant="primary" size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
