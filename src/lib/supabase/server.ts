import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = () => process.env.SUPABASE_URL!;

// Session-aware client: only used for auth (sign in/out, reading the session).
export async function authClient() {
  const store = await cookies();
  return createServerClient(url(), process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components can't write cookies; the middleware refreshes the session.
        }
      },
    },
  });
}

// Secret-key client for all data access. Authorization is enforced in our server code.
export function db() {
  return createClient(url(), process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
