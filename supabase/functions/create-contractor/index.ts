import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Create contractor function called");

    // 1) Get caller (admin) from JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { 
        headers: { 
          Authorization: req.headers.get("Authorization") || "" 
        } 
      },
    });
    
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      console.error("Unauthorized access:", userErr);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: corsHeaders }
      );
    }

    console.log("User authenticated:", userData.user.id);

    // 2) Check admin via profiles.role - using maybeSingle to handle no data
    const { data: profile, error: profErr } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profErr) {
      console.error("Error checking profile:", profErr);
      return new Response(
        JSON.stringify({ error: "Profile check failed" }), 
        { status: 500, headers: corsHeaders }
      );
    }

    if (!profile || profile.role !== "admin") {
      console.error("User is not admin:", profile);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }), 
        { status: 403, headers: corsHeaders }
      );
    }

    const { name, email, city, password } = await req.json();
    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, password" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Creating contractor:", { name, email, city });

    // 3) Admin client with service role
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 4) Create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "contractor", name, city },
    });
    
    if (createErr || !created.user) {
      console.error("Failed to create auth user:", createErr);
      return new Response(
        JSON.stringify({ error: createErr?.message || "Create user failed" }), 
        { status: 400, headers: corsHeaders }
      );
    }
    
    const contractorUserId = created.user.id;
    console.log("Auth user created:", contractorUserId);

    // 5) Insert contractors row
    const { error: insertErr } = await admin
      .from("contractors")
      .insert([{ user_id: contractorUserId, name, email, city }]);

    if (insertErr) {
      console.error("Failed to insert contractor:", insertErr);
      // Rollback - delete the auth user
      try {
        await admin.auth.admin.deleteUser(contractorUserId);
        console.log("Rolled back auth user creation");
      } catch (rollbackErr) {
        console.error("Failed to rollback auth user:", rollbackErr);
      }
      return new Response(
        JSON.stringify({ error: insertErr.message }), 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Contractor created successfully");

    return new Response(
      JSON.stringify({ success: true, user_id: contractorUserId }), 
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }), 
      { status: 500, headers: corsHeaders }
    );
  }
});