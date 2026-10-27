import type { Coordinates } from '@/types/common'

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in kilometres. */
export function distanceKm(from: Coordinates, to: Coordinates) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}
