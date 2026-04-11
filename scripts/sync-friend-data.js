const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const FRIEND_URL = process.env.FRIEND_SUPABASE_URL;
const FRIEND_SERVICE_KEY = process.env.FRIEND_SUPABASE_SERVICE_ROLE_KEY;
const LOCAL_URL = process.env.SUPABASE_URL;
const LOCAL_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FRIEND_URL || !FRIEND_SERVICE_KEY || !LOCAL_URL || !LOCAL_SERVICE_KEY) {
  console.error('Missing env vars. Need FRIEND_SUPABASE_URL, FRIEND_SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const stateFile = path.join(__dirname, 'friend-sync-state.json');
const logFile = path.join(__dirname, 'friend-sync.log');

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
}

function loadState() {
  if (!fs.existsSync(stateFile)) {
    return { processedSince: null, analyticsSince: null };
  }
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  } catch {
    return { processedSince: null, analyticsSince: null };
  }
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function pickFields(row, allowed) {
  const output = {};
  for (const key of allowed) {
    if (row[key] !== undefined) output[key] = row[key];
  }
  return output;
}

async function fetchAll({ client, table, orderBy, since, chunkSize = 1000 }) {
  let done = false;
  let page = 0;
  const rows = [];

  while (!done) {
    let query = client.from(table).select('*').order(orderBy, { ascending: true }).range(page * chunkSize, (page + 1) * chunkSize - 1);
    if (since) {
      query = query.gte(orderBy, since);
    }

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));

    if (!data || data.length < chunkSize) {
      done = true;
    } else {
      page += 1;
    }
  }

  return rows;
}

async function main() {
  console.log('=== Sync Friend Data -> Local ===');
  log('Sync started');
  const friend = createClient(FRIEND_URL, FRIEND_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const local = createClient(LOCAL_URL, LOCAL_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const state = loadState();

  const processedRows = await fetchAll({
    client: friend,
    table: 'sos_reports_processed',
    orderBy: 'processed_at',
    since: state.processedSince,
  });

  const analyticsRows = await fetchAll({
    client: friend,
    table: 'disaster_analytics',
    orderBy: 'last_updated',
    since: state.analyticsSince,
  });

  const processedPayload = processedRows.map((row) => ({
    ...pickFields(row, [
      'id',
      'name',
      'phone',
      'latitude',
      'longitude',
      'category',
      'message',
      'created_at',
      'district',
      'detailed_area',
      'verified_severity',
      'supply_requirements',
      'casualties_reported',
      'processed_at',
      'rephrased_message',
    ]),
    source_project: 'friend',
  }));

  const analyticsPayload = analyticsRows.map((row) => ({
    ...pickFields(row, [
      'district',
      'date_bucket',
      'total_incidents',
      'avg_severity',
      'critical_needs',
      'last_updated',
      'overall_summary',
    ]),
    source_project: 'friend',
  }));

  if (processedPayload.length) {
    const { error } = await local.from('sos_reports_processed').upsert(processedPayload, { onConflict: 'id' });
    if (error) {
      throw error;
    }
    console.log(`Processed synced: ${processedPayload.length}`);
    log(`Processed synced: ${processedPayload.length}`);
  } else {
    console.log('No processed updates found.');
    log('No processed updates found.');
  }

  if (analyticsPayload.length) {
    const { error } = await local
      .from('disaster_analytics')
      .upsert(analyticsPayload, { onConflict: 'source_project,district,date_bucket' });
    if (error) {
      throw error;
    }
    console.log(`Analytics synced: ${analyticsPayload.length}`);
    log(`Analytics synced: ${analyticsPayload.length}`);
  } else {
    console.log('No analytics updates found.');
    log('No analytics updates found.');
  }

  const latestProcessed = processedRows.reduce(
    (max, row) => (row.processed_at && row.processed_at > max ? row.processed_at : max),
    state.processedSince || ''
  );
  const latestAnalytics = analyticsRows.reduce(
    (max, row) => (row.last_updated && row.last_updated > max ? row.last_updated : max),
    state.analyticsSince || ''
  );

  saveState({
    processedSince: latestProcessed || state.processedSince,
    analyticsSince: latestAnalytics || state.analyticsSince,
  });

  console.log('Sync complete.');
  log('Sync complete.');
}

main().catch((err) => {
  console.error('Sync failed:', err.message || err);
  log(`Sync failed: ${err.message || err}`);
  process.exit(1);
});
