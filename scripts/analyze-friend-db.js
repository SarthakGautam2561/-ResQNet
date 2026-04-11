const { createClient } = require('@supabase/supabase-js');

const URL = process.env.FRIEND_SUPABASE_URL;
const SERVICE_KEY = process.env.FRIEND_SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error('Missing FRIEND_SUPABASE_URL or FRIEND_SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SENSITIVE_FIELDS = ['phone', 'email', 'name'];

function maskValue(key, value) {
  if (value == null) return value;
  const lower = key.toLowerCase();
  if (SENSITIVE_FIELDS.some((f) => lower.includes(f))) {
    if (typeof value === 'string') {
      return value.length > 4 ? `${value.slice(0, 2)}***${value.slice(-2)}` : '***';
    }
    return '***';
  }
  return value;
}

async function main() {
  console.log('=== Friend DB Analysis (public schema) ===');

  const { data: columns, error } = await supabase
    .from('_schema_tables')
    .select('*')
    .order('table_name', { ascending: true })
    .order('ordinal_position', { ascending: true });

  if (error) {
    console.error('Failed to read _schema_tables view:', error.message);
    process.exit(1);
  }

  const tables = new Map();
  for (const col of columns) {
    if (!tables.has(col.table_name)) tables.set(col.table_name, []);
    tables.get(col.table_name).push(col);
  }

  for (const [table, cols] of tables.entries()) {
    console.log(`\n--- ${table} ---`);
    console.log(
      cols
        .map((c) => `${c.column_name} (${c.data_type}${c.is_nullable === 'YES' ? ', nullable' : ''})`)
        .join(', ')
    );

    const { data: rows, error: rowsError } = await supabase.from(table).select('*').limit(3);
    if (rowsError) {
      console.log(`Sample fetch error: ${rowsError.message}`);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log('No rows.');
      continue;
    }

    const masked = rows.map((row) => {
      const output = {};
      for (const [key, value] of Object.entries(row)) {
        output[key] = maskValue(key, value);
      }
      return output;
    });

    console.log('Sample rows:', JSON.stringify(masked, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
