"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/utils/supabase/database.types";

export async function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
