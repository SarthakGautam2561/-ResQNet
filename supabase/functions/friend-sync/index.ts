import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const friendUrl = Deno.env.get('FRIEND_SUPABASE_URL');
const friendKey = Deno.env.get('FRIEND_SUPABASE_SERVICE_ROLE_KEY');
const localUrl = Deno.env.get('SUPABASE_URL');
const localKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!friendUrl || !friendKey || !localUrl || !localKey) {
  throw new Error('Missing required environment variables for friend sync.');
}

const friend = createClient(friendUrl, friendKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const local = createClient(localUrl, localKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function pickFields(row: Record<string, unknown>, allowed: string[]) {
  const output: Record<string, unknown> = {};
  for (const key of allowed) {
    if (row[key] !== undefined) output[key] = row[key];
  }
  return output;
}

async function getLocalMax(table: string, column: string) {
  const { data, error } = await local
    .from(table)
    .select(`${column}`)
    .eq('source_project', 'friend')
    .order(column, { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0][column] as string | null;
}

Deno.serve(async () => {
  const latestProcessed = await getLocalMax('sos_reports_processed', 'processed_at');
  const latestAnalytics = await getLocalMax('disaster_analytics', 'last_updated');

  const processedQuery = friend
    .from('sos_reports_processed')
    .select('*')
    .order('processed_at', { ascending: true });
  if (latestProcessed) processedQuery.gte('processed_at', latestProcessed);

  const analyticsQuery = friend
    .from('disaster_analytics')
    .select('*')
    .order('last_updated', { ascending: true });
  if (latestAnalytics) analyticsQuery.gte('last_updated', latestAnalytics);

  const { data: processedRows, error: processedError } = await processedQuery;
  if (processedError) {
    return new Response(JSON.stringify({ ok: false, error: processedError.message }), { status: 500 });
  }

  const { data: analyticsRows, error: analyticsError } = await analyticsQuery;
  if (analyticsError) {
    return new Response(JSON.stringify({ ok: false, error: analyticsError.message }), { status: 500 });
  }

  const processedPayload = (processedRows || []).map((row) => ({
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

  const analyticsPayload = (analyticsRows || []).map((row) => ({
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
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
    }
  }

  if (analyticsPayload.length) {
    const { error } = await local
      .from('disaster_analytics')
      .upsert(analyticsPayload, { onConflict: 'source_project,district,date_bucket' });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed: processedPayload.length,
      analytics: analyticsPayload.length,
    }),
    { status: 200 },
  );
});
