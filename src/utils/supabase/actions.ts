"use server";

import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { Profile } from "@/utils/supabase/types/users";

export async function signUp(
  first_name: string,
  last_name: string,
  email: string,
  password: string
) {
  try {
    const supabase = await createClient();

    const authResponse = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
        },
      },
    });

    return authResponse;
  } catch (error) {
    console.error("Error in signUp:", error);
    throw error;
  }
}

export async function updateUserProfile(
  profile: Profile
): Promise<{ profile: Profile | null; error: PostgrestError | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(profile)
    .eq("user_id", profile.user_id)
    .select()
    .single();

  return { profile: data, error };
}
