import fetch from 'cross-fetch'
import { RateLimiterMemory } from 'rate-limiter-flexible'

const limiter = new RateLimiterMemory({ points: 10, duration: 60 })

export async function getDurationMinutes(pickup: string, dropoff: string) {
  try {
    await limiter.consume('maps')
  } catch {
    throw new Error('rate-limit')
  }
  const key = process.env.GOOGLE_MAPS_API_KEY
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickup)}&destinations=${encodeURIComponent(dropoff)}&key=${key}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    const value = data.rows?.[0]?.elements?.[0]?.duration?.value
    if (!value) throw new Error('no-value')
    return Math.ceil(value / 60)
  } catch {
    return 45 // fallback
  }
}
