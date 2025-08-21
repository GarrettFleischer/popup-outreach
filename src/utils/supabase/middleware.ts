import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle admin route access control
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // If not authenticated, redirect to login
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    // Check if user has admin permissions
    // We need to fetch the user's profile and permissions from the database
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
        *,
        profile_permissions (
          permission_level
        )
      `
      )
      .eq("user_id", user.id)
      .single();

    if (profileError || !profileData || !profileData.profile_permissions) {
      // If we can't fetch permissions, redirect to not-authorized
      const url = request.nextUrl.clone();
      url.pathname = "/not-authorized";
      return NextResponse.redirect(url);
    }

    const permissionLevel = profileData.profile_permissions.permission_level;

    // Level 2 users (regular users) cannot access any admin routes
    if (permissionLevel === 2) {
      const url = request.nextUrl.clone();
      url.pathname = "/not-authorized";
      return NextResponse.redirect(url);
    }

    // Level 1 users (lead managers) can only access leads page
    if (permissionLevel === 1) {
      // If they try to access dashboard or other admin pages, redirect to leads
      if (request.nextUrl.pathname !== "/admin/leads") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/leads";
        return NextResponse.redirect(url);
      }
    }

    // Level 0 users (super admins) can access everything
    // User has admin permissions, allow access
    return supabaseResponse;
  }

  // Redirect authenticated users away from auth pages to appropriate admin page
  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    // Check user permissions to determine where to redirect
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
        *,
        profile_permissions (
          permission_level
        )
      `
      )
      .eq("user_id", user.id)
      .single();

    if (profileError || !profileData || !profileData.profile_permissions) {
      // If we can't fetch permissions, redirect to not-authorized
      const url = request.nextUrl.clone();
      url.pathname = "/not-authorized";
      return NextResponse.redirect(url);
    }

    const permissionLevel = profileData.profile_permissions.permission_level;
    let redirectPath = "/admin/dashboard";

    // Level 1 users get redirected to leads, level 0 users to dashboard
    if (permissionLevel === 1) {
      redirectPath = "/admin/leads";
    } else if (permissionLevel === 2) {
      redirectPath = "/not-authorized";
    }

    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
