export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

export function hasCapacity(bookings: { start: Date; end: Date }[], start: Date, end: Date, vehicles: number) {
  const overlapping = bookings.filter(b => overlaps(start, end, b.start, b.end)).length
  return overlapping < vehicles
}

export function validWindow(pickup: Date, windowHours: number) {
  return pickup.getTime() - Date.now() >= windowHours * 3600 * 1000
}

export function withinService(pickup: Date, startHour: number, endHour: number) {
  const h = pickup.getHours()
  return h >= startHour && h < endHour
}
