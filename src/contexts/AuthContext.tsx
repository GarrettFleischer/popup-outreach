"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  SupabaseClient,
  AuthError,
  AuthTokenResponsePassword,
  Session,
  PostgrestError,
} from "@supabase/supabase-js";
import {
  Profile,
  UserProfile,
  ProfileWithPermissions,
} from "@/utils/supabase/types/users";
import { updateUserProfile } from "@/utils/supabase/actions";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";

type AuthContextType = {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  supabase: SupabaseClient<Database>;
  signIn: (
    email: string,
    password: string
  ) => Promise<AuthTokenResponsePassword>;
  signOut: (scope: "global" | "local" | "others" | undefined) => Promise<{
    error: AuthError | null;
  }>;
  resetPassword: (email: string) => Promise<{
    error: AuthError | null;
    data: object | null;
  }>;
  updateProfile: (profile: Profile) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient();

// Function to fetch profile with permissions
const fetchProfile = async (
  userId: string
): Promise<{
  profile: ProfileWithPermissions | null;
  error: PostgrestError | null;
}> => {
  try {
    // First fetch the basic profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      return { profile: null, error: profileError };
    }

    // Then fetch the permissions separately
    const { data: permissionData, error: permissionError } = await supabase
      .from("profile_permissions")
      .select("permission_level")
      .eq("user_id", userId)
      .single();

    if (permissionError && permissionError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is OK
      console.log(
        "Error fetching permissions:",
        JSON.stringify(permissionError)
      );
      // Continue anyway, just without permissions
    }

    // Combine the data
    const profile: ProfileWithPermissions = {
      ...profileData,
      profile_permissions: permissionData
        ? { permission_level: permissionData.permission_level }
        : null,
    };

    return { profile, error: null };
  } catch (error) {
    console.log("Unexpected error in fetchProfile:", error);
    return { profile: null, error: error as PostgrestError };
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateUserFromSession = async () => {
      try {
        setLoading(user === null);
        const {
          data: { user: logged_in_user },
        } = await supabase.auth.getUser();
        if (logged_in_user) {
          const { profile, error } = await fetchProfile(logged_in_user.id);
          if (error)
            console.log("error fetching profile", JSON.stringify(error));
          if (profile) {
            setUser({ ...logged_in_user, profile });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log("error fetching profile", JSON.stringify(error));
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    updateUserFromSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    console.log("auth context triggered");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("auth state changed", event);
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async (scope: "global" | "local" | "others" | undefined) => {
    return await supabase.auth.signOut({ scope });
  };
  const resetPassword = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });
  };

  const updateProfile = async (profile: Profile) => {
    if (user) {
      const { error } = await updateUserProfile(profile);
      if (error) {
        console.log(JSON.stringify(error));
        return { error: error.message };
      }

      // Fetch the complete profile with permissions after update
      const { profile: completeProfile, error: fetchError } =
        await fetchProfile(profile.user_id);
      if (fetchError) {
        console.log(JSON.stringify(fetchError));
        return { error: fetchError.message };
      }

      if (completeProfile) {
        setUser({ ...user, profile: completeProfile });
      }
      return { error: null };
    }

    return { error: "not logged in" };
  };

  const value = {
    user,
    session,
    loading,
    supabase,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
