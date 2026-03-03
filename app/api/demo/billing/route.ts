import { NextRequest, NextResponse } from 'next/server';

const DEMO_KEY = 'demo-key';

/**
 * GET /api/demo/billing
 *
 * Demo endpoint — returns fictional billing and invoice data for demo customers.
 * Authenticate with: Authorization: Bearer demo-key
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${DEMO_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    invoices: [
      {
        id: 'inv_5001',
        customer_id: 'cust_001',
        customer_name: 'Alice Johnson',
        amount_usd: 49.0,
        status: 'paid',
        due_date: '2026-03-01',
        paid_at: '2026-02-28T18:22:00Z',
        description: 'Pro Plan — March 2026',
      },
      {
        id: 'inv_5002',
        customer_id: 'cust_002',
        customer_name: 'Bob Smith',
        amount_usd: 9.0,
        status: 'outstanding',
        due_date: '2026-03-15',
        paid_at: null,
        description: 'Starter Plan — March 2026',
      },
      {
        id: 'inv_5003',
        customer_id: 'cust_003',
        customer_name: 'Carol White',
        amount_usd: 4880.0,
        status: 'paid',
        due_date: '2026-03-01',
        paid_at: '2026-02-20T11:05:00Z',
        description: 'Enterprise Plan (Annual) + 200 GB Extra Storage — 2026',
      },
    ],
  });
}
