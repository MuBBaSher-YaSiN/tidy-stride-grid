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

    console.log('Create contractor function called');

    // 1) Get caller (admin) from JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      console.error('Unauthorized:', userErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2) Check admin via profiles.role
    const { data: profile, error: profErr } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profErr || !profile || profile.role !== "admin") {
      console.error('Forbidden - not admin:', profErr, profile);
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { name, email, city, password } = await req.json();
    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email, password" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Creating contractor:', { name, email, city });

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
      console.error('Failed to create auth user:', createErr);
      return new Response(JSON.stringify({ error: createErr?.message || "Create user failed" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const contractorUserId = created.user.id;
    console.log('Created auth user with ID:', contractorUserId);

    // 5) Insert contractors row
    const { error: insertErr } = await admin
      .from("contractors")
      .insert([{ user_id: contractorUserId, name, email, city }]);

    if (insertErr) {
      console.error('Failed to insert contractor row:', insertErr);
      // Rollback - delete the auth user
      await admin.auth.admin.deleteUser(contractorUserId);
      console.log('Rolled back auth user creation');
      return new Response(JSON.stringify({ error: insertErr.message }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Successfully created contractor');
    return new Response(JSON.stringify({ success: true, user_id: contractorUserId }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});