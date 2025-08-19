import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/src/lib/token'
import { z } from 'zod'
import { getDurationMinutes } from '@/src/lib/distance'
import { encrypt } from '@/src/lib/crypto'

const schema = z.object({
  patient_first_name: z.string().min(1).max(100),
  patient_last_name: z.string().min(1).max(100),
  birth_date: z.string(),
  station: z.string().max(100),
  pickup_address: z.string().min(3),
  dropoff_address: z.string().min(3),
  pickup_at: z.string(),
  flags: z.record(z.boolean()).optional(),
  special_notes: z.string().max(280).optional(),
  return_ride: z.boolean().optional()
})

export async function POST(req: NextRequest, { params }: { params: { companySlug: string; partnerSlug: string } }) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 401 })
  let decoded
  try {
    decoded = verifyToken(token)
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }
  if (decoded.scope !== 'create_booking') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = schema.parse(await req.json())
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    global: { headers: { 'app.role': 'partner', 'app.company_id': decoded.company_id, 'app.partner_id': decoded.partner_id } }
  })

  const settingsRes = await supabase.from('settings').select('booking_window_hours,buffer_minutes').eq('company_id', decoded.company_id).single()
  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 400 })
  const settings = settingsRes.data

  const pickupTime = new Date(body.pickup_at)
  const minTime = new Date(Date.now() + settings.booking_window_hours * 3600 * 1000)
  if (pickupTime < minTime) return NextResponse.json({ error: 'too soon' }, { status: 400 })

  const duration = (await getDurationMinutes(body.pickup_address, body.dropoff_address)) + settings.buffer_minutes

  const end = new Date(pickupTime.getTime() + duration * 60000)
  const { count: vehicleCount } = await supabase.from('vehicle').select('*', { count: 'exact', head: true }).eq('company_id', decoded.company_id).eq('is_active', true)
  const { count: overlapping } = await supabase
    .from('booking')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', decoded.company_id)
    .lte('pickup_at', end.toISOString())
    .gte('pickup_at', new Date(pickupTime.getTime() - settings.buffer_minutes * 60000).toISOString())
  if (overlapping && vehicleCount && overlapping >= vehicleCount) return NextResponse.json({ error: 'no capacity' }, { status: 409 })

  const encryptedData = {
    patient_first_name: encrypt(body.patient_first_name),
    patient_last_name: encrypt(body.patient_last_name),
    birth_date: encrypt(body.birth_date),
    station: encrypt(body.station),
    pickup_address: encrypt(body.pickup_address),
    dropoff_address: encrypt(body.dropoff_address),
    flags: body.flags || {},
    special_notes: body.special_notes ? encrypt(body.special_notes) : null
  }

  const { data, error } = await supabase.from('booking').insert({
    company_id: decoded.company_id,
    partner_id: decoded.partner_id,
    pickup_at: pickupTime.toISOString(),
    duration_min: duration,
    buffer_min: settings.buffer_minutes,
    ...encryptedData
  }).select('case_number').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ case_number: data.case_number })
}
