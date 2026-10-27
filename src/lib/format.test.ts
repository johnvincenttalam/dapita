import { describe, expect, it } from 'vitest'

import {
  formatAppointment,
  formatDistance,
  formatDuration,
  formatFullDate,
  formatPeso,
  formatPrice,
  formatTime,
} from '@/lib/format'
import { distanceKm } from '@/lib/geo'

describe('market formatters', () => {
  it('formats pesos without centavos unless needed', () => {
    expect(formatPeso(250)).toBe('₱250')
    expect(formatPeso(1200)).toBe('₱1,200')
    expect(formatPeso(250.5)).toBe('₱250.50')
  })

  it('formats every price type (doc §11)', () => {
    expect(formatPrice({ type: 'fixed', amount: 250 })).toBe('₱250')
    expect(formatPrice({ type: 'from', amount: 1200 })).toBe('From ₱1,200')
    expect(formatPrice({ type: 'range', amount: 800, maxAmount: 1500 })).toBe('₱800–₱1,500')
    expect(formatPrice({ type: 'quote' })).toBe('Price on consultation')
  })

  it('formats durations like the design ("30 mins")', () => {
    expect(formatDuration(30)).toBe('30 mins')
    expect(formatDuration(1)).toBe('1 min')
    expect(formatDuration(60)).toBe('1 hr')
    expect(formatDuration(90)).toBe('1 hr 30 mins')
    expect(formatDuration(240)).toBe('4 hrs')
  })

  it('shows times in Manila whatever the device time zone', () => {
    const instant = '2026-07-12T05:30:00.000Z'
    expect(formatTime(instant)).toBe('1:30 PM')
    expect(formatFullDate(instant)).toBe('Sun, Jul 12, 2026')
    expect(formatAppointment(instant)).toBe('Sun, Jul 12 · 1:30 PM')
  })

  it('formats distances', () => {
    expect(formatDistance(1.234)).toBe('1.2 km')
    expect(formatDistance(0.452)).toBe('450 m')
    expect(formatDistance(12.6)).toBe('13 km')
  })

  it('measures distance between coordinates', () => {
    // Poblacion to Lanang, roughly 4 km.
    const km = distanceKm({ lat: 7.0731, lng: 125.6128 }, { lat: 7.1052, lng: 125.6368 })
    expect(km).toBeGreaterThan(3.5)
    expect(km).toBeLessThan(4.5)
  })
})
