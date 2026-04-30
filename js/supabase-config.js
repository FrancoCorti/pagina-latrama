import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase Console → Settings → API
const SUPABASE_URL = "https://etzglbjbamuwzkcjwtvf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0emdsYmpiYW11d3prY2p3dHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzgzNjcsImV4cCI6MjA5MzA1NDM2N30.z5vRSYO4EGSknQJZvXj0a4bwDwR9FJd_cZTFZ_W7j48";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
});
