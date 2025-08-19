import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/src/lib/token'

export async function GET(req: NextRequest, { params }: { params: { companySlug: string; partnerSlug: string } }) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 401 })
  let decoded
  try {
    decoded = verifyToken(token)
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }
  if (decoded.scope !== 'create_booking') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    global: { headers: { 'app.role': 'partner', 'app.company_id': decoded.company_id, 'app.partner_id': decoded.partner_id } }
  })
  const { data, error } = await supabase.rpc('availability', {
    p_company: decoded.company_id,
    p_date: date,
    p_start: 0,
    p_end: 24
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ slots: data })
}
