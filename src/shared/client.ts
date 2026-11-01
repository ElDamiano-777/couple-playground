import { createClient } from "@supabase/supabase-js";

// Publishable browser credentials, not privileged database credentials.
export const supabase = createClient(
  `https://lyewmhtufesdccisqmin.supabase.co`,
  `sb_publishable_r8MBYstfx-S8sNXbcFLOgA_xo4GrXcV`,
);
