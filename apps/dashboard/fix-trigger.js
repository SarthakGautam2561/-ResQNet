// Fix the database trigger and create test user
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Try fix: Drop the trigger, use a simpler version
  const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
    sql: `CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$ 
    BEGIN 
    INSERT INTO profiles (id, name, email, role) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, 'public'); 
    RETURN NEW; 
    END; 
    $$ LANGUAGE plpgsql SECURITY DEFINER;`
  });
  console.log('RPC result:', rpcData, rpcError?.message);
  
  // Try signup with no role metadata to avoid the casting issue
  const { data, error } = await supabase.auth.signUp({
    email: 'demo@resqnet.in',
    password: 'demo123456',
    options: { data: { name: 'Demo Admin' } } // NO role — trigger defaults to 'public'
  });
  console.log('Signup:', data?.user?.id || 'no user', error?.message || 'success');
}

main().catch(console.error);
