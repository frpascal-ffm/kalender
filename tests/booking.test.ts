import { hasCapacity, validWindow, withinService } from '../src/lib/booking'

test('24h rule', () => {
  const now = new Date()
  const future = new Date(now.getTime() + 25 * 3600 * 1000)
  expect(validWindow(future, 24)).toBe(true)
})

test('service hours', () => {
  const date = new Date('2023-01-01T10:00:00Z')
  expect(withinService(date, 6, 20)).toBe(true)
})

test('capacity', () => {
  const start = new Date('2023-01-01T10:00:00Z')
  const end = new Date('2023-01-01T11:00:00Z')
  const bookings = [{ start, end }]
  expect(hasCapacity(bookings, start, end, 2)).toBe(true)
  expect(hasCapacity(bookings, start, end, 1)).toBe(false)
})
