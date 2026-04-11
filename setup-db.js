const { createClient } = require('@supabase/supabase-js');

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL = process.env.SUPABASE_URL;

if (!SERVICE_KEY || !URL) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL in the environment.');
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: 'admin@resqnet.in', password: 'admin123456', name: 'Admin User', role: 'admin' },
  { email: 'official@resqnet.in', password: 'official123456', name: 'Delhi Official', role: 'official' },
  { email: 'ngo@resqnet.in', password: 'ngo123456', name: 'Red Cross Delhi', role: 'ngo' },
  { email: 'volunteer@resqnet.in', password: 'volunteer123456', name: 'Volunteer Team', role: 'volunteer' },
];

const SHELTERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Central Relief Camp',
    latitude: 28.6139,
    longitude: 77.209,
    capacity: 250,
    contact: '+91 11 4000 1111',
    is_active: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'North Zone Shelter',
    latitude: 28.7041,
    longitude: 77.1025,
    capacity: 180,
    contact: '+91 11 4000 2222',
    is_active: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'East Medical Post',
    latitude: 28.6506,
    longitude: 77.281,
    capacity: 120,
    contact: '+91 11 4000 3333',
    is_active: true,
  },
];

async function main() {
  console.log('=== ResQNet Seed Script ===');

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;

  const usersByEmail = new Map((list?.users || []).map((u) => [u.email, u]));

  console.log('\n=== Users ===');
  for (const user of USERS) {
    const existing = usersByEmail.get(user.email);
    let userId;

    if (existing) {
      userId = existing.id;
      console.log(`Found existing user: ${user.email}`);
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { name: user.name, role: user.role },
      });
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name, role: user.role },
      });
      if (error) {
        console.log(`Create failed for ${user.email}: ${error.message}`);
        continue;
      }
      userId = data.user.id;
      console.log(`Created user: ${user.email}`);
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    if (profileError) {
      console.log(`Profile upsert failed for ${user.email}: ${profileError.message}`);
    }
  }

  console.log('\n=== Shelters ===');
  const { error: shelterError } = await supabase.from('shelters').upsert(SHELTERS, { onConflict: 'id' });
  if (shelterError) {
    console.log(`Shelter upsert failed: ${shelterError.message}`);
  } else {
    console.log(`Seeded ${SHELTERS.length} shelters`);
  }

  console.log('\n=== Done ===');
  console.log('Login credentials:');
  console.log('  Admin:     admin@resqnet.in / admin123456');
  console.log('  Official:  official@resqnet.in / official123456');
  console.log('  NGO:       ngo@resqnet.in / ngo123456');
  console.log('  Volunteer: volunteer@resqnet.in / volunteer123456');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
