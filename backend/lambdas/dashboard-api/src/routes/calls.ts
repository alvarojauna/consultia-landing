import { query, createSuccessResponse, validateInt, validateDateString } from 'consultia-shared-nodejs';

/**
 * GET /dashboard/:customerId/calls?page=1&limit=20&status=completed&from=2025-01-01&to=2025-02-01
 *
 * Returns paginated call history from usage_records with optional filters.
 * For detailed transcripts/recordings, data comes from test_calls
 * (test calls) or DynamoDB call_logs (production calls).
 */
export async function getCalls(
  customerId: string,
  queryParams: Record<string, string | undefined>,
  requestId: string
) {
  const page = validateInt(queryParams.page, 'page', { min: 1, max: 1000, defaultValue: 1 });
  const limit = validateInt(queryParams.limit, 'limit', { min: 1, max: 100, defaultValue: 20 });
  const offset = (page - 1) * limit;
  const fromDate = validateDateString(queryParams.from, 'from');
  const toDate = validateDateString(queryParams.to, 'to');

  // Build WHERE clauses dynamically
  const conditions: string[] = ['ur.customer_id = $1'];
  const params: any[] = [customerId];
  let paramIdx = 2;

  if (fromDate) {
    conditions.push(`ur.recorded_at >= $${paramIdx}`);
    params.push(fromDate);
    paramIdx++;
  }

  if (toDate) {
    conditions.push(`ur.recorded_at <= $${paramIdx}`);
    params.push(toDate);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) AS total FROM usage_records ur WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated records with agent info
  const callsResult = await query(
    `SELECT
       ur.usage_id, ur.call_sid, ur.quantity AS duration_minutes,
       ur.unit_price_eur, ur.total_cost_eur, ur.recorded_at,
       ur.billing_period_start, ur.billing_period_end,
       a.agent_name
     FROM usage_records ur
     LEFT JOIN agents a ON a.agent_id = ur.agent_id
     WHERE ${whereClause}
     ORDER BY ur.recorded_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  // Also fetch any test calls for this customer (they have transcripts/recordings)
  const testCallsResult = await query(
    `SELECT call_sid, status, duration_seconds, recording_url, transcript, created_at
     FROM test_calls
     WHERE customer_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [customerId]
  );

  // Build a lookup map for test call extra data
  const testCallMap = new Map<string, any>();
  for (const tc of testCallsResult.rows) {
    testCallMap.set(tc.call_sid, {
      recording_url: tc.recording_url,
      transcript: tc.transcript,
      status: tc.status,
    });
  }

  const calls = callsResult.rows.map((row: any) => {
    const testData = row.call_sid ? testCallMap.get(row.call_sid) : null;
    return {
      usage_id: row.usage_id,
      call_sid: row.call_sid,
      agent_name: row.agent_name,
      duration_minutes: parseFloat(row.duration_minutes),
      cost_eur: parseFloat(row.total_cost_eur),
      recorded_at: row.recorded_at,
      recording_url: testData?.recording_url || null,
      transcript: testData?.transcript || null,
    };
  });

  return createSuccessResponse(
    {
      calls,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    },
    200,
    requestId
  );
}
