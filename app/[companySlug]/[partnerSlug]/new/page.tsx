'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function NewBookingPage() {
  const token = useSearchParams().get('token')
  const [caseNumber, setCaseNumber] = useState<string | null>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const res = await fetch(window.location.pathname.replace('/new','') + '/bookings?token=' + token, {
      method: 'POST',
      body: JSON.stringify({
        patient_first_name: form.get('first')!,
        patient_last_name: form.get('last')!,
        birth_date: form.get('birth')!,
        station: form.get('station')!,
        pickup_address: form.get('pickup')!,
        dropoff_address: form.get('dropoff')!,
        pickup_at: form.get('pickup_at')!
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    setCaseNumber(json.case_number)
  }

  if (caseNumber) return <div className="p-4">Fallnummer: {caseNumber}</div>

  return (
    <form onSubmit={submit} className="p-4 grid gap-4 max-w-xl">
      <input name="first" placeholder="Vorname" className="border p-2" />
      <input name="last" placeholder="Nachname" className="border p-2" />
      <input name="birth" placeholder="Geburtsdatum" className="border p-2" />
      <input name="station" placeholder="Station" className="border p-2" />
      <input name="pickup" placeholder="Abholadresse" className="border p-2" />
      <input name="dropoff" placeholder="Zieladresse" className="border p-2" />
      <input name="pickup_at" type="datetime-local" className="border p-2" />
      <button className="bg-brand text-white p-2 rounded">Buchung senden</button>
    </form>
  )
}
